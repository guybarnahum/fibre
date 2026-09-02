const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const PUBLIC_DNS_JSON_ENDPOINT = "https://dns.google/resolve";

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

function normalizeNameserver(value) {
  return nonEmpty("nameserver", value).replace(/\.$/u, "").toLowerCase();
}

function domainRecord(record, status) {
  return Object.freeze({
    status,
    hostname: nonEmpty("Worker custom domain hostname", record?.hostname),
    service: nonEmpty("Worker custom domain service", record?.service),
    id: record?.id ?? null,
    certId: record?.cert_id ?? null,
    zoneId: record?.zone_id ?? null,
    zoneName: nonEmpty("Worker custom domain zone name", record?.zone_name),
    environment: record?.environment ?? null,
  });
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
    async assertPublicDelegation({ zoneName }) {
      const zone = nonEmpty("Worker custom domain zone name", zoneName).toLowerCase();
      const url = new URL(PUBLIC_DNS_JSON_ENDPOINT);
      url.searchParams.set("name", zone);
      url.searchParams.set("type", "NS");
      const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
      let payload = null;
      try { payload = await response.json(); }
      catch { throw new Error(`Public DNS delegation lookup for ${zone} returned non-JSON HTTP ${response.status}`); }
      if (!response.ok) throw new Error(`Public DNS delegation lookup for ${zone} failed with HTTP ${response.status}`);
      const nameservers = (payload?.Answer ?? [])
        .filter((answer) => answer?.type === 2 && typeof answer?.data === "string")
        .map((answer) => normalizeNameserver(answer.data));
      if (payload?.Status !== 0 || nameservers.length === 0) {
        throw new Error(`Public DNS for ${zone} has no authoritative nameserver delegation. Configure the registrar to use the nameservers assigned by Cloudflare, then rerun cloud deployment.`);
      }
      const cloudflareDelegated = nameservers.every((name) => name.endsWith(".ns.cloudflare.com"));
      if (!cloudflareDelegated) {
        throw new Error(`Public DNS for ${zone} is not delegated to Cloudflare nameservers (current: ${nameservers.join(", ")}). Update the registrar nameservers to the pair assigned by Cloudflare, then rerun cloud deployment.`);
      }
      return Object.freeze({ zoneName: zone, nameservers: Object.freeze(nameservers) });
    },
  });
}

export async function ensureCloudflareWorkerDomain({ client, hostname, service } = {}) {
  if (!client?.listDomains || !client?.attachDomain || !client?.assertPublicDelegation) {
    throw new TypeError("Cloudflare Workers Domain client with public delegation verification is required");
  }
  const expectedHostname = nonEmpty("Worker custom domain hostname", hostname);
  const expectedService = nonEmpty("Worker custom domain service", service);
  const matches = (await client.listDomains({ hostname: expectedHostname }))
    .filter((item) => item?.hostname === expectedHostname);
  if (matches.length > 1) throw new Error(`Cloudflare custom domain ${expectedHostname} resolved to multiple Worker domain records`);
  let resolved;
  if (matches.length === 1) {
    if (matches[0].service !== expectedService) {
      throw new Error(`Cloudflare custom domain ${expectedHostname} is already attached to ${String(matches[0].service)}; expected ${expectedService}`);
    }
    resolved = domainRecord(matches[0], "existing");
  } else {
    const attached = await client.attachDomain({ hostname: expectedHostname, service: expectedService });
    if (attached?.hostname !== expectedHostname || attached?.service !== expectedService) {
      throw new Error(`Cloudflare custom domain ${expectedHostname} did not attach to expected Worker ${expectedService}`);
    }
    resolved = domainRecord(attached, "attached");
  }
  const delegation = await client.assertPublicDelegation({ zoneName: resolved.zoneName });
  return Object.freeze({ ...resolved, delegation });
}
