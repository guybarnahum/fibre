import {
  closeSync,
  createReadStream,
  fstatSync,
  lstatSync,
  openSync,
  realpathSync,
} from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { repoFile } from "#repo-root";
import {
  createThreadEditorWorldBoundary,
  normalizeThreadEditorWorldUrl,
} from "../../infra/deployments/thread-editor/world-kernel-boundary.mjs";

const DEFAULT_ROOT = fileURLToPath(repoFile("apps/thread-editor/"));
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

class EditorHttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function assertLoopbackEditorHost(host) {
  if (typeof host !== "string" || !LOOPBACK_HOSTS.has(host)) {
    throw new TypeError("The Thread Editor may bind only to a loopback host");
  }
}

export const normalizeWorldKernelUrl = normalizeThreadEditorWorldUrl;

function loopbackHostHeader(value) {
  if (typeof value !== "string") return false;
  const authority = value.toLowerCase();
  return /^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/u.test(authority)
    || /^\[::1\](?::[0-9]{1,5})?$/u.test(authority);
}

function safeTokenEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function jsonHeaders(requestId) {
  return {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "content-security-policy": "default-src 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
  };
}

function staticHeaders(contentType) {
  return {
    "cache-control": "no-store",
    "content-type": contentType,
    "content-security-policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
}

function writeJson(response, status, payload, requestId) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...jsonHeaders(requestId),
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

function publicError(error, requestId) {
  if (error instanceof EditorHttpError) {
    return { status: error.status, payload: { error: { code: error.code, message: error.message, requestId } } };
  }
  const status = Number.isInteger(error?.httpStatus) ? error.httpStatus : 500;
  const code = typeof error?.code === "string" ? error.code : "EDITOR_INTERNAL_ERROR";
  const message = status >= 500
    ? "Thread Editor could not complete the inspection request"
    : (error?.message ?? "Thread Editor request failed");
  return { status, payload: { error: { code, message, requestId } } };
}

function assertStaticPath(root, rootReal, file) {
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    throw new EditorHttpError(403, "FORBIDDEN", "Static path escapes editor root");
  }
  const relativePath = relative(root, file);
  let cursor = root;
  for (const segment of relativePath.split(sep).filter(Boolean)) {
    cursor = join(cursor, segment);
    let stat;
    try { stat = lstatSync(cursor); }
    catch { throw new EditorHttpError(404, "NOT_FOUND", "Static file not found"); }
    if (stat.isSymbolicLink()) {
      throw new EditorHttpError(403, "FORBIDDEN", "Symbolic links are not served by the Thread Editor");
    }
  }
  let actual;
  try { actual = realpathSync(file); }
  catch { throw new EditorHttpError(404, "NOT_FOUND", "Static file not found"); }
  if (actual !== rootReal && !actual.startsWith(`${rootReal}${sep}`)) {
    throw new EditorHttpError(403, "FORBIDDEN", "Static file resolves outside editor root");
  }
  return actual;
}

function requireBoundary(boundary) {
  if (!boundary || typeof boundary !== "object") throw new TypeError("Thread Editor World boundary is required");
  for (const method of ["health", "listThreads", "inspectThread"]) {
    if (typeof boundary[method] !== "function") throw new TypeError(`Thread Editor World boundary must expose ${method}()`);
  }
  return boundary;
}

