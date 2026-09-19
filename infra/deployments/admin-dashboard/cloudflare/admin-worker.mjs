import baseWorker, {
  authenticateAccessRequest,
  authorizeAdminPrincipal,
} from "./worker.mjs";
import { readAdminInfraMonitor, readCachedInfraHealth } from "./infra-monitor.mjs";
import { readAdminThreadPopulation } from "./thread-population.mjs";
import {
  combineAdminThreadIdentity,
  resolveAdminThreadIdentity,
  resolveAdminWorldThreadIdentity,
} from "./thread-identity.mjs";

export { FibreAdminInfraMonitor } from "./infra-monitor-do.mjs";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const THREAD_IDENTITY_ROUTE = /^\/api\/threads\/([^/]+)\/identity$/u;
const THREAD_OBSERVATORY_ROUTE = /^\/api\/threads\/([^/]+)\/observatory$/u;
const THREAD_REPAIR_ROUTE = /^\/api\/threads\/([^/]+)\/repair$/u;
const THREAD_ASSET_ROUTE = /^\/api\/thread-assets\/([^/]+)$/u;
const THREAD_POPULATION_ROUTE = "/api/threads/population";
const INFRA_MONITOR_ROUTE = "/api/infra-monitor";
const INFRA_HEALTH_ROUTE = "/internal/infra-health";

function json(status, payload, cacheControl = "no-store") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function id(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} must be a Fibre identifier`);
  return value;
}

async function adminPrincipal(request, env) {
  let principal = null;
  try { principal = await authenticateAccessRequest(request, env); } catch {}
  if (!principal) return { response: json(403, { error: "access_required" }) };
  try {
    if (!await authorizeAdminPrincipal(env, principal)) return { response: json(403, { error: "admin_required" }) };
  } catch {
    return { response: json(503, { error: "admin_authorization_unavailable" }) };
  }
  return { response: null };
}

function serviceBinding(env, name) {
  const binding = env?.[name];
  if (!binding?.fetch) throw new Error(`${name} binding is unavailable`);
  return binding;
}

function bindingFetch(env, name) {
  const binding = serviceBinding(env, name);
  return (input, init) => binding.fetch(new Request(input, init));
}

function presentationBinding(env) {
  return serviceBinding(env, "THREAD_PRESENTATION");
}

function privateToken(env) {
  const value = typeof env?.FIBRE_PRIVATE_TOKEN === "string" ? env.FIBRE_PRIVATE_TOKEN.trim() : "";
  if (value.length < 16) throw new Error("Fibre private service token is unavailable");
  return value;
}

function adminIdentity(identity) {
  return Object.freeze({
    ...identity,
    assets: Object.freeze((identity.assets ?? []).map((asset) => Object.freeze({
      ...asset,
      url: asset.source === "current_public_presentation"
        ? `/api/thread-assets/${encodeURIComponent(asset.objectRef)}`
        : null,
      deliveryStatus: asset.source === "current_public_presentation" ? "published" : "world_only",
    }))),
  });
}

async function proxyAsset(request, env, objectRef) {
  const upstream = await presentationBinding(env).fetch(new Request(
    `https://thread-presentation.internal/api/assets/${encodeURIComponent(objectRef)}`,
    {
      method: "GET",
      headers: { Accept: request.headers.get("Accept") ?? "*/*" },
    },
  ));
  const headers = new Headers(upstream.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.delete("Access-Control-Allow-Origin");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function proxyThreadObservatory(env, threadId) {
  const upstream = await serviceBinding(env, "WORLD_KERNEL").fetch(new Request(
    `https://world.internal/internal/threads/${encodeURIComponent(threadId)}/observatory`,
    { headers:{ Accept:"application/json", "x-fibre-private-token":privateToken(env) } },
  ));
  const payload = await upstream.text();
  return new Response(payload, {
    status:upstream.status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"no-referrer",
    },
  });
}

async function proxyThreadRepair(request, env, threadId) {
  let token;
  try { token = privateToken(env); }
  catch { return json(503, { error:"thread_repair_not_configured" }); }
  const init = {
    method:request.method,
    headers:{
      Accept:"application/json",
      "x-fibre-private-token":token,
      ...(request.method === "POST" ? { "content-type":"application/json" } : {}),
    },
  };
  if (request.method === "POST") init.body = await request.text();
  const upstream = await serviceBinding(env, "WORLD_KERNEL").fetch(new Request(
    `https://world.internal/internal/threads/${encodeURIComponent(threadId)}/repair`,
    init,
  ));
  const payload = await upstream.text();
  return new Response(payload, {
    status:upstream.status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"no-referrer",
    },
  });
}

