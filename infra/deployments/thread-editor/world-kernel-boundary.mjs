const THREAD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

export function normalizeThreadEditorWorldUrl(value) {
  const url = new URL(value ?? "http://127.0.0.1:8787");
  if (url.protocol !== "http:") throw new TypeError("Thread Editor World URL must use http");
  if (!LOOPBACK_HOSTS.has(url.hostname)) throw new TypeError("Thread Editor World URL must target loopback");
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new TypeError("Thread Editor World URL must contain only scheme, loopback host, and port");
  }
  return new URL(`${url.protocol}//${url.host}`);
}

function threadId(value) {
  const normalized = nonEmpty("Thread ID", value);
  if (!THREAD_ID_PATTERN.test(normalized)) throw new TypeError("Thread ID is invalid");
  return normalized;
}

async function responseJson(response) {
  try { return await response.json(); }
  catch { return null; }
}

function upstreamError(response, payload) {
  const detail = payload?.error?.message ?? payload?.error?.code ?? payload?.error ?? response.statusText ?? `HTTP ${response.status}`;
  const error = new Error(`World Kernel rejected Thread Editor inspection: ${detail}`);
  error.code = payload?.error?.code ?? "THREAD_EDITOR_WORLD_REQUEST_FAILED";
  error.httpStatus = response.status;
  return error;
}

export function createThreadEditorWorldBoundary({
  baseUrl = "http://127.0.0.1:8787",
  privateToken,
  fetchImpl = fetch,
  timeoutMs = 5_000,
} = {}) {
  const worldUrl = normalizeThreadEditorWorldUrl(baseUrl);
  const token = nonEmpty("Fibre private token", privateToken);
  if (token.length < 16) throw new TypeError("Fibre private token must be at least 16 characters");
  if (typeof fetchImpl !== "function") throw new TypeError("Thread Editor World fetch implementation is required");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    throw new TypeError("Thread Editor World timeoutMs must be an integer from 100 through 60000");
  }

  async function request(path, { privateAccess = true } = {}) {
    let response;
    try {
      response = await fetchImpl(new URL(path, worldUrl), {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(privateAccess ? { "x-fibre-private-token": token } : {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const unavailable = new Error(`World Kernel is unavailable: ${error?.message ?? String(error)}`);
      unavailable.code = "THREAD_EDITOR_WORLD_UNAVAILABLE";
      unavailable.httpStatus = 502;
      throw unavailable;
    }
    const payload = await responseJson(response);
    if (!response.ok) throw upstreamError(response, payload);
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      const invalid = new Error("World Kernel returned an invalid Thread Editor response");
      invalid.code = "THREAD_EDITOR_WORLD_INVALID_RESPONSE";
      invalid.httpStatus = 502;
      throw invalid;
    }
    return payload;
  }

  return Object.freeze({
    baseUrl: worldUrl.href.replace(/\/$/u, ""),
    async health() {
      return request("/healthz", { privateAccess: false });
    },
    async listThreads() {
      const payload = await request("/internal/threads");
      if (payload.ok !== true || !Array.isArray(payload.threads)) {
        const error = new Error("World Kernel Thread directory response is invalid");
        error.code = "THREAD_EDITOR_WORLD_INVALID_RESPONSE";
        error.httpStatus = 502;
        throw error;
      }
      return payload;
    },
    async inspectThread(value) {
      const id = threadId(value);
      const payload = await request(`/internal/threads/${encodeURIComponent(id)}/inspection`);
      if (payload.ok !== true || !payload.inspection || typeof payload.inspection !== "object") {
        const error = new Error("World Kernel Thread inspection response is invalid");
        error.code = "THREAD_EDITOR_WORLD_INVALID_RESPONSE";
        error.httpStatus = 502;
        throw error;
      }
      return payload;
    },
  });
}
