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

const seed=JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8"));
const T0=Date.parse("2026-11-10T09:00:00.000Z");
const at=minutes=>new Date(T0+minutes*60_000).toISOString();
const ANA="thr_regard_ana",TOMAS="thr_regard_tomas",SELA="thr_regard_sela";
const decision=(regard,engagement=null)=>({journalEntry:null,afterthoughts:[],stances:[],interests:[],moments:[],regard,engagement,
  memory:{outcome:"not_remembered",rememberedContent:null,rememberedMeaning:null,
    gist:null,confidence:null,salience:null,uncertainty:[]}});

test("each Thread records regard as it perceived it, and two Threads take the same talk their own way", async () => {
  const directory=mkdtempSync(join(tmpdir(),"fibre-regard-"));
  const storage=installedWorldStateStorage(join(directory,"world.sqlite"));
  const world=openWorldStore(storage),experience=openLivedExperienceStore(storage);
  const memory=openAutobiographicalMemoryStore(storage),semantic=openSemanticStateStore(storage);
  try{
    for(const [threadId,name] of [[ANA,"Ana Silva"],[TOMAS,"Tomas Berg"],[SELA,"Sela Tupou"]]){
      const thread=structuredClone(seed);
      thread.threadId=threadId;thread.identity.name=name;thread.provenance.lastEventId="evt_"+threadId;
      world.seedThread(thread);
    }
    const perceived={
      [ANA]:decision([
        {personRef:TOMAS,act:"talked_over",by:"them",account:"Tomas talked over me before I could finish about the beds."},
        {personRef:SELA,act:"credited",by:"them",account:"Sela said the idea was mine."},
      ],"weary"),
      [TOMAS]:decision([
        {personRef:ANA,act:"held_ground",by:"me",account:"I kept to the north beds when Ana pushed for the south."},
      ]),
    };
    const results=[];
    const process=createExperienceConsolidationProcess({
      worldReader:world,semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      livedNowStore:{getSituation:(id)=>({situationId:id,threadId:id.slice(4),establishedAt:at(0),
        location:{kind:"place",placeRef:"wpl_garden"},mediatedContext:null,activity:"In the garden.",evidenceRefs:[]})},
      modelAdapter:{async invoke(request){
        if(request.clientRequestId.startsWith("memory-gist_"))return {output:{gists:[]}};
        return {output:perceived[request.input.thread.threadId],provenance:{provider:"fixture",modelId:"fixture"}};
      }},
      now:()=>at(5),clock:()=>T0+5*60_000,groupWindowMs:60_000,batchLimit:2,
    });
    const story={storyVersion:"encounter-story-v0.1",beats:[
      {actorThreadId:ANA,kind:"utterance",text:"I think the south beds get more—"},
      {actorThreadId:TOMAS,kind:"utterance",text:"The north beds. They always have."},
      {actorThreadId:ANA,kind:"utterance",text:"Fine, the north beds."},
    ]};
    const record=experience.recordEncounterStory({occurredAt:at(0),story,
      threadPresence:[ANA,TOMAS].map(threadId=>({threadId,situationId:"sit_"+threadId})),
      visualization:createEncounterVisualization({occurredAt:at(0),story,scene:"In a garden.",
        sourceReferences:["sit_"+ANA],depictedThreadRefs:[]})});
    for(const threadId of [ANA,TOMAS]){
      const attention=experience.recordThreadEncounterAttention({threadId,encounterRef:record.encounterId,
        situationId:"sit_"+threadId,occurredAt:at(0),outcome:"noticed",experienceText:"The beds again."});
      experience.queueThreadExperienceConsolidation({experienceId:attention.experience.experienceId,queuedAt:at(0)});
    }
    const run=await process.runOnce();
    assert.equal(run.failed,0,"a reflection failed");
    results.push(...run.results);

    const ana=experience.listPerceivedRegard(ANA,TOMAS,{before:at(60)});
    const tomas=experience.listPerceivedRegard(TOMAS,ANA,{before:at(60)});
    assert.deepEqual(ana.map(item=>[item.act,item.actorThreadId]),[["talked_over",TOMAS]],
      "Ana's perception of the talk was not kept as hers");
    assert.deepEqual(tomas.map(item=>[item.act,item.actorThreadId]),[["held_ground",TOMAS]],
      "Tomas's perception was not kept apart from Ana's");
    assert.ok(ana[0].evidenceRefs.length>0,"perceived regard does not cite the experience it rests on");
    assert.equal(experience.listPerceivedRegard(ANA,SELA,{before:at(60)}).length,0,
      "regard with someone who was not there was admitted");
    assert.equal(results.find(result=>result.threadId===ANA).regardDropped,1,"the dropped regard was not counted");
    assert.deepEqual(experience.listEngagementReadings(ANA,{since:at(-60),until:at(60)}).map(item=>item.reading),["weary"],
      "how the talk held Ana, in her own reading, was not kept");
    assert.equal(experience.listEngagementReadings(TOMAS,{since:at(-60),until:at(60)}).length,0,
      "a reading was recorded for a Thread that gave none");
  }finally{
    semantic.close();memory.close();experience.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
