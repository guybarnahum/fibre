function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function serviceUrl(baseUrl, pathname) {
  const url = new URL(nonEmpty("Fibre Identity Authority URL", baseUrl));
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

async function responseJson(response, label) {
  const body = await response.json().catch(() => null);
  if (body === null) throw new Error(`${label} returned invalid JSON`);
  return body;
}

function rejected(response, body, fallbackCode) {
  const detail = body?.error?.detail ?? body?.detail ?? body?.error?.code ?? body?.error ?? `HTTP ${response.status}`;
  const error = new Error(`Fibre Identity Authority rejected request: ${detail}`);
  error.code = body?.error?.code ?? fallbackCode;
  error.retryable = response.status === 429 || response.status >= 500;
  error.activityCategory = "reconciliation";
  return error;
}

export function createFidAuthorityBoundary({
  baseUrl,
  privateToken,
  fetchImpl = fetch,
} = {}) {
  const token = nonEmpty("Fibre private token", privateToken);
  if (typeof fetchImpl !== "function") throw new TypeError("Fibre Identity Authority fetch implementation is required");

  async function getActive(threadId) {
    const id = nonEmpty("threadId", threadId);
    const response = await fetchImpl(
      serviceUrl(baseUrl, `/internal/fid/threads/${encodeURIComponent(id)}/active`),
      { headers:{ Accept:"application/json", "x-fibre-private-token":token } },
    );
    if (response.status === 404) return null;
    const body = await responseJson(response, "FID active lookup");
    if (!response.ok) throw rejected(response, body, "FID_ACTIVE_LOOKUP_FAILED");
    if (!body.active || body.active.threadId !== id) throw new Error("Fibre Identity Authority returned an invalid active credential");
    return body.active;
  }

  return Object.freeze({
    getActive,
    async cut({ threadId, idempotencyKey } = {}) {
      const id = nonEmpty("threadId", threadId);
      const key = nonEmpty("FID cut idempotencyKey", idempotencyKey);
      const response = await fetchImpl(
        serviceUrl(baseUrl, "/internal/fid/cards/reissue"),
        {
          method:"POST",
          headers:{
            Accept:"application/json",
            "Content-Type":"application/json",
            "x-fibre-private-token":token,
          },
          body:JSON.stringify({ threadId:id, idempotencyKey:key }),
        },
      );
      const result = await responseJson(response, "FID cut");
      if (!response.ok) throw rejected(response, result, "FID_CUT_FAILED");
      if (!result || typeof result !== "object" || typeof result.state !== "string") {
        throw new Error("Fibre Identity Authority returned an invalid cut result");
      }
      const active = result.state === "active" ? await getActive(id) : null;
      if (result.state === "active" && active === null) {
        throw new Error("Fibre Identity Authority activated a credential that cannot be resolved");
      }
      return Object.freeze({ result, active });
    },
  });
}
