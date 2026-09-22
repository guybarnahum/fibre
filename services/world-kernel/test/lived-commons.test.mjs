// fibre-test-purpose: prove-developed-life-can-voluntarily-bend-shared-mediated-presence-without-rewriting-physical-life

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
    version:1,
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

function memory(threadId, meaning) {
  return {
    memoryId:`mem_${threadId}`,
    threadId,
    rememberedMeaning:meaning,
    status:"current",
    accessibility:"accessible",
    retentionState:"retained",
    salience:0.9,
    asOf:"2026-09-21T12:00:00.000Z",
  };
}

test("developed life bends voluntary Commons presence without moving anyone", async () => {
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
  const memories = new Map([
    ["thr_ada", [memory("thr_ada", "Quiet ambient company has helped me feel connected without disrupting focused work.")]],
    ["thr_ben", [memory("thr_ben", "Being lightly reachable in the background has made solitary work feel easier.")]],
    ["thr_cleo", [memory("thr_cleo", "Background social presence made concentrated work harder, so I protected solitude afterward.")]],
  ]);
  const recordedPlans = [];
  const enacted = [];

  const worldReader = {
    getThread(threadId) { return structuredClone(threads.get(threadId) ?? null); },
  };
  const service = createLivedCommonsService({
    worldReader,
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
    identityStore:{
      getCurrentIdentityView(threadId) { return { threadId, assertions:[] }; },
    },
    semanticStateStore:{
      listCurrentState() { return []; },
    },
    memoryStore:{
      listCurrentMemories(threadId) { return structuredClone(memories.get(threadId) ?? []); },
    },
    situatedLifeStore:{
      listCurrentLifeRelations() { return []; },
    },
    modelAdapter:{
      provider:"fixture",
      modelId:"fixture-commons",
      async invoke(call) {
        assert.equal(call.input.concern.kind, "commons_entry");
        assert.equal(call.input.concern.externalContext.currentSituation.phase, "at_place");
        const remembered = call.input.developedSelfEvidence.find((item) => item.kind === "memory");
        assert.ok(remembered, "Commons cognition should receive Fibre-selected remembered meaning");
        const protectsSolitude = /protected solitude/u.test(remembered.text);
        return {
          output:{
            result:protectsSolitude
              ? {
                  decision:"stay_out",
                  activity:null,
                  purpose:null,
                  reason:"Past background social presence made concentrated work harder, so solitude fits now.",
                }
              : {
                  decision:"enter",
                  activity:"Continuing an ordinary personal activity with Fibre Commons open in the background.",
                  purpose:"Ambient company fits the life already underway without committing to conversation.",
                  reason:"Remembered low-cost ambient company fits the current activity.",
                },
            evidenceRefs:[remembered.ref],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-commons",
            providerRequestId:call.clientRequestId,
          },
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
    "persisted lived meaning should support genuinely different Commons choices",
  );
  assert.equal(
    result.entries.every((entry) => entry.diagnostics?.cognitionProfile === "interior-cognition-single-episode"),
    true,
    "Commons choices should route through the shared Interior Cognition profile",
  );
  assert.equal(
    result.entries.every((entry) => entry.diagnostics?.evidenceRefs.length === 1),
    true,
    "Commons choices should retain their cited private evidence",
  );
  assert.equal(recordedPlans.length, 2, "only entering Threads should author Commons plans");
  assert.equal(
    recordedPlans.every((candidate) => candidate.sourceReferences.every((ref) => !ref.startsWith("mem_"))),
    true,
    "private memory evidence must not become World/situated plan evidence",
  );
  assert.equal(
    recordedPlans.every((candidate) => candidate.cognition.evidenceRefs.length === 1),
    true,
    "entering plans should retain the private cognition witness",
  );
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
