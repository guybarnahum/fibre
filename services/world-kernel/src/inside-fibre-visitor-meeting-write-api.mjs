import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
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

export function createInsideFibreVisitorMeetingWriteApi({
  meetingService,
  publication,
  privateToken,
  now = () => new Date().toISOString(),
}) {
  requireMethod(meetingService, "Inside Fibre meetingService", "enter");
  requireMethod(meetingService, "Inside Fibre meetingService", "encounter");
  requireMethod(publication, "Inside Fibre publication", "publishCurrentSituation");
  if (typeof privateToken !== "string" || privateToken.trim() === "") {
    throw new TypeError("Inside Fibre meeting API requires privateToken");
  }
  if (typeof now !== "function") throw new TypeError("Inside Fibre meeting API requires now()");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const entry = url.pathname === "/internal/inside-fibre/meeting-entry";
      const encounter = url.pathname === "/internal/inside-fibre/visitor-encounter";
      if (!entry && !encounter) return null;
      if (request.method !== "POST") return json({ error:"method_not_allowed" }, 405);
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error:"private_token_required" }, 403);
      }

      let body;
      try {
        body = await request.json();
        assertPlainObject("Inside Fibre meeting request", body);
        if (entry) {
          assertExactKeys("Inside Fibre meeting entry", body, ["threadId"]);
          assertId("Inside Fibre meeting entry.threadId", body.threadId);
        } else {
          assertExactKeys("Inside Fibre visitor encounter", body, [
            "threadId",
            "expectedSituationId",
            "utterance",
            "occurredAt",
          ]);
          assertId("Inside Fibre visitor encounter.threadId", body.threadId);
          assertId("Inside Fibre visitor encounter.expectedSituationId", body.expectedSituationId);
          assertNonEmpty("Inside Fibre visitor encounter.utterance", body.utterance);
          assertIsoTimestamp("Inside Fibre visitor encounter.occurredAt", body.occurredAt);
        }
      } catch (error) {
        return json({ error:"invalid_inside_fibre_meeting", detail:error.message }, 400);
      }

      if (entry) {
        const admitted = await meetingService.enter({
          threadId:body.threadId,
          at:now(),
        });
        if (admitted === null) return json({ error:"thread_meeting_unavailable" }, 409);
        const published = await publication.publishCurrentSituation(admitted.situation);
        return json({
          ok:true,
          result:{
            threadId:body.threadId,
            situationId:admitted.situation.situationId,
            availability:admitted.availability,
            present:published.present,
          },
        });
      }

      const result = await meetingService.encounter({
        threadId:body.threadId,
        expectedSituationId:body.expectedSituationId,
        utterance:body.utterance,
        at:body.occurredAt,
      });
      if (result === null) return json({ error:"thread_meeting_changed" }, 409);
      return json({
        ok:true,
        result:{
          situationId:result.situationId,
          responseText:result.responseText,
          encounterStoryId:result.encounterStory.encounterId,
        },
      });
    },
  });
}
