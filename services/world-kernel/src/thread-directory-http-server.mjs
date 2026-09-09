import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

function tokenEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function loopbackHost(value) {
  if (typeof value !== "string") return false;
  const authority = value.toLowerCase();
  return /^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(authority)
    || /^\[::1\](?::[0-9]{1,5})?$/.test(authority);
}

function writeJson(response, status, payload, requestId) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "content-security-policy": "default-src 'none'",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
  });
  response.end(body);
}

function isDirectoryRoute(target) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) return false;
  return new URL(target, "http://world-kernel.local").pathname === "/internal/thread-directory/search";
}

function searchRequest(target) {
  const url = new URL(target, "http://world-kernel.local");
  const allowed = new Set(["q", "fin", "limit"]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) throw new TypeError(`unsupported Thread directory parameter ${key}`);
  }
  const limitText = url.searchParams.get("limit") ?? "50";
  if (!/^\d+$/.test(limitText)) throw new TypeError("Thread directory limit is invalid");
  const limit = Number(limitText);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new TypeError("Thread directory limit is invalid");
  const q = url.searchParams.get("q");
  const fin = url.searchParams.get("fin");
  if (q !== null && q.length > 240) throw new TypeError("Thread directory query is too long");
  if (fin !== null && fin.length > 64) throw new TypeError("Thread directory FIN is too long");
  return { query: q, fin, limit };
}

export function attachThreadDirectoryHttpServer({
  server,
  directory,
  privateToken = null,
  onError = () => {},
} = {}) {
  if (!server || typeof server.listeners !== "function") throw new TypeError("Thread directory HTTP boundary requires a Node HTTP server");
  if (!directory || typeof directory.search !== "function") throw new TypeError("Thread directory HTTP boundary requires directory.search");
  const handlers = server.listeners("request");
  if (handlers.length !== 1) throw new TypeError("Thread directory HTTP boundary requires exactly one existing request handler");
  const [baseHandler] = handlers;
  server.removeAllListeners("request");
  server.on("request", async (request, response) => {
    if (!isDirectoryRoute(request.url)) return baseHandler(request, response);
    const requestId = `req_${randomUUID()}`;
    try {
      if (!loopbackHost(request.headers.host)) {
        return writeJson(response, 421, { error: { code: "MISDIRECTED_REQUEST", message: "The Fibre world-kernel accepts only loopback Host headers", requestId } }, requestId);
      }
      if (request.method !== "GET") {
        return writeJson(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "Use GET", requestId } }, requestId);
      }
      if (privateToken === null) {
        return writeJson(response, 503, { error: { code: "PRIVATE_ACCESS_DISABLED", message: "Private Thread directory access is not enabled", requestId } }, requestId);
      }
      if (!tokenEqual(request.headers["x-fibre-private-token"], privateToken)) {
        return writeJson(response, 403, { error: { code: "PRIVATE_TOKEN_REQUIRED", message: "A valid private-access token is required", requestId } }, requestId);
      }
      return writeJson(response, 200, directory.search(searchRequest(request.url)), requestId);
    } catch (error) {
      const status = error instanceof TypeError ? 400 : 500;
      const code = error instanceof TypeError ? "INVALID_REQUEST" : "THREAD_DIRECTORY_FAILED";
      const message = status === 400 ? error.message : "The world-kernel could not search the Thread directory";
      if (status >= 500) {
        try { onError(error, { requestId, method: request.method, url: request.url }); } catch {}
      }
      if (!response.headersSent) return writeJson(response, status, { error: { code, message, requestId } }, requestId);
      response.destroy();
    }
  });
  return server;
}
