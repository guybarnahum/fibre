import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

const TOKEN_ENCODER = new TextEncoder();

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers:{ "cache-control":"no-store" },
  });
}

function requireMethod(owner, name, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

export function createPublicVisitorEncounterWriteApi({
  encounterService,
  privateToken,
  now = () => new Date().toISOString(),
}) {
  requireMethod(encounterService, "public visitor encounterService", "encounter");
  if (typeof privateToken !== "string" || privateToken.trim() === "") {
    throw new TypeError("public visitor encounter API requires privateToken");
  }
  if (typeof now !== "function") throw new TypeError("public visitor encounter API requires now()");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/public-visitor-encounter") return null;
      if (request.method !== "POST") return json({ error:"method_not_allowed" }, 405);
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error:"private_token_required" }, 403);
      }

      let body;
      try {
        body = await request.json();
        assertPlainObject("public visitor encounter request", body);
        assertExactKeys("public visitor encounter request", body, [
          "threadId",
          "expectedSituationId",
          "utterance",
        ]);
        assertId("public visitor encounter request.threadId", body.threadId);
        assertId("public visitor encounter request.expectedSituationId", body.expectedSituationId);
        assertNonEmpty("public visitor encounter request.utterance", body.utterance);
      } catch (error) {
        return json({ error:"invalid_public_encounter", detail:error.message }, 400);
      }

      const result = await encounterService.encounter({
        threadId:body.threadId,
        expectedSituationId:body.expectedSituationId,
        utterance:body.utterance,
        at:now(),
      });
      if (result.outcome === "scene_changed") {
        return json({
          error:"encounter_scene_changed",
          currentSituationId:result.currentSituationId,
        }, 409);
      }
      return json({ ok:true, result });
    },
  });
}
