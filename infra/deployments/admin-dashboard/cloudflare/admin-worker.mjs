import { reverseGeoNamesPlace, searchGeoNamesPlaces } from "#integrations/geography/geonames.mjs";

import baseWorker, {
  authenticateAccessRequest,
  authorizeAdminPrincipal,
} from "./worker.mjs";
import { readAdminInfraMonitor, readCachedInfraHealth } from "./infra-monitor.mjs";
import { readAdminThreadPopulation, readAdminThreadPopulationThread } from "./thread-population.mjs";
import {
  combineAdminThreadIdentity,
  resolveAdminThreadIdentity,
  resolveAdminWorldThreadIdentity,
} from "./thread-identity.mjs";

export { FibreAdminInfraMonitor } from "./infra-monitor-do.mjs";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const THREAD_IDENTITY_ROUTE = /^\/api\/threads\/([^/]+)\/identity$/u;
const THREAD_OBSERVATORY_ROUTE = /^\/api\/threads\/([^/]+)\/observatory$/u;
const THREAD_JOURNAL_ROUTE = /^\/api\/threads\/([^/]+)\/journal$/u;
const THREAD_MEETING_ROUTE = /^\/api\/threads\/([^/]+)\/meet-threads$/u;
const THREAD_REPAIR_ROUTE = /^\/api\/threads\/([^/]+)\/repair$/u;
const THREAD_FID_REISSUE_ROUTE = /^\/api\/threads\/([^/]+)\/fid\/reissue$/u;
const FIN_VERIFY_ROUTE = "/api/fid/verify";
const THREAD_ASSET_ROUTE = /^\/api\/thread-assets\/([^/]+)$/u;
const THREAD_POPULATION_ROUTE = "/api/threads/population";
const THREAD_LABELS_ROUTE = "/api/threads/labels";
const THREAD_POPULATION_ENTRY_ROUTE = /^\/api\/threads\/([^/]+)\/population$/u;
const THREAD_BIRTH_ROUTE = "/api/threads/birth";
const THREAD_PENDING_BIRTHS_ROUTE = "/api/threads/births/pending";
const THREAD_BIRTHPLACES_ROUTE = "/api/threads/births/places";
const THREAD_BIRTH_PLACE_SEARCH_ROUTE = "/api/threads/births/place-search";
const INFRA_MONITOR_ROUTE = "/api/infra-monitor";
const ADMIN_LIVE_ROUTE = "/api/live";
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

export async function proxyAdminLive(request, env) {
  const namespace = env?.ADMIN_LIVE;
  if (!namespace?.getByName) throw new Error("ADMIN_LIVE binding is unavailable");
  try {
    const response = await namespace.getByName("admin").fetch(request);
    console.log(JSON.stringify({
      event:"admin-live-upgrade",
      status:response.status,
      upgraded:response.status === 101,
    }));
    return response;
  } catch (error) {
    console.error(JSON.stringify({
      event:"admin-live-upgrade-failed",
      message:error instanceof Error ? error.message : String(error),
    }));
    throw error;
  }
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

async function proxyThreadJournal(env, threadId) {
  const upstream = await serviceBinding(env, "WORLD_KERNEL").fetch(new Request(
    `https://world.internal/internal/threads/${encodeURIComponent(threadId)}/journal`,
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

async function proxyThreadMeeting(request, env, initiatorThreadId) {
  let input;
  try { input = await request.json(); }
  catch { return json(400, { error:"invalid_thread_meeting", detail:"meeting request must be JSON" }); }
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 0) {
    return json(400, {
      error:"invalid_thread_meeting",
      detail:"meeting request no longer selects counterparties; send an empty object",
    });
  }
  const upstream = await serviceBinding(env, "WORLD_KERNEL").fetch(new Request(
    "https://world.internal/internal/social-meeting",
    {
      method:"POST",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "x-fibre-private-token":privateToken(env),
      },
      body:JSON.stringify({ initiatorThreadId }),
    },
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

export async function proxyFinCardVerify(request, env) {
  const side = new URL(request.url).searchParams.get("side");
  if (side !== "front" && side !== "back") return json(400, { error:"invalid_fid_side" });

  const upstream = await serviceBinding(env, "FIBRE_IDENTITY_AUTHORITY").fetch(new Request(
    `https://fibre-identity-authority.internal/internal/fid/cards/verify?side=${encodeURIComponent(side)}`,
    {
      method:"POST",
      headers:{
        Accept:"application/json",
        "Content-Type":"image/png",
        "x-fibre-private-token":privateToken(env),
      },
      body:await request.arrayBuffer(),
    },
  ));
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok || payload === null) {
    return json(upstream.ok ? 502 : upstream.status, payload ?? { error:"fid_verify_invalid_response" });
  }
  return json(200, payload);
}

export async function proxyFidReissue(request, env, threadId) {
  let input;
  try { input = await request.json(); }
  catch { return json(400, { error:"invalid_fid_reissue", detail:"FID reissue request must be JSON" }); }
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).join(",") !== "idempotencyKey") {
    return json(400, { error:"invalid_fid_reissue", detail:"FID reissue request must contain exactly idempotencyKey" });
  }
  const idempotencyKey = id("idempotencyKey", input.idempotencyKey);
  let presentation;
  try { presentation = serviceBinding(env, "THREAD_PRESENTATION"); }
  catch {
    return json(503, {
      error:"fid_reissue_not_configured",
      detail:"Thread Presentation is not deployed in this environment.",
    });
  }
  const upstream = await presentation.fetch(new Request(
    "https://thread-presentation.internal/internal/fid/reconcile",
    {
      method:"POST",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "x-fibre-private-token":privateToken(env),
      },
      body:JSON.stringify({ threadId, idempotencyKey, mode:"reissue" }),
    },
  ));
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok || payload?.ok !== true || !payload.result) {
    return json(upstream.status, payload ?? { error:"fid_reissue_invalid_response" });
  }
  return json(upstream.status, payload.result);
}

