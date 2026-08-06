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

const DEFAULT_ROOT = fileURLToPath(new URL("../apps/thread-editor/", import.meta.url));
const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_MAX_UPSTREAM_BYTES = 2 * 1024 * 1024;
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

export function normalizeWorldKernelUrl(value) {
  const url = new URL(value ?? "http://127.0.0.1:8787");
  if (url.protocol !== "http:") throw new TypeError("FIBRE_WORLD_URL must use http");
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new TypeError("FIBRE_WORLD_URL must target a loopback host");
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new TypeError("FIBRE_WORLD_URL must contain only scheme, loopback host, and port");
  }
  return new URL(`${url.protocol}//${url.host}`);
}

function loopbackHostHeader(value) {
  if (typeof value !== "string") return false;
  const authority = value.toLowerCase();
  return /^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(authority) ||
    /^\[::1\](?::[0-9]{1,5})?$/.test(authority);
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

async function readJson(request, maxBodyBytes) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new EditorHttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
  }
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBodyBytes) {
      throw new EditorHttpError(413, "REQUEST_TOO_LARGE", `Request body exceeds ${maxBodyBytes} bytes`);
    }
    chunks.push(chunk);
  }
  if (length === 0) throw new EditorHttpError(400, "INVALID_JSON", "A JSON body is required");
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new EditorHttpError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new EditorHttpError(400, "INVALID_REQUEST", "Request body must be an object");
  }
  return value;
}

function assertExactKeys(value, allowed) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) throw new EditorHttpError(400, "INVALID_REQUEST", `${key} is not allowed`);
  }
}

function decodeParts(pathname) {
  try {
    return pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    throw new EditorHttpError(400, "INVALID_PATH", "Path contains invalid encoding");
  }
}

async function parseUpstream(response, maxUpstreamBytes) {
  const chunks = [];
  let length = 0;
  if (response.body !== null) {
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk);
      length += bytes.length;
      if (length > maxUpstreamBytes) {
        throw new EditorHttpError(
          502,
          "WORLD_KERNEL_RESPONSE_TOO_LARGE",
          `World kernel response exceeds ${maxUpstreamBytes} bytes`,
        );
      }
      chunks.push(bytes);
    }
  }
  if (length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new EditorHttpError(502, "WORLD_KERNEL_INVALID_RESPONSE", "World kernel returned non-JSON content");
  }
}

function publicError(error, requestId) {
  if (error instanceof EditorHttpError) {
    return { status: error.status, payload: { error: { code: error.code, message: error.message, requestId } } };
  }
  return {
    status: 500,
    payload: { error: { code: "EDITOR_INTERNAL_ERROR", message: "Thread Editor could not complete the request", requestId } },
  };
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
    try {
      stat = lstatSync(cursor);
    } catch {
      throw new EditorHttpError(404, "NOT_FOUND", "Static file not found");
    }
    if (stat.isSymbolicLink()) {
      throw new EditorHttpError(403, "FORBIDDEN", "Symbolic links are not served by the Thread Editor");
    }
  }
  let actual;
  try {
    actual = realpathSync(file);
  } catch {
    throw new EditorHttpError(404, "NOT_FOUND", "Static file not found");
  }
  if (actual !== rootReal && !actual.startsWith(`${rootReal}${sep}`)) {
    throw new EditorHttpError(403, "FORBIDDEN", "Static file resolves outside editor root");
  }
  return actual;
}

function encodedSuffix(segments) {
  return segments.length === 0 ? "" : `/${segments.map(encodeURIComponent).join("/")}`;
}

