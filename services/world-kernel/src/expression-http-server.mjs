import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

import {
  IntegrityError,
  StorageBusyError,
} from "./persistence-common.mjs";
import { DEFAULT_MAX_HTTP_BODY_BYTES } from "./http-server.mjs";
import { createLifecycleWorldKernelHttpServer } from "./lifecycle-hardening-http-server.mjs";
import {
  ExpressionConflictError,
  ExpressionNotFoundError,
  ExpressionRejectedError,
  ParticipationAuthorizationNotFoundError,
} from "./expression-domain.mjs";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function requestId(value) {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
    ? value
    : `req_${randomUUID()}`;
}

function tokenEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function writeJson(response, status, payload, id, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...headers,
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'",
    "x-request-id": id,
  });
  response.end(body);
}

function loopbackHost(value) {
  if (typeof value !== "string") return false;
  const authority = value.toLowerCase();
  return /^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(authority) ||
    /^\[::1\](?::[0-9]{1,5})?$/.test(authority);
}

function httpError(status, code, message) {
  const value = new TypeError(message);
  value.httpStatus = status;
  value.httpCode = code;
  return value;
}

async function readJson(request, maxBodyBytes) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw httpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
  }
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBodyBytes) {
      throw httpError(413, "REQUEST_TOO_LARGE", `Request body exceeds ${maxBodyBytes} bytes`);
    }
    chunks.push(chunk);
  }
  if (length === 0) throw httpError(400, "INVALID_JSON", "A JSON request body is required");
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("request body must be a plain object");
  }
  return value;
}

function problem(value) {
  if (value instanceof ParticipationAuthorizationNotFoundError) {
    return [404, "PARTICIPATION_AUTHORIZATION_NOT_FOUND", value.message, {}];
  }
  if (value instanceof ExpressionNotFoundError) {
    return [404, "EXPRESSION_NOT_FOUND", value.message, {}];
  }
  if (value instanceof ExpressionConflictError) {
    return [409, "EXPRESSION_CONFLICT", value.message, {}];
  }
  if (value instanceof ExpressionRejectedError) {
    return [422, "EXPRESSION_REJECTED", value.message, {}];
  }
  if (value instanceof StorageBusyError) {
    return [503, "STORAGE_BUSY", "World storage is temporarily busy", { "retry-after": "1" }];
  }
  if (value instanceof IntegrityError) {
    return [503, "INTEGRITY_FAILURE", "Authoritative Thread data failed integrity validation", {}];
  }
  if (value instanceof TypeError) {
    return [value.httpStatus ?? 400, value.httpCode ?? "INVALID_REQUEST", value.message, {}];
  }
  return [500, "INTERNAL_ERROR", "The world-kernel could not complete the request", {}];
}

function parsedParts(target) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  const url = new URL(target, "http://world-kernel.local");
  if (url.search !== "") return null;
  try {
    return url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
}

function expressionRoute(target) {
  const parts = parsedParts(target);
  if (parts === null || parts[0] !== "threads" || parts[2] !== "private") return null;
  if (parts.length === 4 && parts[3] === "expression") {
    return { kind: "list", threadId: parts[1], exact: true };
  }
  if (parts.length < 6 || parts[3] !== "requests") return null;
  const threadId = parts[1];
  const requestId = parts[4];
  const leaf = parts[5];
  if (["authorization", "disclosure", "response", "expression"].includes(leaf)) {
    return {
      kind: leaf,
      threadId,
      requestId,
      integrity: leaf === "expression" && parts.length === 7 && parts[6] === "integrity",
      exact: parts.length === 6 || (leaf === "expression" && parts.length === 7 && parts[6] === "integrity"),
    };
  }
  return null;
}

function requirePrivate(request, privateToken) {
  if (privateToken === null) {
    throw httpError(503, "PRIVATE_ACCESS_DISABLED", "Private request access is not enabled");
  }
  if (!tokenEqual(request.headers["x-fibre-private-token"], privateToken)) {
    throw httpError(403, "PRIVATE_TOKEN_REQUIRED", "A valid private-access token is required");
  }
}

function requireMethod(method, allowed) {
  if (!allowed.includes(method)) {
    throw httpError(405, "METHOD_NOT_ALLOWED", `Method is not allowed; use ${allowed.join(", ")}`);
  }
}

export function createExpressionWorldKernelHttpServer({
  service,
  privateToken = null,
  adminToken = null,
  maxBodyBytes = DEFAULT_MAX_HTTP_BODY_BYTES,
  onError = () => {},
  ...baseOptions
} = {}) {
  const server = createLifecycleWorldKernelHttpServer({
    service,
    privateToken,
    adminToken,
    maxBodyBytes,
    onError,
    ...baseOptions,
  });
  const [baseHandler] = server.listeners("request");
  server.removeAllListeners("request");
  server.on("request", async (request, response) => {
    const route = expressionRoute(request.url);
    if (route === null || !route.exact) return baseHandler(request, response);

    const id = requestId(request.headers["x-request-id"]);
    try {
      if (!loopbackHost(request.headers.host)) {
        throw httpError(421, "MISDIRECTED_REQUEST", "The M1 world-kernel accepts only loopback Host headers");
      }
      requirePrivate(request, privateToken);
      const method = request.method ?? "GET";

      if (route.kind === "list") {
        requireMethod(method, ["GET"]);
        return writeJson(response, 200, { expressions: service.listExpressionSummaries(route.threadId) }, id);
      }

      if (route.kind === "authorization") {
        if (method === "GET") {
          return writeJson(response, 200, { authorization: service.getParticipationAuthorization(route.threadId, route.requestId) }, id);
        }
        requireMethod(method, ["GET", "POST"]);
        const body = await readJson(request, maxBodyBytes);
        const result = service.issueNonExecutionAuthorization(route.threadId, route.requestId, body);
        return writeJson(response, result.idempotent ? 200 : 201, result, id);
      }

      if (route.kind === "disclosure") {
        if (method === "GET") {
          return writeJson(response, 200, { disclosure: service.getDisclosureStrategy(route.threadId, route.requestId) }, id);
        }
        requireMethod(method, ["GET", "POST"]);
        const body = await readJson(request, maxBodyBytes);
        const result = service.recordDisclosureStrategy(route.threadId, route.requestId, body);
        return writeJson(response, result.idempotent ? 200 : 201, result, id);
      }

      if (route.kind === "response") {
        if (method === "GET") {
          return writeJson(response, 200, { response: service.getAudienceResponse(route.threadId, route.requestId) }, id);
        }
        requireMethod(method, ["GET", "POST"]);
        const body = await readJson(request, maxBodyBytes);
        const result = service.recordAudienceResponse(route.threadId, route.requestId, body);
        return writeJson(response, result.idempotent ? 200 : 201, result, id);
      }

      if (route.kind === "expression") {
        requireMethod(method, ["GET"]);
        return writeJson(
          response,
          200,
          route.integrity
            ? service.verifyExpressionIntegrity(route.threadId, route.requestId)
            : { expression: service.getExpressionChain(route.threadId, route.requestId) },
          id,
        );
      }

      return baseHandler(request, response);
    } catch (value) {
      const [status, code, message, headers] = problem(value);
      if (status >= 500) {
        try {
          onError(value, { requestId: id, method: request.method, url: request.url });
        } catch {}
      }
      if (!response.headersSent) {
        return writeJson(response, status, { error: { code, message, requestId: id } }, id, headers);
      }
      response.destroy();
    }
  });
  return server;
}
