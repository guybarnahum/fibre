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
const SELF="thr_interest_kaleo",FRIEND="thr_interest_noor",SITUATION="sit_interest_cafe";
const decision=(interests=[],memory=null)=>({journalEntry:null,afterthoughts:[],stances:[],interests,
  memory:memory===null?{outcome:"not_remembered",rememberedContent:null,rememberedMeaning:null,
    gist:null,confidence:null,salience:null,uncertainty:[]}
    :{outcome:"retained",rememberedContent:memory,rememberedMeaning:null,gist:null,
      confidence:0.9,salience:0.7,uncertainty:[]}});

test("a Thread finds its first interests in its own past, then lives with them and revises them",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-interests-"));
  const storage=installedWorldStateStorage(join(directory,"world.sqlite"));
  const world=openWorldStore(storage),experience=openLivedExperienceStore(storage);
  const memory=openAutobiographicalMemoryStore(storage),semantic=openSemanticStateStore(storage);
  try{
    for(const [threadId,name] of [[SELF,"Kaleo Akana"],[FRIEND,"Noor Haddad"]]){
      const thread=structuredClone(seed);
      thread.threadId=threadId;thread.identity.name=name;thread.provenance.lastEventId="evt_"+threadId;
      world.seedThread(thread);
    }
    const decisions=[],reflections=[],formations=[];
    let clock=T0;
    const process=createExperienceConsolidationProcess({
      worldReader:world,semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      livedNowStore:{getSituation:()=>({situationId:SITUATION,threadId:SELF,establishedAt:at(0),
        location:{kind:"place",placeRef:"wpl_cafe"},mediatedContext:null,activity:"At the café.",evidenceRefs:[]})},
      modelAdapter:{async invoke(request){
        if(request.clientRequestId.startsWith("memory-gist_"))return {output:{gists:[]}};
        if(request.clientRequestId.startsWith("interest-formation_")){
          formations.push(request.input);
          const [own]=request.input.formativeMemories.map(item=>item.memoryId);
          return {output:{interests:[
            {subject:"Rooftop beekeeping",draw:"My grandmother's bees and their seasons of honey.",
              selfImage:"I could be the one who keeps the old hives going and teaches others.",
              openQuestions:["Why does the honey change with the season?"],evidenceRefs:[own,"mem_not_mine"]},
            {subject:"Someone else's memory",draw:"Nothing I lived.",selfImage:"None.",
              openQuestions:[],evidenceRefs:["mem_not_mine"]},
          ]}};
        }
        reflections.push(request.input);
        return {output:decisions.shift(),provenance:{provider:"fixture",modelId:"fixture"}};
      }},
      now:()=>new Date(clock).toISOString(),clock:()=>clock,groupWindowMs:60_000,
    });
    const live=async minutes=>{
      const story={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:FRIEND,kind:"utterance",text:"How do you keep bees on a roof?"},
        {actorThreadId:SELF,kind:"utterance",text:"Let me show you."},
      ]};
      const record=experience.recordEncounterStory({occurredAt:at(minutes),story,
        threadPresence:[[FRIEND,"sit_"+FRIEND],[SELF,SITUATION]].map(([threadId,situationId])=>({threadId,situationId})),
        visualization:createEncounterVisualization({occurredAt:at(minutes),story,scene:"At a café.",
          sourceReferences:[SITUATION],depictedThreadRefs:[]})});
      const attention=experience.recordThreadEncounterAttention({threadId:SELF,encounterRef:record.encounterId,
        situationId:SITUATION,occurredAt:at(minutes),outcome:"noticed",experienceText:"Noor wanted to learn."});
      experience.queueThreadExperienceConsolidation({experienceId:attention.experience.experienceId,queuedAt:at(minutes)});
      clock=T0+(minutes+2)*60_000;
      assert.equal((await process.runOnce()).failed,0,"a reflection failed");
      return attention.experience.experienceId;
    };

    decisions.push(decision([],"My grandmother kept bees on the roof; each season's honey tasted different."));
    await live(0);
    assert.equal(formations.length,0,"a Thread with no past was asked what fascinates it");

    decisions.push(decision());
    await live(30);
    const [ownMemory]=memory.listCurrentMemories(SELF);
    assert.deepEqual(formations[0].formativeMemories.map(item=>item.memoryId),[ownMemory.memoryId],
      "formative reflection read memories that are not this Thread's own");
    const [bees]=experience.listCurrentInterests(SELF);
    assert.deepEqual(experience.listCurrentInterests(SELF).map(item=>[item.subject,[...item.evidenceRefs]]),
      [["Rooftop beekeeping",[ownMemory.memoryId]]],
      "an interest was kept without resting on this Thread's own memory");
    assert.deepEqual(reflections.at(-1).interests.map(item=>item.interestRef),[bees.interestId],
      "the Thread's reflection did not see the interest it had just found");

    decisions.push(decision([
      {change:"deepen",interestRef:bees.interestId,subject:"Rooftop beekeeping",
        draw:"My grandmother's bees, and now Noor's wish to learn.",
        selfImage:"Noor asked me to show her: I am becoming someone others learn this from.",
        openQuestions:["How do I teach it well?"]},
      {change:"form",interestRef:null,subject:"Teaching by showing",
        draw:"Showing Noor worked better than explaining.",selfImage:"Someone who teaches with their hands.",
        openQuestions:[]},
      {change:"deepen",interestRef:"int_never_held",subject:"Unheld",draw:"x",selfImage:"y",openQuestions:[]},
    ]));
    const taught=await live(60);
    const now=experience.listCurrentInterests(SELF);
    const deepened=now.find(item=>item.interestId===bees.interestId);
    assert.equal(deepened?.revision,2,"a deepened interest did not keep its identity as a new revision");
    assert.match(deepened.selfImage,/learn this from/u,"feedback from an encounter did not reach the self-image");
    assert.deepEqual([...now.find(item=>item.subject==="Teaching by showing").evidenceRefs],[taught],
      "a new interest did not rest on the experience that sparked it");
    assert.equal(now.length,2,"a change to an interest the Thread never held was admitted");
    assert.equal(formations.length,1,"a Thread re-found its formative interests");

    const evidence=selectDevelopedSelfEvidence({threadId:SELF,at:at(90),sourceStores:{
      identityStore:{getCurrentIdentityView:threadId=>({threadId,assertions:[]})},
      situatedLifeStore:{listCurrentLifeRelations:()=>[]},
      semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
    }});
    assert.ok(evidence.some(item=>item.kind==="interest"&&item.ref===bees.interestId),
      "the Thread's interests did not reach its developed-self evidence");
  }finally{
    semantic.close();memory.close();experience.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
