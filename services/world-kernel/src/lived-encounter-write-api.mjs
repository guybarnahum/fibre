import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";
import { respondToLivedEncounter } from "./lived-encounter-cognition.mjs";
import { internalizeLivedEncounter } from "./lived-encounter-reflection.mjs";
import { formLivedEncounterMemory } from "./lived-encounter-memory.mjs";

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
    headers: { "cache-control": "no-store" },
  });
}

function requireDependency(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

export function createLivedEncounterWriteApi({
  worldReader,
  livedNowStore,
  semanticStateStore,
  modelAdapter,
  experienceStore = null,
  memoryStore = null,
  privateToken,
}) {
  requireDependency("worldReader", worldReader, "getThread");
  requireDependency("livedNowStore", livedNowStore, "getCurrentSituation");
  requireDependency("semanticStateStore", semanticStateStore, "listCurrentState");
  requireDependency("modelAdapter", modelAdapter, "invoke");
  if (experienceStore !== null) {
    requireDependency("experienceStore", experienceStore, "recordEncounter");
    requireDependency("experienceStore", experienceStore, "recordJournalEntry");
  }
  if (memoryStore !== null) {
    if (experienceStore === null) throw new TypeError("memoryStore requires experienceStore");
    requireDependency("memoryStore", memoryStore, "listCurrentMemories");
    requireDependency("memoryStore", memoryStore, "recordMemory");
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

      const encounter = { utterance: body.utterance, occurredAt: body.occurredAt };
      const result = await respondToLivedEncounter({
        thread,
        encounter,
        livedNowStore,
        semanticStateStore,
        modelAdapter,
      });
      if (result.grounding.situationId !== body.expectedSituationId) {
        return json({ error: "encounter_scene_changed" }, 409);
      }

      if (experienceStore !== null) {
        const internalized = await internalizeLivedEncounter({
          thread,
          encounter,
          encounterResult: result,
          semanticStateStore,
          experienceStore,
          modelAdapter,
        });
        if (memoryStore !== null) {
          await formLivedEncounterMemory({
            thread,
            historyEvent: internalized.historyEvent,
            journalEntry: internalized.journalEntry,
            semanticStateStore,
            memoryStore,
            modelAdapter,
          });
        }
      }
      return json({ ok: true, result });
    },
  });
}
