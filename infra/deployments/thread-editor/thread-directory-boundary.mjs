import { timingSafeEqual } from "node:crypto";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const LOOPBACK_HOST_HEADER = /^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$|^\[::1\](?::[0-9]{1,5})?$/i;

function safeEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeLocalServiceUrl(value, name) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new TypeError(`${name} must use http and a loopback host for the local Thread Editor`);
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new TypeError(`${name} must contain only scheme, loopback host, and port`);
  }
  return new URL(`${url.protocol}//${url.host}`);
}

export function normalizeThreadPresentationUrl(value = "http://127.0.0.1:8788") {
  return normalizeLocalServiceUrl(value, "FIBRE_THREAD_PRESENTATION_URL");
}

export function normalizeWorldKernelUrl(value = "http://127.0.0.1:8787") {
  return normalizeLocalServiceUrl(value, "FIBRE_WORLD_URL");
}

function writeJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "content-security-policy": "default-src 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

async function upstreamJson(response, maxBytes, label) {
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error(`${label} response is too large`);
  if (bytes.length === 0) return null;
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error(`${label} returned invalid JSON`); }
}

export function attachThreadDirectoryBoundary(server, {
  worldKernelBaseUrl = "http://127.0.0.1:8787",
  presentationBaseUrl = "http://127.0.0.1:8788",
  privateToken = null,
  fetchImpl = globalThis.fetch,
  maxUpstreamBytes = 512 * 1024,
  onError = () => {},
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Thread directory fetch implementation is required");
  if (privateToken !== null && (typeof privateToken !== "string" || privateToken.length < 16)) {
    throw new TypeError("Thread directory privateToken must be null or at least 16 characters");
  }
  const world = normalizeWorldKernelUrl(worldKernelBaseUrl);
  const presentation = normalizeThreadPresentationUrl(presentationBaseUrl);
  const handlers = server.listeners("request");
  if (handlers.length !== 1) throw new Error("Thread Editor must expose exactly one request handler before directory composition");
  const [editorHandler] = handlers;
  server.removeAllListeners("request");

  server.on("request", async (request, response) => {
    const target = request.url ?? "/";
    if (!LOOPBACK_HOST_HEADER.test(request.headers.host ?? "") || !target.startsWith("/") || target.startsWith("//")) {
      return editorHandler(request, response);
    }

    let url;
    try { url = new URL(target, "http://thread-editor.local"); }
    catch { return editorHandler(request, response); }

    const isSearch = url.pathname === "/api/editor/directory/search";
    const isMeet = url.pathname === "/api/editor/directory/meet";
    if (!isSearch && !isMeet) return editorHandler(request, response);

    try {
      if (request.method !== "GET") {
        return writeJson(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "Use GET" } });
      }
      if (!safeEqual(request.headers["x-fibre-editor-token"], server.editorAccessToken)) {
        return writeJson(response, 403, {
          error: { code: "EDITOR_TOKEN_REQUIRED", message: "A valid per-run editor access token is required" },
        });
      }
      if (isSearch && privateToken === null) {
        return writeJson(response, 503, {
          error: {
            code: "EDITOR_PRIVATE_ACCESS_DISABLED",
            message: "Operator Thread search requires FIBRE_PRIVATE_TOKEN; Meet a Thread remains available from public Presentation",
          },
        });
      }

      const upstreamUrl = new URL(
        isSearch ? "/internal/thread-directory/search" : "/api/threads/meet",
        isSearch ? world : presentation,
      );
      const params = new URLSearchParams(url.search);
      if (isSearch) params.delete("language");
      upstreamUrl.search = params.toString();

      const headers = { accept: "application/json" };
      if (isSearch) headers["x-fibre-private-token"] = privateToken;

      let upstream;
      try {
        upstream = await fetchImpl(upstreamUrl, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        return writeJson(response, 502, {
          error: {
            code: isSearch ? "WORLD_THREAD_DIRECTORY_UNAVAILABLE" : "THREAD_PRESENTATION_UNAVAILABLE",
            message: isSearch
              ? "World Thread directory is unavailable"
              : "Thread Presentation Meet service is unavailable",
          },
        });
      }
      const label = isSearch ? "World Thread directory" : "Thread Presentation Meet service";
      const payload = await upstreamJson(upstream, maxUpstreamBytes, label);
      if (!upstream.ok) {
        return writeJson(response, upstream.status, {
          error: {
            code: "THREAD_DIRECTORY_REQUEST_FAILED",
            message: payload?.error?.message
              ?? (payload?.error === "invalid_request" ? "Thread directory parameters are invalid" : `${label} returned ${upstream.status}`),
          },
        });
      }
      return writeJson(response, 200, payload);
    } catch (error) {
      try { onError(error, { method: request.method, url: request.url }); } catch {}
      return writeJson(response, 502, {
        error: { code: "THREAD_DIRECTORY_UNAVAILABLE", message: error.message ?? "Thread directory is unavailable" },
      });
    }
  });

  return Object.freeze({
    worldKernelBaseUrl: world.href.replace(/\/$/, ""),
    presentationBaseUrl: presentation.href.replace(/\/$/, ""),
  });
}
