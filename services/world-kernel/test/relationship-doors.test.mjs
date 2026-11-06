import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedWorldStateStorage,localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import { installWorldSchemas } from "../src/world-schema-installation.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openRelationshipInspectionStore } from "../src/relationship-inspection.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { runThreadLiveSocialEncounter } from "../src/lived-social-live-encounter.mjs";
import { socialScorecard } from "../../../tools/ops/world-social-quality.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const T0="2026-11-05T09:00:00.000Z";
const at=minutes=>new Date(Date.parse(T0)+minutes*60_000).toISOString();
const A="thr_doors_abeba",B="thr_doors_bekele";

// Two Threads in one World; Stories and invitations go through the same
// store methods the social meeting service uses to admit them.
function world(){
  const directory=mkdtempSync(join(tmpdir(),"fibre-doors-"));
  const path=join(directory,"world.sqlite");
  const storage=installedWorldStateStorage(path);
  const threads=openWorldStore(storage),experience=openLivedExperienceStore(storage);
  const inspection=openRelationshipInspectionStore(storage);
  for(const [threadId,name] of [[A,"Abeba Tesfaye"],[B,"Bekele Alemu"]]){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.identity.name=name;
    thread.provenance.lastEventId="evt_"+threadId;
    threads.seedThread(thread);
  }
  function story(when,beats){
    return record(when,{storyVersion:"encounter-story-v0.1",beats:beats.map(([actor,words,more={}])=>({
      actorThreadId:actor,kind:"utterance",text:`A person says: "${words}"`,spokenText:words,...more,
    }))});
  }
  function record(when,recorded){
    return experience.recordEncounterStory({
      occurredAt:when,story:recorded,
      threadPresence:[A,B].map(threadId=>({threadId,situationId:"sit_"+threadId})),
      visualization:createEncounterVisualization({occurredAt:when,story:recorded,
        scene:"At a café.",sourceReferences:["sit_"+A,"sit_"+B],depictedThreadRefs:[]}),
    });
  }
  function invite(when,from,to,decision){
    return experience.recordSocialInteraction({
      occurredAt:when,initiatorThreadId:from,recipientThreadId:to,
      initiatorSituationId:"sit_"+from,recipientSituationId:"sit_"+to,
      requestText:"Would you like to talk?",responseDecision:decision,
      responseExpression:decision==="accept"?"Yes, sit down.":"Not now.",suggestedAt:null,
    });
  }
  const view=()=>inspection.inspect({since:"2026-01-01T00:00:00.000Z"});
  const doors=()=>view().doors.map(door=>door.door).sort();
  return {path,story,record,invite,view,doors,close(){
    inspection.close();experience.close();threads.close();
    rmSync(directory,{recursive:true,force:true});
  }};
}

test("a door opens only when the other person answers",()=>{
  const w=world();
  try{
    w.story(at(0),[[A,"Good morning."]]);
    w.story(at(1),[[A,"Lovely day, isn't it?"]]);
    assert.deepEqual(w.doors(),[],"an unanswered greeting opened a door");
    assert.equal(w.view().ledger.filter(act=>act.kind==="offered").length,1,
      "a repeated unanswered greeting was recorded as a new offer");

    w.invite(at(2),A,B,"decline");
    assert.deepEqual(w.doors(),[],"a declined invitation opened a door");
    assert.ok(w.view().ledger.some(act=>act.door==="conversation"
      &&act.kind==="declined"&&act.actorThreadId===B),"the decline was not recorded");

    w.story(at(3),[[B,"Morning to you."]]);
    const [door]=w.view().doors;
    assert.deepEqual(w.doors(),["attention"],"an answered greeting did not open attention alone");
    assert.equal(door.openedBy,B,"the door was not opened by the answer");
  }finally{w.close();}
});

test("a continued conversation opens its door once while the ledger only grows",()=>{
  const w=world();
  try{
    w.story(at(0),[[A,"Is this seat taken?"]]);
    w.story(at(1),[[B,"No, please."]]);
    w.story(at(2),[[B,"No, please."],[A,"Thank you. Do you come here often?"],[B,"Every morning."]]);
    const opened=w.view().doors.find(door=>door.door==="conversation");
    assert.ok(opened,"a conversation in which both spoke did not open its door");
    const before=w.view().ledger.length;

    w.story(at(30),[[A,"Back again!"],[B,"Of course."]]);
    const conversation=w.view().doors.filter(door=>door.door==="conversation");
    assert.equal(conversation.length,1,"the conversation door opened twice");
    assert.equal(conversation[0].openedAt,opened.openedAt,"reopening rewrote when it opened");
    assert.equal(w.view().ledger.length,before,"an already-open door recorded a new act");

    const db=new DatabaseSync(w.path);
    try{
      assert.throws(()=>db.prepare("UPDATE relationship_ledger SET kind='declined'").run(),
        /append-only/u,"a relational act was rewritten");
      assert.throws(()=>db.prepare("DELETE FROM relationship_ledger").run(),
        /append-only/u,"a relational act was erased");
    }finally{db.close();}
  }finally{w.close();}
});

