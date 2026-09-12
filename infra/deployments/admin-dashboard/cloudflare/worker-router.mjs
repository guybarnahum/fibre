import activityWorker, {
  authenticateAccessRequest,
  authorizeAdminPrincipal,
} from "./worker.mjs";
import { resolveAdminThreadIdentity } from "./thread-identity.mjs";

const THREAD_IDENTITY_ROUTE = /^\/api\/threads\/([^/]+)\/identity$/u;

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"no-referrer",
    },
  });
}

export function createAdminDashboardRouter({
  authenticate = authenticateAccessRequest,
  authorize = authorizeAdminPrincipal,
  resolveIdentity = resolveAdminThreadIdentity,
  fallback = activityWorker,
} = {}) {
  return Object.freeze({
    async fetch(request, env) {
      const url = new URL(request.url);
      const match = url.pathname.match(THREAD_IDENTITY_ROUTE);
      if (match === null) return fallback.fetch(request, env);
      if (request.method !== "GET") return json(405, { error:"method_not_allowed" });

      let principal = null;
      try { principal = await authenticate(request, env); } catch { principal = null; }
      if (!principal) return json(403, { error:"access_required" });
      let isAdmin = false;
      try { isAdmin = await authorize(env, principal); }
      catch { return json(503, { error:"admin_authorization_unavailable" }); }
      if (!isAdmin) return json(403, { error:"admin_required" });

      const threadId = decodeURIComponent(match[1]);
      try {
        const identity = await resolveIdentity({ environment:env.FIBRE_ENVIRONMENT, threadId });
        if (identity === null) return json(404, { error:"thread_not_found" });
        return json(200, {
          contract:"fibre-admin-thread-identity-v0.1",
          environment:env.FIBRE_ENVIRONMENT,
          resolvedAt:new Date().toISOString(),
          identity,
        });
      } catch (error) {
        return json(error instanceof TypeError ? 400 : 503, {
          error:error instanceof TypeError ? "invalid_thread" : "thread_identity_unavailable",
          detail:error.message,
        });
      }
    },
  });
}

export default createAdminDashboardRouter();
