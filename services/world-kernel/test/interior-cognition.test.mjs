import assert from "node:assert/strict";
import test from "node:test";

import { runInteriorCognition } from "../src/interior-cognition.mjs";
import { formVisitorMeetingStance } from "../src/lived-meeting-cognition.mjs";

const AT = "2026-09-22T16:10:00.000Z";
const CONCERN = Object.freeze({
  kind:"quiet_shared_presence",
  question:"A quiet shared mediated room can remain open while I continue working. Do I want that background company right now?",
  externalContext:Object.freeze({
    physicalActivity:"working alone at a desk",
    interruptionRequired:false,
    conversationRequired:false,
  }),
});
const ADAPTER = Object.freeze({
  id:"presence_preference",
  instruction:"Return stance=welcome or avoid for the Thread's private preference toward the offered ambient presence.",
  resultSchema:Object.freeze({
    type:"object",
    additionalProperties:false,
    required:["stance"],
    properties:{ stance:{ type:"string", enum:["welcome","avoid"] } },
  }),
});

function sourceStores({ threadId, memoryId, rememberedMeaning }) {
  return {
    worldStore:{
      getThread(id) {
        assert.equal(id, threadId);
        return {
          threadId,
          version:3,
          identity:{ name:threadId.endsWith("a") ? "Ada" : "Ben" },
          currentState:{
            selfModel:"I am still figuring out how much company helps while I work.",
            needs:[],
            feelings:[],
            unresolvedIntentions:[],
          },
        };
      },
    },
    identityStore:{
      getCurrentIdentityView(id) {
        return { threadId:id, assertions:[] };
      },
    },
    semanticStateStore:{
      listCurrentState(id) {
        assert.equal(id, threadId);
        return [];
      },
    },
    memoryStore:{
      listCurrentMemories(id) {
        assert.equal(id, threadId);
        const expectedMemoryId = threadId === "thr_person_a" ? "mem-person-a" : "mem-person-b";
        assert.equal(memoryId, expectedMemoryId,
          "fixture must retain the authoritative memory ID before selection");
        return [{
          memoryId,
          threadId,
          status:"current",
          accessibility:"accessible",
          retentionState:"available",
          salience:0.9,
          asOf:"2026-09-21T12:00:00.000Z",
          rememberedMeaning,
          rememberedContent:"A prior ordinary experience.",
        }];
      },
    },
    situatedLifeStore:{
      listCurrentLifeRelations(id) {
        assert.equal(id, threadId);
        return [];
      },
    },
  };
}

function modelAdapter() {
  return {
    provider:"fixture",
    modelId:"fixture-interior",
    async invoke(call) {
      assert.deepEqual(call.input.concern, CONCERN, "same concern must reach both Threads");
      assert.equal(Object.hasOwn(call.input.thread, "genome"), false,
        "raw genome must not enter ordinary Interior Cognition");
      const memory = call.input.developedSelfEvidence.find((item) => item.kind === "memory");
      assert.ok(memory, "remembered meaning should reach private cognition");
      const expectedMemoryRef = call.input.thread.threadId === "thr_person_a" ? "mem-person-a" : "mem-person-b";
      assert.equal(memory.ref, expectedMemoryRef,
        "Interior Cognition must preserve the authoritative memory reference");
      const welcome = /company restored me/u.test(memory.text);
      return {
        output:{
          result:{ stance:welcome ? "welcome" : "avoid" },
          evidenceRefs:[memory.ref],
          conflictingMotives:[],
          uncertainty:null,
        },
        provenance:{
          provider:"fixture",
          modelId:"fixture-interior",
          providerRequestId:`req_${call.input.thread.threadId}`,
          usage:{ inputTokens:120, outputTokens:18, totalTokens:138 },
        },
      };
    },
  };
}

