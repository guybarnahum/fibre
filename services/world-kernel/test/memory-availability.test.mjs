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
import { recallMemories,reviewMemoryAvailability } from "../src/memory-availability.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const T0=Date.parse("2026-11-08T09:00:00.000Z");
const at=minutes=>new Date(T0+minutes*60_000).toISOString();
const DAY=24*60;
const SELF="thr_recall_kaleo",NOOR="thr_recall_noor",SELA="thr_recall_sela",SITUATION="sit_recall_cafe";

test("unused memories fade, anchored ones stay, and meeting someone again brings one back",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-availability-"));
  const storage=installedWorldStateStorage(join(directory,"world.sqlite"));
  const world=openWorldStore(storage),experience=openLivedExperienceStore(storage);
  const memory=openAutobiographicalMemoryStore(storage),semantic=openSemanticStateStore(storage);
  try{
    for(const [threadId,name] of [[SELF,"Kaleo Akana"],[NOOR,"Noor Haddad"],[SELA,"Sela Tupou"]]){
      const thread=structuredClone(seed);
      thread.threadId=threadId;thread.identity.name=name;thread.provenance.lastEventId="evt_"+threadId;
      world.seedThread(thread);
    }
    const outputs=[];
    let clock=T0;
    const process=createExperienceConsolidationProcess({
      worldReader:world,semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      livedNowStore:{getSituation:()=>({situationId:SITUATION,threadId:SELF,establishedAt:at(0),
        location:{kind:"place",placeRef:"wpl_cafe"},mediatedContext:null,activity:"At the café.",evidenceRefs:[]})},
      modelAdapter:{async invoke(request){
        if(request.clientRequestId.startsWith("memory-gist_"))return {output:{gists:[]}};
        if(request.clientRequestId.startsWith("interest-formation_"))return {output:{interests:[]}};
        return {output:outputs.shift(),provenance:{provider:"fixture",modelId:"fixture"}};
      }},
      now:()=>new Date(clock).toISOString(),clock:()=>clock,groupWindowMs:60_000,
    });
    const live=async(minutes,person,recollection,salience)=>{
      const story={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:person,kind:"utterance",text:"Hello again."},
        {actorThreadId:SELF,kind:"utterance",text:"Hello."},
      ]};
      const record=experience.recordEncounterStory({occurredAt:at(minutes),story,
        threadPresence:[[person,"sit_"+person],[SELF,SITUATION]].map(([threadId,situationId])=>({threadId,situationId})),
        visualization:createEncounterVisualization({occurredAt:at(minutes),story,scene:"At a café.",
          sourceReferences:[SITUATION],depictedThreadRefs:[]})});
      const attention=experience.recordThreadEncounterAttention({threadId:SELF,encounterRef:record.encounterId,
        situationId:SITUATION,occurredAt:at(minutes),outcome:"noticed",experienceText:"We talked."});
      experience.queueThreadExperienceConsolidation({experienceId:attention.experience.experienceId,queuedAt:at(minutes)});
      outputs.push({journalEntry:null,afterthoughts:[],stances:[],interests:[],memory:{outcome:"retained",
        rememberedContent:recollection,rememberedMeaning:null,gist:null,confidence:0.9,salience,uncertainty:[]}});
      clock=T0+(minutes+2)*60_000;
      assert.equal((await process.runOnce()).failed,0,"a reflection failed");
      return memory.listCurrentMemories(SELF).find(item=>item.rememberedContent===recollection);
    };
    const withNoor=await live(0,NOOR,"Noor showed me how she presses flowers between book pages.",0.3);
    const withSela=await live(30,SELA,"Sela and I compared the bus routes across the city.",0.3);
    const cherished=await live(60,SELA,"Sela told me my sketches made her want to draw again.",0.9);
    const followed=await live(90,SELA,"Sela mentioned a bookbinder near the market.",0.3);
    experience.recordInterest({threadId:SELF,interestId:"int_bookbinding",status:"current",
      interest:{subject:"Bookbinding",draw:"Old books and the bindery Sela mentioned.",
        selfImage:"Someone who could repair a family's books.",openQuestions:[]},
      evidenceRefs:[followed.memoryId],formedBy:"consolidation",sourceRef:"src_test",asOf:at(95)});

    const later=at(20*DAY);
    reviewMemoryAvailability({threadId:SELF,memoryStore:memory,experienceStore:experience,
      semanticStateStore:semantic,at:later});
    const inMind=mode=>memory.listCurrentMemories(SELF,{inMind:mode}).map(item=>item.memoryId);
    assert.deepEqual(new Set(inMind("background")),new Set([cherished.memoryId,followed.memoryId]),
      "unused memories did not fade, or anchored ones faded");
    assert.equal(memory.listCurrentMemories(SELF).find(item=>item.memoryId===withNoor.memoryId)
      ?.rememberedContent,withNoor.rememberedContent,"fading changed or lost the memory itself");
    const evidence=()=>selectDevelopedSelfEvidence({threadId:SELF,at:later,sourceStores:{
      identityStore:{getCurrentIdentityView:threadId=>({threadId,assertions:[]})},
      situatedLifeStore:{listCurrentLifeRelations:()=>[]},
      semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
    }}).map(item=>item.ref);
    assert.ok(!evidence().includes(withNoor.memoryId),"a memory out of reach still reached deliberate thought");

    reviewMemoryAvailability({threadId:SELF,memoryStore:memory,experienceStore:experience,
      semanticStateStore:semantic,cuePersonIds:[NOOR],cueRef:"exp_meeting_noor_again",at:later});
    assert.ok(inMind("deliberate").includes(withNoor.memoryId)&&!inMind("background").includes(withNoor.memoryId),
      "meeting Noor again did not bring her memory one step back");
    assert.ok(!inMind("deliberate").includes(withSela.memoryId),"a cue revived a memory of someone else");

    recallMemories({memoryStore:memory,threadId:SELF,memoryIds:[withNoor.memoryId],at:later});
    assert.ok(inMind("background").includes(withNoor.memoryId),"a recalled memory did not come back to mind");
  }finally{
    semantic.close();memory.close();experience.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
