import assert from "node:assert/strict";
import test from "node:test";
import { createLivedEncounterWriteApi } from "../src/lived-encounter-write-api.mjs";

const thread = {
  threadId: "thr_a5_bridge",
  identity: { selfDescription: "I am here already." },
  currentState: { selfModel: "I am drawing.", unresolvedIntentions: [] },
};
const situation = {
  situationId: "sit_a5_bridge",
  threadId: thread.threadId,
  establishedAt: "2026-09-11T00:00:00Z",
};

function api({ modelCalls = [], activityRecorder = null } = {}) {
  return createLivedEncounterWriteApi({
    privateToken: "private-token-a5-bridge",
    worldReader: { getThread: () => structuredClone(thread) },
    livedNowStore: { getCurrentSituation: () => structuredClone(situation) },
    semanticStateStore: { listCurrentState: () => [] },
    activityRecorder,
    modelAdapter: {
      async invoke(input) {
        modelCalls.push(input);
        return {
          output: { responseText: "Hi." },
          provenance: { provider: "fixture", modelId: "fixture-a5", providerRequestId: "req_a5" },
        };
      },
    },
  });
}

function request(body) {
  return new Request("https://world.internal/internal/lived-encounter", {
    method: "POST",
    headers: { "content-type": "application/json", "x-fibre-private-token": "private-token-a5-bridge" },
    body: JSON.stringify(body),
  });
}

