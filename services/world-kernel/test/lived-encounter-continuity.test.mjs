import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { createLivedEncounterWriteApi } from "../src/lived-encounter-write-api.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { livedPlanId, livedSituationId } from "../src/lived-now.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { placeEpisodeId } from "../src/situated-life-domain.mjs";
import { placeEpisodeRevisionRef } from "../src/situated-life-evidence.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const PRIVATE_TOKEN = "private-token-b2";
const FIRST_AT = "2026-09-10T17:40:00Z";
const LATER_AT = "2026-09-10T18:40:00Z";

async function withWorld(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-b2-lived-world-"));
  const databasePath = join(directory, "world.sqlite");
  const infraDriver = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
  const storage = { infraDriver, stateScopeId: "world" };
  try { return await run(storage); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function seedLife(storage) {
  const thread = structuredClone(mina);
  thread.threadId = "thr_b2_maya";
  thread.identity = {
    ...thread.identity,
    name: "Maya Vale",
    selfDescription: "I am curious about animals and drawing, and I care when someone notices a detail I worked on.",
  };
  thread.currentState = {
    ...thread.currentState,
    selfModel: "I learn by looking closely, drawing details, and carrying interesting questions with me.",
    unresolvedIntentions: ["Finish the fox sketch, then return my library book."],
  };
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = { createdAt: "2026-09-10T17:00:00Z", createdBy: "fibre.test" };

  const world = openWorldStore(storage);
  const seeded = world.seedThread(thread).thread;
  const sourceEvent = world.listEvents(thread.threadId)[0].eventId;
  world.close();

  const situated = openSituatedLifeStore(storage);
  const place = (label, displayName, episodeKind, recordedAt) => {
    const record = situated.recordPlaceEpisode({
      episodeId: placeEpisodeId({ threadId: thread.threadId, label }),
      revision: 1,
      threadId: thread.threadId,
      episodeKind,
      place: {
        placeId: `place.b2.${label}`,
        displayName,
        countryCode: "US",
        region: "Arizona",
        locality: "Tucson",
        precision: "locality",
      },
      startAt: "2025-01-01T00:00:00Z",
      endAt: null,
      sourceReferences: [sourceEvent],
      visibility: "private",
      provenance: "thread_history",
      recordedAt,
    });
    return placeEpisodeRevisionRef(record);
  };
  const homeRef = place("home", "Home", "residence", "2026-09-10T17:01:00Z");
  const libraryRef = place("library", "Neighborhood library", "formative_presence", "2026-09-10T17:02:00Z");
  situated.close();

  const plan = {
    planId: livedPlanId({ threadId: thread.threadId, authoredAt: "2026-09-10T17:10:00Z" }),
    kind: "personal",
    subjectThreadId: thread.threadId,
    owner: { partyId: thread.threadId, kind: "thread" },
    authoredAt: "2026-09-10T17:10:00Z",
    horizonStart: "2026-09-10T17:10:00Z",
    horizonEnd: "2026-09-10T19:10:00Z",
    stops: [
      {
        startAt: "2026-09-10T17:15:00Z",
        endAt: "2026-09-10T18:00:00Z",
        physicalPlaceRef: homeRef,
        mediatedContext: null,
        activity: "Finish the fox sketch at the desk.",
        purpose: "I want to get the expression right before I leave.",
        companionRefs: [],
        travelFromPrevious: null,
      },
      {
        startAt: "2026-09-10T18:30:00Z",
        endAt: "2026-09-10T19:10:00Z",
        physicalPlaceRef: libraryRef,
        mediatedContext: null,
        activity: "Return a book and look through animal drawing references.",
        purpose: "I want another look at how animals hold their ears and faces.",
        companionRefs: [],
        travelFromPrevious: "Walk to the neighborhood library.",
      },
    ],
    sourceReferences: [sourceEvent, homeRef, libraryRef],
    cognition: { provider: "fixture", modelId: "fixture-plan", providerRequestId: "req_b2_plan" },
  };

  const livedNow = openLivedNowStore(storage);
  livedNow.recordPlan(plan);
  const firstSituation = livedNow.enactCurrentSituation({
    threadId: thread.threadId,
    situationId: livedSituationId({ threadId: thread.threadId, at: "2026-09-10T17:30:00Z" }),
    establishedAt: "2026-09-10T17:30:00Z",
    observation: {
      phase: "at_place",
      location: { kind: "place", placeRef: homeRef },
      mediatedContext: null,
      activity: "Finish the fox sketch at the desk.",
      reason: "World observation finds Maya still working on the sketch before leaving.",
      participantRefs: [],
      evidenceRefs: [sourceEvent],
    },
  });
  livedNow.close();

  return { thread: seeded, sourceEvent, homeRef, libraryRef, plan, firstSituation };
}

function encounterRequest(threadId, situationId, utterance, occurredAt) {
  return new Request("https://world.internal/internal/lived-encounter", {
    method: "POST",
    headers: { "content-type": "application/json", "x-fibre-private-token": PRIVATE_TOKEN },
    body: JSON.stringify({ threadId, expectedSituationId: situationId, utterance, occurredAt }),
  });
}

function cognitionAdapter({ secondEncounter }) {
  return {
    async invoke(request) {
      if (request.clientRequestId.startsWith("lived-encounter_")) {
        if (request.input.visitorUtterance.includes("remember")) {
          secondEncounter.input = structuredClone(request.input);
          return {
            output: { responseText: "Yes. You noticed the fox's expression, which stuck with me." },
            provenance: { provider: "fixture", modelId: "fixture-b2-encounter" },
          };
        }
        return {
          output: { responseText: "Thanks. I keep changing the ears." },
          provenance: { provider: "fixture", modelId: "fixture-b2-encounter" },
        };
      }
      if (request.clientRequestId.startsWith("lived-reflection_")) {
        return {
          output: {
            journalEntry: request.input.encounter.visitorUtterance.includes("remember")
              ? null
              : "They noticed the expression instead of just saying the drawing was nice. I liked that.",
          },
          provenance: { provider: "fixture", modelId: "fixture-b2-reflection" },
        };
      }
      if (request.clientRequestId.startsWith("lived-memory_")) {
        const first = request.input.experience.visitorUtterance.includes("expression");
        return {
          output: first ? {
            outcome: "retained",
            rememberedContent: "I remember someone really looking at the expression in my fox drawing.",
            rememberedMeaning: "Specific attention to my work felt more meaningful than generic praise.",
            confidence: 0.8,
            salience: 0.72,
            uncertainty: [],
          } : {
            outcome: "not_remembered",
            rememberedContent: null,
            rememberedMeaning: null,
            confidence: null,
            salience: null,
            uncertainty: [],
          },
          provenance: { provider: "fixture", modelId: "fixture-b2-memory" },
        };
      }
      throw new Error("unexpected B2 cognition pass");
    },
  };
}

function encounterApi(storage, modelAdapter) {
  const stores = {
    world: openWorldStore(storage),
    livedNow: openLivedNowStore(storage),
    semantic: openSemanticStateStore(storage),
    experience: openLivedExperienceStore(storage),
    memory: openAutobiographicalMemoryStore(storage),
  };
  return {
    api: createLivedEncounterWriteApi({
      worldReader: stores.world,
      livedNowStore: stores.livedNow,
      semanticStateStore: stores.semantic,
      experienceStore: stores.experience,
      memoryStore: stores.memory,
      modelAdapter,
      privateToken: PRIVATE_TOKEN,
    }),
    close() { Object.values(stores).forEach((store) => store.close()); },
  };
}

test("B2 life moves on after the visitor, survives restart, and only retained experience reaches the next meeting", async () => {
  await withWorld(async (storage) => {
    const life = seedLife(storage);
    const secondEncounter = { input: null };
    const modelAdapter = cognitionAdapter({ secondEncounter });

    let runtime = encounterApi(storage, modelAdapter);
    const first = await runtime.api.fetch(encounterRequest(
      life.thread.threadId,
      life.firstSituation.situationId,
      "That fox has a great expression.",
      FIRST_AT,
    ));
    assert.equal(first.status, 200, "the first meeting should enter Maya's lived moment");
    runtime.close();

    const livedNow = openLivedNowStore(storage);
    const laterSituation = livedNow.enactCurrentSituation({
      threadId: life.thread.threadId,
      situationId: livedSituationId({ threadId: life.thread.threadId, at: LATER_AT }),
      establishedAt: LATER_AT,
      observation: {
        phase: "at_place",
        location: { kind: "place", placeRef: life.libraryRef },
        mediatedContext: null,
        activity: "Return a book and look through animal drawing references.",
        reason: "World observation finds Maya at the library in the next part of her own plan.",
        participantRefs: [],
        evidenceRefs: [life.sourceEvent],
      },
    });
    assert.notEqual(laterSituation.situationId, life.firstSituation.situationId, "life should move beyond the visitor's scene");
    assert.equal(laterSituation.location.placeRef, life.libraryRef, "Maya's plan should carry her to the later place");
    livedNow.close();

    runtime = encounterApi(storage, modelAdapter);
    const second = await runtime.api.fetch(encounterRequest(
      life.thread.threadId,
      laterSituation.situationId,
      "Do you remember what I said about the fox?",
      "2026-09-10T18:45:00Z",
    ));
    runtime.close();

    assert.equal(second.status, 200, "the second meeting should enter the continued life");
    assert.equal(secondEncounter.input.currentSituation.situationId, laterSituation.situationId,
      "the second meeting should happen where life actually moved");
    assert.equal(secondEncounter.input.autobiographicalMemories.length, 1,
      "only experience Maya retained should carry into the later meeting");
    assert.match(secondEncounter.input.autobiographicalMemories[0].rememberedContent, /fox drawing/,
      "the later meeting should receive Maya's recollection, not the old transcript");
  });
});
