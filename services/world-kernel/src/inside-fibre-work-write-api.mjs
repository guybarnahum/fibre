import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
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

export function createInsideFibreWorkWriteApi({
  workService,
  fibreCreditStore,
  privateToken,
  now = () => new Date().toISOString(),
}) {
  requireMethod(workService, "Inside Fibre workService", "considerOffer");
  requireMethod(workService, "Inside Fibre workService", "reconcileAcceptedWork");
  requireMethod(fibreCreditStore, "Inside Fibre fibreCreditStore", "balance");
  if (typeof privateToken !== "string" || privateToken.trim() === "") {
    throw new TypeError("Inside Fibre work API requires privateToken");
  }
  if (typeof now !== "function") throw new TypeError("Inside Fibre work API requires now()");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const offerRoute = url.pathname === "/internal/inside-fibre/work-offer";
      const stateRoute = url.pathname === "/internal/inside-fibre/work-state";
      if (!offerRoute && !stateRoute) return null;

      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error:"private_token_required" }, 403);
      }

      if (stateRoute) {
        if (request.method !== "GET") return json({ error:"method_not_allowed" }, 405);
        try {
          const threadId = url.searchParams.get("threadId");
          assertId("Inside Fibre work state.threadId", threadId);
          return json({
            ok:true,
            result:{
              threadId,
              fibreCredits:fibreCreditStore.balance(threadId),
            },
          });
        } catch (error) {
          return json({ error:"invalid_inside_fibre_work_state", detail:error.message }, 400);
        }
      }

      if (request.method !== "POST") return json({ error:"method_not_allowed" }, 405);
      let body;
      try {
        body = await request.json();
        assertPlainObject("Inside Fibre work offer request", body);
        assertExactKeys("Inside Fibre work offer request", body, [
          "threadId",
          "startAt",
          "endAt",
          "fibreCredits",
        ]);
        assertId("Inside Fibre work offer.threadId", body.threadId);
        assertIsoTimestamp("Inside Fibre work offer.startAt", body.startAt);
        assertIsoTimestamp("Inside Fibre work offer.endAt", body.endAt);
        assertFiniteNumber("Inside Fibre work offer.fibreCredits", body.fibreCredits, {
          integer:true,
          minimum:1,
        });
      } catch (error) {
        return json({ error:"invalid_inside_fibre_work_offer", detail:error.message }, 400);
      }

      try {
        const considered = await workService.considerOffer({
          threadId:body.threadId,
          at:now(),
          startAt:body.startAt,
          endAt:body.endAt,
          fibreCredits:body.fibreCredits,
        });
        if (considered.decision === "decline") {
          return json({
            ok:true,
            result:{
              threadId:body.threadId,
              decision:"decline",
              reason:considered.reason,
              offerId:considered.offer.offerId,
              startAt:considered.offer.startAt,
              endAt:considered.offer.endAt,
              fibreCredits:considered.offer.compensation.fibreCredits,
              commitmentId:null,
              planning:null,
            },
          });
        }

        const planning = await workService.reconcileAcceptedWork(considered.commitment.commitmentId);
        return json({
          ok:true,
          result:{
            threadId:body.threadId,
            decision:"accept",
            reason:considered.reason,
            offerId:considered.offer.offerId,
            startAt:considered.commitment.startAt,
            endAt:considered.commitment.endAt,
            fibreCredits:considered.commitment.compensation.fibreCredits,
            commitmentId:considered.commitment.commitmentId,
            planning:{
              state:planning.state,
              planId:planning.plan?.planId ?? null,
            },
          },
        });
      } catch (error) {
        return json({
          error:"inside_fibre_work_offer_failed",
          detail:error instanceof Error ? error.message : String(error),
        }, 503);
      }
    },
  });
}
