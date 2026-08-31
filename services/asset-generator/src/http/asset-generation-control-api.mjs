function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function createAssetGenerationControlApi({
  privateToken,
  controlService,
} = {}) {
  const token = nonEmpty("Fibre private token", privateToken);
  if (!controlService || typeof controlService.reconcile !== "function") {
    throw new TypeError("asset generation control API requires controlService.reconcile()");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method !== "POST" || url.pathname !== "/internal/generation/reconcile") {
        return json(404, { ok: false, error: "not_found" });
      }
      if (request.headers.get("x-fibre-private-token") !== token) {
        return json(403, { ok: false, error: "private_token_required" });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json(400, { ok: false, error: "invalid_json" });
      }

      try {
        const result = await controlService.reconcile(body?.job);
        return json(200, { ok: true, result });
      } catch (error) {
        if (error instanceof TypeError) {
          return json(400, { ok: false, error: "invalid_request", detail: error.message });
        }
        console.error(JSON.stringify({
          event: "asset_generation_control_failed",
          errorName: error?.constructor?.name ?? "Error",
          message: error?.message ?? String(error),
        }));
        return json(500, { ok: false, error: "asset_generation_control_failed" });
      }
    },
  });
}
