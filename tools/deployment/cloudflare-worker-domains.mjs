const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function apiError(operation, response, payload) {
  const details = Array.isArray(payload?.errors)
    ? payload.errors.map((item) => [item?.message, item?.code ? `code=${item.code}` : null].filter(Boolean).join(" ")).filter(Boolean)
    : [];
  const suffix = details.length > 0 ? `: ${details.join("; ")}` : `: HTTP ${response.status}`;
  return new Error(`Cloudflare Workers Domain ${operation} failed${suffix}`);
}

async function responseJson(operation, response) {
  let payload = null;
  try { payload = await response.json(); }
  catch { throw new Error(`Cloudflare Workers Domain ${operation} returned non-JSON HTTP ${response.status}`); }
  if (!response.ok || payload?.success !== true) throw apiError(operation, response, payload);
  return payload;
}

export function createCloudflareWorkerDomainClient({ accountId, apiToken, fetchImpl = globalThis.fetch } = {}) {
  const account = nonEmpty("Cloudflare account id", accountId);
  const token = nonEmpty("Cloudflare API token", apiToken);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  const endpoint = `${CLOUDFLARE_API_BASE}/accounts/${encodeURIComponent(account)}/workers/domains`;
  const headers = Object.freeze({ Authorization: `Bearer ${token}`, Accept: "application/json" });

  return Object.freeze({
    async listDomains({ hostname }) {
      const expected = nonEmpty("Worker custom domain hostname", hostname);
      const url = new URL(endpoint);
      url.searchParams.set("hostname", expected);
      const payload = await responseJson("list", await fetchImpl(url, { headers }));
      return Array.isArray(payload.result) ? payload.result : [];
    },
    async attachDomain({ hostname, service }) {
      const expectedHostname = nonEmpty("Worker custom domain hostname", hostname);
      const expectedService = nonEmpty("Worker custom domain service", service);
      const payload = await responseJson("attach", await fetchImpl(endpoint, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: expectedHostname, service: expectedService }),
      }));
      return payload.result;
    },
  });
}

export async function ensureCloudflareWorkerDomain({ client, hostname, service } = {}) {
  if (!client?.listDomains || !client?.attachDomain) throw new TypeError("Cloudflare Workers Domain client is required");
  const expectedHostname = nonEmpty("Worker custom domain hostname", hostname);
  const expectedService = nonEmpty("Worker custom domain service", service);
  const matches = (await client.listDomains({ hostname: expectedHostname }))
    .filter((item) => item?.hostname === expectedHostname);
  if (matches.length > 1) throw new Error(`Cloudflare custom domain ${expectedHostname} resolved to multiple Worker domain records`);
  if (matches.length === 1) {
    if (matches[0].service !== expectedService) {
      throw new Error(`Cloudflare custom domain ${expectedHostname} is already attached to ${String(matches[0].service)}; expected ${expectedService}`);
    }
    return Object.freeze({ status: "existing", hostname: expectedHostname, service: expectedService, id: matches[0].id ?? null });
  }
  const attached = await client.attachDomain({ hostname: expectedHostname, service: expectedService });
  if (attached?.hostname !== expectedHostname || attached?.service !== expectedService) {
    throw new Error(`Cloudflare custom domain ${expectedHostname} did not attach to expected Worker ${expectedService}`);
  }
  return Object.freeze({ status: "attached", hostname: expectedHostname, service: expectedService, id: attached.id ?? null });
}
