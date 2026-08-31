function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function endpoint(baseUrl) {
  const url = new URL(nonEmpty("Thread Presentation URL", baseUrl));
  url.pathname = "/internal/visual-publication/reconcile";
  url.search = "";
  url.hash = "";
  return url;
}

export function createThreadPresentationVisualHttpBoundary({
  baseUrl,
  privateToken,
  fetchImpl = fetch,
} = {}) {
  const url = endpoint(baseUrl);
  const token = nonEmpty("Fibre private token", privateToken);
  if (typeof fetchImpl !== "function") throw new TypeError("Thread Presentation fetch implementation is required");

  return Object.freeze({
    async reconcileAvailableEmbodiment({ threadId, embodiment, observedAt } = {}) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fibre-private-token": token,
        },
        body: JSON.stringify({ threadId, embodiment, observedAt }),
      });
      let body = null;
      try { body = await response.json(); } catch {}
      if (!response.ok) {
        const detail = body?.detail ?? body?.error ?? response.statusText ?? `HTTP ${response.status}`;
        const error = new Error(`Thread Presentation rejected visual publication handoff: ${detail}`);
        error.code = "THREAD_PRESENTATION_VISUAL_HANDOFF_FAILED";
        error.httpStatus = response.status;
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      if (!body || body.ok !== true || !body.result || typeof body.result !== "object") {
        const error = new Error("Thread Presentation returned an invalid visual publication response");
        error.code = "THREAD_PRESENTATION_VISUAL_HANDOFF_INVALID_RESPONSE";
        error.retryable = true;
        throw error;
      }
      return body.result;
    },
  });
}
