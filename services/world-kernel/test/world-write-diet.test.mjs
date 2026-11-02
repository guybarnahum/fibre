import {reportTestEvidence} from "../../../tools/test-infra/test-evidence.mjs";
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
import {openSemanticStateStore} from "../src/semantic-state-store.mjs";
import {openSituatedLifeStore} from "../src/situated-life-store.mjs";
import {openContactStore} from "../src/contact-store.mjs";
import {lifeRelationId} from "../src/situated-life-domain.mjs";
import {createThreadContactProcess} from "../src/thread-contact-process.mjs";
import {createThreadContactPerception} from "../src/thread-contact-perception.mjs";
import {createWorldSocialOpportunity} from "../src/world-social-opportunity.mjs";
import {createWorldEnvironmentEvolution} from "../src/world-environment-evolution.mjs";
import {createWorldReconciliationProcess} from "../src/world-reconciliation-process.mjs";
import {createLivedNowService} from "../src/lived-now-service.mjs";
import {createLivedBoundaryProcess,nextLivedBoundary} from "../src/lived-now-boundary.mjs";
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
  db.exec(`CREATE TABLE _fibre_write_audit(id INTEGER PRIMARY KEY,
    table_name TEXT NOT NULL,operation TEXT NOT NULL)`);
  const tables=db.prepare(`SELECT name,sql FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
      AND name!='_fibre_write_audit' ORDER BY name`).all()
    .filter(row=>!/^CREATE VIRTUAL TABLE\b/iu.test(row.sql??""));
  const weights=new Map();
  const withoutRowid=new Set(db.prepare("PRAGMA table_list").all()
    .filter(table=>table.wr===1).map(table=>table.name));
  for(const {name} of tables){
    const tableName='"'+name.replaceAll('"','""')+'"';
    // WITHOUT ROWID's primary index IS its table B-tree, not a second
    // index entry. Its secondary indexes still count as writes.
    weights.set(name,(withoutRowid.has(name)?0:1)
      +db.prepare(`PRAGMA index_list(${tableName})`).all().length);
    for(const operation of ["INSERT","UPDATE","DELETE"]){
      const trigger='"_fibre_audit_'+operation.toLowerCase()+'_'+name.replaceAll('"','""')+'"';
      const literal=name.replaceAll("'","''");
      db.exec(`CREATE TRIGGER ${trigger} AFTER ${operation} ON ${tableName}
        BEGIN INSERT INTO _fibre_write_audit(table_name,operation)
          VALUES('${literal}','${operation}'); END`);
    }
  }
  const latest=db.prepare("SELECT COALESCE(MAX(id),0) AS id FROM _fibre_write_audit");
  const delta=db.prepare(`SELECT table_name,operation,COUNT(*) AS writes
    FROM _fibre_write_audit WHERE id>? GROUP BY table_name,operation`);
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
  const byActivity=new Map();
  async function measure(kind,action){
    const result=await action();
    const next=latest.get().id;
    for(const row of delta.all(cursor)){
      const cost=Number(row.writes)*weights.get(row.table_name);
      const store=storeOf(row.table_name);
      byTable[row.table_name]=(byTable[row.table_name]??0)+cost;
      byStore[store]=(byStore[store]??0)+cost;
      byEvent[kind]=(byEvent[kind]??0)+cost;
      const entry=byActivity.get(kind)??new Map();
      const item=entry.get(row.table_name)??{table:row.table_name,weight:weights.get(row.table_name),operations:{}};
      item.operations[row.operation]=(item.operations[row.operation]??0)+Number(row.writes);
      entry.set(row.table_name,item);
      byActivity.set(kind,entry);
    }
    cursor=next;
    return result;
  }
  return {measure,report(threads){
    const total=Object.values(byTable).reduce((sum,x)=>sum+x,0);
    const activities=Object.fromEntries([...byActivity].map(([name,entries])=>{
      const tables=[...entries.values()].sort((a,b)=>a.table.localeCompare(b.table))
        .map(({table,weight,operations})=>({
          table,operations,weight,
          weightedRows:Object.values(operations).reduce((sum,rows)=>sum+rows,0)*weight,
        }));
      return [name,{weightedRows:tables.reduce((sum,table)=>sum+table.weightedRows,0),tables}];
    }));
    return {rowsPerThreadDay:total/threads,total,byStore,byEvent,byTable,activities};
  },close(){db.close();}};
}

