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

function optionalRegenerationKey(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("regenerationKey must be a non-empty string when supplied");
  }
  return value.trim();
}

function failureResponse(error, kind = "visual_publication") {
  const detail = error instanceof Error ? error.message : String(error);
  if (error instanceof TypeError) {
    return Response.json({ error: `invalid_${kind}_handoff`, detail, retryable: false }, { status: 400 });
  }
  const retryable = error?.retryable !== false;
  const code = typeof error?.code === "string" && error.code !== ""
    ? error.code
    : `${kind.toUpperCase()}_RECONCILIATION_FAILED`;
  return Response.json({
    error: `${kind}_reconciliation_failed`,
    code,
    detail,
    retryable,
  }, { status: 503 });
}

export function createVisualPublicationWriteApi({ reconciler, privateToken } = {}) {
  if (!reconciler || typeof reconciler.reconcileAvailableEmbodiment !== "function") {
    throw new TypeError("visual publication write API requires a reconciler");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const currentPresent = url.pathname === "/internal/current-present";
      if (!currentPresent && url.pathname !== "/internal/visual-publication/reconcile") return null;
      if (request.method !== "POST") {
        return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
      }
      if (!authorized(request, privateToken)) {
        return Response.json({ error: "private_token_required" }, { status: 403 });
      }

      try {
        const body = await jsonBody(request);
        if (currentPresent && typeof reconciler.publishCurrentPresent !== "function") {
          throw new TypeError("current-present publication is not configured");
        }
        const result = currentPresent
          ? await reconciler.publishCurrentPresent({
              threadId: body.threadId,
              present: body.present,
            })
          : await reconciler.reconcileAvailableEmbodiment({
              threadId: body.threadId,
              embodiment: body.embodiment,
              observedAt: body.observedAt,
              regenerationKey: optionalRegenerationKey(body.regenerationKey),
            });
        return Response.json({ ok: true, result });
      } catch (error) {
        return failureResponse(error, currentPresent ? "current_present" : "visual_publication");
      }
    },
  });
}
