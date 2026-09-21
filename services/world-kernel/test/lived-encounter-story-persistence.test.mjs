import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const seed = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function seedThread(storage, threadId, name) {
  const thread = structuredClone(seed);
  thread.threadId = threadId;
  thread.identity.name = name;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt:"2026-09-21T17:00:00.000Z",
    createdBy:"fibre.test",
    lastEventId:`evt_seed_${threadId}`,
  };
  const world = openWorldStore(storage);
  try { world.seedThread(thread); }
  finally { world.close(); }
}

test("E0 persists one Encounter Story with separate Thread Experiences", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-e0-story-"));
  const storage = {
    infraDriver:createSqliteStateInfraDriver({ scopes:{ world:join(directory, "world.sqlite") } }),
    stateScopeId:"world",
  };

  try {
    seedThread(storage, "thr_e0_mina", "Mina");
    seedThread(storage, "thr_e0_noor", "Noor");

    const store = openLivedExperienceStore(storage);
    try {
      const story = store.recordEncounterStory({
        occurredAt:"2026-09-21T18:00:00.000Z",
        threadPresence:[
          { threadId:"thr_e0_mina", situationId:"sit_e0_mina" },
          { threadId:"thr_e0_noor", situationId:"sit_e0_noor" },
        ],
        story:{
          beats:[
            { actorThreadId:"thr_e0_mina", kind:"utterance", text:"Mind if I sit here?" },
            { actorThreadId:"thr_e0_noor", kind:"action", text:"Noor moves her notebook aside." },
          ],
        },
        visualization:createEncounterVisualization({
          occurredAt:"2026-09-21T18:00:00.000Z",
          story:{
            beats:[
              { actorThreadId:"thr_e0_mina", kind:"utterance", text:"Mind if I sit here?" },
              { actorThreadId:"thr_e0_noor", kind:"action", text:"Noor moves her notebook aside." },
            ],
          },
          scene:"A quiet shared table.",
          sourceReferences:["sit_e0_mina","sit_e0_noor"],
          depictedThreadRefs:[],
        }),
      });

      const mina = store.recordThreadExperience({
        threadId:"thr_e0_mina",
        encounterRef:story.encounterId,
        situationId:"sit_e0_mina",
        occurredAt:story.occurredAt,
      });
      const noor = store.recordThreadExperience({
        threadId:"thr_e0_noor",
        encounterRef:story.encounterId,
        situationId:"sit_e0_noor",
        occurredAt:story.occurredAt,
      });

      assert.equal(store.listEncounterStories("thr_e0_mina")[0].encounterId, story.encounterId,
        "Mina should resolve the shared story");
      assert.equal(store.listEncounterStories("thr_e0_noor")[0].encounterId, story.encounterId,
        "Noor should resolve the shared story");
      assert.equal(mina.encounterRef, noor.encounterRef,
        "private experiences should cite one objective story");
    } finally { store.close(); }
  } finally {
    rmSync(directory, { recursive:true, force:true });
  }
});
