import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { createEnvironmentalEncounterService } from "../src/lived-environmental-encounter.mjs";
import { createLiveEncounter } from "../src/live-encounter.mjs";
import { observeAdmittedWorldEncounter } from "../src/live-encounter-world.mjs";
import { streamLivedEncounterResponse } from "../src/lived-encounter-cognition.mjs";
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

test("E6a World authors a bounded occurrence once and attention remains selective", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-e1-environment-"));
  const storage = {
    infraDriver:createSqliteStateInfraDriver({ scopes:{ world:join(directory, "world.sqlite") } }),
    stateScopeId:"world",
  };

  let experienceStore = null;
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
    experienceStore = openLivedExperienceStore(storage);
    const retained = [];
    const invocations = [];

    const modelAdapter = {
      async invoke(request) {
        invocations.push(structuredClone(request));
        if (request.clientRequestId.startsWith("world-occurrence_")) {
          assert.equal(Object.hasOwn(request.input, "thread"), false,
            "World occurrence authoring received Thread-private context");
          assert.equal(request.input.currentSituation.activity, situation.activity,
            "World occurrence authoring lost the enacted scene");
          if (request.input.occurredAt === AT) {
            return {
              output:{
                occurrenceText:"A bee settles onto a small yellow flower beside the path and moves deliberately around its center.",
              },
              provenance:{ provider:"fixture", modelId:"fixture-e6-world" },
            };
          }
          return {
            output:{ occurrenceText:"A thin cloud briefly softens the sunlight over the park." },
            provenance:{ provider:"fixture", modelId:"fixture-e6-world" },
          };
        }
        if (request.clientRequestId.startsWith("encounter-attention_")) {
          return request.input.encounterStory.occurredAt === AT
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
          assert.equal(
            typeof request.input.experience.experiencedAs,
            "string",
            "memory should receive lived experience",
          );
          assert.notEqual(
            request.input.experience.experiencedAs.trim(),
            "",
            "memory should receive lived experience",
          );
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
      livedNowStore:{
        getCurrentSituation:() => structuredClone(situation),
        getWorldPlace:() => null,
        listCurrentSituations:() => [structuredClone(situation)],
      },
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

    const live=createLiveEncounter({
      participantIds:["person_guy",activeThread.threadId],
    });
    const personEvents=[];
    live.subscribe("person_guy",(event)=>personEvents.push(event));
    live.pushSpeechDelta({
      actorId:"person_guy",
      text:"I was thinking about drawing when",
    });

    const noticed = await service.encounter({
      threadId:activeThread.threadId,
      at:AT,
    });
    observeAdmittedWorldEncounter({
      liveEncounter:live,
      experienceStore,
      encounterId:noticed.encounterStory.encounterId,
    });

    const replay = await service.encounter({
      threadId:activeThread.threadId,
      at:AT,
    });
    const missed = await service.encounter({
      threadId:activeThread.threadId,
      at:"2026-09-21T18:02:00.000Z",
    });
    observeAdmittedWorldEncounter({
      liveEncounter:live,
      experienceStore,
      encounterId:missed.encounterStory.encounterId,
    });

    assert.equal(noticed.attention.outcome, "noticed", "bee should enter lived attention");
    assert.equal(
      typeof noticed.attention.experience.experienceText,
      "string",
      "noticed occurrence should become personal experience",
    );
    assert.equal(
      noticed.encounterStory.visualization.visualizationPrompt.includes(
        noticed.encounterStory.story.beats[0].text,
      ),
      true,
      "Encounter Story should remain visually reconstructable",
    );
    assert.deepEqual(
      noticed.encounterStory.visualization.depictedThreadRefs,
      [],
      "visualization should not invent an unbound likeness",
    );
    assert.equal(retained.length, 0, "environmental encounter still formed memory on the hot path");
    assert.deepEqual(
      experienceStore.listUnclaimedExperienceConsolidationCandidates({limit:8})
        .map((entry)=>entry.experienceId),
      [noticed.attention.experience.experienceId],
      "noticed occurrence was not queued for later consolidation",
    );

    assert.equal(replay.reused, true, "retry should reuse admitted World occurrence");
    assert.equal(
      replay.encounterStory.encounterId,
      noticed.encounterStory.encounterId,
      "retry must not rewrite objective World occurrence",
    );
    assert.equal(missed.attention.outcome, "not_noticed", "cloud may pass outside lived attention");
    assert.equal(missed.attention.experience, null, "unnoticed occurrence must not fabricate Thread Experience");
    assert.equal(missed.aftermath, null, "unnoticed occurrence must not create private aftermath");
    assert.equal(retained.length, 0, "unnoticed occurrence must not create memory");
    assert.equal(
      invocations.filter((request) => request.clientRequestId.startsWith("world-occurrence_")).length,
      2,
      "retry must not resample an admitted World occurrence",
    );

    assert.equal(
      personEvents.filter((event)=>event.type==="world_event").length,
      2,
      "objective live encounter should expose both admitted World occurrences",
    );
    assert.deepEqual(
      live.perceivedWorldEvents(activeThread.threadId).map((event)=>event.eventRef),
      [noticed.encounterStory.encounterId],
      "Thread cognition bypassed selective World attention",
    );

    assert.deepEqual(
      live.snapshot().activeSpeakers,
      ["person_guy"],
      "World occurrence froze the ongoing conversation",
    );
    live.pushSpeechDelta({
      actorId:"person_guy",
      text:"—did you notice that?",
    });
    live.endSpeech({actorId:"person_guy"});

    let liveInput=null;
    const liveAdapter={
      provider:"fixture",
      modelId:"fixture-live-world",
      configuration:{transport:"fixture"},
      async invoke(){
        throw new Error("structured cognition should not run in live World interleaving proof");
      },
      async *streamExpression(call){
        liveInput=structuredClone(call.input);
        yield {type:"expression_delta",text:"Yes, I saw the bee settle on the flower."};
        yield {
          type:"expression_complete",
          provenance:{
            provider:"fixture",
            modelId:"fixture-live-world",
            providerRequestId:"fixture_live_world_1",
          },
        };
      },
    };
    await streamLivedEncounterResponse({
      livedContext:{
        thread:structuredClone(activeThread),
        situation:structuredClone(situation),
        semanticStates:[],
        memories:[],
      },
      encounter:{
        utterance:"I was thinking about drawing when—did you notice that?",
        occurredAt:"2026-09-21T18:03:00.000Z",
      },
      recentEncounterStories:[],
      liveEncounter:live,
      participantId:activeThread.threadId,
      modelAdapter:liveAdapter,
    });

    assert.equal(
      liveInput.liveInteraction.perceivedWorldEvents.length,
      1,
      "live cognition received an unnoticed World occurrence",
    );
    assert.equal(
      liveInput.liveInteraction.perceivedWorldEvents[0].beats[0].text,
      noticed.encounterStory.story.beats[0].text,
      "live cognition lost the admitted World occurrence",
    );
  } finally {
    experienceStore?.close();
    rmSync(directory, { recursive:true, force:true });
  }
});

test("shared World occurrence belongs to one place and different observers notice differently",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-shared-environment-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  let experienceStore=null;
  try{
    const first=thread();
    const second=structuredClone(first);
    second.threadId="thr_e7_second";
    second.identity.name="Second";
    second.provenance.lastEventId="evt_seed_e7_second";
    const away=structuredClone(first);
    away.threadId="thr_e7_away";
    away.identity.name="Away";
    away.provenance.lastEventId="evt_seed_e7_away";
    const world=openWorldStore(storage);
    try{
      for(const current of [first,second,away])world.seedThread(current);
    }finally{world.close();}
    experienceStore=openLivedExperienceStore(storage);

    const placeRef="wpl_e7_shared_park";
    const situations=new Map([first,second,away].map((item)=>[
      item.threadId,{
        situationId:`sit_${item.threadId}`,
        threadId:item.threadId,
        establishedAt:AT,
        location:{kind:"place",placeRef:item.threadId===away.threadId?"wpl_e7_elsewhere":placeRef},
        mediatedContext:null,
        activity:item.threadId===first.threadId?"reading":"walking",
        evidenceRefs:[],
      },
    ]));
    const threads=new Map([first,second,away].map((item)=>[item.threadId,item]));
    const events=[];
    const modelAdapter={
      async invoke(request){
        events.push(structuredClone(request));
        if(request.clientRequestId.startsWith("world-occurrence_")){
          assert.equal(Object.hasOwn(request.input,"thread"),false,
            "World occurrence must not see a Thread identity");
          assert.equal(Object.hasOwn(request.input,"currentSituation"),false,
            "shared occurrence must not depend on observer activity");
          assert.equal(request.input.place.ref,placeRef,
            "shared occurrence must be grounded in the real World place");
          return {
            output:{occurrenceText:"A rain shower begins over the park."},
            provenance:{provider:"fixture",modelId:"world"},
          };
        }
        if(request.clientRequestId.startsWith("encounter-attention_")){
          const noticing=request.input.thread.threadId===first.threadId;
          return {
            output:{
              outcome:noticing?"noticed":"not_noticed",
              experienceText:noticing?"The first drops make me look up from my reading.":null,
            },
            provenance:{provider:"fixture",modelId:"attention"},
          };
        }
        throw new Error("unexpected World cognition");
      },
    };
    const service=createEnvironmentalEncounterService({
      worldReader:{getThread:(id)=>structuredClone(threads.get(id)??null)},
      livedNow:{ensure:async({threadId})=>structuredClone(situations.get(threadId))},
      livedNowStore:{
        getCurrentSituation:(id)=>structuredClone(situations.get(id)),
        getWorldPlace:(id,ref)=>id!==away.threadId&&ref===placeRef
          ?{ref,displayName:"Shared Park",placeKind:"public"}:null,
        listCurrentSituations:()=>[...situations.values()].map((item)=>structuredClone(item)),
      },
      situatedLifeStore:{listCurrentPlaceEpisodes:()=>[]},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      experienceStore,
      modelAdapter,
    });

    const lived=await service.encounter({threadId:first.threadId,at:AT});
    const replay=await service.encounter({threadId:second.threadId,at:AT});

    assert.equal(lived.encounterStory.threadPresence.length,2,
      "one shared occurrence should have two real co-present observers");
    assert.deepEqual(new Set(lived.encounterStory.threadPresence.map((p)=>p.threadId)),
      new Set([first.threadId,second.threadId]),
      "a Thread elsewhere must not become a witness");
    assert.equal(replay.encounterStory.encounterId,lived.encounterStory.encounterId,
      "two observers must share the same objective occurrence");
    assert.equal(replay.reused,true,
      "second observer must not generate its own weather");
    assert.equal(lived.attention.outcome,"noticed",
      "first observer should independently notice the rain");
    assert.equal(replay.attention.outcome,"not_noticed",
      "second observer may miss the same rain");
    assert.equal(replay.attention.experience,null,
      "unnoticed shared occurrence must not fabricate Experience");
    assert.deepEqual(
      experienceStore.listUnclaimedExperienceConsolidationCandidates({limit:8})
        .map((item)=>item.experienceId),
      [lived.attention.experience.experienceId],
      "only independently noticed experience can enter consolidation",
    );
    assert.equal(events.filter((item)=>item.clientRequestId.startsWith("world-occurrence_")).length,1,
      "the World must author the shared rain only once");
    assert.equal(events.filter((item)=>item.clientRequestId.startsWith("encounter-attention_")).length,2,
      "retry must preserve both observers' private attention decisions");
  }finally{
    experienceStore?.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
