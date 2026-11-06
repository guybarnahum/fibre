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
import { decideLaterContact } from "../src/lived-contact-cognition.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const T0=Date.parse("2026-11-07T09:00:00.000Z");
const at=minutes=>new Date(T0+minutes*60_000).toISOString();
const SELF="thr_gist_kaleo",FRIEND="thr_gist_noor",SITUATION="sit_gist_cafe";
const OLD="We sat by the window and Noor told me, at length, how her grandmother kept bees on the roof and what the honey tasted like in each season.";
const NEW="Noor brought back the book I lent her, with a pressed flower between the pages where she had stopped reading and a note in the margin.";
const NEW_GIST="Noor returned my book with a flower and a note; she cares for what she borrows.";

test("a memory is held in mind by its gist while its full recollection stays the memory",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-gist-"));
  const storage=installedWorldStateStorage(join(directory,"world.sqlite"));
  const world=openWorldStore(storage),experience=openLivedExperienceStore(storage);
  const memory=openAutobiographicalMemoryStore(storage),semantic=openSemanticStateStore(storage);
  try{
    for(const [threadId,name] of [[SELF,"Kaleo Akana"],[FRIEND,"Noor Haddad"]]){
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
      modelAdapter:{async invoke(){return {output:outputs.shift(),provenance:{provider:"fixture",modelId:"fixture"}};}},
      now:()=>new Date(clock).toISOString(),clock:()=>clock,groupWindowMs:60_000,
    });
    const live=async(minutes,recollection,gist)=>{
      const story={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:FRIEND,kind:"utterance",text:"Here you are."},
        {actorThreadId:SELF,kind:"utterance",text:"Thank you."},
      ]};
      const record=experience.recordEncounterStory({occurredAt:at(minutes),story,
        threadPresence:[[FRIEND,"sit_"+FRIEND],[SELF,SITUATION]].map(([threadId,situationId])=>({threadId,situationId})),
        visualization:createEncounterVisualization({occurredAt:at(minutes),story,scene:"At a café.",
          sourceReferences:[SITUATION],depictedThreadRefs:[]})});
      const attention=experience.recordThreadEncounterAttention({threadId:SELF,encounterRef:record.encounterId,
        situationId:SITUATION,occurredAt:at(minutes),outcome:"noticed",experienceText:"I listened."});
      experience.queueThreadExperienceConsolidation({experienceId:attention.experience.experienceId,queuedAt:at(minutes)});
      outputs.push({journalEntry:null,afterthoughts:[],stances:[],memory:{outcome:"retained",
        rememberedContent:recollection,rememberedMeaning:null,gist,confidence:0.9,salience:0.6,uncertainty:[]}});
      clock=T0+(minutes+2)*60_000;
      assert.equal((await process.runOnce()).failed,0,"a consolidation failed");
    };
    await live(0,OLD,null);
    await live(30,NEW,NEW_GIST);

    const memories=memory.listCurrentMemories(SELF);
    const formed=memories.find(item=>item.rememberedContent===NEW);
    assert.equal(formed?.gist,NEW_GIST,"the Thread's gist was not kept with its memory");

    let seen=null;
    await decideLaterContact({
      thread:world.getThread(SELF),afterthoughts:[{kind:"intention",text:"Thank Noor properly."}],
      memories,candidates:[{partyId:FRIEND,recipientKind:"thread",displayName:"Noor Haddad",relationKind:"social_contact"}],
      modelAdapter:{async invoke(request){seen=request.input.autobiographicalMemories;
        return {output:{decision:"keep_private",recipientPartyId:null,reason:"Later."},provenance:{}};}},
    });
    const held=text=>seen.find(item=>JSON.stringify(item).includes(text));
    assert.deepEqual(Object.keys(held("flower")).filter(key=>key!=="memoryId"),["gist"],
      "a memory with a gist was carried in full");
    assert.equal(held("grandmother")?.rememberedContent,OLD,"a memory without a gist lost its recollection");
  }finally{
    semantic.close();memory.close();experience.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
