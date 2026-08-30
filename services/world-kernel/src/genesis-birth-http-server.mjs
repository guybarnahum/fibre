import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

import { DEFAULT_MAX_HTTP_BODY_BYTES } from "./http-server.mjs";

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
  return /^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(authority)
    || /^\[::1\](?::[0-9]{1,5})?$/.test(authority);
}

function httpError(status, code, message) {
  const error = new TypeError(message);
  error.httpStatus = status;
  error.httpCode = code;
  return error;
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
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("request body must be a plain object");
    }
    return value;
  } catch (error) {
    if (error instanceof TypeError && error.httpStatus !== undefined) throw error;
    if (error instanceof TypeError && error.message === "request body must be a plain object") throw error;
    throw httpError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
}

function isBirthRoute(target) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) return false;
  const url = new URL(target, "http://world-kernel.local");
  return url.search === "" && url.pathname === "/internal/genesis/births";
}

export function attachGenesisBirthPublicationHttpServer({
  server,
  birthPublisher,
  privateToken = null,
  maxBodyBytes = DEFAULT_MAX_HTTP_BODY_BYTES,
  onError = () => {},
} = {}) {
  if (!server || typeof server.listeners !== "function") throw new TypeError("Genesis birth HTTP boundary requires a Node HTTP server");
  if (!birthPublisher || typeof birthPublisher.publishBirth !== "function") {
    throw new TypeError("Genesis birth HTTP boundary requires birthPublisher.publishBirth(bundle)");
  }
  const handlers = server.listeners("request");
  if (handlers.length !== 1) throw new TypeError("Genesis birth HTTP boundary requires exactly one existing request handler");
  const [baseHandler] = handlers;
  server.removeAllListeners("request");
  server.on("request", async (request, response) => {
    if (!isBirthRoute(request.url)) return baseHandler(request, response);
    const id = requestId(request.headers["x-request-id"]);
    try {
      if (!loopbackHost(request.headers.host)) {
        throw httpError(421, "MISDIRECTED_REQUEST", "The Fibre world-kernel accepts only loopback Host headers");
      }
      if (request.method !== "POST") throw httpError(405, "METHOD_NOT_ALLOWED", "Method is not allowed; use POST");
      if (privateToken === null) throw httpError(503, "PRIVATE_ACCESS_DISABLED", "Private birth publication access is not enabled");
      if (!tokenEqual(request.headers["x-fibre-private-token"], privateToken)) {
        throw httpError(403, "PRIVATE_TOKEN_REQUIRED", "A valid private-access token is required");
      }
      const bundle = await readJson(request, maxBodyBytes);
      const result = await birthPublisher.publishBirth(bundle);
      const idempotent = result?.idempotent === true;
      return writeJson(response, idempotent ? 200 : 201, result, id);
    } catch (error) {
      const status = error instanceof TypeError ? (error.httpStatus ?? 400) : 500;
      const code = error instanceof TypeError ? (error.httpCode ?? "INVALID_REQUEST") : "INTERNAL_ERROR";
      const message = status >= 500
        ? "The world-kernel could not publish the Genesis birth"
        : error.message;
      if (status >= 500) {
        try { onError(error, { requestId: id, method: request.method, url: request.url }); } catch {}
      }
      if (!response.headersSent) return writeJson(response, status, { error: { code, message, requestId: id } }, id);
      response.destroy();
    }
  });
  return server;
}
