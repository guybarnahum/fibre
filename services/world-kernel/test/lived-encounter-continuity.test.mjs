import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { respondToLivedEncounter } from "../src/lived-encounter-cognition.mjs";
import { formLivedEncounterMemory } from "../src/lived-encounter-memory.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withWorld(name, run) {
  const directory = mkdtempSync(join(tmpdir(), `${name}-`));
  const databasePath = join(directory, "world.sqlite");
  const infraDriver = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
  const storage = { infraDriver, stateScopeId: "world" };
  try { return run(storage); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(storage, threadId) {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-09-10T17:00:00Z",
    createdBy: "fibre.test",
    lastEventId: `evt_seed_${threadId}`,
  };
  const world = openWorldStore(storage);
  try { return world.seedThread(thread).thread; }
  finally { world.close(); }
}

function firstExperience(experienceStore, threadId) {
  const historyEvent = experienceStore.recordEncounter({
    threadId,
    situationId: "sit_b2_drawing",
    occurredAt: "2026-09-10T17:40:00Z",
    visitorUtterance: "That fox has a great expression.",
    responseText: "Thanks. I keep changing the ears.",
  });
  const journalEntry = experienceStore.recordJournalEntry({
    threadId,
    aboutEventRef: historyEvent.eventId,
    writtenAt: historyEvent.occurredAt,
    entryText: "They actually noticed the expression. I liked that more than I expected.",
  });
  return { historyEvent, journalEntry };
}

const semanticStateStore = { listCurrentState: () => [] };

function laterSituation(threadId) {
  return {
    situationId: "sit_b2_station_later",
    threadId,
    establishedAt: "2026-09-10T19:00:00Z",
    phase: "at_place",
    location: { kind: "place", placeRef: "place_station_later" },
    mediatedContext: null,
    activity: "Waiting for a train after the drawing session.",
    reason: "Life moved on to the next part of the day.",
    participantRefs: [],
    evidenceRefs: ["evt_later_station"],
    sourcePlanRefs: ["lplan_later"],
    resolution: {
      kind: "personal_plan",
      conflict: false,
      observedDivergence: false,
      governingPlanRef: "lplan_later",
      constrainedPlanRef: null,
      summary: "Observed life has moved on from the earlier drawing scene.",
    },
    provenance: { kind: "world_observation", observationEvidenceRefs: ["evt_later_station"] },
  };
}

async function formFirstMemory({ thread, historyEvent, journalEntry, memoryStore, retained }) {
  return formLivedEncounterMemory({
    thread,
    historyEvent,
    journalEntry,
    semanticStateStore,
    memoryStore,
    modelAdapter: {
      async invoke() {
        return retained ? {
          output: {
            outcome: "retained",
            rememberedContent: "I remember someone really looking at the expression in my fox drawing.",
            rememberedMeaning: "Specific attention to my work felt more meaningful than generic praise.",
            confidence: 0.8,
            salience: 0.72,
            uncertainty: [],
          },
          provenance: { provider: "fixture", modelId: "fixture-memory" },
        } : {
          output: {
            outcome: "not_remembered",
            rememberedContent: null,
            rememberedMeaning: null,
            confidence: null,
            salience: null,
            uncertainty: [],
          },
          provenance: { provider: "fixture", modelId: "fixture-memory" },
        };
      },
    },
  });
}

test("B2 after restart a later meeting can reflect retained experience without seeing old history or journal", async () => {
  await withWorld("fibre-b2-retained-continuity", async (storage) => {
    const thread = seed(storage, "thr_b2_retained");
    const experienceStore = openLivedExperienceStore(storage);
    let memoryStore = openAutobiographicalMemoryStore(storage);
    const first = firstExperience(experienceStore, thread.threadId);
    const formed = await formFirstMemory({ thread, ...first, memoryStore, retained: true });
    assert.equal(formed.outcome, "retained");
    memoryStore.close();
    experienceStore.close();

    memoryStore = openAutobiographicalMemoryStore(storage);
    try {
      let secondInput = null;
      const currentThread = (() => {
        const world = openWorldStore(storage);
        try { return world.getThread(thread.threadId); }
        finally { world.close(); }
      })();
      const result = await respondToLivedEncounter({
        thread: currentThread,
        encounter: { utterance: "Do you remember the fox?", occurredAt: "2026-09-10T19:05:00Z" },
        livedNowStore: { getCurrentSituation: () => laterSituation(thread.threadId) },
        semanticStateStore,
        memoryStore,
        modelAdapter: {
          async invoke(request) {
            secondInput = request.input;
            return {
              output: { responseText: "Yes. You noticed the expression, not just the drawing." },
              provenance: { provider: "fixture", modelId: "fixture-second-meeting" },
            };
          },
        },
      });

      assert.equal(result.grounding.situationId, "sit_b2_station_later");
      assert.deepEqual(result.grounding.memoryIds, [formed.memory.memoryId]);
      assert.equal(secondInput.autobiographicalMemories.length, 1);
      assert.equal(secondInput.autobiographicalMemories[0].rememberedContent, formed.memory.rememberedContent);
      assert.equal(Object.hasOwn(secondInput, "journal"), false);
      assert.equal(Object.hasOwn(secondInput, "encounterHistory"), false);
      assert.equal(secondInput.currentSituation.activity, "Waiting for a train after the drawing session.");
    } finally { memoryStore.close(); }
  });
});

test("B2 a later meeting cannot recollect an encounter that history and journal kept but memory did not", async () => {
  await withWorld("fibre-b2-forgotten-continuity", async (storage) => {
    const thread = seed(storage, "thr_b2_forgotten");
    const experienceStore = openLivedExperienceStore(storage);
    let memoryStore = openAutobiographicalMemoryStore(storage);
    const first = firstExperience(experienceStore, thread.threadId);
    const formed = await formFirstMemory({ thread, ...first, memoryStore, retained: false });
    assert.equal(formed.outcome, "not_remembered");
    memoryStore.close();
    experienceStore.close();

    memoryStore = openAutobiographicalMemoryStore(storage);
    try {
      let secondInput = null;
      await respondToLivedEncounter({
        thread,
        encounter: { utterance: "Do you remember my comment about the fox?", occurredAt: "2026-09-10T19:05:00Z" },
        livedNowStore: { getCurrentSituation: () => laterSituation(thread.threadId) },
        semanticStateStore,
        memoryStore,
        modelAdapter: {
          async invoke(request) {
            secondInput = request.input;
            return {
              output: { responseText: "I'm not sure what comment you mean." },
              provenance: { provider: "fixture", modelId: "fixture-second-meeting" },
            };
          },
        },
      });
      assert.deepEqual(secondInput.autobiographicalMemories, []);
    } finally { memoryStore.close(); }
  });
});
