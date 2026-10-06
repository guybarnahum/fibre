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
import { formEncounterStoryMemory } from "../src/lived-encounter-memory.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
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

function x4PlanningModel() {
  let sharedExternalContext=null;
  return {
    provider:"fixture",
    modelId:"fixture-x4-planning",
    async invoke(call) {
      const external=call.input.concern.externalContext;
      if(sharedExternalContext===null){
        sharedExternalContext=structuredClone(external);
      }else{
        assert.deepEqual(external,sharedExternalContext,"X4 planning World conditions changed");
      }
      const memory=call.input.developedSelfEvidence.find((item)=>item.kind==="memory")??null;
      const meaning=memory?.text??"";
      const enriching=/unfamiliar people can broaden my thinking/u.test(meaning);
      const aversive=/unstructured interruption made me protective of quiet/u.test(meaning);
      return {
        output:{
          result:{
            stops:[{
              startAt:external.horizon.startAt,
              endAt:external.horizon.endAt,
              physicalPlaceRef:enriching?"place_x4_library":"place_x4_home",
              presenceMode:"physical",
              mediatedContext:"",
              activity:enriching
                ?"Spend the afternoon at the library and leave room for an unfamiliar workshop or conversation."
                :aversive
                  ?"Work alone at home and protect a quiet uninterrupted afternoon."
                  :"Continue an ordinary quiet afternoon at home.",
              purpose:enriching
                ?"A retained experience made unfamiliar perspectives feel worth seeking again."
                :aversive
                  ?"A retained experience made unstructured social interruption feel costly."
                  :"Follow the ordinary day without reconstructing meaning from old history.",
              travelFromPrevious:"",
            }],
          },
          evidenceRefs:memory===null?[]:[memory.ref],
          conflictingMotives:[],
          uncertainty:null,
        },
        provenance:{
          provider:"fixture",
          modelId:"fixture-x4-planning",
          providerRequestId:call.clientRequestId,
        },
      };
    },
  };
}

async function x4EncounterMemory({
  thread,
  outcome,
  rememberedMeaning,
  experienceStore,
  memoryStore,
}) {
  const situationId=`sit_x4_${thread.threadId}`;
  const story=experienceStore.recordEncounterStory({
    occurredAt:"2026-09-21T15:00:00.000Z",
    threadPresence:[{ threadId:thread.threadId,situationId }],
    story:{
      beats:[
        {
          actorThreadId:null,
          kind:"occurrence",
          text:"At an open community workshop, another attendee demonstrates an unfamiliar way to solve the same practical problem.",
        },
        {
          actorThreadId:thread.threadId,
          kind:"action",
          text:"The Thread tries the unfamiliar approach and spends a while comparing it with the familiar method.",
        },
      ],
    },
    visualization:createEncounterVisualization({
      occurredAt:"2026-09-21T15:00:00.000Z",
      story:{
        beats:[
          {
            actorThreadId:null,
            kind:"occurrence",
            text:"Another attendee demonstrates an unfamiliar practical method.",
          },
          {
            actorThreadId:thread.threadId,
            kind:"action",
            text:"The Thread tries it and compares it with the familiar method.",
          },
        ],
      },
      scene:"An open community workshop with shared tables.",
      sourceReferences:[situationId],
      depictedThreadRefs:[],
    }),
  });
  const experience=experienceStore.recordThreadExperience({
    threadId:thread.threadId,
    encounterRef:story.encounterId,
    situationId,
    occurredAt:story.occurredAt,
    experienceText:outcome==="not_remembered"
      ?"The unfamiliar demonstration was noticed in the moment but did not become a lasting personal takeaway."
      :rememberedMeaning,
  });
  const livedContext={
    thread,
    situation:{
      situationId,
      threadId:thread.threadId,
      establishedAt:story.occurredAt,
      phase:"at_place",
      location:{ kind:"place",placeRef:"place_x4_workshop" },
      mediatedContext:null,
      activity:"Try an unfamiliar practical method at an open workshop.",
      participantRefs:[],
    },
    semanticStates:[],
    memories:[],
  };
  return {
    story,
    experience,
    memory:await formEncounterStoryMemory({
      livedContext,
      experienceRecord:experience,
      encounterStory:story,
      journalEntry:null,
      memoryStore,
      modelAdapter:{
        async invoke(){
          return {
            output:outcome==="not_remembered"
              ?{
                outcome:"not_remembered",
                rememberedContent:null,
                rememberedMeaning:null,
                confidence:null,
                salience:null,
                uncertainty:[],
              }
              :{
                outcome:"retained",
                rememberedContent:"I remember trying an unfamiliar approach at the workshop.",
                rememberedMeaning,
                confidence:0.9,
                salience:0.85,
                uncertainty:[],
              },
            provenance:{ provider:"fixture",modelId:"fixture-x4-memory" },
          };
        },
      },
    }),
  };
}