export function createThreadEditorServer({
  rootDirectory = DEFAULT_ROOT,
  worldKernelUrl = "http://127.0.0.1:8787",
  privateToken = null,
  accessToken = randomBytes(32).toString("hex"),
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  maxUpstreamBytes = DEFAULT_MAX_UPSTREAM_BYTES,
  fetchImpl = globalThis.fetch,
  onError = () => {},
} = {}) {
  const root = resolve(rootDirectory);
  const rootReal = realpathSync(root);
  const kernel = normalizeWorldKernelUrl(worldKernelUrl);
  if (privateToken !== null && (typeof privateToken !== "string" || privateToken.length < 16)) {
    throw new TypeError("privateToken must be null or at least 16 characters");
  }
  if (typeof accessToken !== "string" || accessToken.length < 16) {
    throw new TypeError("accessToken must be at least 16 characters");
  }
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1024) {
    throw new TypeError("maxBodyBytes must be an integer of at least 1024");
  }
  if (!Number.isSafeInteger(maxUpstreamBytes) || maxUpstreamBytes < 1024) {
    throw new TypeError("maxUpstreamBytes must be an integer of at least 1024");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

  async function callKernel(path, { method = "GET", body, privateAccess = false } = {}) {
    const headers = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (privateAccess) {
      if (privateToken === null) {
        throw new EditorHttpError(503, "EDITOR_PRIVATE_ACCESS_DISABLED", "Editor private inspection is not configured");
      }
      headers["x-fibre-private-token"] = privateToken;
    }
    let response;
    try {
      response = await fetchImpl(new URL(path, kernel), {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new EditorHttpError(502, "WORLD_KERNEL_UNAVAILABLE", "World kernel is unavailable");
    }
    const payload = await parseUpstream(response, maxUpstreamBytes);
    if (!response.ok) {
      const code = payload?.error?.code ?? "WORLD_KERNEL_ERROR";
      const message = payload?.error?.message ?? `World kernel returned ${response.status}`;
      throw new EditorHttpError(response.status, code, message);
    }
    return payload;
  }

  async function inspection(threadId) {
    const [health, thread, events, integrity] = await Promise.all([
      callKernel("/health"),
      callKernel(`/threads/${encodeURIComponent(threadId)}`),
      callKernel(`/threads/${encodeURIComponent(threadId)}/events`),
      callKernel(`/threads/${encodeURIComponent(threadId)}/integrity`),
    ]);
    let requests = null;
    let runtimes = null;
    if (privateToken !== null) {
      [requests, runtimes] = await Promise.all([
        callKernel(`/threads/${encodeURIComponent(threadId)}/private/requests`, { privateAccess: true }),
        callKernel(`/threads/${encodeURIComponent(threadId)}/private/runtime`, { privateAccess: true }),
      ]);
    }
    return {
      mode: "inspection",
      capabilities: {
        editorCredentialRequired: true,
        commandPreview: true,
        commandAcceptance: false,
        seed: false,
        runtimeMutation: false,
        freeze: false,
        abandon: false,
        repair: false,
        obligationMutation: false,
      },
      kernel: health,
      thread: thread.thread,
      events: events.events,
      integrity,
      private: {
        available: privateToken !== null,
        requests: requests?.requests ?? [],
        runtimes: runtimes?.runtimes ?? [],
      },
    };
  }

  function requireEditorAccess(request) {
    if (!safeTokenEqual(request.headers["x-fibre-editor-token"], accessToken)) {
      throw new EditorHttpError(403, "EDITOR_TOKEN_REQUIRED", "A valid per-run editor access token is required");
    }
  }

  async function apiRoute(request, response, url, requestId) {
    if (url.search !== "") throw new EditorHttpError(400, "QUERY_NOT_SUPPORTED", "Query parameters are not supported");
    requireEditorAccess(request);
    const parts = decodeParts(url.pathname);
    if (parts[0] !== "api" || parts[1] !== "editor") return false;

    if (parts.length === 3 && parts[2] === "health") {
      if (request.method !== "GET") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET");
      const kernelHealth = await callKernel("/health");
      writeJson(response, 200, {
        editor: {
          status: "ok",
          mode: "inspection",
          accessCredentialRequired: true,
          privateInspection: privateToken !== null,
        },
        kernel: kernelHealth,
      }, requestId);
      return true;
    }

    if (parts.length >= 4 && parts[2] === "threads") {
      const threadId = parts[3];
      if (parts.length === 4) {
        if (request.method !== "GET") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET");
        writeJson(response, 200, await inspection(threadId), requestId);
        return true;
      }
      if (parts.length === 5 && parts[4] === "preview-self-model") {
        if (request.method !== "POST") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use POST");
        const body = await readJson(request, maxBodyBytes);
        assertExactKeys(body, ["selfModel", "summary"]);
        if (typeof body.selfModel !== "string" || body.selfModel.trim().length === 0) {
          throw new EditorHttpError(400, "INVALID_REQUEST", "selfModel is required");
        }
        if (body.summary !== undefined && (typeof body.summary !== "string" || body.summary.trim().length === 0)) {
          throw new EditorHttpError(400, "INVALID_REQUEST", "summary must be non-empty when provided");
        }
        const [current, health] = await Promise.all([
          callKernel(`/threads/${encodeURIComponent(threadId)}`),
          callKernel("/health"),
        ]);
        if (typeof health.kernelTime !== "string") {
          throw new EditorHttpError(502, "WORLD_KERNEL_TIME_UNAVAILABLE", "World kernel did not publish kernel-owned time");
        }
        const command = {
          commandId: `cmd_editor_${randomUUID()}`,
          threadId,
          expectedVersion: current.thread.version,
          type: "UPDATE_SELF_MODEL",
          payload: {
            selfModel: body.selfModel.trim(),
            summary: body.summary?.trim() ?? "Thread Editor non-mutating preview",
          },
          actor: { entityId: "thread_editor", kind: "other", displayName: "Thread Editor preview" },
          occurredAt: health.kernelTime,
        };
        const preview = await callKernel(
          `/threads/${encodeURIComponent(threadId)}/commands/preview`,
          { method: "POST", body: { command } },
        );
        const { previewId: _previewId, ...safePreview } = preview;
        writeJson(response, 200, {
          command,
          preview: safePreview,
          receipt: {
            previewIdRedacted: true,
            previewIdentityDerivableFromReturnedFields: true,
            commandAcceptanceRequiresAdminToken: true,
          },
        }, requestId);
        return true;
      }
      if (parts.length === 5 && parts[4] === "requests") {
        if (request.method !== "GET") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET");
        const payload = await callKernel(
          `/threads/${encodeURIComponent(threadId)}/private/requests`,
          { privateAccess: true },
        );
        writeJson(response, 200, payload, requestId);
        return true;
      }
      if (parts.length >= 6 && parts[4] === "requests") {
        if (request.method !== "GET") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET");
        const requestIdValue = parts[5];
        const suffixParts = parts.slice(6);
        const suffixKey = suffixParts.join("/");
        if (!new Set(["", "integrity"]).has(suffixKey)) {
          throw new EditorHttpError(404, "EDITOR_ROUTE_NOT_FOUND", "Unknown editor route");
        }
        const payload = await callKernel(
          `/threads/${encodeURIComponent(threadId)}/private/requests/${encodeURIComponent(requestIdValue)}${encodedSuffix(suffixParts)}`,
          { privateAccess: true },
        );
        writeJson(response, 200, payload, requestId);
        return true;
      }
      if (parts.length === 5 && parts[4] === "runtimes") {
        if (request.method !== "GET") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET");
        const payload = await callKernel(
          `/threads/${encodeURIComponent(threadId)}/private/runtime`,
          { privateAccess: true },
        );
        writeJson(response, 200, payload, requestId);
        return true;
      }
      if (parts.length >= 6 && parts[4] === "runtimes") {
        if (request.method !== "GET") throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET");
        const sessionId = parts[5];
        const suffixParts = parts.slice(6);
        const allowed = new Set(["", "integrity", "freeze", "freeze/integrity", "abandon", "abandon/integrity"]);
        const suffixKey = suffixParts.join("/");
        if (!allowed.has(suffixKey)) throw new EditorHttpError(404, "EDITOR_ROUTE_NOT_FOUND", "Unknown editor route");
        const payload = await callKernel(
          `/threads/${encodeURIComponent(threadId)}/private/runtime/${encodeURIComponent(sessionId)}${encodedSuffix(suffixParts)}`,
          { privateAccess: true },
        );
        writeJson(response, 200, payload, requestId);
        return true;
      }
    }

    throw new EditorHttpError(404, "EDITOR_ROUTE_NOT_FOUND", "Unknown editor route");
  }

  function serveStatic(request, response, url) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw new EditorHttpError(405, "METHOD_NOT_ALLOWED", "Use GET or HEAD");
    }
    if (url.search !== "") throw new EditorHttpError(400, "QUERY_NOT_SUPPORTED", "Query parameters are not supported");
    let requested;
    try {
      requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
    } catch {
      throw new EditorHttpError(400, "INVALID_PATH", "Path contains invalid encoding");
    }
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
      if (url.pathname.startsWith("/api/")) {
        const handled = await apiRoute(request, response, url, requestId);
        if (!handled) {
          throw new EditorHttpError(404, "EDITOR_ROUTE_NOT_FOUND", "Unknown editor route");
        }
      } else {
        serveStatic(request, response, url);
      }
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
