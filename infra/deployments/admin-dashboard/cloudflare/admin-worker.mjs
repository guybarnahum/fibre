import baseWorker, {
  authenticateAccessRequest,
  authorizeAdminPrincipal,
} from "./worker.mjs";
import { resolveAdminThreadIdentity } from "./thread-identity.mjs";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const THREAD_IDENTITY_ROUTE = /^\/api\/threads\/([^/]+)\/identity$/u;
const THREAD_ASSET_ROUTE = /^\/api\/thread-assets\/([^/]+)$/u;

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
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

function presentationBinding(env) {
  if (!env.THREAD_PRESENTATION?.fetch) throw new Error("THREAD_PRESENTATION binding is unavailable");
  return env.THREAD_PRESENTATION;
}

function presentationFetch(env) {
  const binding = presentationBinding(env);
  return (input, init) => binding.fetch(new Request(input, init));
}

function adminIdentity(identity) {
  return Object.freeze({
    ...identity,
    assets: Object.freeze((identity.assets ?? []).map((asset) => Object.freeze({
      ...asset,
      url: `/api/thread-assets/${encodeURIComponent(asset.objectRef)}`,
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const identityMatch = THREAD_IDENTITY_ROUTE.exec(url.pathname);
    const assetMatch = THREAD_ASSET_ROUTE.exec(url.pathname);
    if (request.method === "GET" && (identityMatch || assetMatch)) {
      const gate = await adminPrincipal(request, env);
      if (gate.response) return gate.response;
      try {
        if (identityMatch) {
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const threadId = id("threadId", decodeURIComponent(identityMatch[1]));
          const identity = await resolveAdminThreadIdentity({
            environment,
            threadId,
            fetchImpl: presentationFetch(env),
          });
          if (identity === null) return json(404, { error: "thread_not_found" });
          return json(200, {
            contract: "fibre-admin-thread-identity-v0.2",
            environment,
            resolvedAt: new Date().toISOString(),
            identity: adminIdentity(identity),
          });
        }
        return proxyAsset(request, env, id("objectRef", decodeURIComponent(assetMatch[1])));
      } catch (error) {
        return json(error instanceof TypeError ? 400 : 503, {
          error: error instanceof TypeError ? "invalid_thread_resource" : "thread_presentation_unavailable",
          detail: error.message,
        });
      }
    }
    return baseWorker.fetch(request, env, ctx);
  },
};
