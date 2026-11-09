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
import {createSocialMeetingService} from "../src/lived-social-meeting.mjs";
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
              reason:"Read independently alongside the others.",participantRefs:[],
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
    reportTestEvidence("FIBRE-WORLD-WRITE-BUDGET",report);
    // Storage-only upper bound for the seven-Thread day; semantic heads add
    // writes only when a new semantic record is admitted. The day's one spoken
    // social act also appends one relational-ledger offer.
    const budget=Number(process.env.FIBRE_WORLD_WRITE_BUDGET??291/7);
    assert.ok(report.rowsPerThreadDay<=budget,
      "World write budget exceeded "+report.total+"/7: "+JSON.stringify(report.byStore));
    // New alarm activities are measured after the original day budget, so
    // measuring wider World behavior does not silently relax that ceiling.
    const sender=ids[0],recipient=ids[1];
    await audit.measure("contact-source",()=>{
      const note={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:sender,kind:"utterance",
          text:"I kept thinking about the passage we read together."},
      ]};
      const encounter=experience.recordEncounterStory({
        occurredAt:at("16:32"),
        threadPresence:[{threadId:sender,situationId:situations.get(sender)}],
        story:note,
        visualization:createEncounterVisualization({
          occurredAt:at("16:32"),story:note,
          scene:"At the reading room.",sourceReferences:[venue.ref],
          depictedThreadRefs:[],
        }),
      });
      const attention=experience.recordThreadEncounterAttention({
        threadId:sender,encounterRef:encounter.encounterId,
        situationId:situations.get(sender),occurredAt:at("16:32"),
        outcome:"noticed",
        experienceText:"I still want to know what the other reader thought.",
      });
      experience.queueThreadExperienceConsolidation({
        experienceId:attention.experience.experienceId,queuedAt:at("16:32"),
      });
      situated.recordLifeRelation({
      relationId:lifeRelationId({threadId:sender,partyId:recipient,role:"peer"}),
      revision:1,threadId:sender,
      relatedParty:{partyId:recipient,kind:"thread",displayName:"Another reader"},
      relationKind:"social_contact",geneticContributionRole:"none",
      factualRoleRefs:["peer"],relationshipFacts:["We have read in the same room."],
      sourceReferences:[events.get(sender)],validFrom:at("08:00"),validTo:null,
      visibility:"restricted",provenance:"world_recorded",recordedAt:at("16:30"),
      });
    });
    const reflection=await audit.measure("contact-afterthought",()=>
      createExperienceConsolidationProcess({
        worldReader:world,livedNowStore:lived,semanticStateStore:semantic,
        memoryStore:memory,experienceStore:experience,
        now:()=>at("17:04"),clock:()=>Date.parse(at("17:04")),batchLimit:1,
        modelAdapter:{async invoke(){
          return {output:{
            journalEntry:null,
            afterthoughts:[{kind:"question",
              text:"I want to ask the other reader about her favorite passage."}],
            memory:{outcome:"not_remembered",rememberedContent:null,
              rememberedMeaning:null,confidence:null,salience:null,uncertainty:[]},
          },provenance:{provider:"fixture",modelId:"write-map-afterthought"}};
        }},
      }).runOnce());
    assert.equal(reflection.completed,1,"contact source did not become an afterthought");
    const realLivedNow=createLivedNowService({livedNowStore:lived});
    const ensureCurrent=input=>realLivedNow.ensure(input);
    const outreach=createThreadContactProcess({
      worldReader:world,livedNow:{ensure:ensureCurrent},livedNowStore:lived,situatedLifeStore:situated,
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
    assert.equal(lived.listRecentSituations(sender)
      .filter(situation=>situation.establishedAt>=at("16:00")).length,1,
      "mid-stop contact decision invented a new situation");
    assert.equal(sent.attempted,1,"the afterthought did not prompt contact");
    assert.equal(contact.listInbox(recipient).length,1,"contact was not delivered");
    const due=contact.listDueContactReceptions({at:at("17:06"),limit:1})[0];
    assert.ok(due,"delivered contact has no reception opportunity");
    await audit.measure("contact-reception-mid-stop",()=>
      realLivedNow.ensure({threadId:recipient,at:at("17:06")}));
    const claim=await audit.measure("contact-reception",()=>contact.claimContactReception({
      messageId:due.messageId,threadId:recipient,
      situationId:situations.get(recipient),perceivedAt:at("17:06"),
      senderName:world.getThread(sender).identity.name,
    }));
    assert.equal(claim.situationId,situations.get(recipient),
      "reception was not bound to the recipient's lived situation");
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
    const reception=await audit.measure("contact-noticing",
      ()=>perception.runOnce());
    assert.equal(reception.noticed,1,"recipient did not notice delivered contact");
    assert.equal(lived.listRecentSituations(recipient)
      .filter(situation=>situation.establishedAt>=at("16:00")).length,1,
      "mid-stop contact reception rewrote the recipient's present");
    const noticedReflection=await audit.measure("contact-noticed-reflection",()=>
      createExperienceConsolidationProcess({
        worldReader:world,livedNowStore:lived,semanticStateStore:semantic,
        memoryStore:memory,experienceStore:experience,
        now:()=>at("17:27"),clock:()=>Date.parse(at("17:27")),batchLimit:1,
        modelAdapter:{async invoke(){
          return {output:{journalEntry:null,afterthoughts:[],
            memory:{outcome:"not_remembered",rememberedContent:null,
              rememberedMeaning:null,confidence:null,salience:null,uncertainty:[]}},
          provenance:{provider:"fixture",modelId:"write-map-noticed-reflection"}};
        }},
      }).runOnce());
    assert.equal(noticedReflection.completed,1,
      "recipient's noticed contact was not consolidated");
    // A second delivered message is available to its recipient but may never
    // enter attention. Keep this outcome's writes separate from noticed contact.
    const quietSender=ids[2],quietRecipient=ids[3];
    await audit.measure("contact-pass-source",()=>{
      const note={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:quietSender,kind:"utterance",
          text:"I wonder what the other person is reading."},
      ]};
      const encounter=experience.recordEncounterStory({
        occurredAt:at("17:10"),
        threadPresence:[{threadId:quietSender,situationId:situations.get(quietSender)}],
        story:note,visualization:createEncounterVisualization({
          occurredAt:at("17:10"),story:note,scene:"In the reading room.",
          sourceReferences:[venue.ref],depictedThreadRefs:[],
        }),
      });
      const attention=experience.recordThreadEncounterAttention({
        threadId:quietSender,encounterRef:encounter.encounterId,
        situationId:situations.get(quietSender),occurredAt:at("17:10"),
        outcome:"noticed",experienceText:"I am curious about their book.",
      });
      experience.queueThreadExperienceConsolidation({
        experienceId:attention.experience.experienceId,queuedAt:at("17:10"),
      });
      situated.recordLifeRelation({
        relationId:lifeRelationId({
          threadId:quietSender,partyId:quietRecipient,role:"peer",
        }),
        revision:1,threadId:quietSender,
        relatedParty:{partyId:quietRecipient,kind:"thread",displayName:"A quiet reader"},
        relationKind:"social_contact",geneticContributionRole:"none",
        factualRoleRefs:["peer"],relationshipFacts:["We read in the same room."],
        sourceReferences:[events.get(quietSender)],validFrom:at("08:00"),validTo:null,
        visibility:"restricted",provenance:"world_recorded",recordedAt:at("17:10"),
      });
    });
    const quietReflection=await audit.measure("contact-pass-afterthought",()=>
      createExperienceConsolidationProcess({
        worldReader:world,livedNowStore:lived,semanticStateStore:semantic,
        memoryStore:memory,experienceStore:experience,
        now:()=>at("17:35"),clock:()=>Date.parse(at("17:35")),batchLimit:1,
        modelAdapter:{async invoke(){
          return {output:{journalEntry:null,afterthoughts:[{
            kind:"question",text:"Perhaps we can exchange reading recommendations.",
          }],memory:{outcome:"not_remembered",rememberedContent:null,
            rememberedMeaning:null,confidence:null,salience:null,uncertainty:[]}},
          provenance:{provider:"fixture",modelId:"write-map-quiet-afterthought"}};
        }},
      }).runOnce());
    assert.equal(quietReflection.completed,1,"quiet contact source lost its afterthought");
    const quietOutreach=createThreadContactProcess({
      worldReader:world,livedNow:{ensure:ensureCurrent},livedNowStore:lived,situatedLifeStore:situated,
      semanticStateStore:semantic,memoryStore:memory,experienceStore:experience,
      contactStore:contact,now:()=>at("17:36"),batchLimit:1,
      modelAdapter:{async invoke(call){
        return {output:call.clientRequestId.startsWith("later-contact-decision_")
          ?{decision:"contact",recipientPartyId:quietRecipient,
            reason:"I want to exchange reading recommendations."}
          :{messageText:"Have you found a book you would recommend?"},
        provenance:{provider:"fixture",modelId:"write-map-quiet-contact"}};
      }},
    });
    const quietSent=await audit.measure("contact-pass-outreach",()=>
      quietOutreach.runOnce());
    assert.equal(quietSent.attempted,1,"quiet contact was not sent");
    const quietDue=contact.listDueContactReceptions({at:at("17:37"),limit:1})[0];
    assert.ok(quietDue,"quiet message has no reception opportunity");
    await audit.measure("contact-pass-reception",()=>contact.claimContactReception({
      messageId:quietDue.messageId,threadId:quietRecipient,
      situationId:situations.get(quietRecipient),perceivedAt:at("17:37"),
      senderName:world.getThread(quietSender).identity.name,
    }));
    const quietPerception=createThreadContactPerception({
      contactStore:contact,livedNow:{ensure:ensureCurrent},livedNowStore:lived,
      worldReader:world,semanticStateStore:semantic,memoryStore:memory,
      experienceStore:experience,now:()=>at("17:37"),
      modelAdapter:{async invoke(){
        return {output:{outcome:"not_noticed",experienceText:null,
          passedReason:"I stayed absorbed in the book before me."},
          provenance:{provider:"fixture",modelId:"write-map-unnoticed-contact"}};
      }},
    });
    const passed=await audit.measure("contact-passed",()=>quietPerception.runOnce());
    assert.equal(passed.results[0]?.outcome,"not_noticed",
      "an unremarked message was forced into personal experience");
    assert.equal(passed.results[0]?.experienceId,null,
      "passing on a message manufactured a personal experience");

    const observed=await audit.measure("social-observed-setup",()=>
      experience.enqueueObservedSocialOpportunity({
        encounterRef:story.encounterId,threadId:ids[2],situationId:situations.get(ids[2]),
        counterpartyThreadId:ids[3],venueRef:venue.physicalVenue.ref,
        dueAt:at("16:10"),
      }));
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

    // An independently noticed gesture creates an ordinary chance to greet.
    // The World process delegates to the real meeting service, which records
    // the outward act and each person's independently appraised attention.
    const socialActor=ids[5],socialOther=ids[6];
    await audit.measure("social-initiated-setup",()=>{
      const gesture={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:socialOther,kind:"action",
          text:"Another reader waves briefly across the table."},
      ]};
      const source=experience.recordEncounterStory({
        occurredAt:at("16:09"),
        threadPresence:[socialActor,socialOther].map(threadId=>({
          threadId,situationId:situations.get(threadId),
        })),
        story:gesture,visualization:createEncounterVisualization({
          occurredAt:at("16:09"),story:gesture,
          scene:"At the shared reading table.",
          sourceReferences:[venue.ref],depictedThreadRefs:[],
        }),
      });
      experience.recordThreadEncounterAttention({
        threadId:socialActor,encounterRef:source.encounterId,
        situationId:situations.get(socialActor),occurredAt:at("16:09"),
        outcome:"noticed",experienceText:"Another reader waved in my direction.",
      });
      const queued=experience.enqueueObservedSocialOpportunity({
        encounterRef:source.encounterId,threadId:socialActor,
        situationId:situations.get(socialActor),
        counterpartyThreadId:socialOther,venueRef:venue.physicalVenue.ref,
        dueAt:at("16:10"),
      });
      assert.equal(queued.inserted,true,"noticed social gesture was not actionable");
    });
    let initiationCalls=0,attentionCalls=0;
    const meeting=createSocialMeetingService({
      worldReader:world,livedNow:{async ensure(){
        throw Error("social cognition must not advance lived time");
      }},
      livedNowStore:lived,
      identityStore:{getCurrentIdentityView:threadId=>({
        threadId,assertions:[],
      })},
      situatedLifeStore:situated,semanticStateStore:semantic,
      memoryStore:memory,experienceStore:experience,boundedVenueDiscovery:true,
      modelAdapter:{
        provider:"fixture",modelId:"social-fixture",configuration:{transport:"fixture"},
        async invoke(call){
          if(call.input?.concern?.kind==="social_initiation"){
            initiationCalls++;
            const greet=call.input.thread.threadId===socialActor;
            return {output:{result:{
              act:greet?"greet":"none",
              expression:greet?"Hello, what are you reading?":null,
              experienceText:greet
                ?"I greeted the other reader with genuine curiosity.":null,
              reason:greet?"I would enjoy exchanging a few words."
                :"I prefer to return to my reading.",
              introducesSelf:false,
            },evidenceRefs:[],conflictingMotives:[],uncertainty:null},
            provenance:{provider:"fixture",modelId:"write-map-social-choice"}};
          }
          attentionCalls++;
          return {output:{outcome:"noticed",
            experienceText:"I noticed the greeting and considered responding.",
            passedReason:null},
            provenance:{provider:"fixture",modelId:"write-map-social-attention"}};
        },
        async *streamExpression(){throw Error("greeting must not invoke live conversation");},
      },
    });
    const initiated=createWorldSocialOpportunity({
      experienceStore:experience,livedNowStore:lived,
      meetingService:meeting,worldReader:world,now:()=>at("16:10"),
    });
    const beforeSocial=await audit.measure("social-mid-stop-presence",async()=>{
      await realLivedNow.ensure({threadId:socialActor,at:at("16:10")});
      await realLivedNow.ensure({threadId:socialOther,at:at("16:10")});
      return lived.listRecentSituations(socialActor)
        .filter(situation=>situation.establishedAt>=at("16:00")).length;
    });
    assert.equal(beforeSocial,1,"social presence lookup invented lived history");
    const initiatedResult=await audit.measure("social-initiated",()=>initiated.runOnce());
    assert.equal(initiatedResult.failed,0,"ordinary greeting failed");
    assert.equal(initiatedResult.results[0]?.outcome,"acted",
      "an initiated greeting did not become an outward social act");
    assert.equal(initiationCalls,1,"one greeting spent repeated initiation cognition");
    assert.equal(attentionCalls,1,"recipient lacked independent attention");
    assert.equal(lived.listRecentSituations(socialActor)
      .filter(situation=>situation.establishedAt>=at("16:00")).length,1,
      "mid-stop social encounter minted a false situation");
    const greeting=experience.listEncounterStories(socialActor)
      .find(story=>story.story.beats.some(beat=>
        beat.actorThreadId===socialActor&&beat.kind==="utterance"
        &&beat.text.includes("Hello, what are you reading?")));
    assert.ok(greeting,"a chosen greeting left no objective shared encounter");
    assert.equal(experience.getThreadEncounterAttention(
      socialOther,greeting.encounterId)?.outcome,"noticed",
    "the recipient's independent attention was not recorded");
    const reply=await audit.measure("social-reply-declined",()=>initiated.runOnce());
    assert.equal(reply.results[0]?.outcome,"not_initiated",
      "noticing a greeting forced the recipient to reciprocate");
    assert.equal(initiationCalls,2,"reply choice spent repeated cognition");
    assert.equal(attentionCalls,1,"declined reply manufactured attention");

    const scene={storyVersion:"encounter-story-v0.1",beats:[
      {actorThreadId:null,kind:"occurrence",
        text:"A thundercloud develops beyond the city."},
    ]};
    await audit.measure("environment-source",()=>
      experience.recordEncounterStory({
        occurredAt:at("16:20"),
        threadPresence:[{threadId:ids[4],situationId:situations.get(ids[4])}],
        story:scene,
        visualization:createEncounterVisualization({
          occurredAt:at("16:20"),story:scene,
          scene:"Beyond the reading room windows.",
          sourceReferences:[venue.physicalVenue.ref],depictedThreadRefs:[],
        }),
      },{uniquePlaceOccurrenceRef:venue.physicalVenue.ref,followupAfterMs:30*60_000}));
    const environment=createWorldEnvironmentEvolution({
      experienceStore:experience,livedNowStore:lived,worldReader:world,
      semanticStateStore:semantic,memoryStore:memory,now:()=>at("16:50"),
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

    // Compare matched four-utterance exchanges. Only the first external
    // stimulus belongs to setup; each chosen act and its consequences are
    // measured through the real meeting and World opportunity processes.
    const compare=async(mode,pair)=>{
      const sceneIds=new Map();
      await audit.measure("social-exchange-setup",()=>{
        for(const threadId of pair){
          const thread=structuredClone(seed);
          thread.threadId=threadId;
          thread.provenance.lastEventId="evt_"+threadId;
          world.seedThread(thread);
          const source=world.listEvents(threadId)[0].eventId;
          lived.recordPlan({
            planId:livedPlanId({threadId,kind:"personal",authoredAt:at("08:00")}),
            kind:"personal",subjectThreadId:threadId,
            owner:{partyId:threadId,kind:"thread"},
            authoredAt:at("08:00"),horizonStart:at("08:00"),horizonEnd:at("20:00"),
            stops:[{startAt:at("08:00"),endAt:at("20:00"),
              physicalPlaceRef:venue.ref,mediatedContext:null,
              activity:"Read and reflect at the shared library.",
              outwardActivity:"reading",wakefulness:"awake",
              purpose:"Explore questions at my own pace.",
              companionRefs:[],travelFromPrevious:null}],
            sourceReferences:[source,venue.ref],
            cognition:{provider:"fixture",modelId:"exchange-cost",providerRequestId:null},
          });
          const current=lived.enactCurrentSituation({
            threadId,situationId:livedSituationId({threadId,at:at("16:00")}),
            establishedAt:at("16:00"),
            observation:{phase:"at_place",location:{kind:"place",placeRef:venue.ref},
              mediatedContext:null,activity:"Read and reflect at the shared library.",
              outwardActivity:"reading",wakefulness:"awake",
              reason:"Explore questions at my own pace.",participantRefs:[],
              evidenceRefs:[source,venue.ref]},
          });
          sceneIds.set(threadId,current.situationId);
          lived.scheduleNextLivedBoundary({
            threadId,situationId:current.situationId,dueAt:at("20:00"),
          });
        }
        const event={storyVersion:"encounter-story-v0.1",
          beats:[{actorThreadId:pair[1],kind:"utterance",
            text:"I noticed a question about the reading."}]};
        const source=experience.recordEncounterStory({
          occurredAt:at("17:40"),
          threadPresence:pair.map(threadId=>({
            threadId,situationId:sceneIds.get(threadId),
          })),
          story:event,visualization:createEncounterVisualization({
            occurredAt:at("17:40"),story:event,
            scene:"At the shared library.",sourceReferences:[venue.ref],
            depictedThreadRefs:[],
          }),
        });
        experience.recordThreadEncounterAttention({
          threadId:pair[0],encounterRef:source.encounterId,
          situationId:sceneIds.get(pair[0]),occurredAt:at("17:40"),
          outcome:"noticed",experienceText:"I noticed the other reader's question.",
        });
      });
      const counts={invocations:0,streams:0,decisions:0,attention:0,experiences:0};
      const adapter={
        provider:"fixture",modelId:"exchange-cost",
        configuration:{transport:"fixture"},
        async invoke(call){
          counts.invocations++;
          if(call.input?.concern?.kind==="social_initiation"){
            counts.decisions++;
            const offered=JSON.stringify(call.responseSchema)
              .includes("continue_conversation");
            const act=mode==="continued"&&counts.decisions>=3&&offered
              ?"continue_conversation":"remark";
            return {output:{result:{
              act,expression:"I have a thought about that evidence.",
              experienceText:"I chose to share a thought.",reason:"I remain interested.",
              introducesSelf:false,
            },evidenceRefs:[],conflictingMotives:[],uncertainty:null},
            provenance:{provider:"fixture",modelId:"exchange-choice"}};
          }
          if(call.clientRequestId?.startsWith("encounter-attention_")){
            counts.attention++;
            return {output:{outcome:"noticed",
              experienceText:"I heard the other reader's reply.",passedReason:null},
              provenance:{provider:"fixture",modelId:"exchange-attention"}};
          }
          if(call.clientRequestId?.startsWith("encounter-experience_")){
            counts.experiences++;
            return {output:{experienceText:"I followed the exchange as it unfolded."},
              provenance:{provider:"fixture",modelId:"exchange-experience"}};
          }
          throw Error("unrecognized exchange cognition");
        },
        async *streamExpression(){
          counts.streams++;
          yield {type:"expression_delta",
            text:counts.streams===1?"SAY: One more piece of evidence matters":"SILENT"};
          yield {type:"expression_complete",
            provenance:{provider:"fixture",modelId:"exchange-live-turn"}};
        },
      };
      const meeting=createSocialMeetingService({
        worldReader:world,livedNow:{async ensure(){
          throw Error("social encounter must not re-enact life");
        }},
        livedNowStore:lived,
        identityStore:{getCurrentIdentityView:threadId=>({threadId,assertions:[]})},
        situatedLifeStore:situated,semanticStateStore:semantic,memoryStore:memory,
        experienceStore:experience,boundedVenueDiscovery:true,modelAdapter:adapter,
      });
      const process=minute=>createWorldSocialOpportunity({
        experienceStore:experience,livedNowStore:lived,
        worldReader:world,meetingService:meeting,now:()=>at(minute),
      });
      await audit.measure(mode==="continued"?"social-continued-conversation":"social-four-remarks",
        async()=>{
          const initial=await meeting.meet({
            initiatorThreadId:pair[0],counterpartyThreadId:pair[1],at:at("17:45"),
          });
          assert.equal(initial.attempts[0]?.outcome,"acted","first remark failed");
          const times=mode==="continued"?["17:46","17:47"]
            :["17:46","17:47","17:48"];
          for(const time of times){
            const step=await process(time).runOnce();
            assert.equal(step.failed,0,"reciprocal exchange failed");
            assert.equal(step.attempted,1,"reply was not considered");
          }
        });
      const storyCount=experience.listEncounterStories(pair[0])
        .filter(story=>Date.parse(story.occurredAt)>=Date.parse(at("17:45"))).length;
      assert.equal(storyCount,mode==="continued"?3:4,
        "exchange produced an unexpected number of independent Stories");
      if(mode==="continued"){
        const conversation=experience.listEncounterStories(pair[0])
          .find(story=>Date.parse(story.occurredAt)>=Date.parse(at("17:45"))
            &&story.story.beats.length>2);
        assert.equal(conversation?.story.beats.length,3,
          "continued conversation did not record a voluntary later turn");
        assert.equal(counts.streams,2,
          "a speaking and a silent opportunity should cost one streamed call each");
        assert.ok(!situated.listCurrentLifeRelations(pair[0]).some(relation=>
          relation.relationKind==="social_contact"
          &&relation.relatedParty.partyId===pair[1]),
        "continued speech invented acquaintance without an invitation");
      }
      return counts;
    };
    const fourCalls=await compare("remarks",["thr_write_compare_a","thr_write_compare_b"]);
    const conversationCalls=await compare("continued",["thr_write_compare_c","thr_write_compare_d"]);
    const mapReport=audit.report(ids.length);
    const calibration={
      "lived-boundary":{units:14,ceiling:14},
      "contact-outreach":{units:1,ceiling:49},
      "contact-reception":{units:1,ceiling:10},
      "contact-noticing":{units:1,ceiling:32},
      "social-observed":{units:1,ceiling:35},
      "consolidation":{units:2,ceiling:27},
      "environment-noticed":{units:1,ceiling:19},
      "idle-reconciliation":{units:1,ceiling:3},
    };
    // Local ceilings use measured fixture writes, not fitted staging averages.
    // Derived from the validated pre-change operation counts and the now
    // single-B-tree pending queues / retired indexes. Guy validates after-map.
    const activityCeilings={
      plan:21,"lived-boundary":126,"social-act":15,
      "noticed-experience":10,"consolidation-queue":8,
      "social-opportunity":30,"ambient-scene":9,consolidation:72,
      "contact-source":28,"contact-afterthought":17,
      "contact-outreach":22,"contact-reception":3,"contact-noticing":21,
      "social-observed-setup":5,"social-observed":10,
      "environment-source":12,"environment-noticed":24,
      "idle-reconciliation":0,"social-mid-stop-presence":0,
      "contact-reception-mid-stop":0,
      "social-four-remarks":181,"social-continued-conversation":133,
      // Matched per-activity write ceilings from the November 3 local map.
      // The continued path must also prove audible post-seeding speech.
      // November 5: + one relational-ledger row per act and one row per door
      // opened (social act and outreach +1, remarks +3, continuation +7).
    };
    const activities=Object.fromEntries(Object.entries(mapReport.activities)
      .concat(Object.keys(activityCeilings).filter(name=>!(name in mapReport.activities))
        .map(name=>[name,{weightedRows:0,tables:[]}]))
      .map(([name,measured])=>{
        const reference=calibration[name]??null;
        const localCeiling=activityCeilings[name];
        if(reference===null)return [name,{...measured,localCeiling}];
        const rowsPerUnit=measured.weightedRows/reference.units;
        return [name,{...measured,localCeiling,units:reference.units,rowsPerUnit,
          stagingRowsPerUnit:reference.ceiling,
          deviationPercent:Math.round(100*(rowsPerUnit/reference.ceiling-1))}];
      }));
    const deviations=Object.entries(activities)
      .filter(([,entry])=>Math.abs(entry.deviationPercent)>30)
      .map(([name,entry])=>({name,local:entry.rowsPerUnit,staging:entry.stagingRowsPerUnit}));
    const aboveStagingCeiling=Object.entries(calibration)
      .filter(([name,{ceiling}])=>activities[name].rowsPerUnit>ceiling)
      .map(([name,{ceiling}])=>({name,local:activities[name].rowsPerUnit,ceiling}));
    // A fitted staging average is a comparison, not a local regression gate:
    // this fixture deliberately retains two memories, unlike the staging mix.
    reportTestEvidence("FIBRE-WORLD-WRITE-MAP",{
      activities,deviations,aboveStagingCeiling,
      exchangeComparison:{
        savedWeightedRows:(activities["social-four-remarks"]?.weightedRows??0)
          -(activities["social-continued-conversation"]?.weightedRows??0),
        fourRemarks:{rows:activities["social-four-remarks"]?.weightedRows??0,
          modelCalls:fourCalls.invocations+fourCalls.streams,breakdown:fourCalls},
        continuedConversation:{
          rows:activities["social-continued-conversation"]?.weightedRows??0,
          modelCalls:conversationCalls.invocations+conversationCalls.streams,
          breakdown:conversationCalls},
      },
    });
    const rows=(...names)=>names.reduce((sum,name)=>
      sum+(activities[name]?.weightedRows??0),0);
    const livedWrites=name=>(activities[name]?.tables??[])
      .filter(row=>/^(lived_now_|current_situation_)/u.test(row.table))
      .reduce((sum,row)=>sum+row.weightedRows,0);
    reportTestEvidence("FIBRE-WORLD-MID-STOP",{
      contactDecisionLivedRows:livedWrites("contact-outreach"),
      contactReceptionLivedRows:livedWrites("contact-reception-mid-stop"),
      socialPresenceLivedRows:livedWrites("social-mid-stop-presence"),
      claim:"identical admitted scene; no new current situation",
    });
    reportTestEvidence("FIBRE-WORLD-SOCIAL-CONTACT-MATCHED",{
      staging:{source:"Nov 2 fitted reconciliation stages; R2=0.94",
        outreach:49,reception:10,recipientNoticing:32,socialDecision:35},
      local:{
        contactInitiation:{
          afterthought:rows("contact-afterthought"),
          outreach:rows("contact-outreach"),
          combined:rows("contact-afterthought","contact-outreach"),
          sourceSetupNotInCombined:rows("contact-source"),
        },
        contactNoticed:{
          reception:rows("contact-reception"),
          attentionAndSettlement:rows("contact-noticing"),
          combined:rows("contact-reception","contact-noticing"),
          laterReflection:rows("contact-noticed-reflection"),
        },
        contactPassed:{
          afterthought:rows("contact-pass-afterthought"),
          outreach:rows("contact-pass-outreach"),
          reception:rows("contact-pass-reception"),
          attentionAndSettlement:rows("contact-passed"),
          sourceSetupNotInCombined:rows("contact-pass-source"),
        },
        socialNotInitiated:{
          setup:rows("social-observed-setup"),
          decision:rows("social-observed"),
        },
        socialGreeted:{
          setup:rows("social-initiated-setup"),
          decisionAndConsequences:rows("social-initiated"),
          independentReplyDeclined:rows("social-reply-declined"),
        },
        idleWorldProcess:rows("idle-reconciliation"),
      },
      comparability:{
        outreach:"afterthought + outreach (52 in prior baseline) versus fitted 49",
        reception:"claim + recipient attention is distinct from two fitted stages",
        social:"non-initiation and greeting differ from staging's mixed outcomes",
        idle:"local World process excludes Cloudflare alarm/retry storage",
      },
    });
    for(const [name,ceiling] of Object.entries(activityCeilings)){
      assert.ok(activities[name].weightedRows<=ceiling,
        name+" exceeded local write ceiling: "+activities[name].weightedRows+" > "+ceiling);
    }

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
