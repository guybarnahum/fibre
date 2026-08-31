function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function endpoint(baseUrl) {
  const url = new URL(nonEmpty("Asset Generator URL", baseUrl));
  url.pathname = "/internal/generation/reconcile";
  url.search = "";
  url.hash = "";
  return url;
}

export function createCanonicalVisualRootHttpBoundary({
  baseUrl,
  privateToken,
  fetchImpl = fetch,
} = {}) {
  const url = endpoint(baseUrl);
  const token = nonEmpty("Fibre private token", privateToken);
  if (typeof fetchImpl !== "function") throw new TypeError("Asset Generator fetch implementation is required");

  return Object.freeze({
    async reconcile({ job } = {}) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fibre-private-token": token,
        },
        body: JSON.stringify({ job }),
      });
      let body = null;
      try { body = await response.json(); } catch {}
      if (!response.ok) {
        const detail = body?.detail ?? body?.error ?? response.statusText ?? `HTTP ${response.status}`;
        const error = new Error(`Asset Generator rejected canonical root handoff: ${detail}`);
        error.code = "CANONICAL_VISUAL_ROOT_HANDOFF_FAILED";
        error.httpStatus = response.status;
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      if (!body || body.ok !== true || !body.result || typeof body.result !== "object") {
        const error = new Error("Asset Generator returned an invalid canonical root response");
        error.code = "CANONICAL_VISUAL_ROOT_HANDOFF_INVALID_RESPONSE";
        error.retryable = true;
        throw error;
      }
      return body.result;
    },
  });
}
