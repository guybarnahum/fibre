export const STATUS_PAGE_VERSION = "fibre-status-page-v0.1";
const DEFAULT_BINDING_PROBE_TIMEOUT_MS = 2500;
const DEFAULT_VIEWER_PROBE_TIMEOUT_MS = 3000;
const MAX_PROBE_TIMEOUT_MS = 30000;
const COMPONENTS = Object.freeze([
  { key:"birth", name:"Birth", description:"Identity and Genesis admission", binding:"BIRTH_CENTER", expected:"birth-center" },
  { key:"world", name:"World", description:"Authoritative Thread runtime", binding:"WORLD_KERNEL", expected:"world-kernel" },
  { key:"presentation", name:"Thread presentation", description:"Public Thread projection and delivery", binding:"THREAD_PRESENTATION", expected:"thread-presentation" },
  { key:"media", name:"Media generation", description:"Official generated media execution", binding:"ASSET_GENERATOR", expected:"asset-generator" },
]);
function json(status, payload, cache = "public, max-age=15, stale-while-revalidate=30") { return new Response(JSON.stringify(payload), { status, headers:{ "Content-Type":"application/json; charset=utf-8", "Cache-Control":cache, "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer" } }); }
function probeTimeout(name, value, fallback) { const timeout = value ?? fallback; if (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_PROBE_TIMEOUT_MS) throw new TypeError(`${name} must be an integer between 1 and ${MAX_PROBE_TIMEOUT_MS}`); return timeout; }
async function probeBinding(env, component, timeoutMs) {
  const binding = env[component.binding];
  if (!binding?.fetch) return { key:component.key, name:component.name, description:component.description, status:"outage" };
  try {
    const response = await binding.fetch(new Request("https://fibre.internal/healthz", { headers:{ Accept:"application/json" }, signal:AbortSignal.timeout(timeoutMs) }));
    const payload = await response.json();
    const status = response.ok && payload?.ok === true && payload?.service === component.expected ? "operational" : "degraded";
    return { key:component.key, name:component.name, description:component.description, status };
  } catch { return { key:component.key, name:component.name, description:component.description, status:"outage" }; }
}
async function probeViewer(env, fetchImpl, timeoutMs) {
  try {
    const origin = new URL(env.VIEWER_ORIGIN);
    const response = await fetchImpl(origin, { redirect:"follow", signal:AbortSignal.timeout(timeoutMs) });
    return { key:"web", name:"Website", description:"insidefibre.com public experience", status:response.ok ? "operational" : "degraded" };
  } catch { return { key:"web", name:"Website", description:"insidefibre.com public experience", status:"outage" }; }
}
function overall(components) { const outages = components.filter((item) => item.status === "outage").length; const degraded = components.some((item) => item.status !== "operational"); if (outages >= 2) return "outage"; if (degraded) return "degraded"; return "operational"; }
export async function currentPublicStatus(env, { fetchImpl = globalThis.fetch, now = () => new Date().toISOString(), bindingTimeoutMs, viewerTimeoutMs } = {}) {
  const bindingTimeout = probeTimeout("bindingTimeoutMs", bindingTimeoutMs, DEFAULT_BINDING_PROBE_TIMEOUT_MS);
  const viewerTimeout = probeTimeout("viewerTimeoutMs", viewerTimeoutMs, DEFAULT_VIEWER_PROBE_TIMEOUT_MS);
  const checks = await Promise.all([probeViewer(env, fetchImpl, viewerTimeout), ...COMPONENTS.map((component) => probeBinding(env, component, bindingTimeout))]);
  return Object.freeze({ contract:STATUS_PAGE_VERSION, environment:env.FIBRE_ENVIRONMENT ?? "unknown", checkedAt:now(), status:overall(checks), components:Object.freeze(checks.map(Object.freeze)) });
}
function secureAsset(response) { const headers = new Headers(response.headers); headers.set("X-Content-Type-Options","nosniff"); headers.set("Referrer-Policy","no-referrer"); headers.set("X-Frame-Options","DENY"); headers.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"); return new Response(response.body,{status:response.status,statusText:response.statusText,headers}); }
export function createStatusPageWorker({ statusResolver = currentPublicStatus } = {}) { return Object.freeze({ async fetch(request, env) { const url = new URL(request.url); if (request.method === "GET" && url.pathname === "/healthz") return json(200,{ok:true,service:"status-page",version:STATUS_PAGE_VERSION},"no-store"); if (request.method === "GET" && url.pathname === "/api/status") { try { return json(200,await statusResolver(env)); } catch { return json(503,{error:"status_unavailable"},"no-store"); } } if (url.pathname.startsWith("/api/")) return json(404,{error:"not_found"},"no-store"); if (!env.ASSETS?.fetch) return json(503,{error:"assets_unavailable"},"no-store"); return secureAsset(await env.ASSETS.fetch(request)); } }); }
export default createStatusPageWorker();
