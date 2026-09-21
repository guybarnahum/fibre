import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { createEnvironmentalEncounterService } from "../src/lived-environmental-encounter.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { placeEpisodeRevisionRef } from "../src/situated-life-evidence.mjs";

const baseThread = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const AT = "2026-09-21T18:00:00.000Z";

function thread() {
  const value = structuredClone(baseThread);
  value.threadId = "thr_e1_park";
  value.relationshipRefs = [];
  value.memoryRefs = [];
  value.provenance = {
    createdAt:"2026-09-21T17:00:00.000Z",
    createdBy:"fibre.test",
    lastEventId:"evt_seed_e1_park",
  };
  return value;
}

function parkEpisode() {
  return {
    episodeId:"plce_e1_park",
    revision:1,
    threadId:"thr_e1_park",
    episodeKind:"formative_presence",
    place:{
      placeId:"place_e1_park",
      displayName:"Reid Park",
      countryCode:"US",
      region:"AZ",
      locality:"Tucson",
      precision:"locality",
    },
    startAt:"2026-09-21T17:00:00.000Z",
    endAt:null,
    sourceReferences:["evt_e1_park_presence"],
    visibility:"private",
    status:"current",
    provenance:"thread_history",
    recordedAt:"2026-09-21T17:00:00.000Z",
  };
}

test("E1 an unscheduled World occurrence may enter lived attention or pass unnoticed", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-e1-environment-"));
  const storage = {
    infraDriver:createSqliteStateInfraDriver({ scopes:{ world:join(directory, "world.sqlite") } }),
    stateScopeId:"world",
  };

  try {
    const activeThread = thread();
    const world = openWorldStore(storage);
    try { world.seedThread(activeThread); }
    finally { world.close(); }

    const place = parkEpisode();
    const situation = {
      situationId:"sit_e1_park_walk",
      threadId:activeThread.threadId,
      establishedAt:AT,
      location:{ kind:"place", placeRef:placeEpisodeRevisionRef(place) },
      mediatedContext:null,
      activity:"walking slowly along a park path, looking down and around without urgency",
      evidenceRefs:["evt_e1_park_presence"],
    };
    const experienceStore = openLivedExperienceStore(storage);
    const retained = [];
    const invocations = [];

    const modelAdapter = {
      async invoke(request) {
        invocations.push(structuredClone(request));
        if (request.clientRequestId.startsWith("encounter-attention_")) {
          const occurrence = request.input.encounterStory.story.beats[0].text;
          return occurrence.includes("bee")
            ? {
                output:{
                  outcome:"noticed",
                  experienceText:"I caught the bee hovering at the flower and stopped for a second. Something about its tiny concentration made the whole walk feel quieter.",
                },
                provenance:{ provider:"fixture", modelId:"fixture-e1" },
              }
            : {
                output:{ outcome:"not_noticed", experienceText:null },
                provenance:{ provider:"fixture", modelId:"fixture-e1" },
              };
        }
        if (request.clientRequestId.startsWith("encounter-reflection_")) {
          return {
            output:{ journalEntry:null },
            provenance:{ provider:"fixture", modelId:"fixture-e1" },
          };
        }
        if (request.clientRequestId.startsWith("lived-memory_")) {
          assert.match(request.input.experience.experiencedAs, /tiny concentration/u,
            "memory should receive lived experience");
          return {
            output:{
              outcome:"retained",
              rememberedContent:"I remember stopping to watch a bee work at a flower during a park walk.",
              rememberedMeaning:"Tiny ordinary things can pull me fully into the moment.",
              confidence:0.9,
              salience:0.65,
              uncertainty:[],
            },
            provenance:{ provider:"fixture", modelId:"fixture-e1" },
          };
        }
        throw new Error(`unexpected cognition ${request.clientRequestId}`);
      },
    };

    const service = createEnvironmentalEncounterService({
      worldReader:{ getThread:() => structuredClone(activeThread) },
      livedNow:{ ensure:async () => structuredClone(situation) },
      livedNowStore:{ getCurrentSituation:() => structuredClone(situation) },
      situatedLifeStore:{ listCurrentPlaceEpisodes:() => [structuredClone(place)] },
      semanticStateStore:{ listCurrentState:() => [] },
      memoryStore:{
        listCurrentMemories:() => [],
        recordMemory(candidate) {
          retained.push(structuredClone(candidate));
          return structuredClone(candidate);
        },
      },
      experienceStore,
      modelAdapter,
    });

    const noticed = await service.encounter({
      threadId:activeThread.threadId,
      at:AT,
      occurrence:{
        occurrenceRef:"occ_e1_bee",
        description:"A bee settles onto a small yellow flower beside the path and moves deliberately around its center.",
      },
    });
    const missed = await service.encounter({
      threadId:activeThread.threadId,
      at:"2026-09-21T18:02:00.000Z",
      occurrence:{
        occurrenceRef:"occ_e1_cloud",
        description:"A thin cloud briefly softens the sunlight over the park.",
      },
    });

    assert.equal(noticed.attention.outcome, "noticed", "bee should enter lived attention");
    assert.match(noticed.attention.experience.experienceText, /whole walk feel quieter/u,
      "noticed occurrence should become personal experience");
    assert.match(noticed.encounterStory.visualization.visualizationPrompt, /bee settles onto a small yellow flower/u,
      "Encounter Story should remain visually reconstructable");
    assert.deepEqual(
      noticed.encounterStory.visualization.depictedThreadRefs,
      [],
      "visualization should not invent an unbound likeness",
    );
    assert.equal(retained.length, 1, "noticed occurrence may become autobiographical memory");

    assert.equal(missed.attention.outcome, "not_noticed", "cloud may pass outside lived attention");
    assert.equal(missed.attention.experience, null, "unnoticed occurrence must not fabricate Thread Experience");
    assert.equal(missed.aftermath, null, "unnoticed occurrence must not create private aftermath");
    assert.equal(retained.length, 1, "unnoticed occurrence must not create memory");
  } finally {
    experienceStore.close();
    rmSync(directory, { recursive:true, force:true });
  }
});
