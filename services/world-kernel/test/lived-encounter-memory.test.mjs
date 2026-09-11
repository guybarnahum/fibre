import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
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
    createdAt: "2026-09-10T18:00:00Z",
    createdBy: "fibre.test",
    lastEventId: `evt_seed_${threadId}`,
  };
  const world = openWorldStore(storage);
  try { return world.seedThread(thread).thread; }
  finally { world.close(); }
}

function experience(store, threadId) {
  const historyEvent = store.recordEncounter({
    threadId,
    situationId: "sit_b1_memory_drawing",
    occurredAt: "2026-09-10T18:30:00Z",
    visitorUtterance: "That fox has a great expression.",
    responseText: "Thanks. I keep changing the ears.",
  });
  const journalEntry = store.recordJournalEntry({
    threadId,
    aboutEventRef: historyEvent.eventId,
    writtenAt: historyEvent.occurredAt,
    entryText: "They noticed the expression instead of just saying the drawing was nice. That surprised me.",
  });
  return { historyEvent, journalEntry };
}

const semanticStateStore = {
  listCurrentState: () => [{
    stateId: "sem_b1_memory_pleased",
    domain: "emotion",
    dimension: "felt_state",
    target: null,
    state: "quietly pleased but still self-critical",
  }],
};

test("B1 retained experience becomes selective autobiographical memory grounded in the real encounter", async () => {
  await withWorld("fibre-b1-retained-memory", async (storage) => {
    const thread = seed(storage, "thr_b1_retained_memory");
    const experienceStore = openLivedExperienceStore(storage);
    const memoryStore = openAutobiographicalMemoryStore(storage);
    try {
      const { historyEvent, journalEntry } = experience(experienceStore, thread.threadId);
      const result = await formLivedEncounterMemory({
        thread,
        historyEvent,
        journalEntry,
        semanticStateStore,
        memoryStore,
        modelAdapter: {
          async invoke(request) {
            assert.equal(request.input.thread.stableTendencies.persistence, thread.genome.textualTraits.persistence);
            assert.equal(request.input.experience.journalEntry, journalEntry.entryText);
            assert.equal(request.input.priorMemories.length, 0);
            return {
              output: {
                outcome: "retained",
                rememberedContent: "I remember a stranger really looking at the expression in my fox drawing.",
                rememberedMeaning: "Being specifically noticed felt different from receiving generic praise.",
                confidence: 0.82,
                salience: 0.76,
                uncertainty: ["I do not remember their exact tone."],
              },
              provenance: { provider: "fixture", modelId: "fixture-memory" },
            };
          },
        },
      });

      assert.equal(result.outcome, "retained");
      assert.deepEqual(result.memory.eventRefs, [historyEvent.eventId]);
      assert.equal(result.memory.subject.originEventRef, historyEvent.eventId);
      assert.equal(result.memory.visibility, "private");
      assert.notEqual(result.memory.rememberedContent, journalEntry.entryText);
      assert.equal(memoryStore.listCurrentMemories(thread.threadId).length, 1);

      const world = openWorldStore(storage);
      try { assert.deepEqual(world.getThread(thread.threadId).memoryRefs, [result.memory.memoryId]); }
      finally { world.close(); }
    } finally {
      memoryStore.close();
      experienceStore.close();
    }
  });
});

test("B1 not_remembered preserves encounter and journal without manufacturing memory", async () => {
  await withWorld("fibre-b1-forgotten-memory", async (storage) => {
    const thread = seed(storage, "thr_b1_forgotten_memory");
    const experienceStore = openLivedExperienceStore(storage);
    const memoryStore = openAutobiographicalMemoryStore(storage);
    try {
      const { historyEvent, journalEntry } = experience(experienceStore, thread.threadId);
      const result = await formLivedEncounterMemory({
        thread,
        historyEvent,
        journalEntry,
        semanticStateStore,
        memoryStore,
        modelAdapter: {
          async invoke() {
            return {
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

      assert.equal(result.outcome, "not_remembered");
      assert.equal(result.memory, null);
      assert.equal(experienceStore.listEncounters(thread.threadId).length, 1);
      assert.equal(experienceStore.listJournal(thread.threadId).length, 1);
      assert.equal(memoryStore.listCurrentMemories(thread.threadId).length, 0);
    } finally {
      memoryStore.close();
      experienceStore.close();
    }
  });
});