test("A5 private encounter bridge requires the public scene to still be the World-owned scene", async () => {
  const modelCalls = [];
  const response = await api({ modelCalls }).fetch(request({
    threadId: thread.threadId,
    expectedSituationId: "sit_stale_public_scene",
    utterance: "Hello",
    occurredAt: "2026-09-11T00:05:00Z",
  }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "encounter_scene_changed");
  assert.equal(modelCalls.length, 0, "stale public reality must be rejected before cognition");
});

test("A5 private encounter bridge exposes speech but keeps cognition grounded in World-owned life", async () => {
  const modelCalls = [];
  const response = await api({ modelCalls }).fetch(request({
    threadId: thread.threadId,
    expectedSituationId: situation.situationId,
    utterance: "Hello",
    occurredAt: "2026-09-11T00:05:00Z",
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.responseText, "Hi.");
  assert.equal(body.result.grounding.situationId, situation.situationId);
  assert.equal(modelCalls.length, 1);
});

test("A5 Activity Log exposes encounter causality without copying private speech", async () => {
  const stages = [];
  const activityRecorder = {
    async runStage(metadata, operation) {
      stages.push(structuredClone(metadata));
      return operation();
    },
  };
  const utterance = "This is private visitor speech.";
  const response = await api({ activityRecorder }).fetch(request({
    threadId: thread.threadId,
    expectedSituationId: situation.situationId,
    utterance,
    occurredAt: "2026-09-11T00:05:00Z",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(stages, [{
    threadId: thread.threadId,
    correlationId: situation.situationId,
    stage: "encounter.cognition.respond",
  }]);
  assert.equal(JSON.stringify(stages).includes(utterance), false,
    "operator telemetry should identify the lived encounter without becoming a copy of it");
});

test("one lived encounter keeps one bounded causal present through response and Experience", async () => {
  let situationReads = 0;
  let semanticReads = 0;
  let memoryReads = 0;
  let memoryQuery = null;
  const modelCalls = [];
  const queued = [];
  const memory = {
    memoryId: "mem_prior_context",
    recordedAt: "2026-09-10T23:00:00Z",
    rememberedContent: "A prior moment.",
    rememberedMeaning: null,
    salience: 0.4,
    accessibility: "accessible",
    asOf: "2026-09-10T23:00:00Z",
  };

  const livedApi = createLivedEncounterWriteApi({
    privateToken: "private-token-a5-bridge",
    worldReader: { getThread: () => structuredClone(thread) },
    livedNowStore: {
      getCurrentSituation() {
        situationReads += 1;
        return { ...structuredClone(situation), activity: `scene-${situationReads}` };
      },
    },
    semanticStateStore: {
      listCurrentState() {
        semanticReads += 1;
        return [{
          stateId: `sem_${semanticReads}`,
          domain: "emotion",
          dimension: "valence",
          target: null,
          state: `state-${semanticReads}`,
        }];
      },
    },
    experienceStore: {
      recordEncounterStory(input) {
        return {
          encounterId:"story_lived_context",
          ...structuredClone(input),
        };
      },
      recordThreadEncounterAttention(input) {
        return {
          ...structuredClone(input),
          experience:{
            experienceId:"exp_lived_context",
            threadId:input.threadId,
            encounterRef:input.encounterRef,
            situationId:input.situationId,
            occurredAt:input.occurredAt,
            experienceText:input.experienceText,
          },
        };
      },
      queueThreadExperienceConsolidation(input) {
        const record={
          experienceId:input.experienceId,
          threadId:thread.threadId,
          queuedAt:input.queuedAt,
        };
        queued.push(structuredClone(record));
        return record;
      },
    },
    memoryStore: {
      listCurrentMemories(_threadId, options) {
        memoryReads += 1;
        memoryQuery = structuredClone(options);
        return [{ ...memory, rememberedContent: `${memory.rememberedContent} ${memoryReads}` }];
      },
    },
    modelAdapter: {
      async invoke(call) {
        modelCalls.push(structuredClone(call));
        if (call.clientRequestId.startsWith("lived-encounter_")) {
          return {
            output: { responseText: "Hi." },
            provenance: { provider: "fixture", modelId: "fixture-a5" },
          };
        }
        if (call.clientRequestId.startsWith("encounter-experience_")) {
          return {
            output:{ experienceText:"I shifted my attention toward the visitor." },
            provenance:{ provider:"fixture",modelId:"fixture-a5" },
          };
        }
        throw new Error("unexpected hot-path cognition stage");
      },
    },
  });

  const response = await livedApi.fetch(request({
    threadId: thread.threadId,
    expectedSituationId: situation.situationId,
    utterance: "Hello",
    occurredAt: "2026-09-11T00:05:00Z",
  }));

  assert.equal(response.status, 200);
  assert.equal(situationReads, 1, "one encounter must have one current situation");
  assert.equal(semanticReads, 1, "one encounter must have one semantic present");
  assert.equal(memoryReads, 1, "one encounter must have one prior-memory present");
  assert.deepEqual(memoryQuery, { limit:6, newestFirst:true },
    "encounter memory context must remain bounded as a life grows");
  assert.equal(modelCalls.length, 2,
    "hot path should stop after response plus immediate Experience cognition");
  assert.equal(modelCalls[0].input.semanticStates[0].state, "state-1");
  assert.equal(modelCalls[1].input.semanticStates[0].state, "state-1");
  assert.equal(modelCalls[0].input.autobiographicalMemories[0].rememberedContent, "A prior moment. 1");
  assert.equal(modelCalls[1].input.autobiographicalMemories[0].rememberedContent, "A prior moment. 1");
  assert.deepEqual(queued,[{
    experienceId:"exp_lived_context",
    threadId:thread.threadId,
    queuedAt:"2026-09-11T00:05:00Z",
  }],"immediate Experience did not become durable consolidation work");
});

test("durable Story and Experience survive consolidation scheduling failure", async () => {
  let storyWrites=0;
  let experienceWrites=0;
  let queueWrites=0;
  let modelCalls=0;
  const livedApi=createLivedEncounterWriteApi({
    privateToken:"private-token-a5-bridge",
    worldReader:{getThread:()=>structuredClone(thread)},
    livedNowStore:{getCurrentSituation:()=>structuredClone(situation)},
    semanticStateStore:{listCurrentState:()=>[]},
    experienceStore:{
      recordEncounterStory(input){
        storyWrites+=1;
        return {encounterId:"story_scheduler_failure",...structuredClone(input)};
      },
      recordThreadEncounterAttention(input){
        experienceWrites+=1;
        return {
          ...structuredClone(input),
          experience:{
            experienceId:"exp_scheduler_failure",
            threadId:input.threadId,
            encounterRef:input.encounterRef,
            situationId:input.situationId,
            occurredAt:input.occurredAt,
            experienceText:input.experienceText,
          },
        };
      },
      queueThreadExperienceConsolidation(input){
        queueWrites+=1;
        return {
          experienceId:input.experienceId,
          threadId:thread.threadId,
          queuedAt:input.queuedAt,
        };
      },
    },
    modelAdapter:{
      async invoke(call){
        modelCalls+=1;
        if(call.clientRequestId.startsWith("lived-encounter_")){
          return {
            output:{responseText:"I’m drawing right now."},
            provenance:{provider:"fixture",modelId:"fixture-a5"},
          };
        }
        if(call.clientRequestId.startsWith("encounter-experience_")){
          return {
            output:{experienceText:"I noticed the question while I was drawing."},
            provenance:{provider:"fixture",modelId:"fixture-a5"},
          };
        }
        throw new Error("unexpected cognition");
      },
    },
    async onExperienceQueued(){
      throw new Error("simulated scheduler failure");
    },
  });

  await assert.rejects(
    livedApi.fetch(request({
      threadId:thread.threadId,
      expectedSituationId:situation.situationId,
      utterance:"What are you doing right now?",
      occurredAt:"2026-09-11T00:05:00Z",
    })),
    /simulated scheduler failure/,
  );

  assert.equal(storyWrites,1,"scheduler failure erased objective encounter admission");
  assert.equal(experienceWrites,1,"scheduler failure erased immediate Thread Experience");
  assert.equal(queueWrites,1,"scheduler failure happened before durable consolidation queueing");
  assert.equal(modelCalls,2,"scheduler failure triggered Journal/Memory cognition on the hot path");
});
