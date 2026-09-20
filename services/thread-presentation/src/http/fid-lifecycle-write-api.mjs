function authorized(request, privateToken) {
  return typeof privateToken === "string"
    && privateToken.length > 0
    && request.headers.get("x-fibre-private-token") === privateToken;
}

async function requestBody(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value;
  } catch {
    throw new TypeError("request body must be a JSON object");
  }
}

export function createFidLifecycleWriteApi({ reconciler, privateToken } = {}) {
  if (!reconciler || typeof reconciler.reconcile !== "function") {
    throw new TypeError("FID lifecycle write API requires a reconciler");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/fid/reconcile") return null;
      if (request.method !== "POST") {
        return Response.json({ error:"method_not_allowed" }, { status:405, headers:{ Allow:"POST" } });
      }
      if (!authorized(request, privateToken)) {
        return Response.json({ error:"private_token_required" }, { status:403 });
      }

      try {
        const body = await requestBody(request);
        if (Object.keys(body).sort().join(",") !== "idempotencyKey,mode,threadId") {
          throw new TypeError("FID reconciliation requires exactly threadId, idempotencyKey and mode");
        }
        const result = await reconciler.reconcile({
          threadId:body.threadId,
          idempotencyKey:body.idempotencyKey,
          mode:body.mode,
        });
        return Response.json({ ok:true, result }, { status:result.complete ? 200 : 202 });
      } catch (error) {
        const status = error instanceof TypeError ? 400 : 503;
        return Response.json({
          error:{
            code:status === 400 ? "INVALID_FID_RECONCILIATION" : "FID_RECONCILIATION_FAILED",
            detail:error instanceof Error ? error.message : String(error),
            retryable:error?.retryable === true,
          },
        }, { status });
      }
    },
  });
}
