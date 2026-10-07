import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";
import { respondToLivedEncounter } from "./lived-encounter-cognition.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { formThreadEncounterExperience } from "./lived-thread-experience-cognition.mjs";
import { queueThreadExperienceConsolidation } from "./lived-experience-consolidation-queue.mjs";

const TOKEN_ENCODER = new TextEncoder();
const ENCOUNTER_MEMORY_LIMIT = 6;

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
    headers: { "cache-control": "no-store" },
  });
}

function requireDependency(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function runActivityStage(activityRecorder, metadata, operation) {
  return activityRecorder === null ? operation() : activityRecorder.runStage(metadata, operation);
}

function captureLivedContext({ thread, situation, semanticStateStore, memoryStore }) {
  return Object.freeze({
    thread: structuredClone(thread),
    situation: structuredClone(situation),
    semanticStates: Object.freeze(semanticStateStore.listCurrentState(thread.threadId).map((state) => structuredClone(state))),
    memories: Object.freeze(memoryStore === null
      ? []
      : memoryStore.listCurrentMemories(thread.threadId, {
        limit:ENCOUNTER_MEMORY_LIMIT,
        newestFirst:true,
      }).map((memory) => structuredClone(memory))),
  });
}

export function createLivedEncounterWriteApi({
  worldReader,
  livedNowStore,
  semanticStateStore,
  modelAdapter,
  experienceStore = null,
  memoryStore = null,
  activityRecorder = null,
  onExperienceQueued = null,
  privateToken,
}) {
  requireDependency("worldReader", worldReader, "getThread");
  requireDependency("livedNowStore", livedNowStore, "getCurrentSituation");
  requireDependency("semanticStateStore", semanticStateStore, "listCurrentState");
  requireDependency("modelAdapter", modelAdapter, "invoke");
  if (experienceStore !== null) {
    requireDependency("experienceStore", experienceStore, "recordEncounterStory");
    requireDependency("experienceStore", experienceStore, "recordThreadEncounterAttention");
    requireDependency("experienceStore", experienceStore, "queueThreadExperienceConsolidation");
  }
  if (memoryStore !== null) {
    requireDependency("memoryStore", memoryStore, "listCurrentMemories");
  }
  if (activityRecorder !== null) requireDependency("activityRecorder", activityRecorder, "runStage");
  if (onExperienceQueued !== null && typeof onExperienceQueued !== "function") {
    throw new TypeError("onExperienceQueued must be a function or null");
  }
  assertNonEmpty("privateToken", privateToken);

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/lived-encounter") return null;
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error: "private_token_required" }, 403);
      }

      let body;
      try {
        body = await request.json();
        assertPlainObject("lived encounter request", body);
        assertExactKeys("lived encounter request", body, [
          "threadId",
          "expectedSituationId",
          "utterance",
          "occurredAt",
        ]);
        assertId("lived encounter request.threadId", body.threadId);
        assertId("lived encounter request.expectedSituationId", body.expectedSituationId);
        assertNonEmpty("lived encounter request.utterance", body.utterance);
        assertIsoTimestamp("lived encounter request.occurredAt", body.occurredAt);
      } catch (error) {
        return json({ error: "invalid_encounter", detail: error.message }, 400);
      }

      const situation = livedNowStore.getCurrentSituation(body.threadId);
      if (situation === null) return json({ error: "current_situation_required" }, 409);
      if (situation.situationId !== body.expectedSituationId) {
        return json({
          error: "encounter_scene_changed",
          expectedSituationId: body.expectedSituationId,
          currentSituationId: situation.situationId,
        }, 409);
      }

      const thread = worldReader.getThread(body.threadId, { required: false });
      if (thread === null) return json({ error: "thread_not_found" }, 404);
      const livedContext = captureLivedContext({ thread, situation, semanticStateStore, memoryStore });

      const activity = Object.freeze({
        threadId: body.threadId,
        correlationId: body.expectedSituationId,
      });
      const encounter = { utterance: body.utterance, occurredAt: body.occurredAt };
      const result = await runActivityStage(activityRecorder, {
        ...activity,
        stage: "encounter.cognition.respond",
      }, () => respondToLivedEncounter({
        livedContext,
        encounter,
        modelAdapter,
      }));
      if (result.grounding.situationId !== body.expectedSituationId) {
        return json({ error: "encounter_scene_changed" }, 409);
      }

      if (experienceStore !== null) {
        const story={
          storyVersion:"encounter-story-v0.1",
          beats:[
            { actorThreadId:null,kind:"utterance",text:body.utterance },
            { actorThreadId:body.threadId,kind:"utterance",text:result.responseText },
          ],
        };
        const encounterStory=experienceStore.recordEncounterStory({
          occurredAt:body.occurredAt,
          threadPresence:[{
            threadId:body.threadId,
            situationId:situation.situationId,
          }],
          story,
          visualization:createEncounterVisualization({
            occurredAt:body.occurredAt,
            story,
            scene:"A visitor speaks with a Thread in the World-owned life already underway.",
            sourceReferences:[situation.situationId],
            depictedThreadRefs:[body.threadId],
          }),
        });
        const experienceText=await formThreadEncounterExperience({
          thread:livedContext.thread,
          situation:livedContext.situation,
          encounterStory,
          semanticStates:livedContext.semanticStates,
          memories:livedContext.memories,
          modelAdapter,
        });
        const attention=experienceStore.recordThreadEncounterAttention({
          threadId:body.threadId,
          encounterRef:encounterStory.encounterId,
          situationId:situation.situationId,
          occurredAt:body.occurredAt,
          outcome:"noticed",
          experienceText,
        });
        await queueThreadExperienceConsolidation({
          experienceStore,
          experienceRecord:attention.experience,
          queuedAt:body.occurredAt,
          onQueued:onExperienceQueued,
        });
      }
      return json({ ok: true, result });
    },
  });
}
