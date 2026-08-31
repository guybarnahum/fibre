function authorized(request, privateToken) {
  return typeof privateToken === "string"
    && privateToken.length > 0
    && request.headers.get("x-fibre-private-token") === privateToken;
}

async function jsonBody(request) {
  try {
    const value = await request.json();
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value;
  } catch {
    throw new TypeError("request body must be a JSON object");
  }
}

function failureResponse(error) {
  const detail = error instanceof Error ? error.message : String(error);
  if (error instanceof TypeError) {
    return Response.json({ error: "invalid_visual_publication_handoff", detail }, { status: 400 });
  }
  return Response.json({ error: "visual_publication_reconciliation_failed", detail }, { status: 503 });
}

export function createVisualPublicationWriteApi({ reconciler, privateToken } = {}) {
  if (!reconciler || typeof reconciler.reconcileAvailableEmbodiment !== "function") {
    throw new TypeError("visual publication write API requires a reconciler");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/visual-publication/reconcile") return null;
      if (request.method !== "POST") {
        return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
      }
      if (!authorized(request, privateToken)) {
        return Response.json({ error: "private_token_required" }, { status: 403 });
      }

      try {
        const body = await jsonBody(request);
        const result = await reconciler.reconcileAvailableEmbodiment({
          threadId: body.threadId,
          embodiment: body.embodiment,
          observedAt: body.observedAt,
        });
        return Response.json({ ok: true, result });
      } catch (error) {
        return failureResponse(error);
      }
    },
  });
}
