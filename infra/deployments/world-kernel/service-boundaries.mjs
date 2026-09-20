function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function endpoint(baseUrl, pathname, name) {
  const url = new URL(nonEmpty(name, baseUrl));
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

function bindingFetch(fetchImpl, name) {
  if (typeof fetchImpl !== "function") throw new TypeError(`${name} fetch implementation is required`);
  return fetchImpl;
}

async function responseJson(response) {
  try { return await response.json(); }
  catch { return null; }
}

function downstreamRetryable(response, body) {
  return typeof body?.retryable === "boolean"
    ? body.retryable
    : response.status === 429 || response.status >= 500;
}

function downstreamCode(body, fallback) {
  return typeof body?.code === "string" && body.code !== "" ? body.code : fallback;
}

export function createCanonicalVisualRootBoundary({
  baseUrl,
  privateToken,
  fetchImpl = fetch,
} = {}) {
  const url = endpoint(baseUrl, "/internal/generation/reconcile", "Asset Generator URL");
  const token = nonEmpty("Fibre private token", privateToken);
  const request = bindingFetch(fetchImpl, "Asset Generator");

  return Object.freeze({
    async reconcile({ job } = {}) {
      const response = await request(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fibre-private-token": token,
        },
        body: JSON.stringify({ job }),
      });
      const body = await responseJson(response);
      if (!response.ok) {
        const detail = body?.detail ?? body?.error ?? response.statusText ?? `HTTP ${response.status}`;
        const error = new Error(`Canonical visual generation was rejected: ${detail}`);
        error.code = downstreamCode(body, "CANONICAL_VISUAL_GENERATION_UNAVAILABLE");
        error.activityCategory = "reconciliation";
        error.httpStatus = response.status;
        error.retryable = downstreamRetryable(response, body);
        throw error;
      }
      if (!body || body.ok !== true || !body.result || typeof body.result !== "object") {
        const error = new Error("Asset Generator returned an invalid canonical root response");
        error.code = "CANONICAL_VISUAL_GENERATION_STATE_INVALID";
        error.retryable = true;
        throw error;
      }
      return body.result;
    },
  });
}

export function createThreadPresentationVisualBoundary({
  baseUrl,
  privateToken,
  fetchImpl = fetch,
} = {}) {
  const url = endpoint(baseUrl, "/internal/visual-publication/reconcile", "Thread Presentation URL");
  const token = nonEmpty("Fibre private token", privateToken);
  const request = bindingFetch(fetchImpl, "Thread Presentation");

  return Object.freeze({
    async reconcileAvailableEmbodiment({ threadId, embodiment, observedAt, activityContext = {}, regenerationKey = null } = {}) {
      const response = await request(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fibre-private-token": token,
        },
        body: JSON.stringify({ threadId, embodiment, observedAt, activityContext, regenerationKey }),
      });
      const body = await responseJson(response);
      if (!response.ok) {
        const detail = body?.detail ?? body?.error ?? response.statusText ?? `HTTP ${response.status}`;
        const error = new Error(`Thread Presentation could not reconcile visual identity: ${detail}`);
        error.code = downstreamCode(body, "PRESENTATION_VISUAL_PUBLICATION_UNAVAILABLE");
        error.activityCategory = "reconciliation";
        error.httpStatus = response.status;
        error.retryable = downstreamRetryable(response, body);
        throw error;
      }
      if (!body || body.ok !== true || !body.result || typeof body.result !== "object") {
        const error = new Error("Thread Presentation returned an invalid visual publication response");
        error.code = "PRESENTATION_VISUAL_PUBLICATION_STATE_INVALID";
        error.retryable = true;
        throw error;
      }
      return body.result;
    },
  });
}

export function createThreadPresentationPublisher({
  baseUrl,
  privateToken,
  fetchImpl = fetch,
} = {}) {
  const genesisUrl = endpoint(baseUrl, "/internal/genesis/presentations", "Thread Presentation URL");
  const presentUrl = endpoint(baseUrl, "/internal/current-present", "Thread Presentation URL");
  const token = nonEmpty("Fibre private token", privateToken);
  const request = bindingFetch(fetchImpl, "Thread Presentation");

  async function post(url, bodyValue, label, fallbackCode) {
    const response = await request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-fibre-private-token": token,
      },
      body: JSON.stringify(bodyValue),
    });
    const body = await responseJson(response);
    if (!response.ok) {
      const detail = body?.detail ?? body?.error ?? response.statusText ?? `HTTP ${response.status}`;
      const error = new Error(`Thread Presentation rejected ${label}: ${detail}`);
      error.code = downstreamCode(body, fallbackCode);
      error.activityCategory = "reconciliation";
      error.httpStatus = response.status;
      error.retryable = downstreamRetryable(response, body);
      throw error;
    }
    return body;
  }

  return Object.freeze({
    publishGenesisPresentation({ genesisId, publicationDigest, bundle }) {
      return post(
        genesisUrl,
        { genesisId, publicationDigest, bundle },
        "Genesis projection",
        "GENESIS_PRESENTATION_PUBLICATION_FAILED",
      );
    },
    reconcileIdentityProjection({ threadId, projection, projectedAt }) {
      const identityUrl = endpoint(
        baseUrl,
        `/internal/threads/${encodeURIComponent(threadId)}/identity-projection`,
        "Thread Presentation URL",
      );
      return post(
        identityUrl,
        { projection, projectedAt },
        "World identity projection",
        "PRESENTATION_IDENTITY_PROJECTION_FAILED",
      );
    },
    async publishCurrentPresent({ threadId, present }) {
      const body = await post(
        presentUrl,
        { threadId, present },
        "current present projection",
        "CURRENT_PRESENT_PUBLICATION_FAILED",
      );
      if (!body || body.ok !== true || !body.result || typeof body.result !== "object") {
        const error = new Error("Thread Presentation returned an invalid current present response");
        error.code = "CURRENT_PRESENT_PUBLICATION_STATE_INVALID";
        error.retryable = true;
        throw error;
      }
      return body.result;
    },
  });
}
