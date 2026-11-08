import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { createExperienceConsolidationProcess } from "../src/lived-experience-consolidation.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { selectDevelopedSelfEvidence } from "../src/interior-cognition.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const T0=Date.parse("2026-11-08T09:00:00.000Z");
const at=minutes=>new Date(T0+minutes*60_000).toISOString();
const SELF="thr_moment_kaleo",NOOR="thr_moment_noor",SELA="thr_moment_sela",SITUATION="sit_moment_cafe";
const BEES={subject:"Rooftop beekeeping",draw:"My grandmother's hives.",
  selfImage:"Someone who could keep the old hives going.",openQuestions:[],standing:null};
const decision=({interests=[],moments=[]}={})=>({journalEntry:null,afterthoughts:[],stances:[],interests,moments,
  memory:{outcome:"not_remembered",rememberedContent:null,rememberedMeaning:null,
    gist:null,confidence:null,salience:null,uncertainty:[]}});

test("a Thread recognises being useful to someone, and its felt standing follows from whom",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-moments-"));
  const storage=installedWorldStateStorage(join(directory,"world.sqlite"));
  const world=openWorldStore(storage),experience=openLivedExperienceStore(storage);
  const memory=openAutobiographicalMemoryStore(storage),semantic=openSemanticStateStore(storage);
  try{
    for(const [threadId,name] of [[SELF,"Kaleo Akana"],[NOOR,"Noor Haddad"],[SELA,"Sela Tupou"]]){
      const thread=structuredClone(seed);
      thread.threadId=threadId;thread.identity.name=name;thread.provenance.lastEventId="evt_"+threadId;
      world.seedThread(thread);
    }
    const bees=experience.recordInterest({threadId:SELF,interestId:"int_bees",status:"current",
      interest:BEES,evidenceRefs:["mem_grandmother"],formedBy:"formative_reflection",
      sourceRef:"formative_reflection",asOf:at(-60)});
    const decisions=[],reflections=[];
    let clock=T0;
    const process=createExperienceConsolidationProcess({
      worldReader:world,semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      livedNowStore:{getSituation:()=>({situationId:SITUATION,threadId:SELF,establishedAt:at(0),
        location:{kind:"place",placeRef:"wpl_cafe"},mediatedContext:null,activity:"At the café.",evidenceRefs:[]})},
      modelAdapter:{async invoke(request){
        if(request.clientRequestId.startsWith("memory-gist_"))return {output:{gists:[]}};
        reflections.push(request.input);
        return {output:decisions.shift(),provenance:{provider:"fixture",modelId:"fixture"}};
      }},
      now:()=>new Date(clock).toISOString(),clock:()=>clock,groupWindowMs:60_000,
    });
    const live=async minutes=>{
      const story={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:NOOR,kind:"utterance",text:"How do you keep bees on a roof?"},
        {actorThreadId:SELF,kind:"utterance",text:"Like this: smoke first, then open the lid slowly."},
        {actorThreadId:NOOR,kind:"utterance",text:"That makes sense of everything I read."},
      ]};
      const record=experience.recordEncounterStory({occurredAt:at(minutes),story,
        threadPresence:[[NOOR,"sit_"+NOOR],[SELF,SITUATION]].map(([threadId,situationId])=>({threadId,situationId})),
        visualization:createEncounterVisualization({occurredAt:at(minutes),story,scene:"At a café.",
          sourceReferences:[SITUATION],depictedThreadRefs:[]})});
      const attention=experience.recordThreadEncounterAttention({threadId:SELF,encounterRef:record.encounterId,
        situationId:SITUATION,occurredAt:at(minutes),outcome:"noticed",experienceText:"Noor wanted to learn."});
      experience.queueThreadExperienceConsolidation({experienceId:attention.experience.experienceId,queuedAt:at(minutes)});
      clock=T0+(minutes+2)*60_000;
      const run=await process.runOnce();
      assert.equal(run.failed,0,"a reflection failed");
      return run.results[0];
    };

    decisions.push(decision({
      moments:[
        {kind:"useful",personRef:NOOR,interestRef:bees.interestId,
          moment:"I showed Noor how to smoke the hive before opening it.",taken:"valued",
          reaction:"Proud that she understood it at once."},
        {kind:"learning",personRef:SELA,interestRef:null,
          moment:"Sela taught me to read the weather.",taken:null,reaction:"Grateful."},
      ],
      interests:[{change:"deepen",interestRef:bees.interestId,...BEES,
        standing:"Noor, whom I admire, came to me to learn it; I may know more of it than most here."}],
    }));
    const first=await live(0);
    const moments=experience.listSocialMoments(SELF);
    assert.deepEqual(moments.map(item=>[item.kind,item.personThreadId,item.interestId]),
      [["useful",NOOR,bees.interestId]],"a moment with someone who did not act here was admitted");
    assert.equal(first.momentsDropped,1,"the dropped moment was not counted");
    const [deepened]=experience.listCurrentInterests(SELF);
    assert.ok(deepened.standing?.includes("Noor"),"felt standing did not follow from the moment");

    decisions.push(decision());
    await live(30);
    const [seen]=reflections.at(-1).recentMoments;
    assert.equal(seen?.personRef,NOOR,"the next reflection did not see the moment and its person");
    assert.ok(!("taken" in seen),"an operator category reached the Thread's reflection");

    const facing=personId=>selectDevelopedSelfEvidence({threadId:SELF,at:at(60),focusPartyId:personId,
      sourceStores:{
        identityStore:{getCurrentIdentityView:threadId=>({threadId,assertions:[]})},
        situatedLifeStore:{listCurrentLifeRelations:()=>[]},
        semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      }});
    const withNoor=facing(NOOR);
    assert.equal(withNoor[0]?.ref,moments[0].momentId,"facing Noor, being useful to her did not lead its evidence");
    assert.ok(withNoor.some(item=>item.kind==="interest"&&item.text.includes(deepened.standing)),
      "felt standing did not reach the Thread's evidence");
    assert.ok(!facing(SELA).some(item=>item.kind==="moment"),"a moment with Noor led evidence facing Sela");
  }finally{
    semantic.close();memory.close();experience.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