async function threadRegistry(env, limit) {
  const response = await serviceBinding(env, "WORLD_KERNEL").fetch(new Request(
    `https://world.internal/internal/thread-directory/search?limit=${encodeURIComponent(String(limit))}`,
    { headers:{ Accept:"application/json", "x-fibre-private-token":privateToken(env) } },
  ));
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error?.code ?? `HTTP ${response.status}`);
  if (!Array.isArray(payload?.threads)) throw new Error("World Thread Registry response is invalid");
  return payload.threads;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === INFRA_HEALTH_ROUTE) {
      try {
        const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
        return json(200, await readCachedInfraHealth({ env, environment }), "private, max-age=60");
      } catch (error) {
        return json(503, { error:"infra_health_unavailable", detail:error.message });
      }
    }

    const identityMatch = THREAD_IDENTITY_ROUTE.exec(url.pathname);
    const observatoryMatch = THREAD_OBSERVATORY_ROUTE.exec(url.pathname);
    const repairMatch = THREAD_REPAIR_ROUTE.exec(url.pathname);
    const assetMatch = THREAD_ASSET_ROUTE.exec(url.pathname);
    const threadPopulation = url.pathname === THREAD_POPULATION_ROUTE;
    const infraMonitor = url.pathname === INFRA_MONITOR_ROUTE;
    const adminGet = request.method === "GET" && (identityMatch || observatoryMatch || repairMatch || assetMatch || threadPopulation || infraMonitor);
    const adminPost = request.method === "POST" && (repairMatch || infraMonitor);
    if (adminGet || adminPost) {
      const gate = await adminPrincipal(request, env);
      if (gate.response) return gate.response;
      try {
        if (infraMonitor) {
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const force = request.method === "POST" || url.searchParams.get("force") === "1";
          return json(200, await readAdminInfraMonitor({ env, environment, force }));
        }
        if (threadPopulation) {
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const population = await readAdminThreadPopulation({
            activityLog:env.ACTIVITY_LOG,
            environment,
            readRegistry:(limit) => threadRegistry(env, limit),
          });
          return json(200, {
            contract:"fibre-admin-thread-population-v0.2",
            environment,
            queriedAt:new Date().toISOString(),
            ...population,
          });
        }
        if (repairMatch) {
          const threadId = id("threadId", decodeURIComponent(repairMatch[1]));
          return proxyThreadRepair(request, env, threadId);
        }
        if (observatoryMatch) {
          const threadId = id("threadId", decodeURIComponent(observatoryMatch[1]));
          return proxyThreadObservatory(env, threadId);
        }
        if (identityMatch) {
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const threadId = id("threadId", decodeURIComponent(identityMatch[1]));
          const world = await resolveAdminWorldThreadIdentity({
            threadId,
            fetchImpl: bindingFetch(env, "WORLD_KERNEL"),
          });
          if (world === null) {
            return json(404, {
              error:"thread_not_found",
              existence:"not_admitted",
              detail:"Pre-birth candidate · this identifier was never admitted to World as a Thread",
            });
          }
          const presentation = await resolveAdminThreadIdentity({
            environment,
            threadId,
            fetchImpl: bindingFetch(env, "THREAD_PRESENTATION"),
          });
          const identity = combineAdminThreadIdentity({ world, presentation });
          return json(200, {
            contract: "fibre-admin-thread-identity-v0.3",
            environment,
            resolvedAt: new Date().toISOString(),
            identity: adminIdentity(identity),
          });
        }
        return proxyAsset(request, env, id("objectRef", decodeURIComponent(assetMatch[1])));
      } catch (error) {
        if (infraMonitor) return json(503, { error:"infra_monitor_unavailable", detail:error.message });
        if (threadPopulation) return json(503, { error:"thread_population_unavailable", detail:error.message });
        return json(error instanceof TypeError ? 400 : 503, {
          error: error instanceof TypeError ? "invalid_thread_resource" : "thread_identity_unavailable",
          detail: error.message,
        });
      }
    }
    return baseWorker.fetch(request, env, ctx);
  },
};
