const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

function id(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function allowedOrigin(request, viewerOrigin) {
  const origin = request.headers.get("Origin");
  if (origin === null) return null;
  return viewerOrigin && origin === viewerOrigin ? origin : false;
}

function cors(request, viewerOrigin) {
  const origin = allowedOrigin(request, viewerOrigin);
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(value, request, viewerOrigin, status = 200) {
  return Response.json(value, {
    status,
    headers: { ...cors(request, viewerOrigin), "Cache-Control": "no-store" },
  });
}

export function createPublicEncounterApi({
  readPublicPresent,
  encounter,
  viewerOrigin = null,
  now = () => new Date().toISOString(),
}) {
  if (typeof readPublicPresent !== "function") throw new TypeError("public encounter API requires readPublicPresent");
  if (typeof encounter !== "function") throw new TypeError("public encounter API requires encounter");
  if (typeof now !== "function") throw new TypeError("public encounter API requires now");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const match = /^\/api\/threads\/([^/]+)\/encounter$/.exec(url.pathname);
      if (!match) return null;
      if (request.headers.get("Origin") !== null && allowedOrigin(request, viewerOrigin) === false) {
        return json({ error: "origin_not_allowed" }, request, viewerOrigin, 403);
      }
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request, viewerOrigin) });
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, request, viewerOrigin, 405);

      let body;
      let threadId;
      try {
        threadId = id("threadId", decodeURIComponent(match[1]));
        body = await request.json();
        if (body === null || typeof body !== "object" || Array.isArray(body)) throw new TypeError("encounter request must be an object");
        const keys = Object.keys(body).sort();
        if (keys.length !== 2 || keys[0] !== "situationId" || keys[1] !== "utterance") {
          throw new TypeError("encounter request may contain only situationId and utterance");
        }
        id("situationId", body.situationId);
        if (typeof body.utterance !== "string" || body.utterance.trim() === "") throw new TypeError("utterance is required");
      } catch (error) {
        return json({ error: "invalid_encounter", detail: error.message }, request, viewerOrigin, 400);
      }

      const present = await readPublicPresent(threadId, request);
      if (present === null) return json({ error: "public_present_required" }, request, viewerOrigin, 409);
      if (present.situationId !== body.situationId) {
        return json({ error: "encounter_scene_changed", situationId: present.situationId }, request, viewerOrigin, 409);
      }

      const result = await encounter({
        threadId,
        expectedSituationId: body.situationId,
        utterance: body.utterance,
        occurredAt: now(),
      });
      if (result.situationId !== body.situationId) {
        return json({ error: "encounter_scene_changed", situationId: result.situationId }, request, viewerOrigin, 409);
      }
      return json({ situationId: result.situationId, responseText: result.responseText }, request, viewerOrigin);
    },
  });
}