function geoNamesUsername(env) {
  const value = typeof env?.GEONAMES_USERNAME === "string" ? env.GEONAMES_USERNAME.trim() : "";
  return value === "" ? null : value;
}

async function searchBirthPlaces(request, env) {
  const input = new URL(request.url).searchParams;
  const q = input.get("q")?.trim() ?? "";
  const lat = input.get("lat");
  const long = input.get("long");
  const reverse = lat !== null || long !== null;
  if ((q !== "" && reverse) || (q === "" && !reverse)) {
    return json(400, { error:"invalid_place_search", detail:"Provide either q or lat/long." });
  }

  const username = geoNamesUsername(env);
  if (username === null) {
    return json(503, { error:"place_search_not_configured", detail:"GeoNames place search is not configured." });
  }

  try {
    if (reverse) {
      const latitude = Number(lat);
      const longitude = Number(long);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return json(400, { error:"invalid_place_search", detail:"lat/long are invalid." });
      }
      const place = await reverseGeoNamesPlace({ lat:latitude, long:longitude, username });
      return json(200, { ok:true, places:place === null ? [] : [place] });
    }

    if (q.length < 2 || q.length > 256) return json(200, { ok:true, places:[] });
    const places = await searchGeoNamesPlaces({ query:q, username, maxRows:8 });
    return json(200, { ok:true, places });
  } catch {
    return json(502, { error:"place_search_unavailable", detail:"GeoNames place search failed." });
  }
}

async function proxyThreadBirth(request, env) {
  let input;
  try { input = await request.json(); }
  catch { return json(400, { error:"invalid_thread_birth", detail:"Thread birth request must be JSON" }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json(400, { error:"invalid_thread_birth", detail:"Thread birth request must be an object" });
  }
  const allowed = new Set(["location","sex","requestId","requestedAt"]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) return json(400, { error:"invalid_thread_birth", detail:`Thread birth request.${key} is not allowed` });
  }
  const requestId = typeof input.requestId === "string" && input.requestId.trim() !== ""
    ? input.requestId.trim()
    : `admin_birth_${crypto.randomUUID().replaceAll("-", "")}`;
  const requestedAt = typeof input.requestedAt === "string" && input.requestedAt.trim() !== ""
    ? input.requestedAt.trim()
    : new Date().toISOString();
  const location = input.location === null || input.location === undefined || input.location === ""
    ? null
    : input.location;
  if (location !== null && (!location || typeof location !== "object" || Array.isArray(location))) {
    return json(400, { error:"invalid_thread_birth", detail:"Thread birth request.location must be canonical geography or null" });
  }
  const sex = input.sex === null || input.sex === undefined || input.sex === ""
    ? null
    : input.sex;
  const upstream = await serviceBinding(env, "BIRTH_CENTER").fetch(new Request(
    "https://birth-center.internal/internal/births/initiate",
    {
      method:"POST",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "x-fibre-private-token":privateToken(env),
      },
      body:JSON.stringify({ requestId, requestedAt, location, sex }),
    },
  ));
  const payload = await upstream.json().catch(() => null);
  if (payload === null) return json(502, { error:"thread_birth_invalid_response" });
  return json(upstream.status, payload);
}

