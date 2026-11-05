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
const T0=Date.parse("2026-11-06T09:00:00.000Z");
const at=minutes=>new Date(T0+minutes*60_000).toISOString();
const SELF="thr_stance_kaleo",NOOR="thr_stance_noor",MINA="thr_stance_mina";
const SITUATION="sit_stance_cafe";
const NOT_REMEMBERED={outcome:"not_remembered",rememberedContent:null,rememberedMeaning:null,
  confidence:null,salience:null,uncertainty:[]};

// Kaleo meets people at a café; each meeting is consolidated on its own. What
// Kaleo comes to feel about each person is scripted as its consolidation output.
function cafe(){
  const directory=mkdtempSync(join(tmpdir(),"fibre-stance-"));
  const storage=installedWorldStateStorage(join(directory,"world.sqlite"));
  const world=openWorldStore(storage),experience=openLivedExperienceStore(storage);
  const memory=openAutobiographicalMemoryStore(storage),semantic=openSemanticStateStore(storage);
  for(const [threadId,name] of [[SELF,"Kaleo Akana"],[NOOR,"Noor Haddad"],[MINA,"Mina Park"]]){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.identity.name=name;
    thread.provenance.lastEventId="evt_"+threadId;
    world.seedThread(thread);
  }
  const outputs=[];
  let clock=T0;
  const process=createExperienceConsolidationProcess({
    worldReader:world,semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
    livedNowStore:{getSituation:()=>({situationId:SITUATION,threadId:SELF,establishedAt:at(0),
      location:{kind:"place",placeRef:"wpl_cafe"},mediatedContext:null,activity:"At the café.",evidenceRefs:[]})},
    modelAdapter:{async invoke(){return {output:outputs.shift(),provenance:{provider:"fixture",modelId:"fixture"}};}},
    now:()=>new Date(clock).toISOString(),clock:()=>clock,groupWindowMs:60_000,
  });
  async function meet(minutes,other,words,stances){
    const story={storyVersion:"encounter-story-v0.1",beats:[
      {actorThreadId:other,kind:"utterance",text:words},
      {actorThreadId:SELF,kind:"utterance",text:"I see."},
    ]};
    const record=experience.recordEncounterStory({
      occurredAt:at(minutes),story,
      threadPresence:[SELF,other].sort().map(threadId=>({threadId,
        situationId:threadId===SELF?SITUATION:"sit_"+threadId})),
      visualization:createEncounterVisualization({occurredAt:at(minutes),story,
        scene:"At a café.",sourceReferences:[SITUATION],depictedThreadRefs:[]}),
    });
    const attention=experience.recordThreadEncounterAttention({threadId:SELF,encounterRef:record.encounterId,
      situationId:SITUATION,occurredAt:at(minutes),outcome:"noticed",experienceText:`I listened to ${words}`});
    experience.queueThreadExperienceConsolidation({experienceId:attention.experience.experienceId,queuedAt:at(minutes)});
    outputs.push({journalEntry:null,afterthoughts:[],memory:NOT_REMEMBERED,stances});
    clock=T0+(minutes+2)*60_000;
    const run=await process.runOnce();
    assert.equal(run.failed,0,"a consolidation failed");
    return {experienceId:attention.experience.experienceId,result:run.results[0]};
  }
  const regard=(other,aspect)=>semantic.listCurrentState(SELF).find(state=>
    state.domain==="relationship_attitude"&&state.dimension===aspect&&state.target.targetId===other)??null;
  const evidenceFacing=other=>selectDevelopedSelfEvidence({threadId:SELF,at:at(600),focusPartyId:other,
    sourceStores:{worldStore:world,semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      identityStore:{getCurrentIdentityView:threadId=>({threadId,assertions:[]})},
      situatedLifeStore:{listCurrentLifeRelations:()=>[]}}})
    .filter(item=>item.kind==="semantic_state");
  return {meet,regard,semantic,evidenceFacing,close(){
    semantic.close();memory.close();experience.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }};
}

test("a Thread's regard for a person forms, changes and leads its later cognition toward that person",async()=>{
  const c=cafe();
  try{
    const kept=await c.meet(0,NOOR,"I brought back the book I borrowed.",[
      {personRef:NOOR,aspect:"trust",regard:"Noor keeps her word; I can rely on her."},
      {personRef:"thr_stance_absent",aspect:"fondness",regard:"I like them."},
    ]);
    const first=c.regard(NOOR,"trust");
    assert.equal(first?.state,"Noor keeps her word; I can rely on her.","the Thread's own regard was not admitted");
    assert.deepEqual(first.evidenceReferences,[kept.experienceId],"the regard is not grounded in the meeting");
    assert.equal(first.provenance.author,SELF,"the regard is not authored by the Thread");
    assert.equal(kept.result.stancesDropped,1,"a regard for someone absent was admitted");

    await c.meet(10,MINA,"Your idea was better than mine.",[
      {personRef:MINA,aspect:"fondness",regard:"Mina's generosity warms me to her."},
    ]);
    await c.meet(20,NOOR,"I lost the book, sorry.",[
      {personRef:NOOR,aspect:"trust",regard:"I am less sure Noor will look after what I lend her."},
    ]);
    const second=c.regard(NOOR,"trust");
    assert.equal(second.supersedes,first.stateId,"the changed regard did not supersede the earlier one");
    assert.ok(c.semantic.getState(first.stateId),"the earlier regard was erased");

    assert.equal(c.evidenceFacing(NOOR)[0]?.ref,second.stateId,
      "facing Noor, the Thread's regard for Noor did not come first");
    assert.equal(c.evidenceFacing(MINA)[0]?.ref,c.regard(MINA,"fondness").stateId,
      "facing Mina, the Thread's regard for Mina did not come first");
  }finally{c.close();}
});
