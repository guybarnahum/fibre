const TOKEN_ENCODER = new TextEncoder();
export const DEFAULT_GENESIS_DEVELOPMENT_MAX_BODY_BYTES = 4 * 1024 * 1024;

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

function json(status, payload) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function readJson(request, maxBodyBytes) {
  const contentType = request.headers.get("content-type");
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    const error = new TypeError("Content-Type must be application/json");
    error.httpStatus = 415;
    throw error;
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maxBodyBytes) {
    const error = new TypeError(bytes.byteLength === 0 ? "A JSON request body is required" : "Genesis development request is too large");
    error.httpStatus = bytes.byteLength === 0 ? 400 : 413;
    throw error;
  }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch {
    const error = new TypeError("Request body is not valid JSON");
    error.httpStatus = 400;
    throw error;
  }
}

export function createGenesisDevelopmentApi({
  developmentService,
  privateToken,
  maxBodyBytes = DEFAULT_GENESIS_DEVELOPMENT_MAX_BODY_BYTES,
  onError = () => {},
} = {}) {
  if (!developmentService || typeof developmentService.develop !== "function") {
    throw new TypeError("Genesis development API requires developmentService.develop(request)");
  }
  if (typeof privateToken !== "string" || privateToken.length < 16) {
    throw new TypeError("Genesis development API privateToken must be at least 16 characters");
  }
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1024) {
    throw new TypeError("Genesis development API maxBodyBytes must be an integer of at least 1024");
  }
  if (typeof onError !== "function") throw new TypeError("Genesis development API onError must be a function");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/births/develop") return null;
      try {
        if (url.search !== "") return json(400, { error: { code: "QUERY_NOT_SUPPORTED" } });
        if (request.method !== "POST") return json(405, { error: { code: "METHOD_NOT_ALLOWED" } });
        if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
          return json(403, { error: { code: "PRIVATE_TOKEN_REQUIRED" } });
        }
        const developmentRequest = await readJson(request, maxBodyBytes);
        const result = await developmentService.develop(developmentRequest);
        return json(result.status === "published" ? 200 : 202, { ok: true, development: result });
      } catch (error) {
        const status = error instanceof TypeError ? (error.httpStatus ?? 400) : 500;
        if (status >= 500) {
          try { onError(error); } catch {}
        }
        return json(status, {
          error: {
            code: status >= 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST",
            message: status >= 500 ? "Birth Center could not develop the Genesis candidate" : error.message,
          },
        });
      }
    },
  });
}
