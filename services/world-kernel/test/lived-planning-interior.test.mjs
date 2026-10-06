import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMemoryId,
} from "../src/autobiographical-memory-domain.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";
import { formPersonalLivedPlan } from "../src/lived-plan-cognition.mjs";
import { explorationInteroceptionForLivedContinuity } from "../src/lived-now-regulation.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { placeEpisodeId } from "../src/situated-life-domain.mjs";
import { placeEpisodeRevisionRef } from "../src/situated-life-evidence.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-lived-planning-interior-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return await run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function seedThread(worldStore, threadId, name, createdAt, runtimeBaselines = null) {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.identity = {
    ...thread.identity,
    name,
    selfDescription: "I am still learning what kinds of ordinary surroundings help me do good work.",
  };
  if (runtimeBaselines !== null) thread.genome.runtimeBaselines = structuredClone(runtimeBaselines);
  thread.currentState = {
    needs: [],
    feelings: [],
    selfModel: "I am still learning what kinds of ordinary surroundings help me do good work.",
    unresolvedIntentions: [],
  };
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt,
    createdBy: "lived-planning-interior-test",
  };
  worldStore.seedThread(thread);
  return worldStore.listEvents(threadId)[0];
}

function recordMeaning(memoryStore, { threadId, event, rememberedMeaning, recordedAt }) {
  const subject = { originEventRef:event.eventId, slot:"ordinary-company-meaning" };
  const memoryId = autobiographicalMemoryId({
    threadId,
    originReference:subject.originEventRef,
    slot:subject.slot,
  });
  memoryStore.recordMemory({
    memoryId,
    revision:1,
    threadId,
    subject,
    subjectPeriod:{ startAt:event.occurredAt, endAt:event.occurredAt },
    eventRefs:[event.eventId],
    rememberedMeaning,
    asOf:recordedAt,
    confidence:0.9,
    uncertainty:[],
    salience:0.95,
    accessibility:"accessible",
    retentionState:"retained",
    authorship:{
      kind:"fibre_policy_derived",
      entityId:"fibre.world-kernel",
      policy:{ ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs:[],
    contradictingEvidenceRefs:[],
    visibility:"private",
    status:"current",
    recordedAt,
  });
  return memoryId;
}

function planningPlaceAuthority(records) {
  const byRef=new Map(records.map((record)=>[record.ref,record]));
  return {
    getWorldPlace(_threadId,reference,{ required=true }={}){
      const place=byRef.get(reference)??null;
      if(place!==null)return structuredClone(place);
      if(required)throw new TypeError(`missing planning place ${reference}`);
      return null;
    },
  };
}

function fixturePlanningModel() {
  let sharedExternalContext = null;
  return {
    provider:"fixture",
    modelId:"fixture-lived-planning",
    async invoke(call) {
      const external = call.input.concern.externalContext;
      if (sharedExternalContext === null) {
        sharedExternalContext = structuredClone(external);
      } else {
        assert.deepEqual(external, sharedExternalContext, "planning World conditions must stay equivalent");
      }

      const memory = call.input.developedSelfEvidence.find((item) => item.kind === "memory");
      assert.ok(memory, "persisted remembered meaning should reach planning");
      const welcomesCompany = /quiet company restored me/u.test(memory.text);
      return {
        output:{
          result:{
            stops:[{
              startAt:external.horizon.startAt,
              endAt:external.horizon.endAt,
              physicalPlaceRef:external.startingPlaceRef,
              presenceMode:"physical",
              mediatedContext:"",
              activity:welcomesCompany
                ? "Read and sketch while sharing the room quietly with other people."
                : "Read and sketch alone, keeping the room quiet and interruption-free.",
              purpose:welcomesCompany
                ? "Quiet company has helped me settle into focused work before."
                : "Background social presence has made focused work harder for me before.",
              travelFromPrevious:"",
            }],
          },
          evidenceRefs:[memory.ref],
          conflictingMotives:[],
          uncertainty:null,
        },
        provenance:{
          provider:"fixture",
          modelId:"fixture-lived-planning",
          providerRequestId:call.clientRequestId,
          usage:{ inputTokens:160, outputTokens:55, totalTokens:215 },
        },
      };
    },
  };
}

test("persisted lived meaning bends an otherwise equivalent personal Flight Plan", async () =>
  withDatabase(async (databasePath) => {
    const storage = localWorldStateStorage(databasePath);
    const worldStore = openWorldStore(storage);
    const firstEvent = seedThread(
      worldStore,
      "thr_lived_plan_a",
      "Ada Vale",
      "2026-09-20T08:00:00.000Z",
    );
    const secondEvent = seedThread(
      worldStore,
      "thr_lived_plan_b",
      "Ben Vale",
      "2026-09-20T08:00:00.000Z",
    );

    const identityStore = openIdentityStore(storage);
    const semanticStateStore = openSemanticStateStore(storage);
    const memoryStore = openAutobiographicalMemoryStore(storage);
    const situatedLifeStore = openSituatedLifeStore(storage);

    const memoryA = recordMeaning(memoryStore, {
      threadId:"thr_lived_plan_a",
      event:firstEvent,
      rememberedMeaning:"After a long solitary stretch, quiet company restored me without disrupting my work.",
      recordedAt:"2026-09-21T12:00:00.000Z",
    });
    const memoryB = recordMeaning(memoryStore, {
      threadId:"thr_lived_plan_b",
      event:secondEvent,
      rememberedMeaning:"When I kept background social presence around while concentrating, I became tense and protected solitude afterward.",
      recordedAt:"2026-09-21T12:00:00.000Z",
    });

    const sourceStores = {
      worldStore,
      identityStore,
      semanticStateStore,
      memoryStore,
      situatedLifeStore,
      livedNowStore:planningPlaceAuthority([{
        ref:"place_shared_reading_room",
        placeKind:"library_or_learning",
        displayName:"A shared reading room with desks, books and other readers.",
      }]),
    };
    const modelAdapter = fixturePlanningModel();
    const planInput = {
      authoredAt:"2026-09-22T09:00:00.000Z",
      horizonEnd:"2026-09-22T13:00:00.000Z",
      availablePlaceRefs:["place_shared_reading_room"],
      startingPlaceRef:"place_shared_reading_room",
      modelAdapter,
    };

    const [planA, planB] = await Promise.all([
      formPersonalLivedPlan({
        ...planInput,
        threadId:"thr_lived_plan_a",
        sourceReferences:[firstEvent.eventId],
        sourceStores,
      }),
      formPersonalLivedPlan({
        ...planInput,
        threadId:"thr_lived_plan_b",
        sourceReferences:[secondEvent.eventId],
        sourceStores,
      }),
    ]);

    assert.notEqual(
      planA.stops[0].activity,
      planB.stops[0].activity,
      "different lives should bend equivalent ordinary planning",
    );
    assert.equal(
      planA.sourceReferences.includes(memoryA),
      false,
      "private memory evidence must not become World/situated plan evidence",
    );
    assert.equal(
      planB.sourceReferences.includes(memoryB),
      false,
      "private memory evidence must not become World/situated plan evidence",
    );
    assert.ok(
      planA.cognition.selectedEvidenceRefs.includes(memoryA),
      "Ada's memory should remain in the private cognition witness",
    );
    assert.ok(
      planB.cognition.selectedEvidenceRefs.includes(memoryB),
      "Ben's memory should remain in the private cognition witness",
    );
    assert.deepEqual(
      planA.cognition.evidenceRefs,
      [memoryA],
      "Ada's cited causal memory should remain inspectable",
    );
    assert.deepEqual(
      planB.cognition.evidenceRefs,
      [memoryB],
      "Ben's cited causal memory should remain inspectable",
    );
    assert.notEqual(
      planA.cognition.contextDigest,
      planB.cognition.contextDigest,
      "different developed lives should bind different cognition contexts",
    );

    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    identityStore.close();
    worldStore.close();
  }));

test("personal Flight Plan admission keeps private cognition evidence separate from situated authority", async () =>
  withDatabase(async (databasePath) => {
    const storage = localWorldStateStorage(databasePath);
    const worldStore = openWorldStore(storage);
    const event = seedThread(
      worldStore,
      "thr_lived_plan_admission",
      "Cara Vale",
      "2026-09-20T08:00:00.000Z",
    );
    const identityStore = openIdentityStore(storage);
    const semanticStateStore = openSemanticStateStore(storage);
    const memoryStore = openAutobiographicalMemoryStore(storage);
    const situatedLifeStore = openSituatedLifeStore(storage);
    const livedNowStore = openLivedNowStore(storage);

    const memoryId = recordMeaning(memoryStore, {
      threadId:"thr_lived_plan_admission",
      event,
      rememberedMeaning:"After a long solitary stretch, quiet company restored me without disrupting my work.",
      recordedAt:"2026-09-21T12:00:00.000Z",
    });
    const place = situatedLifeStore.recordPlaceEpisode({
      episodeId:placeEpisodeId({ threadId:"thr_lived_plan_admission", place:"reading-room" }),
      revision:1,
      threadId:"thr_lived_plan_admission",
      episodeKind:"residence",
      place:{
        placeId:"place.test.reading-room",
        displayName:"Reading room",
        countryCode:"US",
        region:"Arizona",
        locality:"Tucson",
        precision:"locality",
      },
      startAt:"2026-09-20T08:00:00.000Z",
      endAt:null,
      sourceReferences:[event.eventId],
      visibility:"private",
      provenance:"thread_history",
      recordedAt:"2026-09-20T08:01:00.000Z",
    });
    const placeRef = placeEpisodeRevisionRef(place);

    const plan = await formPersonalLivedPlan({
      threadId:"thr_lived_plan_admission",
      authoredAt:"2026-09-22T09:00:00.000Z",
      horizonEnd:"2026-09-22T13:00:00.000Z",
      availablePlaces:[{ ref:placeRef, displayName:"Reading room" }],
      startingPlaceRef:placeRef,
      sourceReferences:[event.eventId],
      sourceStores:{
        worldStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        livedNowStore,
      },
      modelAdapter:fixturePlanningModel(),
    });

    const admitted = livedNowStore.recordPlan(plan);
    assert.deepEqual(
      admitted.sourceReferences.sort(),
      [event.eventId, placeRef].sort(),
      "World plan evidence should contain only situated/event authority",
    );
    assert.deepEqual(
      admitted.cognition.evidenceRefs,
      [memoryId],
      "private causal memory should remain inspectable in cognition provenance",
    );

    livedNowStore.close();
    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    identityStore.close();
    worldStore.close();
  }));



test("Flight Planning receives actual local civil time for a non-UTC World", async () =>
  withDatabase(async (databasePath) => {
    const storage = localWorldStateStorage(databasePath);
    const worldStore = openWorldStore(storage);
    const event = seedThread(
      worldStore,
      "thr_lived_plan_local_time",
      "Nino Vale",
      "2026-09-20T08:00:00.000Z",
      {
        circadianPhaseOffsetMinutes:90,
        sleepNeedMinutes:480,
        regulatorRestSensitivity:1.05,
      },
    );
    const identityStore = openIdentityStore(storage);
    const semanticStateStore = openSemanticStateStore(storage);
    const memoryStore = openAutobiographicalMemoryStore(storage);
    const situatedLifeStore = openSituatedLifeStore(storage);

    let observedLocalHorizon = null;
    let observedDailyRhythm = null;
    const modelAdapter = {
      async invoke(call) {
        const external = call.input.concern.externalContext;
        observedLocalHorizon = structuredClone(external.localHorizon);
        observedDailyRhythm = structuredClone(external.dailyRhythm);
        return {
          output:{
            result:{
              stops:[{
                startAt:external.horizon.startAt,
                endAt:external.horizon.endAt,
                physicalPlaceRef:external.startingPlaceRef,
                presenceMode:"physical",
                mediatedContext:"",
                activity:"Continue the ordinary day from the current place.",
                purpose:"Follow the life already underway.",
                travelFromPrevious:"",
              }],
            },
            evidenceRefs:[],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-local-civil-time",
            providerRequestId:call.clientRequestId,
          },
        };
      },
    };

    await formPersonalLivedPlan({
      threadId:"thr_lived_plan_local_time",
      authoredAt:"2026-09-23T04:30:00.000Z",
      horizonEnd:"2026-09-23T16:30:00.000Z",
      availablePlaceRefs:["place_current"],
      startingPlaceRef:"place_current",
      sourceReferences:[event.eventId],
      sourceStores:{
        worldStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        livedNowStore:planningPlaceAuthority([{
          ref:"place_current",
          placeKind:"library_or_learning",
          displayName:"Current place",
        }]),
      },
      modelAdapter,
      worldTimeZone:"Asia/Tbilisi",
    });

    assert.deepEqual(observedLocalHorizon, {
      timeZone:"Asia/Tbilisi",
      start:{ date:"2026-09-23", time:"08:30", weekday:"Wednesday" },
      end:{ date:"2026-09-23", time:"20:30", weekday:"Wednesday" },
    }, "planning should see the World's local civil horizon rather than the UTC clock");
    assert.equal(observedDailyRhythm.sleepNeedHours, 8, "inherited sleep need should reach planning");
    assert.equal(observedDailyRhythm.flexibility, "soft", "rhythm should remain a tendency, not a schedule");
    assert.equal(
      "circadianPhaseOffsetMinutes" in observedDailyRhythm
        || "regulatorRestSensitivity" in observedDailyRhythm,
      false,
      "planning should receive a derived rhythm cue rather than raw genome baselines",
    );

    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    identityStore.close();
    worldStore.close();
  }));


test("X1 grounded exploration reaches the existing planning mind without becoming World authority", async () =>
  withDatabase(async (databasePath) => {
    const storage = localWorldStateStorage(databasePath);
    const worldStore = openWorldStore(storage);
    const event = seedThread(
      worldStore,
      "thr_x1_exploration",
      "Mira Vale",
      "2026-09-20T08:00:00.000Z",
    );
    const thread = worldStore.getThread("thr_x1_exploration");
    const identityStore = openIdentityStore(storage);
    const semanticStateStore = openSemanticStateStore(storage);
    const memoryStore = openAutobiographicalMemoryStore(storage);
    const situatedLifeStore = openSituatedLifeStore(storage);
    const sourceStores = {
      worldStore,
      identityStore,
      semanticStateStore,
      memoryStore,
      situatedLifeStore,
      livedNowStore:planningPlaceAuthority([
        { ref:"place_x1_home",placeKind:"residence",displayName:"Home" },
        { ref:"place_x1_library",placeKind:"library_or_learning",displayName:"Neighborhood library" },
      ]),
    };
    const previousSituation = {
      situationId:"sit_x1_same_1",
      threadId:thread.threadId,
      establishedAt:"2026-09-22T08:00:00.000Z",
      phase:"at_place",
      location:{ kind:"place", placeRef:"place_x1_home" },
      mediatedContext:null,
      activity:"Reading technical notes at home.",
      participantRefs:[],
    };
    const currentSituation = {
      ...previousSituation,
      situationId:"sit_x1_same_2",
      establishedAt:"2026-09-22T08:30:00.000Z",
    };
    const interoception = explorationInteroceptionForLivedContinuity({
      thread,
      previousSituation,
      currentSituation,
    });
    assert.ok(interoception, "sustained sameness did not produce planning interoception");

    const calls = [];
    const modelAdapter = {
      provider:"fixture",
      modelId:"fixture-x1-planning",
      async invoke(call) {
        calls.push(structuredClone(call));
        const external = call.input.concern.externalContext;
        const exploring = external.interoception?.drives.some((drive) =>
          drive.family === "exploration" && drive.pressure > 0) ?? false;
        return {
          output:{
            result:{
              stops:[{
                startAt:external.horizon.startAt,
                endAt:external.horizon.endAt,
                physicalPlaceRef:exploring ? "place_x1_library" : "place_x1_home",
                presenceMode:"physical",
                mediatedContext:"",
                activity:exploring
                  ? "Spend the afternoon somewhere different and browse unfamiliar material."
                  : "Keep reading technical notes at home.",
                purpose:exploring
                  ? "I want some variety and a chance to run into ideas outside this morning's groove."
                  : "I want to keep following the work already in front of me.",
                travelFromPrevious:"",
              }],
            },
            evidenceRefs:[],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-x1-planning",
            providerRequestId:call.clientRequestId,
          },
        };
      },
    };
    const base = {
      threadId:thread.threadId,
      authoredAt:"2026-09-22T09:00:00.000Z",
      horizonEnd:"2026-09-22T13:00:00.000Z",
      availablePlaceRefs:["place_x1_home","place_x1_library"],
      sourceReferences:[event.eventId],
      sourceStores,
      modelAdapter,
    };

    const ordinary = await formPersonalLivedPlan({
      ...base,
      startingPlaceRef:null,
    });
    const exploratory = await formPersonalLivedPlan({
      ...base,
      startingPlaceRef:null,
      interoception,
    });

    assert.equal(calls.length, 2, "X1 added more than the existing planning call");
    assert.equal(
      calls[0].input.concern.externalContext.interoception,
      undefined,
      "ordinary planning invented exploration",
    );
    assert.deepEqual(
      calls[1].input.concern.externalContext.interoception,
      interoception,
      "grounded exploration did not reach planning",
    );
    assert.notEqual(
      ordinary.stops[0].physicalPlaceRef,
      exploratory.stops[0].physicalPlaceRef,
      "exploration did not bend planning",
    );
    assert.deepEqual(
      semanticStateStore.listCurrentState(thread.threadId),
      [],
      "X1 minted semantic state instead of reusing planning",
    );
    assert.equal(
      exploratory.sourceReferences.includes(previousSituation.situationId)
        || exploratory.sourceReferences.includes(currentSituation.situationId),
      false,
      "private exploration evidence became World plan authority",
    );
    assert.deepEqual(
      interoception.evidenceRefs.sort(),
      [previousSituation.situationId, currentSituation.situationId].sort(),
      "planning exploration lost its lived grounding",
    );

    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    identityStore.close();
    worldStore.close();
  }));
