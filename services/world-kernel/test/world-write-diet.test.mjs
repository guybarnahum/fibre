import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";

import {localWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {installWorldSchemas} from "../src/world-schema-installation.mjs";
import {openWorldStore} from "../src/persistence.mjs";
import {openLivedNowStore} from "../src/lived-now-store.mjs";
import {openLivedExperienceStore} from "../src/lived-experience-store.mjs";
import {openAutobiographicalMemoryStore} from "../src/autobiographical-memory-store.mjs";
import {createExperienceConsolidationProcess} from "../src/lived-experience-consolidation.mjs";
import {createEncounterVisualization} from "../src/lived-encounter-visualization.mjs";
import {livedPlanId,livedSituationId} from "../src/lived-now.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
// 08:00–20:00 Tucson civil time on October 22 (MST, UTC-7).
const at=(time)=>{
  const [hour,minute]=time.split(":").map(Number);
  return new Date(Date.UTC(2026,9,22,hour+7,minute)).toISOString();
};

// Local-only SQLite triggers observe the writes the actual World stores make,
// including writes from their own triggers. Audit-table writes are excluded.
// An index entry is charged on each affected row, matching the requested
// conservative Cloudflare accounting model (not a provider invoice).
function auditWorldWrites(path){
  const db=new DatabaseSync(path,{enableForeignKeyConstraints:true});
  db.exec(`CREATE TABLE _fibre_write_audit(id INTEGER PRIMARY KEY,table_name TEXT NOT NULL)`);
  const tables=db.prepare(`SELECT name,sql FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
      AND name!='_fibre_write_audit' ORDER BY name`).all()
    .filter(row=>!/^CREATE VIRTUAL TABLE\b/iu.test(row.sql??""));
  const weights=new Map();
  for(const {name} of tables){
    const tableName='"'+name.replaceAll('"','""')+'"';
    weights.set(name,1+db.prepare(`PRAGMA index_list(${tableName})`).all().length);
    for(const operation of ["INSERT","UPDATE","DELETE"]){
      const trigger='"_fibre_audit_'+operation.toLowerCase()+'_'+name.replaceAll('"','""')+'"';
      const literal=name.replaceAll("'","''");
      db.exec(`CREATE TRIGGER ${trigger} AFTER ${operation} ON ${tableName}
        BEGIN INSERT INTO _fibre_write_audit(table_name) VALUES('${literal}'); END`);
    }
  }
  const latest=db.prepare("SELECT COALESCE(MAX(id),0) AS id FROM _fibre_write_audit");
  const delta=db.prepare(`SELECT table_name,COUNT(*) AS writes
    FROM _fibre_write_audit WHERE id>? GROUP BY table_name`);
  function storeOf(table){
    if(/^(lived_now_|current_situation_)/u.test(table))return "LivedNowStore";
    if(table.startsWith("semantic_state_"))return "SemanticStateStore";
    if(table.startsWith("autobiographical_"))return "MemoryStore";
    if(/^(thread_experience_|thread_encounter_|encounter_story_|world_(?:social_|observed_|environment_|ambient_|arrival_))/u.test(table))
      return "LivedExperienceStore";
    if(table.startsWith("thread_contact_"))return "ContactStore";
    if(table.startsWith("thread_journal_"))return "JournalStore";
    return "Other";
  }
  let cursor=latest.get().id;
  const byEvent={};
  const byStore={};
  const byTable={};
  async function measure(kind,action){
    const result=await action();
    const next=latest.get().id;
    for(const row of delta.all(cursor)){
      const cost=Number(row.writes)*weights.get(row.table_name);
      const store=storeOf(row.table_name);
      byTable[row.table_name]=(byTable[row.table_name]??0)+cost;
      byStore[store]=(byStore[store]??0)+cost;
      byEvent[kind]=(byEvent[kind]??0)+cost;
    }
    cursor=next;
    return result;
  }
  return {measure,report(threads){
    const total=Object.values(byTable).reduce((sum,x)=>sum+x,0);
    return {rowsPerThreadDay:total/threads,total,byStore,byEvent,byTable};
  },close(){db.close();}};
}

test("seven Tucson Threads one waking day has a measured World write budget",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-world-write-diet-"));
  const path=join(directory,"world.sqlite");
  let audit=null,world=null,lived=null,experience=null,memory=null;
  try{
    const storage=localWorldStateStorage(path);
    installWorldSchemas(storage);
    world=openWorldStore(storage);
    lived=openLivedNowStore(storage);
    experience=openLivedExperienceStore(storage);
    memory=openAutobiographicalMemoryStore(storage);
    const ids=Array.from({length:7},(_,i)=>`thr_write_diet_${i+1}`);
    const events=new Map();
    for(const threadId of ids){
      const thread=structuredClone(seed);
      thread.threadId=threadId;
      thread.provenance.lastEventId="evt_"+threadId;
      world.seedThread(thread);
      events.set(threadId,world.listEvents(threadId)[0].eventId);
    }
    const venue=lived.admitPublicPlace({
      venueIdentity:"fixture:write-diet-reading",
      displayName:"Tucson public reading room",
      streetAddress:"7 Example Street",
      locality:"Tucson",country:"United States",countryCode:"US",
      lat:32.222,long:-110.975,timeZone:"America/Phoenix",
      evidenceRef:"https://example.org/write-diet",affordances:["Reading","Conversation"],
    });
    audit=auditWorldWrites(path);
    const situations=new Map();
    for(const threadId of ids){
      await audit.measure("plan",()=>lived.recordPlan({
        planId:livedPlanId({threadId,kind:"personal",authoredAt:at("08:00")}),
        kind:"personal",subjectThreadId:threadId,
        owner:{partyId:threadId,kind:"thread"},
        authoredAt:at("08:00"),horizonStart:at("08:00"),horizonEnd:at("20:00"),
        stops:[{
          startAt:at("08:00"),endAt:at("20:00"),physicalPlaceRef:venue.ref,
          mediatedContext:null,activity:"Read in the public room.",
          outwardActivity:"reading",wakefulness:"awake",
          purpose:"Read independently alongside the others.",
          companionRefs:[],travelFromPrevious:null,
        }],
        sourceReferences:[events.get(threadId),venue.ref],
        cognition:{provider:"fixture",modelId:"write-diet",providerRequestId:null},
      }));
      for(const [time,next] of [["08:00","16:00"],["16:00","20:00"]]){
        const situation=await audit.measure("lived-boundary",()=>{
          const current=lived.enactCurrentSituation({
            threadId,situationId:livedSituationId({threadId,at:at(time)}),
            establishedAt:at(time),
            observation:{
              phase:"at_place",location:{kind:"place",placeRef:venue.ref},
              mediatedContext:null,activity:"Read in the public room.",
              outwardActivity:"reading",wakefulness:"awake",
              reason:"Ordinary continued reading.",participantRefs:[],
              evidenceRefs:[events.get(threadId),venue.ref],
            },
          });
          lived.scheduleNextLivedBoundary({
            threadId,situationId:current.situationId,dueAt:at(next),
          });
          return current;
        });
        if(time==="16:00")situations.set(threadId,situation.situationId);
      }
    }
    const members=ids.slice(0,2).map(threadId=>({
      threadId,situationId:situations.get(threadId),
    }));
    const story=await audit.measure("social-act",()=>experience.recordEncounterStory({
      occurredAt:at("16:05"),threadPresence:members,
      story:{storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:ids[0],kind:"utterance",text:"I found a thoughtful passage."},
      ]},
      visualization:createEncounterVisualization({
        occurredAt:at("16:05"),story:{storyVersion:"encounter-story-v0.1",
          beats:[{actorThreadId:ids[0],kind:"utterance",text:"I found a thoughtful passage."}]},
        scene:"At the shared Tucson reading room.",
        sourceReferences:[venue.ref],depictedThreadRefs:[],
      }),
    }));
    const noticed=[];
    for(const person of members){
      const attention=await audit.measure("noticed-experience",()=>experience.recordThreadEncounterAttention({
        threadId:person.threadId,encounterRef:story.encounterId,
        situationId:person.situationId,occurredAt:at("16:05"),
        outcome:"noticed",experienceText:"A passage changed what I wanted to read next.",
      }));
      noticed.push(attention.experience);
      await audit.measure("consolidation-queue",()=>experience.queueThreadExperienceConsolidation({
        experienceId:attention.experience.experienceId,queuedAt:at("16:05"),
      }));
    }
    for(const member of members){
      await audit.measure("social-opportunity",()=>{
        experience.enqueueSocialOpportunity({
          threadId:member.threadId,situationId:member.situationId,dueAt:at("16:10"),
        });
        const claimed=experience.claimDueSocialOpportunity({at:at("16:10")});
        assert.ok(claimed,"social opportunity could not be claimed");
        experience.completeSocialOpportunity({
          situationId:claimed.situationId,at:at("16:10"),outcome:"not_initiated",
        });
      });
    }
    await audit.measure("ambient-scene",()=>{
      const sceneRef="venue:"+venue.physicalVenue.ref;
      experience.enqueueSceneAmbientOpportunity({
        sceneRef,threadId:ids[0],situationId:situations.get(ids[0]),
        dueAt:at("16:20"),
      });
      experience.recordEnvironmentalOpportunityDecision({
        situationId:situations.get(ids[0]),sceneRef,kind:"scene",
        decision:{outcome:"no_change",occurredAt:at("16:20"),
          occurrenceText:null,presence:[]},
      });
      experience.completeEnvironmentalOpportunity({
        situationId:situations.get(ids[0]),sceneRef,kind:"scene",
        completedAt:at("16:20"),
      });
    });
    const consolidated=await audit.measure("consolidation",async()=>{
      const process=createExperienceConsolidationProcess({
        worldReader:world,livedNowStore:lived,
        semanticStateStore:{listCurrentState:()=>[]},
        memoryStore:memory,experienceStore:experience,
        modelAdapter:{async invoke(){
          return {output:{journalEntry:null,afterthoughts:[],memory:{
            outcome:"retained",
            rememberedContent:"I remember hearing a thoughtful passage.",
            rememberedMeaning:"Reading beside others can redirect my interests.",
            confidence:0.8,salience:0.7,uncertainty:[],
          }},provenance:{provider:"fixture",modelId:"write-diet"}};
        }},
        now:()=>at("17:00"),clock:()=>Date.parse(at("17:00")),
        batchLimit:4,
      });
      return process.runOnce();
    });
    assert.equal(consolidated.failed,0,"consolidation failed during cost measurement");
    assert.equal(memory.listCurrentMemories(ids[0]).length,1,
      "one noticed experience did not form a persistent memory");
    const report=audit.report(ids.length);
    assert.ok(report.total>0&&report.byStore.LivedNowStore>0
      &&report.byStore.LivedExperienceStore>0,
    "World write measurement omitted lived and experience storage");
    console.log("FIBRE-WORLD-WRITE-BUDGET "+JSON.stringify(report));
    // Baseline measured locally on November 1, 2026: 352 weighted rows
    // for seven Threads, 50.2857 rows per Thread-day. Only ratchet downward.
    const budget=Number(process.env.FIBRE_WORLD_WRITE_BUDGET??352/7);
    assert.ok(report.rowsPerThreadDay<=budget,
      "World write budget exceeded "+report.total+"/7: "+JSON.stringify(report.byStore));
  }finally{
    audit?.close();memory?.close();experience?.close();lived?.close();world?.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