test("Interior Cognition lets different lived meaning bend the same private concern", async () => {
  const adapter = modelAdapter();
  const [ada, ben] = await Promise.all([
    runInteriorCognition({
      threadId:"thr_person_a",
      at:AT,
      concern:CONCERN,
      adapter:ADAPTER,
      sourceStores:sourceStores({
        threadId:"thr_person_a",
        memoryId:"mem-person-a",
        rememberedMeaning:"After a long solitary stretch, quiet company restored me without disrupting my work.",
      }),
      modelAdapter:adapter,
    }),
    runInteriorCognition({
      threadId:"thr_person_b",
      at:AT,
      concern:CONCERN,
      adapter:ADAPTER,
      sourceStores:sourceStores({
        threadId:"thr_person_b",
        memoryId:"mem-person-b",
        rememberedMeaning:"When I let a shared room stay open while concentrating, I became tense and protected solitude afterward.",
      }),
      modelAdapter:adapter,
    }),
  ]);

  assert.equal(ada.result.stance, "welcome");
  assert.equal(ben.result.stance, "avoid");
  assert.deepEqual(ada.evidenceRefs, ["mem-person-a"]);
  assert.deepEqual(ben.evidenceRefs, ["mem-person-b"]);
  assert.equal(ada.metrics.modelCalls, 1);
  assert.equal(ada.metrics.usage.totalTokens, 138);
});


test("N6.3c visitor participation is the Thread's existing social-response cognition in actual current life", async () => {
  const threadId = "thr_person_a";
  const situation = {
    situationId:"sit_n6_public_current",
    threadId,
    establishedAt:AT,
    phase:"at_place",
    location:{ kind:"place", placeRef:"wpl_n6_library" },
    mediatedContext:null,
    activity:"Reading and making notes at a library table.",
    reason:"This is the enacted World situation.",
    participantRefs:[],
    evidenceRefs:["evt_n6_public_current"],
    sourcePlanRefs:["lplan_n6_public"],
    resolution:{
      kind:"personal_plan",
      conflict:false,
      observedDivergence:false,
      governingPlanRef:"lplan_n6_public",
      constrainedPlanRef:null,
      summary:"The current situation follows the personal Flight Plan.",
    },
    provenance:"world_enacted",
  };
  const plan = {
    planId:"lplan_n6_public",
    kind:"personal",
    subjectThreadId:threadId,
    horizonStart:"2026-09-22T15:00:00.000Z",
    horizonEnd:"2026-09-22T20:00:00.000Z",
    stops:[],
  };

  const stance = await formVisitorMeetingStance({
    threadId,
    at:AT,
    plan,
    situation,
    requestText:"Could I talk with you for a minute?",
    sourceStores:sourceStores({
      threadId,
      memoryId:"mem-person-a",
      rememberedMeaning:"After a long solitary stretch, quiet company restored me without disrupting my work.",
    }),
    modelAdapter:{
      provider:"fixture",
      modelId:"fixture-public-participation",
      async invoke(call) {
        const context = call.input.concern.externalContext;
        assert.equal(call.input.concern.kind, "social_response",
          "visitor request must reuse social-response cognition");
        assert.equal(context.currentSituation.situationId, situation.situationId,
          "participation must see actual enacted life");
        assert.equal(context.remainingFlightPlan.planId, plan.planId,
          "participation may consider the remaining intention without treating it as reality");
        assert.deepEqual(context.socialRequest, {
          requesterKind:"person",
          text:"Could I talk with you for a minute?",
        });
        assert.equal(Object.hasOwn(context, "situatedPercept"), false,
          "a public visitor must not be fabricated as a Thread");
        return {
          output:{
            result:{
              decision:"decline",
              expression:"Not right now, thanks.",
              suggestedAt:null,
              reason:"I want to finish what I am doing before taking on a conversation.",
            },
            evidenceRefs:[],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-public-participation",
            providerRequestId:"req_public_participation",
          },
        };
      },
    },
  });

  assert.equal(stance.decision, "decline",
    "the Thread must retain agency over the visitor request");
  assert.equal(stance.expression, "Not right now, thanks.");
});
