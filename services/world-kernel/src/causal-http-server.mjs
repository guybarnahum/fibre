import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

import {
  PrivateRequestConflictError,
  PrivateRequestNotFoundError,
  StorageBusyError,
  IntegrityError,
} from "./persistence-common.mjs";
import { GuardianModelError } from "./guardian-model-adapter.mjs";
import { DEFAULT_MAX_HTTP_BODY_BYTES } from "./http-server.mjs";
import { createExpressionWorldKernelHttpServer } from "./expression-http-server.mjs";
import { PreM2CausalWorldKernelService } from "./causal-service.mjs";

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
  if (value instanceof PrivateRequestNotFoundError) {
    return [404, "PRIVATE_REQUEST_NOT_FOUND", value.message, {}];
  }
  if (value instanceof PrivateRequestConflictError) {
    return [409, "PRIVATE_REQUEST_CONFLICT", value.message, {}];
  }
  if (value instanceof StorageBusyError) {
    return [503, "STORAGE_BUSY", "World storage is temporarily busy", { "retry-after": "1" }];
  }
  if (value instanceof IntegrityError) {
    return [503, "INTEGRITY_FAILURE", "Authoritative Thread data failed integrity validation", {}];
  }
  if (value instanceof GuardianModelError) {
    return [503, "COGNITION_UNAVAILABLE", "The Thread's semantic appraisal did not complete; no private stance was recorded", { "retry-after": "1" }];
  }
  if (value instanceof TypeError) {
    return [value.httpStatus ?? 400, value.httpCode ?? "INVALID_REQUEST", value.message, {}];
  }
  return [500, "INTERNAL_ERROR", "The world-kernel could not complete the request", {}];
}

function parsedParts(target) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) return null;
  const url = new URL(target, "http://world-kernel.local");
  if (url.search !== "") return null;
  try {
    return url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
}

function causalRoute(target, method) {
  const parts = parsedParts(target);
  if (parts === null || method !== "POST") return null;
  if (parts[0] !== "threads" || parts[2] !== "private" || parts[3] !== "requests") return null;
  if (parts.length === 4) return { kind: "appraise", threadId: parts[1] };
  if (parts.length !== 6) return null;
  const base = { threadId: parts[1], requestId: parts[4] };
  if (parts[5] === "participation") return { ...base, kind: "participation" };
  if (parts[5] === "stance") return { ...base, kind: "forbidden_stance" };
  if (parts[5] === "runtime") return { ...base, kind: "forbidden_runtime" };
  if (parts[5] === "authorization") return { ...base, kind: "forbidden_authorization" };
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

export function createCausalWorldKernelHttpServer({
  service,
  privateToken = null,
  adminToken = null,
  maxBodyBytes = DEFAULT_MAX_HTTP_BODY_BYTES,
  onError = () => {},
  ...baseOptions
} = {}) {
  if (!(service instanceof PreM2CausalWorldKernelService)) {
    throw new TypeError("service must be a PreM2CausalWorldKernelService");
  }
  const server = createExpressionWorldKernelHttpServer({
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
    const method = request.method ?? "GET";
    const route = causalRoute(request.url, method);
    if (route === null) return baseHandler(request, response);

    const id = requestId(request.headers["x-request-id"]);
    try {
      if (!loopbackHost(request.headers.host)) {
        throw httpError(421, "MISDIRECTED_REQUEST", "The Fibre world-kernel accepts only loopback Host headers");
      }
      requirePrivate(request, privateToken);

      if (route.kind === "forbidden_stance") {
        throw httpError(
          410,
          "CALLER_AUTHORED_STANCE_DISABLED",
          "Caller-authored private assessments are disabled; submit the external request for Fibre-owned appraisal.",
        );
      }
      if (route.kind === "forbidden_runtime" || route.kind === "forbidden_authorization") {
        throw httpError(
          410,
          "CALLER_AUTHORED_PARTICIPATION_DISABLED",
          "Caller-authored participation decisions or runtime selections are disabled; use the participation continuation boundary.",
        );
      }

      const body = await readJson(request, maxBodyBytes);
      if (route.kind === "appraise") {
        const result = await service.appraiseParticipation(route.threadId, body);
        return writeJson(response, result.idempotent ? 200 : 201, result, id);
      }
      if (route.kind === "participation") {
        const result = service.continueParticipation(route.threadId, route.requestId, body);
        return writeJson(response, result.idempotent ? 200 : 201, result, id);
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
