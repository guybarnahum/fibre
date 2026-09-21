import {
  assertExactKeys,
  assertId,
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

export function createReciprocalMeetingWriteApi({
  meetingService,
  privateToken,
  now = () => new Date().toISOString(),
}) {
  if (meetingService === null || typeof meetingService !== "object" || typeof meetingService.meet !== "function") {
    throw new TypeError("reciprocal meeting API requires meetingService.meet");
  }
  if (typeof privateToken !== "string" || privateToken.trim() === "") {
    throw new TypeError("reciprocal meeting API requires privateToken");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/reciprocal-meeting") return null;
      if (request.method !== "POST") return json({ error:"method_not_allowed" }, 405);
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error:"private_token_required" }, 403);
      }
      let body;
      try {
        body = await request.json();
        assertPlainObject("reciprocal meeting request", body);
        assertExactKeys("reciprocal meeting request", body, ["initiatorThreadId","participantThreadIds"]);
        assertId("reciprocal meeting initiatorThreadId", body.initiatorThreadId);
        if (!Array.isArray(body.participantThreadIds) || body.participantThreadIds.length < 2 || body.participantThreadIds.length > 6) {
          throw new TypeError("reciprocal meeting requires 2-6 participantThreadIds");
        }
        for (const threadId of body.participantThreadIds) assertId("reciprocal meeting participantThreadId", threadId);
      } catch (error) {
        return json({ error:"invalid_reciprocal_meeting", detail:error.message }, 400);
      }
      const result = await meetingService.meet({
        initiatorThreadId:body.initiatorThreadId,
        participantThreadIds:body.participantThreadIds,
        at:now(),
      });
      return json({ ok:true, result });
    },
  });
}