export function createThreadEditorServer({
  rootDirectory = DEFAULT_ROOT,
  worldKernelUrl = "http://127.0.0.1:8787",
  privateToken = null,
  worldBoundary = null,
  accessToken = randomBytes(32).toString("hex"),
  fetchImpl = globalThis.fetch,
  onError = () => {},
} = {}) {
  const root = resolve(rootDirectory);
  const rootReal = realpathSync(root);
  if (typeof accessToken !== "string" || accessToken.length < 16) {
    throw new TypeError("accessToken must be at least 16 characters");
  }
  if (typeof onError !== "function") throw new TypeError("onError must be a function");
  const world = worldBoundary === null
    ? createThreadEditorWorldBoundary({ baseUrl: worldKernelUrl, privateToken, fetchImpl })
    : requireBoundary(worldBoundary);

  function requireEditorAccess(request) {
    if (!safeTokenEqual(request.headers["x-fibre-editor-token"], accessToken)) {
      throw new EditorHttpError(403, "EDITOR_TOKEN_REQUIRED", "A valid per-run editor access token is required");
    }
  }

  async function apiRoute(request, response, url, requestId) {
    if (url.search !== "") throw new EditorHttpError(400, "QUERY_NOT_SUPPORTED", "Query parameters are not supported");
    requireEditorAccess(request);
    if (request.method !== "GET") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Thread Editor inspection APIs are GET-only");

    if (url.pathname === "/api/editor/health") {
      writeJson(response, 200, {
        editor: {
          status: "ok",
          mode: "modern-thread-inspection",
          accessCredentialRequired: true,
          providerKnowledge: false,
          semanticMutation: false,
        },
        world: await world.health(),
      }, requestId);
      return true;
    }

    if (url.pathname === "/api/editor/threads") {
      const directory = await world.listThreads();
      writeJson(response, 200, {
        mode: "modern-thread-inspection",
        threadCount: directory.threadCount,
        threads: directory.threads,
      }, requestId);
      return true;
    }

    const match = /^\/api\/editor\/threads\/([^/]+)$/u.exec(url.pathname);
    if (match !== null) {
      let threadId;
      try { threadId = decodeURIComponent(match[1]); }
      catch { throw new EditorHttpError(400, "INVALID_PATH", "Thread ID contains invalid encoding"); }
      const result = await world.inspectThread(threadId);
      writeJson(response, 200, {
        mode: "modern-thread-inspection",
        inspection: result.inspection,
        capabilities: {
          editorCredentialRequired: true,
          worldInspection: true,
          birthCenterDevelopment: false,
          semanticMutation: false,
          directStateAccess: false,
        },
      }, requestId);
      return true;
    }

    throw new EditorHttpError(404, "EDITOR_ROUTE_NOT_FOUND", "Unknown editor route");
  }

  function serveStatic(request, response, url) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET or HEAD");
    }
    if (url.search !== "") throw new EditorHttpError(400, "QUERY_NOT_SUPPORTED", "Query parameters are not supported");
    let requested;
    try { requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, ""); }
    catch { throw new EditorHttpError(400, "INVALID_PATH", "Path contains invalid encoding"); }
    if (requested.includes("\0") || isAbsolute(requested)) {
      throw new EditorHttpError(403, "FORBIDDEN", "Invalid static path");
    }
    const file = normalize(join(root, requested));
    const actual = assertStaticPath(root, rootReal, file);
    let fd;
    try {
      fd = openSync(actual, "r");
      const stat = fstatSync(fd);
      if (!stat.isFile()) throw new EditorHttpError(404, "NOT_FOUND", "Static file not found");
      response.writeHead(200, {
        ...staticHeaders(MIME[extname(actual)] ?? "application/octet-stream"),
        "content-length": stat.size,
      });
      if (request.method === "HEAD") {
        closeSync(fd);
        return response.end();
      }
      createReadStream(null, { fd, autoClose: true }).pipe(response);
    } catch (error) {
      if (fd !== undefined) {
        try { closeSync(fd); } catch {}
      }
      if (error instanceof EditorHttpError) throw error;
      throw new EditorHttpError(404, "NOT_FOUND", "Static file not found");
    }
  }

  const server = createServer(async (request, response) => {
    const requestId = `edr_${randomUUID()}`;
    try {
      if (!loopbackHostHeader(request.headers.host)) {
        throw new EditorHttpError(421, "MISDIRECTED_REQUEST", "Thread Editor accepts only loopback Host headers");
      }
      const target = request.url ?? "/";
      if (!target.startsWith("/") || target.startsWith("//")) {
        throw new EditorHttpError(421, "MISDIRECTED_REQUEST", "Absolute and network-path request targets are not accepted");
      }
      const url = new URL(target, "http://thread-editor.local");
      if (url.pathname.startsWith("/api/")) await apiRoute(request, response, url, requestId);
      else serveStatic(request, response, url);
    } catch (error) {
      const problem = publicError(error, requestId);
      if (problem.status >= 500) {
        try { onError(error, { requestId, method: request.method, url: request.url }); } catch {}
      }
      if (!response.headersSent) writeJson(response, problem.status, problem.payload, requestId);
      else response.destroy();
    }
  });
  server.editorAccessToken = accessToken;
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxConnections = 32;
  return server;
}

export async function listenThreadEditorServer(server, { host = "127.0.0.1", port = 4173 } = {}) {
  assertLoopbackEditorHost(host);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new TypeError("port must be between 0 and 65535");
  await new Promise((resolvePromise, reject) => {
    const onError = (error) => { server.off("listening", onListening); reject(error); };
    const onListening = () => { server.off("error", onError); resolvePromise(); };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Thread Editor did not expose a TCP address");
  return { host: address.address, port: address.port };
}

export async function closeThreadEditorServer(server) {
  if (!server.listening) return;
  await new Promise((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
}
