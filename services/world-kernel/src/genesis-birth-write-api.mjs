const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TOKEN_ENCODER = new TextEncoder();
export const DEFAULT_GENESIS_BIRTH_MAX_BODY_BYTES = 1024 * 1024;

function requestId(value) {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
    ? value
    : `req_${crypto.randomUUID()}`;
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function json(status, payload, id, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-content-type-options", "nosniff");
  responseHeaders.set("content-security-policy", "default-src 'none'");
  responseHeaders.set("x-request-id", id);
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
}

function problem(status, code, message) {
  const error = new TypeError(message);
  error.httpStatus = status;
  error.httpCode = code;
  return error;
}

async function readJson(request, maxBodyBytes) {
  const contentType = request.headers.get("content-type");
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw problem(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBodyBytes) {
    throw problem(413, "REQUEST_TOO_LARGE", `Request body exceeds ${maxBodyBytes} bytes`);
  }
  if (bytes.byteLength === 0) throw problem(400, "INVALID_JSON", "A JSON request body is required");
  let value;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw problem(400, "INVALID_JSON", "Request body is not valid JSON"); }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw problem(400, "INVALID_REQUEST", "request body must be a plain object");
  }
  return value;
}

export function createGenesisBirthWriteApi({
  birthPublisher,
  privateToken = null,
  maxBodyBytes = DEFAULT_GENESIS_BIRTH_MAX_BODY_BYTES,
  onError = () => {},
} = {}) {
  if (!birthPublisher || typeof birthPublisher.publishBirth !== "function") {
    throw new TypeError("Genesis birth write API requires birthPublisher.publishBirth(bundle)");
  }
  if (privateToken !== null && (typeof privateToken !== "string" || privateToken.length < 16)) {
    throw new TypeError("Genesis birth write API privateToken must be null or at least 16 characters");
  }
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1024) {
    throw new TypeError("Genesis birth write API maxBodyBytes must be an integer of at least 1024");
  }
  if (typeof onError !== "function") throw new TypeError("Genesis birth write API onError must be a function");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/genesis/births") return null;
      const id = requestId(request.headers.get("x-request-id"));
      try {
        if (url.search !== "") throw problem(400, "QUERY_NOT_SUPPORTED", "Query parameters are not supported");
        if (request.method !== "POST") throw problem(405, "METHOD_NOT_ALLOWED", "Method is not allowed; use POST");
        if (privateToken === null) throw problem(503, "PRIVATE_ACCESS_DISABLED", "Private birth publication access is not enabled");
        if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
          throw problem(403, "PRIVATE_TOKEN_REQUIRED", "A valid private-access token is required");
        }
        const bundle = await readJson(request, maxBodyBytes);
        const result = await birthPublisher.publishBirth(bundle);
        return json(result?.idempotent === true ? 200 : 201, result, id);
      } catch (error) {
        const status = error instanceof TypeError ? (error.httpStatus ?? 400) : 500;
        const code = error instanceof TypeError ? (error.httpCode ?? "INVALID_REQUEST") : "INTERNAL_ERROR";
        const message = status >= 500
          ? "The world-kernel could not publish the Genesis birth"
          : error.message;
        if (status >= 500) {
          try { onError(error, { requestId: id, method: request.method, url: request.url }); } catch {}
        }
        return json(status, { error: { code, message, requestId: id } }, id, status === 405 ? { allow: "POST" } : {});
      }
    },
  });
}
