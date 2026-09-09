import { timingSafeEqual } from "node:crypto";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const DIRECTORY_PATHS = new Map([
  ["/api/editor/directory/search", "/api/threads/search"],
  ["/api/editor/directory/meet", "/api/threads/meet"],
]);

function safeEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizeThreadPresentationUrl(value = "http://127.0.0.1:8788") {
  const url = new URL(value);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new TypeError("FIBRE_THREAD_PRESENTATION_URL must use http and a loopback host for the local Thread Editor");
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new TypeError("FIBRE_THREAD_PRESENTATION_URL must contain only scheme, loopback host, and port");
  }
  return new URL(`${url.protocol}//${url.host}`);
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

async function upstreamJson(response, maxBytes) {
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error("Thread Presentation directory response is too large");
  if (bytes.length === 0) return null;
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Thread Presentation directory returned invalid JSON"); }
}

export function attachThreadDirectoryBoundary(server, {
  presentationBaseUrl = "http://127.0.0.1:8788",
  fetchImpl = globalThis.fetch,
  maxUpstreamBytes = 512 * 1024,
  onError = () => {},
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Thread directory fetch implementation is required");
  const presentation = normalizeThreadPresentationUrl(presentationBaseUrl);
  const handlers = server.listeners("request");
  if (handlers.length !== 1) throw new Error("Thread Editor must expose exactly one request handler before directory composition");
  const [editorHandler] = handlers;
  server.removeAllListeners("request");

  server.on("request", async (request, response) => {
    let url;
    try {
      url = new URL(request.url ?? "/", "http://thread-editor.local");
    } catch {
      return editorHandler(request, response);
    }
    const upstreamPath = DIRECTORY_PATHS.get(url.pathname);
    if (upstreamPath === undefined) return editorHandler(request, response);

    try {
      if (request.method !== "GET") {
        return writeJson(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "Use GET" } });
      }
      if (!safeEqual(request.headers["x-fibre-editor-token"], server.editorAccessToken)) {
        return writeJson(response, 403, {
          error: { code: "EDITOR_TOKEN_REQUIRED", message: "A valid per-run editor access token is required" },
        });
      }

      const upstreamUrl = new URL(upstreamPath, presentation);
      upstreamUrl.search = url.search;
      let upstream;
      try {
        upstream = await fetchImpl(upstreamUrl, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        return writeJson(response, 502, {
          error: { code: "THREAD_PRESENTATION_UNAVAILABLE", message: "Thread Presentation directory is unavailable" },
        });
      }
      const payload = await upstreamJson(upstream, maxUpstreamBytes);
      if (!upstream.ok) {
        return writeJson(response, upstream.status, {
          error: {
            code: "THREAD_DIRECTORY_REQUEST_FAILED",
            message: payload?.error === "invalid_request"
              ? "Thread directory search parameters are invalid"
              : `Thread Presentation directory returned ${upstream.status}`,
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

  return Object.freeze({ presentationBaseUrl: presentation.href.replace(/\/$/, "") });
}
