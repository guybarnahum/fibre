import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

import {
  IntegrityError,
  StorageBusyError,
} from "./persistence-common.mjs";
import {
  DEFAULT_MAX_HTTP_BODY_BYTES,
} from "./http-server.mjs";
import { createFreezeWorldKernelHttpServer } from "./freeze-http-server.mjs";
import {
  RuntimeAbandonConflictError,
  RuntimeAbandonNotFoundError,
  RuntimeAbandonRejectedError,
} from "./lifecycle-hardening-domain.mjs";

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

async function readJson(request, maxBodyBytes) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    const error = new TypeError("Content-Type must be application/json");
    error.httpStatus = 415;
    error.httpCode = "UNSUPPORTED_MEDIA_TYPE";
    throw error;
  }
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBodyBytes) {
      const error = new TypeError(`Request body exceeds ${maxBodyBytes} bytes`);
      error.httpStatus = 413;
      error.httpCode = "REQUEST_TOO_LARGE";
      throw error;
    }
    chunks.push(chunk);
  }
  if (length === 0) throw new TypeError("A JSON request body is required");
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new TypeError("Request body is not valid JSON");
    error.httpCode = "INVALID_JSON";
    throw error;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("request body must be a plain object");
  }
  return value;
}

function problem(error) {
  if (error instanceof RuntimeAbandonNotFoundError) {
    return [404, "RUNTIME_ABANDON_NOT_FOUND", error.message, {}];
  }
  if (error instanceof RuntimeAbandonConflictError) {
    return [409, "RUNTIME_ABANDON_CONFLICT", error.message, {}];
  }
  if (error instanceof RuntimeAbandonRejectedError) {
    return [422, "RUNTIME_ABANDON_REJECTED", error.message, {}];
  }
  if (error instanceof StorageBusyError) {
    return [503, "STORAGE_BUSY", "World storage is temporarily busy", { "retry-after": "1" }];
  }
  if (error instanceof IntegrityError) {
    return [503, "INTEGRITY_FAILURE", "Authoritative Thread data failed integrity validation", {}];
  }
  if (error instanceof TypeError) {
    return [error.httpStatus ?? 400, error.httpCode ?? "INVALID_REQUEST", error.message, {}];
  }
  return [500, "INTERNAL_ERROR", "The world-kernel could not complete the request", {}];
}

function abandonRoute(target) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  const url = new URL(target, "http://world-kernel.local");
  if (url.search !== "") return null;
  const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  if (
    parts.length >= 6 &&
    parts[0] === "threads" &&
    parts[2] === "private" &&
    parts[3] === "runtime" &&
    parts[5] === "abandon"
  ) {
    return {
      threadId: parts[1],
      sessionId: parts[4],
      integrity: parts.length === 7 && parts[6] === "integrity",
      exact: parts.length === 6 || (parts.length === 7 && parts[6] === "integrity"),
    };
  }
  return null;
}

export function createLifecycleWorldKernelHttpServer({
  service,
  privateToken = null,
  maxBodyBytes = DEFAULT_MAX_HTTP_BODY_BYTES,
  onError = () => {},
  ...baseOptions
} = {}) {
  const server = createFreezeWorldKernelHttpServer({
    service,
    privateToken,
    maxBodyBytes,
    onError,
    ...baseOptions,
  });
  const [baseHandler] = server.listeners("request");
  server.removeAllListeners("request");
  server.on("request", async (request, response) => {
    let route;
    try {
      route = abandonRoute(request.url);
    } catch {
      return baseHandler(request, response);
    }
    if (route === null || !route.exact) return baseHandler(request, response);

    const id = requestId(request.headers["x-request-id"]);
    try {
      if (!loopbackHost(request.headers.host)) {
        const error = new TypeError("The M1 world-kernel accepts only loopback Host headers");
        error.httpStatus = 421;
        error.httpCode = "MISDIRECTED_REQUEST";
        throw error;
      }
      if (privateToken === null) {
        const error = new TypeError("Private request access is not enabled");
        error.httpStatus = 503;
        error.httpCode = "PRIVATE_ACCESS_DISABLED";
        throw error;
      }
      if (!tokenEqual(request.headers["x-fibre-private-token"], privateToken)) {
        const error = new TypeError("A valid private-access token is required");
        error.httpStatus = 403;
        error.httpCode = "PRIVATE_TOKEN_REQUIRED";
        throw error;
      }
      if (typeof service.abandonRejectedRuntime !== "function") {
        const error = new TypeError("M1 rejected-runtime abandonment is not enabled");
        error.httpStatus = 503;
        error.httpCode = "RUNTIME_ABANDON_DISABLED";
        throw error;
      }
      if (route.integrity) {
        if (request.method !== "GET") {
          const error = new TypeError("Method is not allowed; use GET");
          error.httpStatus = 405;
          error.httpCode = "METHOD_NOT_ALLOWED";
          throw error;
        }
        return writeJson(
          response,
          200,
          service.verifyRuntimeAbandonment(route.threadId, route.sessionId),
          id,
        );
      }
      if (request.method === "GET") {
        return writeJson(
          response,
          200,
          { abandonment: service.getRuntimeAbandonment(route.threadId, route.sessionId) },
          id,
        );
      }
      if (request.method !== "POST") {
        const error = new TypeError("Method is not allowed; use GET, POST");
        error.httpStatus = 405;
        error.httpCode = "METHOD_NOT_ALLOWED";
        throw error;
      }
      const body = await readJson(request, maxBodyBytes);
      const result = service.abandonRejectedRuntime(route.threadId, route.sessionId, body);
      return writeJson(response, result.idempotent ? 200 : 201, result, id);
    } catch (error) {
      const [status, code, message, headers] = problem(error);
      if (status >= 500) {
        try {
          onError(error, { requestId: id, method: request.method, url: request.url });
        } catch {}
      }
      if (!response.headersSent) {
        writeJson(response, status, { error: { code, message, requestId: id } }, id, headers);
      } else {
        response.destroy();
      }
    }
  });
  return server;
}