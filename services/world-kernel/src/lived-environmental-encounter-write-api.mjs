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
  return Response.json(value, { status, headers:{ "cache-control":"no-store" } });
}

export function createEnvironmentalEncounterWriteApi({
  encounterService,
  privateToken,
  now = () => new Date().toISOString(),
} = {}) {
  if (!encounterService || typeof encounterService.encounter !== "function") {
    throw new TypeError("environmental encounter API requires encounterService.encounter");
  }
  if (typeof privateToken !== "string" || privateToken.trim() === "") {
    throw new TypeError("environmental encounter API requires privateToken");
  }
  if (typeof now !== "function") throw new TypeError("environmental encounter API requires now()");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/environmental-encounter") return null;
      if (request.method !== "POST") return json({ error:"method_not_allowed" }, 405);
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error:"private_token_required" }, 403);
      }

      let body;
      try {
        body = await request.json();
        assertPlainObject("environmental encounter request", body);
        assertExactKeys("environmental encounter request", body, ["threadId","occurrence"]);
        assertId("environmental encounter threadId", body.threadId);
        assertPlainObject("environmental encounter occurrence", body.occurrence);
        assertExactKeys("environmental encounter occurrence", body.occurrence, ["occurrenceRef","description"]);
        assertId("environmental encounter occurrenceRef", body.occurrence.occurrenceRef);
        assertNonEmpty("environmental encounter description", body.occurrence.description);
      } catch (error) {
        return json({ error:"invalid_environmental_encounter", detail:error.message }, 400);
      }

      const result = await encounterService.encounter({
        threadId:body.threadId,
        occurrence:body.occurrence,
        at:now(),
      });
      return json({ ok:true, result });
    },
  });
}
