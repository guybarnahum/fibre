import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { internalizeLivedEncounter } from "../src/lived-encounter-reflection.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function seededThread(storage, threadId) {
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

function withWorld(name, run) {
  const directory = mkdtempSync(join(tmpdir(), `${name}-`));
  const databasePath = join(directory, "world.sqlite");
  const infraDriver = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
  const storage = { infraDriver, stateScopeId: "world" };
  try { return run(storage); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

const encounter = {
  utterance: "That fox has a great expression.",
  occurredAt: "2026-09-10T18:30:00Z",
};
const encounterResult = {
  responseText: "Thanks. I keep changing the ears.",
  grounding: { situationId: "sit_drawing_fox", semanticStateIds: [] },
};
const semanticStateStore = { listCurrentState: () => [] };

function modelReturning(journalEntry) {
  return {
    async invoke(request) {
      assert.equal(request.input.encounter.visitorUtterance, encounter.utterance);
      assert.equal(request.input.encounter.responseText, encounterResult.responseText);
      return {
        output: { journalEntry },
        provenance: { provider: "fixture", modelId: "fixture-reflection" },
      };
    },
  };
}

test("B1 maps an objective encounter to the Thread's private first-person journal", async () => {
  await withWorld("fibre-b1-journal", async (storage) => {
    const thread = seededThread(storage, "thr_b1_journal");
    const experienceStore = openLivedExperienceStore(storage);
    try {
      const result = await internalizeLivedEncounter({
        thread,
        encounter,
        encounterResult,
        semanticStateStore,
        experienceStore,
        modelAdapter: modelReturning(
          "I liked that they noticed the expression instead of just saying the drawing was nice. It made me look at the fox differently.",
        ),
      });

      const history = experienceStore.listEncounters(thread.threadId);
      const journal = experienceStore.listJournal(thread.threadId);
      assert.equal(history.length, 1);
      assert.equal(journal.length, 1);
      assert.equal(journal[0].aboutEventRef, history[0].eventId);
      assert.equal(result.historyEvent.eventId, history[0].eventId);
      assert.equal(result.journalEntry.journalEntryId, journal[0].journalEntryId);
      assert.notEqual(journal[0].entryText, `${encounter.utterance}\n${encounterResult.responseText}`);
    } finally { experienceStore.close(); }
  });
});

test("B1 keeps the lived encounter as history even when the Thread writes no journal note", async () => {
  await withWorld("fibre-b1-no-journal", async (storage) => {
    const thread = seededThread(storage, "thr_b1_no_journal");
    const experienceStore = openLivedExperienceStore(storage);
    try {
      const result = await internalizeLivedEncounter({
        thread,
        encounter,
        encounterResult,
        semanticStateStore,
        experienceStore,
        modelAdapter: modelReturning(null),
      });

      assert.equal(result.journalEntry, null);
      assert.equal(experienceStore.listEncounters(thread.threadId).length, 1);
      assert.equal(experienceStore.listJournal(thread.threadId).length, 0);
    } finally { experienceStore.close(); }
  });
});