test("the scorecard stage follows the doors, and closing lowers it while the ledger remembers",()=>{
  const w=world();
  const stage=()=>socialScorecard(w.view(),{at:at(120)}).pairs[0]?.stage??"stranger";
  try{
    assert.equal(stage(),"stranger");
    w.story(at(0),[[A,"Hello, I am Abeba.",{disclosesSpeakerName:true}]]);
    w.story(at(1),[[B,"Hello."]]);
    assert.equal(stage(),"acknowledged","an answered greeting did not acknowledge");
    w.story(at(2),[[B,"I am Bekele.",{disclosesSpeakerName:true}]]);
    assert.equal(stage(),"acquainted","mutual introductions did not acquaint");
    w.invite(at(3),A,B,"accept");
    w.story(at(3),[[A,"Would you like to talk?"],[B,"Yes, sit down."]]);
    assert.equal(stage(),"conversed","an accepted, spoken invitation did not converse");

    // Either person may close a door alone; no live act closes one yet.
    const db=new DatabaseSync(w.path,{enableForeignKeyConstraints:true});
    try{
      db.prepare(`INSERT INTO relationship_ledger(thread_a,thread_b,door,seq,kind,
        actor_thread_id,occurred_at,source_ref) SELECT ?,?,'attention',MAX(seq)+1,'closed',?,?,'fixture'
        FROM relationship_ledger WHERE thread_a=? AND thread_b=? AND door='attention'`)
        .run(A,B,B,at(60),A,B);
    }finally{db.close();}
    assert.equal(stage(),"stranger","a closed first door left the stage above it");
    assert.ok(w.view().ledger.some(act=>act.kind==="opened"&&act.door==="attention"),
      "closing erased the history of the door");
  }finally{w.close();}
});

test("installation backfill reopens the doors that recorded history already opened",()=>{
  const w=world();
  try{
    w.story(at(0),[[A,"Hello, I am Abeba.",{disclosesSpeakerName:true}]]);
    w.story(at(1),[[B,"I am Bekele.",{disclosesSpeakerName:true}]]);
    w.invite(at(2),B,A,"decline");
    w.invite(at(3),A,B,"accept");
    w.story(at(3),[[A,"Would you like to talk?"],[B,"Yes, sit down."]]);
    const live=w.view().doors;
    const db=new DatabaseSync(w.path);
    try{db.exec("DROP TABLE relationship_doors;DROP TABLE relationship_ledger;");}
    finally{db.close();}
    installWorldSchemas(localWorldStateStorage(w.path));
    assert.deepEqual(w.view().doors,live,"backfill derived different doors than live recording");
    assert.ok(w.view().ledger.some(act=>act.kind==="declined"&&act.actorThreadId===A),
      "backfill lost a declined invitation");
  }finally{w.close();}
});

// A live conversation between the two, where each turn's model output is
// scripted per speaker: the first entry on their first turn, and so on.
function conversation(lines){
  const said=new Map();
  const context=(threadId,name,other)=>({
    thread:{threadId,version:1,identity:{name},currentState:{unresolvedIntentions:[]}},
    situation:{situationId:"sit_"+threadId,threadId,establishedAt:T0,
      location:{kind:"place",placeRef:"wpl_cafe"},mediatedContext:null,
      activity:"Sharing a table.",participantRefs:[]},
    perspective:{developedSelfEvidence:[],placeName:"the café",counterparts:[{threadId:other,appearance:"a person across the table",noticedBefore:[]}]},
  });
  return runThreadLiveSocialEncounter({
    initiator:context(A,"Abeba Tesfaye",B),counterparty:context(B,"Bekele Alemu",A),
    request:{initiatorThreadId:A,text:"Is this seat free?"},
    stance:{decision:"accept",expression:"Yes, please.",suggestedAt:null,reason:"I am willing."},
    modelAdapter:{provider:"fixture",modelId:"fixture",configuration:{},
      async invoke(){throw new Error("unexpected structured call");},
      async *streamExpression(call){
        const id=call.input.thread.threadId,turn=said.get(id)??0;
        said.set(id,turn+1);
        yield {type:"expression_delta",text:lines[id]?.[turn]??"SILENT"};
        yield {type:"expression_complete",provenance:null};
      }},
  });
}

test("a name told in conversation offers the name door; a name merely said does not",async()=>{
  const w=world();
  try{
    const first=await conversation({
      [B]:["INTRODUCE: I'm Bekele, by the way."],
      [A]:["SAY: Abeba, my grandmother, loved this café."],
    });
    w.record(at(0),first.story);
    const names=w.view().ledger.filter(act=>act.door==="name");
    assert.deepEqual(names.map(act=>[act.kind,act.actorThreadId]),[["offered",B]],
      "only Bekele's chosen introduction should offer his name");

    const second=await conversation({[A]:["INTRODUCE: I'm Abeba."]});
    w.record(at(60),second.story);
    assert.ok(w.doors().includes("name"),"answering an introduction did not open the name door");
  }finally{w.close();}
});

test("how a conversation went is measured where its words are, and no words leave",()=>{
  const w=world();
  try{
    w.story(at(0),[[A,"Yes, exactly, the light is lovely today."],[B,"Actually, I think it was brighter yesterday."],
      [A,"Was it?"]]);
    const [talk]=w.view().stories;
    assert.deepEqual([talk.assent[A],talk.pushback[B],talk.questions[A]],[1,1,1],
      "agreement, pushback and questions were not measured per speaker");
    assert.ok(!JSON.stringify(w.view()).includes("brighter"),"spoken words left the World");
  }finally{w.close();}
});
