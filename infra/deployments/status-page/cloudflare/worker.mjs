export const STATUS_PAGE_VERSION = "fibre-status-page-v0.3";
const DEFAULT_BINDING_PROBE_TIMEOUT_MS = 2500;
const DEFAULT_VIEWER_PROBE_TIMEOUT_MS = 3000;
const MAX_PROBE_TIMEOUT_MS = 30000;
// What a visitor can rely on, not how Fibre is built: whether Threads are
// living, whether new ones can be born, and whether the website is there.
// Each is judged by the services it rests on: whether they answer, and
// whether infrastructure health found a real failure there (never a usage
// threshold). Which service, resource or provider failed stays private.
const EXPERIENCES = Object.freeze([
  Object.freeze({ key:"life", name:"Thread life", description:"Threads living their days: meeting, talking, reading and thinking",
    probes:[{ binding:"WORLD_KERNEL", expected:"world-kernel" }], services:["world-kernel", "account"], failed:"outage",
    summary:{ operational:"Threads are living their days.", degraded:"Thread life is running slowly or only in part.", outage:"Thread life is paused." } }),
  Object.freeze({ key:"birth", name:"Births", description:"New Threads being born into the World",
    probes:[{ binding:"BIRTH_CENTER", expected:"birth-center" }], services:["birth-center"], failed:"outage",
    summary:{ operational:"New Threads can be born.", degraded:"Births may be delayed.", outage:"Births are paused." } }),
  Object.freeze({ key:"web", name:"insidefibre.com", description:"Following Threads, their stories and portraits", viewer:true,
    probes:[{ binding:"THREAD_PRESENTATION", expected:"thread-presentation" }, { binding:"ASSET_GENERATOR", expected:"asset-generator", ancillary:true }],
    services:["thread-presentation", "asset-generator"], failed:"degraded",
    summary:{ operational:"The website and Thread pages are up.", degraded:"Some pages or new portraits may be slow or missing.", outage:"The website is unavailable." } }),
]);
const RANK = Object.freeze({ operational:0, degraded:1, outage:2 });
const worst = (states) => states.reduce((a, b) => RANK[b] > RANK[a] ? b : a, "operational");
function json(status, payload, cache = "public, max-age=15, stale-while-revalidate=30") { return new Response(JSON.stringify(payload), { status, headers:{ "Content-Type":"application/json; charset=utf-8", "Cache-Control":cache, "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer" } }); }
function probeTimeout(name, value, fallback) { const timeout = value ?? fallback; if (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_PROBE_TIMEOUT_MS) throw new TypeError(`${name} must be an integer between 1 and ${MAX_PROBE_TIMEOUT_MS}`); return timeout; }
async function withProbeTimeout(operation, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("probe_timeout");
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try { return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), timeout]); }
  finally { clearTimeout(timer); }
}
// Whether a service answers as itself: an outage when it cannot be reached,
// degraded when it answers wrongly. A service that only adds to an
// experience (new portraits) degrades it at most.
async function probeService(env, probe, timeoutMs) {
  const binding = env[probe.binding];
  const down = probe.ancillary ? "degraded" : "outage";
  if (!binding?.fetch) return down;
  try {
    const response = await withProbeTimeout((signal) => binding.fetch(new Request("https://fibre.internal/healthz", { headers:{ Accept:"application/json" }, signal })), timeoutMs);
    const payload = await response.json();
    return response.ok && payload?.ok === true && payload?.service === probe.expected ? "operational" : "degraded";
  } catch { return down; }
}
// Real failures by service from infrastructure health. When that health is
// itself unavailable or stale, it proves nothing either way and is left out.
async function readFailures(env, timeoutMs) {
  const binding = env.ADMIN_DASHBOARD;
  if (!binding?.fetch) return {};
  try {
    const response = await withProbeTimeout((signal) => binding.fetch(new Request("https://admin.internal/internal/infra-health", { headers:{ Accept:"application/json" }, signal })), timeoutMs);
    const payload = await response.json();
    if (!response.ok || payload?.stale === true || typeof payload?.failures !== "object" || payload.failures === null) return {};
    return payload.failures;
  } catch { return {}; }
}
async function probeViewer(env, fetchImpl, timeoutMs) {
  try {
    const response = await withProbeTimeout((signal) => fetchImpl(new URL(env.VIEWER_ORIGIN), { redirect:"follow", signal }), timeoutMs);
    return response.ok ? "operational" : "degraded";
  } catch { return "outage"; }
}
function judged(experience, states, failures) {
  const failed = experience.services.map((service) => failures[service])
    .map((level) => level === "critical" ? experience.failed : level === "elevated" ? "degraded" : "operational");
  const status = worst([...states, ...failed]);
  return Object.freeze({ key:experience.key, name:experience.name, description:experience.description,
    status, summary:experience.summary[status] });
}
// Fibre is out when Thread life is, or when two experiences are.
function overall(experiences) {
  const out = experiences.filter((item) => item.status === "outage");
  if (out.some((item) => item.key === "life") || out.length >= 2) return "outage";
  return experiences.some((item) => item.status !== "operational") ? "degraded" : "operational";
}
export async function currentPublicStatus(env, { fetchImpl = globalThis.fetch, now = () => new Date().toISOString(), bindingTimeoutMs, viewerTimeoutMs } = {}) {
  const bindingTimeout = probeTimeout("bindingTimeoutMs", bindingTimeoutMs, DEFAULT_BINDING_PROBE_TIMEOUT_MS);
  const viewerTimeout = probeTimeout("viewerTimeoutMs", viewerTimeoutMs, DEFAULT_VIEWER_PROBE_TIMEOUT_MS);
  const [failures, viewer, ...probed] = await Promise.all([readFailures(env, bindingTimeout), probeViewer(env, fetchImpl, viewerTimeout),
    ...EXPERIENCES.map((experience) => Promise.all(experience.probes.map((probe) => probeService(env, probe, bindingTimeout))))]);
  const experiences = EXPERIENCES.map((experience, index) =>
    judged(experience, [...probed[index], ...(experience.viewer ? [viewer] : [])], failures));
  return Object.freeze({ contract:STATUS_PAGE_VERSION, environment:env.FIBRE_ENVIRONMENT ?? "unknown", checkedAt:now(),
    status:overall(experiences), components:Object.freeze(experiences) });
}
function secureAsset(response) { const headers = new Headers(response.headers); headers.set("X-Content-Type-Options","nosniff"); headers.set("Referrer-Policy","no-referrer"); headers.set("X-Frame-Options","DENY"); headers.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"); return new Response(response.body,{status:response.status,statusText:response.statusText,headers}); }
export function createStatusPageWorker({ statusResolver = currentPublicStatus } = {}) { return Object.freeze({ async fetch(request, env) { const url = new URL(request.url); if (request.method === "GET" && url.pathname === "/healthz") { if(url.searchParams.get("service")==="admin-dashboard"){ const response=await env.ADMIN_DASHBOARD.fetch(new Request("https://fibre.internal/healthz")); if(!response.ok)return json(503,{error:"admin_revision_unavailable"},"no-store"); const health=await response.json(); return json(200,{deploymentGitSha:health.deploymentGitSha??null},"no-store"); } return json(200,{ok:true,service:"status-page",version:STATUS_PAGE_VERSION,deploymentGitSha:env.FIBRE_DEPLOYMENT_GIT_SHA??null},"no-store"); } if (request.method === "GET" && url.pathname === "/api/status") { try { return json(200,await statusResolver(env)); } catch { return json(503,{error:"status_unavailable"},"no-store"); } } if (url.pathname.startsWith("/api/")) return json(404,{error:"not_found"},"no-store"); if (!env.ASSETS?.fetch) return json(503,{error:"assets_unavailable"},"no-store"); return secureAsset(await env.ASSETS.fetch(request)); } }); }
export default createStatusPageWorker();
