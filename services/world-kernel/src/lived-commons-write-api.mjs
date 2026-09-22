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

export function createLivedCommonsWriteApi({
  commonsService,
  privateToken,
  now = () => new Date().toISOString(),
}) {
  if (!commonsService || typeof commonsService.gather !== "function") {
    throw new TypeError("Fibre Commons API requires commonsService.gather");
  }
  if (typeof privateToken !== "string" || privateToken.trim() === "") {
    throw new TypeError("Fibre Commons API requires privateToken");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/lived-commons") return null;
      if (request.method !== "POST") return json({ error:"method_not_allowed" }, 405);
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error:"private_token_required" }, 403);
      }

      let body;
      try {
        body = await request.json();
        assertPlainObject("Fibre Commons request", body);
        assertExactKeys("Fibre Commons request", body, ["threadIds"]);
        if (!Array.isArray(body.threadIds) || body.threadIds.length < 1 || body.threadIds.length > 6) {
          throw new TypeError("Fibre Commons requires 1-6 threadIds");
        }
        for (const threadId of body.threadIds) assertId("Fibre Commons threadId", threadId);
      } catch (error) {
        return json({ error:"invalid_lived_commons", detail:error.message }, 400);
      }

      const result = await commonsService.gather({
        threadIds:body.threadIds,
        at:now(),
      });
      return json({ ok:true, result });
    },
  });
}
