// fibre-test-purpose: prove-voluntary-shared-mediated-presence-without-rewriting-physical-life

import assert from "node:assert/strict";
import test from "node:test";

import {
  FIBRE_COMMONS_CONTEXT,
  createLivedCommonsService,
} from "../src/lived-commons.mjs";
import { meetingPresenceCompatible } from "../src/lived-meeting-cognition.mjs";

const AT = "2026-09-22T02:00:00.000Z";
const END = "2026-09-22T04:00:00.000Z";

function thread(threadId, name) {
  return {
    threadId,
    identity:{ name, selfDescription:`${name} has an ordinary life already underway.` },
    currentState:{
      selfModel:`${name} chooses social presence selectively.`,
      needs:[],
      feelings:[],
      unresolvedIntentions:[],
    },
    genome:{ textualTraits:{} },
  };
}

function situation(threadId, placeRef) {
  return {
    situationId:`sit_${threadId}`,
    threadId,
    establishedAt:AT,
    phase:"at_place",
    location:{ kind:"place", placeRef },
    mediatedContext:null,
    activity:"Continuing an ordinary personal activity.",
    reason:"Following the current personal plan.",
    participantRefs:[],
    evidenceRefs:[placeRef, `evt_${threadId}`],
    sourcePlanRefs:[`lplan_original_${threadId}`],
    resolution:{
      kind:"personal_plan",
      conflict:false,
      observedDivergence:false,
      governingPlanRef:`lplan_original_${threadId}`,
      constrainedPlanRef:null,
      summary:"Personal plan governs.",
    },
    provenance:"world_enacted",
  };
}

function plan(threadId, placeRef) {
  return {
    planId:`lplan_original_${threadId}`,
    kind:"personal",
    subjectThreadId:threadId,
    owner:{ partyId:threadId, kind:"thread" },
    authoredAt:"2026-09-22T00:00:00.000Z",
    horizonStart:"2026-09-22T00:00:00.000Z",
    horizonEnd:END,
    stops:[],
    sourceReferences:[placeRef, `evt_${threadId}`],
    cognition:{ provider:"fixture", modelId:"fixture", providerRequestId:null },
  };
}

test("Fibre Commons creates voluntary shared presence without moving anyone", async () => {
  const threads = new Map([
    ["thr_ada", thread("thr_ada", "Ada")],
    ["thr_ben", thread("thr_ben", "Ben")],
    ["thr_cleo", thread("thr_cleo", "Cleo")],
  ]);
  const situations = new Map([
    ["thr_ada", situation("thr_ada", "per:plce_ada_home:1")],
    ["thr_ben", situation("thr_ben", "per:plce_ben_library:1")],
    ["thr_cleo", situation("thr_cleo", "per:plce_cleo_cafe:1")],
  ]);
  const plans = new Map([
    ["thr_ada", plan("thr_ada", "per:plce_ada_home:1")],
    ["thr_ben", plan("thr_ben", "per:plce_ben_library:1")],
    ["thr_cleo", plan("thr_cleo", "per:plce_cleo_cafe:1")],
  ]);
  const recordedPlans = [];
  const enacted = [];

  const service = createLivedCommonsService({
    worldReader:{
      getThread(threadId) { return structuredClone(threads.get(threadId) ?? null); },
    },
    livedNow:{
      async ensure({ threadId }) { return structuredClone(situations.get(threadId)); },
    },
    livedNowStore:{
      latestPlan(threadId) { return structuredClone(plans.get(threadId)); },
      recordPlan(candidate) {
        recordedPlans.push(structuredClone(candidate));
        plans.set(candidate.subjectThreadId, structuredClone(candidate));
        return structuredClone(candidate);
      },
      enactCurrentSituation(input) {
        const current = {
          ...structuredClone(situations.get(input.threadId)),
          situationId:input.situationId,
          establishedAt:input.establishedAt,
          ...structuredClone(input.observation),
        };
        situations.set(input.threadId, current);
        enacted.push(structuredClone(current));
        return current;
      },
    },
    modelAdapter:{
      async invoke(call) {
        const name = call.input.thread.name;
        if (name === "Cleo") {
          return {
            output:{
              decision:"stay_out",
              activity:null,
              purpose:null,
              reason:"Cleo wants uninterrupted solitude for the activity already underway.",
            },
            provenance:{ provider:"fixture", modelId:"fixture-commons", providerRequestId:"req_cleo" },
          };
        }
        return {
          output:{
            decision:"enter",
            activity:"Continuing an ordinary personal activity with Fibre Commons open in the background.",
            purpose:"Ambient company feels compatible with what I am already doing without committing to conversation.",
            reason:"Background company feels low-cost and compatible with the current activity.",
          },
          provenance:{ provider:"fixture", modelId:"fixture-commons", providerRequestId:`req_${name.toLowerCase()}` },
        };
      },
    },
  });

  const result = await service.gather({
    threadIds:["thr_ada","thr_ben","thr_cleo"],
    at:AT,
  });

  assert.deepEqual(
    result.entries.map((entry) => entry.outcome),
    ["entered","entered","stayed_out"],
    "Commons entry must remain voluntary",
  );
  assert.equal(
    result.entries.every((entry) => typeof entry.diagnostics?.decisionReason === "string"),
    true,
    "Commons choices should be inspectable during live debugging",
  );
  assert.equal(recordedPlans.length, 2, "only entering Threads should author Commons plans");
  assert.deepEqual(
    enacted.map((current) => current.location.placeRef),
    ["per:plce_ada_home:1","per:plce_ben_library:1"],
    "Commons must preserve physical life",
  );
  assert.equal(
    enacted.every((current) => current.mediatedContext === FIBRE_COMMONS_CONTEXT),
    true,
    "entering Threads should share one mediated context",
  );
  assert.equal(
    recordedPlans.every((plan) => /ordinary personal activity/u.test(plan.stops[0].activity)),
    true,
    "Commons should remain ambient to life already underway",
  );
  assert.equal(
    meetingPresenceCompatible(enacted[0], enacted[1]),
    true,
    "Commons entrants should become genuinely compatible for social encounter",
  );
  assert.equal(
    meetingPresenceCompatible(enacted[0], situations.get("thr_cleo")),
    false,
    "staying out must not fabricate co-presence",
  );
});