async function proxyBirthCenterGet(env, pathname) {
  const upstream = await serviceBinding(env, "BIRTH_CENTER").fetch(new Request(
    `https://birth-center.internal${pathname}`,
    {
      method:"GET",
      headers:{
        Accept:"application/json",
        "x-fibre-private-token":privateToken(env),
      },
    },
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

async function birthCenterStillborn(env) {
  const response = await serviceBinding(env, "BIRTH_CENTER").fetch(new Request(
    "https://birth-center.internal/internal/births/stillborn",
    {
      method:"GET",
      headers:{
        Accept:"application/json",
        "x-fibre-private-token":privateToken(env),
      },
    },
  ));
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  if (!Array.isArray(payload?.births)) throw new Error("Birth Center stillborn response is invalid");
  return payload.births;
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

async function threadRegistryEntries(env, threadIds) {
  const response = await serviceBinding(env, "WORLD_KERNEL").fetch(new Request(
    "https://world.internal/internal/thread-directory/entries",
    {
      method:"POST",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "x-fibre-private-token":privateToken(env),
      },
      body:JSON.stringify({ threadIds }),
    },
  ));
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error?.code ?? `HTTP ${response.status}`);
  if (!Array.isArray(payload?.threads)) throw new Error("World Thread Registry batch response is invalid");
  return payload.threads;
}

async function threadRegistryEntry(env, threadId) {
  const response = await serviceBinding(env, "WORLD_KERNEL").fetch(new Request(
    `https://world.internal/internal/thread-directory/entry/${encodeURIComponent(threadId)}`,
    { headers:{ Accept:"application/json", "x-fibre-private-token":privateToken(env) } },
  ));
  const payload = await response.json().catch(() => null);
  if (response.status === 404 && payload?.error?.code === "THREAD_NOT_FOUND") return null;
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error?.code ?? `HTTP ${response.status}`);
  if (payload?.thread?.threadId !== threadId) throw new Error("World Thread Registry response is invalid");
  return payload.thread;
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
    const journalMatch = THREAD_JOURNAL_ROUTE.exec(url.pathname);
    const meetingMatch = THREAD_MEETING_ROUTE.exec(url.pathname);
    const repairMatch = THREAD_REPAIR_ROUTE.exec(url.pathname);
    const fidReissueMatch = THREAD_FID_REISSUE_ROUTE.exec(url.pathname);
    const assetMatch = THREAD_ASSET_ROUTE.exec(url.pathname);
    const threadPopulation = url.pathname === THREAD_POPULATION_ROUTE;
    const threadLabels = url.pathname === THREAD_LABELS_ROUTE;
    const threadPopulationEntryMatch = THREAD_POPULATION_ENTRY_ROUTE.exec(url.pathname);
    const threadBirth = url.pathname === THREAD_BIRTH_ROUTE;
    const pendingBirths = url.pathname === THREAD_PENDING_BIRTHS_ROUTE;
    const birthplaces = url.pathname === THREAD_BIRTHPLACES_ROUTE;
    const birthPlaceSearch = url.pathname === THREAD_BIRTH_PLACE_SEARCH_ROUTE;
    const infraMonitor = url.pathname === INFRA_MONITOR_ROUTE;
    const adminLive = url.pathname === ADMIN_LIVE_ROUTE;
    const adminGet = request.method === "GET" && (identityMatch || observatoryMatch || journalMatch || repairMatch || assetMatch || threadPopulation || threadPopulationEntryMatch || pendingBirths || birthplaces || birthPlaceSearch || infraMonitor || adminLive);
    const finVerify = url.pathname === FIN_VERIFY_ROUTE;
    const adminPost = request.method === "POST" && (repairMatch || fidReissueMatch || meetingMatch || finVerify || threadBirth || infraMonitor || threadLabels);
    if (adminGet || adminPost) {
      const gate = await adminPrincipal(request, env);
      if (gate.response) {
        if (adminLive) {
          console.warn(JSON.stringify({
            event:"admin-live-auth-rejected",
            status:gate.response.status,
          }));
        }
        return gate.response;
      }
      try {
        if (adminLive) {
          if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
            return json(426, { error:"websocket_required" });
          }
          return proxyAdminLive(request, env);
        }
        if (infraMonitor) {
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const force = request.method === "POST" || url.searchParams.get("force") === "1";
          return json(200, await readAdminInfraMonitor({ env, environment, force }));
        }
        if (threadLabels) {
          let body;
          try { body = await request.json(); }
          catch { return json(400, { error:"invalid_thread_labels", detail:"threadIds must be JSON" }); }
          if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.threadIds)) {
            return json(400, { error:"invalid_thread_labels", detail:"threadIds must be an array" });
          }
          const threadIds = [...new Set(body.threadIds.map((value) => id("threadId", value)))];
          if (threadIds.length < 1 || threadIds.length > 64) {
            return json(400, { error:"invalid_thread_labels", detail:"threadIds must contain 1 through 64 IDs" });
          }
          const threads = await threadRegistryEntries(env, threadIds);
          return json(200, {
            contract:"fibre-admin-thread-labels-v0.1",
            labels:threads.map((thread) => ({
              threadId:thread.threadId,
              name:thread.displayName ?? null,
              birthLocation:thread.birthLocation ?? null,
              birthPlace:thread.birthPlace ?? null,
            })),
          });
        }
        if (threadBirth) return proxyThreadBirth(request, env);
        if (pendingBirths) return proxyBirthCenterGet(env, "/internal/births/pending");
        if (birthplaces) return proxyBirthCenterGet(env, "/internal/births/places");
        if (birthPlaceSearch) return searchBirthPlaces(request, env);
        if (threadPopulation) {
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const population = await readAdminThreadPopulation({
            activityLog:env.ACTIVITY_LOG,
            environment,
            readRegistry:(limit) => threadRegistry(env, limit),
            readStillborn:() => birthCenterStillborn(env),
          });
          return json(200, {
            contract:"fibre-admin-thread-population-v0.3",
            environment,
            queriedAt:new Date().toISOString(),
            ...population,
          });
        }
        if (threadPopulationEntryMatch) {
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const threadId = id("threadId", decodeURIComponent(threadPopulationEntryMatch[1]));
          const thread = await readAdminThreadPopulationThread({
            activityLog:env.ACTIVITY_LOG,
            environment,
            threadId,
            readRegistryEntry:(candidate) => threadRegistryEntry(env, candidate),
          });
          if (thread === null) return json(404, { error:"thread_not_found" });
          return json(200, {
            contract:"fibre-admin-thread-population-entry-v0.1",
            environment,
            queriedAt:new Date().toISOString(),
            thread,
          });
        }
        if (finVerify) return proxyFinCardVerify(request, env);
        if (fidReissueMatch) {
          const threadId = id("threadId", decodeURIComponent(fidReissueMatch[1]));
          return proxyFidReissue(request, env, threadId);
        }
        if (repairMatch) {
          const threadId = id("threadId", decodeURIComponent(repairMatch[1]));
          return proxyThreadRepair(request, env, threadId);
        }
        if (meetingMatch) {
          const threadId = id("threadId", decodeURIComponent(meetingMatch[1]));
          return proxyThreadMeeting(request, env, threadId);
        }
        if (journalMatch) {
          const threadId = id("threadId", decodeURIComponent(journalMatch[1]));
          return proxyThreadJournal(env, threadId);
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
        if (adminLive) {
          console.error(JSON.stringify({
            event:"admin-live-request-failed",
            message:error instanceof Error ? error.message : String(error),
          }));
          return json(503, { error:"admin_live_unavailable", detail:error.message });
        }
        if (infraMonitor) return json(503, { error:"infra_monitor_unavailable", detail:error.message });
        if (threadLabels) return json(error instanceof TypeError ? 400 : 503, { error:"thread_labels_unavailable", detail:error.message });
        if (threadBirth) return json(error instanceof TypeError ? 400 : 503, { error:"thread_birth_unavailable", detail:error.message });
        if (pendingBirths || birthplaces) return json(503, { error:"thread_birth_data_unavailable", detail:error.message });
        if (threadPopulation || threadPopulationEntryMatch) return json(503, { error:"thread_population_unavailable", detail:error.message });
        if (finVerify) return json(error instanceof TypeError ? 400 : 503, { error:"fid_verify_unavailable", detail:error.message });
        if (fidReissueMatch) return json(error instanceof TypeError ? 400 : 503, { error:"fid_reissue_unavailable", detail:error.message });
        return json(error instanceof TypeError ? 400 : 503, {
          error: error instanceof TypeError ? "invalid_thread_resource" : "thread_identity_unavailable",
          detail: error.message,
        });
      }
    }
    return baseWorker.fetch(request, env, ctx);
  },
};