test("X4 retained lived outcome bends later planning while not_remembered history does not", async () =>
  withDatabase(async (databasePath) => {
    const storage=localWorldStateStorage(databasePath);
    const worldStore=openWorldStore(storage);
    const events=new Map();
    for(const [threadId,name] of [
      ["thr_x4_enriching","Mira Vale"],
      ["thr_x4_aversive","Mira Vale"],
      ["thr_x4_forgotten","Mira Vale"],
    ]){
      events.set(threadId,seedThread(
        worldStore,
        threadId,
        name,
        "2026-09-20T08:00:00.000Z",
      ));
    }

    const identityStore=openIdentityStore(storage);
    const semanticStateStore=openSemanticStateStore(storage);
    const memoryStore=openAutobiographicalMemoryStore(storage);
    const situatedLifeStore=openSituatedLifeStore(storage);
    const experienceStore=openLivedExperienceStore(storage);

    const enriching=await x4EncounterMemory({
      thread:worldStore.getThread("thr_x4_enriching"),
      outcome:"retained",
      rememberedMeaning:"Meeting unfamiliar people can broaden my thinking without taking over the whole day.",
      experienceStore,
      memoryStore,
    });
    const aversive=await x4EncounterMemory({
      thread:worldStore.getThread("thr_x4_aversive"),
      outcome:"retained",
      rememberedMeaning:"An unstructured interruption made me protective of quiet when I want to focus.",
      experienceStore,
      memoryStore,
    });
    const forgotten=await x4EncounterMemory({
      thread:worldStore.getThread("thr_x4_forgotten"),
      outcome:"not_remembered",
      rememberedMeaning:null,
      experienceStore,
      memoryStore,
    });

    assert.equal(enriching.memory.outcome,"retained");
    assert.equal(aversive.memory.outcome,"retained");
    assert.equal(forgotten.memory.outcome,"not_remembered");
    assert.equal(forgotten.memory.memory,null,"not_remembered created autobiographical residue");
    assert.equal(
      experienceStore.listEncounterStories("thr_x4_forgotten").length,
      1,
      "forgotten exploration lost objective history",
    );

    const sourceStores={
      worldStore,
      identityStore,
      semanticStateStore,
      memoryStore,
      situatedLifeStore,
      livedNowStore:planningPlaceAuthority([
        { ref:"place_x4_home",placeKind:"residence",displayName:"Home" },
        { ref:"place_x4_library",placeKind:"library_or_learning",displayName:"Neighborhood library with public programs" },
      ]),
    };
    const plans={};
    const observedEvidence=new Map();
    const planningModel=x4PlanningModel();
    const base={
      authoredAt:"2026-09-22T13:00:00.000Z",
      horizonEnd:"2026-09-22T17:00:00.000Z",
      availablePlaceRefs:["place_x4_home","place_x4_library"],
      startingPlaceRef:null,
      sourceStores,
      modelAdapter:{
        ...planningModel,
        async invoke(call){
          observedEvidence.set(
            call.input.thread.threadId,
            structuredClone(call.input.developedSelfEvidence),
          );
          return planningModel.invoke(call);
        },
      },
    };

    for(const threadId of [
      "thr_x4_enriching",
      "thr_x4_aversive",
      "thr_x4_forgotten",
    ]){
      plans[threadId]=await formPersonalLivedPlan({
        ...base,
        threadId,
        sourceReferences:[events.get(threadId).eventId],
      });
    }

    assert.equal(
      plans.thr_x4_enriching.stops[0].physicalPlaceRef,
      "place_x4_library",
      "enriching lived meaning did not bend later exploration",
    );
    assert.equal(
      plans.thr_x4_aversive.stops[0].physicalPlaceRef,
      "place_x4_home",
      "aversive lived meaning did not protect later quiet",
    );
    assert.equal(
      plans.thr_x4_forgotten.stops[0].physicalPlaceRef,
      "place_x4_home",
      "forgotten history reconstructed exploratory meaning",
    );
    assert.notEqual(
      plans.thr_x4_enriching.stops[0].activity,
      plans.thr_x4_aversive.stops[0].activity,
      "different retained outcomes did not bend later life differently",
    );

    const forgottenEvidence=observedEvidence.get("thr_x4_forgotten");
    assert.equal(
      forgottenEvidence.some((item)=>item.kind==="memory"),
      false,
      "not_remembered history reached later planning as memory",
    );
    assert.equal(
      forgottenEvidence.some((item)=>
        item.ref===forgotten.story.encounterId
        || item.ref===forgotten.experience.experienceId),
      false,
      "World encounter history bypassed memory authority",
    );
    assert.equal(
      plans.thr_x4_forgotten.cognition.evidenceRefs.length,
      0,
      "forgotten encounter became private causal planning evidence",
    );

    experienceStore.close();
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
      availablePlaceRefs:[placeRef],
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


test("X2 planning place meaning comes from World/situated authority, not caller decoration", async () =>
  withDatabase(async (databasePath) => {
    const storage=localWorldStateStorage(databasePath);
    const worldStore=openWorldStore(storage);
    const event=seedThread(
      worldStore,
      "thr_x2_places",
      "Lina Vale",
      "2026-09-20T08:00:00.000Z",
    );
    const identityStore=openIdentityStore(storage);
    const semanticStateStore=openSemanticStateStore(storage);
    const memoryStore=openAutobiographicalMemoryStore(storage);
    const situatedLifeStore=openSituatedLifeStore(storage);
    const livedNowStore=openLivedNowStore(storage);

    const place=(label,episodeKind,displayName)=>{
      const record=situatedLifeStore.recordPlaceEpisode({
        episodeId:placeEpisodeId({ threadId:"thr_x2_places",label }),
        revision:1,
        threadId:"thr_x2_places",
        episodeKind,
        place:{
          placeId:`place.x2.${label}`,
          displayName,
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
      return placeEpisodeRevisionRef(record);
    };
    const homeRef=place("home","residence","Home");
    const libraryRef=place("library","study","Neighborhood library");

    let observedPlaces=null;
    const modelAdapter={
      provider:"fixture",
      modelId:"fixture-x2-planning",
      async invoke(call){
        observedPlaces=structuredClone(call.input.concern.externalContext.availablePlaces);
        const library=observedPlaces.find((candidate)=>candidate.placeKind==="study");
        assert.ok(library,"planning lost admitted place meaning");
        return {
          output:{
            result:{
              stops:[{
                startAt:call.input.concern.externalContext.horizon.startAt,
                endAt:call.input.concern.externalContext.horizon.endAt,
                physicalPlaceRef:library.ref,
                presenceMode:"physical",
                mediatedContext:"",
                activity:"Read somewhere already known as a place of study.",
                purpose:"Use the real alternatives available in my world.",
                travelFromPrevious:"",
              }],
            },
            evidenceRefs:[],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-x2-planning",
            providerRequestId:call.clientRequestId,
          },
        };
      },
    };

    const plan=await formPersonalLivedPlan({
      threadId:"thr_x2_places",
      authoredAt:"2026-09-22T09:00:00.000Z",
      horizonEnd:"2026-09-22T13:00:00.000Z",
      availablePlaceRefs:[homeRef,libraryRef],
      // Deliberately ignored: callers no longer own place meaning.
      availablePlaces:[{
        ref:libraryRef,
        displayName:"Exclusive nightclub with guaranteed exciting strangers",
      }],
      sourceReferences:[event.eventId],
      sourceStores:{
        worldStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        livedNowStore,
      },
      modelAdapter,
    });

    assert.deepEqual(observedPlaces,[
      {
        ref:homeRef,
        displayName:"Home",
        placeKind:"residence",
        location:{ countryCode:"US",region:"Arizona",locality:"Tucson" },
      },
      {
        ref:libraryRef,
        displayName:"Neighborhood library",
        placeKind:"study",
        location:{ countryCode:"US",region:"Arizona",locality:"Tucson" },
      },
    ],"planning place meaning did not come from authority");
    assert.equal(
      JSON.stringify(observedPlaces).includes("nightclub"),
      false,
      "caller decoration reached planning",
    );
    assert.equal(plan.stops[0].physicalPlaceRef,libraryRef);

    livedNowStore.close();
    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    identityStore.close();
    worldStore.close();
  }));