test("seven Tucson Threads one waking day has a measured World write budget",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-world-write-diet-"));
  const path=join(directory,"world.sqlite");
  let audit=null,world=null,lived=null,experience=null,memory=null,contact=null,situated=null,semantic=null;
  try{
    const storage=localWorldStateStorage(path);
    installWorldSchemas(storage);
    world=openWorldStore(storage);
    lived=openLivedNowStore(storage);
    experience=openLivedExperienceStore(storage);
    memory=openAutobiographicalMemoryStore(storage);
    contact=openContactStore(storage);
    situated=openSituatedLifeStore(storage);
    semantic=openSemanticStateStore(storage);
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
    let consolidationCalls=0;
    const consolidated=await audit.measure("consolidation",async()=>{
      const process=createExperienceConsolidationProcess({
        worldReader:world,livedNowStore:lived,
        semanticStateStore:{listCurrentState:()=>[]},
        memoryStore:memory,experienceStore:experience,
        modelAdapter:{async invoke(){
          return {output:{journalEntry:null,afterthoughts:consolidationCalls++===0
            ?[{kind:"question",text:"I want to ask the other reader about her favorite passage."}]
            :[],memory:{
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
    reportTestEvidence("FIBRE-WORLD-WRITE-BUDGET",report);
    // Storage-only upper bound for the seven-Thread day; semantic heads add
    // writes only when a new semantic record is admitted.
    const budget=Number(process.env.FIBRE_WORLD_WRITE_BUDGET??310/7);
    assert.ok(report.rowsPerThreadDay<=budget,
      "World write budget exceeded "+report.total+"/7: "+JSON.stringify(report.byStore));
    // New alarm activities are measured after the original day budget, so
    // measuring wider World behavior does not silently relax that ceiling.
    const sender=ids[0],recipient=ids[1];
    situated.recordLifeRelation({
      relationId:lifeRelationId({threadId:sender,partyId:recipient,role:"peer"}),
      revision:1,threadId:sender,
      relatedParty:{partyId:recipient,kind:"thread",displayName:"Another reader"},
      relationKind:"social_contact",geneticContributionRole:"none",
      factualRoleRefs:["peer"],relationshipFacts:["We have read in the same room."],
      sourceReferences:[events.get(sender)],validFrom:at("08:00"),validTo:null,
      visibility:"restricted",provenance:"world_recorded",recordedAt:at("16:30"),
    });
    const ensureCurrent=async({threadId})=>lived.getCurrentSituation(threadId);
    const outreach=createThreadContactProcess({
      worldReader:world,livedNow:{ensure:ensureCurrent},situatedLifeStore:situated,
      semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      contactStore:contact,now:()=>at("17:05"),batchLimit:1,
      modelAdapter:{async invoke(call){
        return {output:call.clientRequestId.startsWith("later-contact-decision_")
          ?{decision:"contact",recipientPartyId:recipient,
            reason:"I want to ask about the passage."}
          :{messageText:"Would you like to compare what we read?"},
        provenance:{provider:"fixture",modelId:"write-map-contact"}};
      }},
    });
    const sent=await audit.measure("contact-outreach",()=>outreach.runOnce());
    assert.equal(sent.failed,0,"contact outreach failed in write map");
    assert.equal(contact.listInbox(recipient).length,1,"contact was not delivered");
    const perception=createThreadContactPerception({
      contactStore:contact,livedNow:{ensure:ensureCurrent},livedNowStore:lived,
      worldReader:world,semanticStateStore:semantic,memoryStore:memory,
      experienceStore:experience,now:()=>at("17:06"),
      modelAdapter:{async invoke(){
        return {output:{outcome:"noticed",
          experienceText:"My fellow reader asked to compare our books.",passedReason:null},
          provenance:{provider:"fixture",modelId:"write-map-attention"}};
      }},
    });
    const reception=await audit.measure("contact-reception-noticing",
      ()=>perception.runOnce());
    assert.equal(reception.noticed,1,"recipient did not notice delivered contact");
    const observed=experience.enqueueObservedSocialOpportunity({
      encounterRef:story.encounterId,threadId:ids[2],situationId:situations.get(ids[2]),
      counterpartyThreadId:ids[3],venueRef:venue.physicalVenue.ref,
      dueAt:at("16:10"),
    });
    assert.equal(observed.inserted,true,"observed social opportunity was not admitted");
    const social=createWorldSocialOpportunity({
      experienceStore:experience,livedNowStore:lived,now:()=>at("16:10"),
      meetingService:{async meet(){
        return {attempts:[{counterpartyThreadId:ids[3],outcome:"not_initiated",
          salience:null,initiation:{act:"none",expression:null,
            reason:"I choose to keep reading.",
            decisionContext:null,cognition:{selectedEvidenceRefs:[],evidenceRefs:[]}},
          stance:null,encounterStory:null}]};
      }},
    });
    const socialResult=await audit.measure("social-observed",()=>social.runOnce());
    assert.equal(socialResult.failed,0,"observed social decision failed");
    assert.equal(socialResult.results[0]?.outcome,"not_initiated",
      "observed opportunity lost voluntary non-participation");

    const scene={storyVersion:"encounter-story-v0.1",beats:[
      {actorThreadId:null,kind:"occurrence",
        text:"A thundercloud develops beyond the city."},
    ]};
    const source=experience.recordEncounterStory({
      occurredAt:at("17:00"),
      threadPresence:[{threadId:ids[4],situationId:situations.get(ids[4])}],
      story:scene,
      visualization:createEncounterVisualization({
        occurredAt:at("17:00"),story:scene,
        scene:"Beyond the reading room windows.",
        sourceReferences:[venue.ref],depictedThreadRefs:[],
      }),
    },{uniquePlaceOccurrenceRef:venue.physicalVenue.ref,followupAfterMs:30*60_000});
    const environment=createWorldEnvironmentEvolution({
      experienceStore:experience,livedNowStore:lived,worldReader:world,
      semanticStateStore:semantic,memoryStore:memory,now:()=>at("17:30"),
      modelAdapter:{async invoke(call){
        return call.clientRequestId.startsWith("world-environment-followup_")
          ?{output:{outcome:"changed",
            occurrenceText:"A lightning flash illuminates the horizon.",
            potentialObserverThreadIds:[ids[4]]}}
          :{output:{outcome:"noticed",
            experienceText:"I noticed lightning beyond the library.",
            passedReason:null},provenance:{provider:"fixture",modelId:"write-map-attention"}};
      }},
    });
    const changed=await audit.measure("environment-noticed",
      ()=>environment.runOnce());
    assert.equal(changed.failed,0,"World change was not observed");
    assert.equal(changed.noticed,1,"environmental change did not become experience");

    const idle=createWorldReconciliationProcess({
      contactOutreachProcess:outreach,contactReceptionProcess:perception,
      socialOpportunityProcess:social,environmentEvolutionProcess:environment,
    });
    const idleResult=await audit.measure("idle-reconciliation",()=>idle.runOnce());
    assert.equal(idleResult.skipped,false,"idle reconciliation did not run");
    assert.equal(idleResult.contactOutreach.result?.attempted,0,
      "idle World repeated contact work");

    const mapReport=audit.report(ids.length);
    const calibration={
      "lived-boundary":{units:14,ceiling:14},
      "contact-outreach":{units:1,ceiling:49},
      "contact-reception-noticing":{units:1,ceiling:42},
      "social-observed":{units:1,ceiling:35},
      "consolidation":{units:2,ceiling:27},
      "environment-noticed":{units:1,ceiling:19},
      "idle-reconciliation":{units:1,ceiling:3},
    };
    const activities=Object.fromEntries(Object.entries(calibration).map(([name,{units,ceiling}])=>{
      const measured=mapReport.activities[name]??{weightedRows:0,tables:[]};
      const rowsPerUnit=measured.weightedRows/units;
      return [name,{...measured,units,rowsPerUnit,stagingRowsPerUnit:ceiling,
        deviationPercent:Math.round(100*(rowsPerUnit/ceiling-1))}];
    }));
    const deviations=Object.entries(activities)
      .filter(([,entry])=>Math.abs(entry.deviationPercent)>30)
      .map(([name,entry])=>({name,local:entry.rowsPerUnit,staging:entry.stagingRowsPerUnit}));
    reportTestEvidence("FIBRE-WORLD-WRITE-MAP",{activities,deviations});
    for(const [name,{ceiling}] of Object.entries(calibration))
      assert.ok(activities[name].rowsPerUnit<=ceiling,
        name+" exceeded measured staging write ceiling: "
          +activities[name].rowsPerUnit+" > "+ceiling);

  }finally{
    audit?.close();contact?.close();situated?.close();semantic?.close();
    memory?.close();experience?.close();lived?.close();world?.close();
    rmSync(directory,{recursive:true,force:true});
  }
});

 
// This is the deploy-style boundary unit, not the isolated storage API.
test("a real arrival boundary includes semantic regulation, wake rearm and settlement",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-boundary-write-diet-"));
  const path=join(directory,"world.sqlite");
  let audit=null,world=null,lived=null,semantic=null;
  try{
    const storage=localWorldStateStorage(path);
    installWorldSchemas(storage);
    world=openWorldStore(storage);
    lived=openLivedNowStore(storage);
    semantic=openSemanticStateStore(storage);
    const ids=Array.from({length:7},(_,i)=>`thr_boundary_cost_${i+1}`);
    for(const threadId of ids){
      const thread=structuredClone(seed);
      thread.threadId=threadId;
      thread.provenance.lastEventId="evt_"+threadId;
      world.seedThread(thread);
    }
    const place=(identity,name,number)=>lived.admitPublicPlace({
      venueIdentity:identity,displayName:name,
      streetAddress:`${number} Example Street`,
      locality:"Tucson",country:"United States",countryCode:"US",
      lat:32.222,long:-110.975,timeZone:"America/Phoenix",
      evidenceRef:"https://example.org/world-write-diet",
      affordances:["Reading","Conversation"],
    });
    const origin=place("fixture:write-diet-home","Tucson community room",1);
    const venue=place("fixture:write-diet-venue","Tucson reading library",2);
    const modelCalls=[];
    const service=createLivedNowService({
      livedNowStore:lived,worldStore:world,semanticStateStore:semantic,
      modelAdapter:{async invoke(call){
        assert.ok(call.input?.interoception,
          "boundary benchmark unexpectedly requested plan cognition");
        modelCalls.push(call);
        return {output:{states:[{
          domain:"emotion",dimension:"contentment",
          state:"I feel a quiet sense of arrival at the reading library.",
        }]},provenance:{provider:"fixture",modelId:"world-boundary-write-diet",
          providerRequestId:call.clientRequestId}};
      }},
      onSituationResolved:situation=>lived.scheduleNextLivedBoundary({
        threadId:situation.threadId,situationId:situation.situationId,
        dueAt:nextLivedBoundary(lived,situation),
      }),
    });
    for(const threadId of ids){
      const eventRef=world.listEvents(threadId)[0].eventId;
      lived.recordPlan({
        planId:livedPlanId({threadId,kind:"personal",authoredAt:at("08:00")}),
        kind:"personal",subjectThreadId:threadId,
        owner:{partyId:threadId,kind:"thread"},
        authoredAt:at("08:00"),horizonStart:at("08:00"),horizonEnd:at("20:00"),
        stops:[
          {startAt:at("08:00"),endAt:at("08:15"),
            physicalPlaceRef:origin.ref,mediatedContext:null,
            activity:"Finish reading before setting out.",
            purpose:"I want to spend the afternoon at the library.",
            outwardActivity:"reading",wakefulness:"awake",
            companionRefs:[],travelFromPrevious:null},
          {startAt:at("08:30"),endAt:at("20:00"),
            physicalPlaceRef:venue.ref,mediatedContext:null,
            activity:"Read in the public library.",
            purpose:"Learn something alongside other readers.",
            outwardActivity:"reading",wakefulness:"awake",
            companionRefs:[],travelFromPrevious:"Walk to the library."},
        ],
        sourceReferences:[eventRef,origin.ref,venue.ref],
        cognition:{provider:"fixture",modelId:"write-diet",
          providerRequestId:null},
      });
      const transit=await service.ensure({threadId,at:at("08:20")});
      assert.equal(transit.phase,"in_transit",
        "cost scenario did not establish its prior transit");
    }
    assert.equal(modelCalls.length,0,
      "preparing an initial transit performed extra regulation cognition");
    audit=auditWorldWrites(path);
    const boundary=createLivedBoundaryProcess({
      livedNowStore:lived,livedNow:service,now:()=>at("08:30"),
    });
    const outcomes=[];
    await audit.measure("arrival-boundary",async()=>{
      for(let pass=0;pass<2;pass++){
        const step=await boundary.runOnce();
        assert.equal(step.failed,0,"measured boundary had a failed pass");
        outcomes.push(...step.results);
      }
    });
    assert.equal(outcomes.length,ids.length,"missed one Thread's planned arrival");
    assert.ok(outcomes.every(result=>result.outcome==="advanced"),
      "World did not advance every admitted arrival");
    assert.equal(modelCalls.length,ids.length,
      "arrival regulation was not exercised once per Thread");
    for(const threadId of ids){
      assert.equal(lived.getCurrentSituation(threadId).location.placeRef,venue.ref);
      assert.equal(semantic.listCurrentState(threadId).length,1,
        "arriving Thread did not persist its independent semantic state");
    }
    const beforeReplay=audit.report(ids.length).total;
    await audit.measure("idempotent-replay",async()=>{
      for(const threadId of ids)
        await service.ensure({threadId,at:at("08:30")});
      const repeated=await boundary.runOnce();
      assert.equal(repeated.attempted,0,
        "settled boundaries were not removed from the due queue");
    });
    assert.equal(audit.report(ids.length).total,beforeReplay,
      "retry rewrote an unchanged situation or semantic state");
    const report=audit.report(ids.length);
    reportTestEvidence("FIBRE-WORLD-BOUNDARY-UNIT",{
      advances:outcomes.length,semanticStates:modelCalls.length,
      rowsPerBoundary:report.total/outcomes.length,...report,
    });
    assert.ok(report.byStore.LivedNowStore>0&&report.byStore.SemanticStateStore>0,
      "boundary diet omitted lived or semantic writes: "+JSON.stringify(report.byStore));
    // The compact semantic head is one PK B-tree write per new state, not
    // the former rowid + autoindex + secondary-index projection. This is
    // an upper bound; the printed measurement remains authoritative.
    const bound=Number(process.env.FIBRE_WORLD_BOUNDARY_WRITE_BUDGET??15);
    assert.ok(report.total/outcomes.length<=bound,
      "boundary write budget "+report.total+"/"+outcomes.length+": "
        +JSON.stringify(report.byStore));
  }finally{
    audit?.close();semantic?.close();lived?.close();world?.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
