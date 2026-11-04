import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openGenesisFirstLifeStore } from "../src/genesis-first-life-store.mjs";
import { openThreadLifeRestStore } from "../src/thread-life-rest-store.mjs";
import { normalizeCurrentSituation } from "../src/lived-now.mjs";
import { createLivedNowService,LivedNowCoverageError } from "../src/lived-now-service.mjs";
import { createLivedBoundaryProcess } from "../src/lived-now-boundary.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { canonicalJson,sha256 } from "../src/persistence-common.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const T0="2026-11-04T08:00:00.000Z";
const at=(minutes)=>new Date(Date.parse(T0)+minutes*60_000).toISOString();

function world(){
  const directory=mkdtempSync(join(tmpdir(),"fibre-life-rest-"));
  const path=join(directory,"world.sqlite");
  const storage=installedWorldStateStorage(path);
  const stores={
    world:openWorldStore(storage),lived:openLivedNowStore(storage),
    experience:openLivedExperienceStore(storage),
    firstLife:openGenesisFirstLifeStore(storage),rest:openThreadLifeRestStore(storage),
  };
  const db=new DatabaseSync(path,{enableForeignKeyConstraints:true});
  const place=stores.lived.admitPublicPlace({
    venueIdentity:"fixture:rest-cafe",displayName:"Corner café",
    streetAddress:"1 Bole Road",locality:"Addis Ababa",country:"Ethiopia",
    countryCode:"ET",lat:9.01,long:38.76,timeZone:"Africa/Addis_Ababa",
    evidenceRef:"https://example.org/rest-cafe",affordances:["Coffee"],
  });
  function person(threadId){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.provenance.lastEventId="evt_"+threadId;
    stores.world.seedThread(thread);
    const situation=normalizeCurrentSituation({
      situationId:"sit_"+threadId,threadId,establishedAt:T0,phase:"at_place",
      location:{kind:"place",placeRef:place.ref},mediatedContext:null,
      activity:"Drinking coffee.",wakefulness:"awake",reason:"A morning visit.",
      participantRefs:[],evidenceRefs:["evt_"+threadId],sourcePlanRefs:["plan_"+threadId],
      resolution:{kind:"personal_plan",conflict:false,observedDivergence:false,
        governingPlanRef:"plan_"+threadId,constrainedPlanRef:null,summary:"Planned."},
      provenance:"world_enacted",
    });
    const json=canonicalJson(situation);
    db.prepare(`INSERT INTO current_situation_records
      (situation_id,thread_id,established_at,record_json,record_digest)
      VALUES (?,?,?,?,?)`).run(situation.situationId,threadId,T0,json,"sha256:"+sha256(json));
    return situation;
  }
  return {...stores,db,place,venueRef:place.physicalVenue.ref,person,close(){
    db.close();for(const store of Object.values(stores))store.close();
    rmSync(directory,{recursive:true,force:true});
  }};
}

test("a resting life leaves the World and its due work until it wakes",async()=>{
  const w=world();
  try{
    const living=w.person("thr_life_living"),resting=w.person("thr_life_resting");
    const L=living.threadId,R=resting.threadId;
    w.lived.scheduleNextLivedBoundary({threadId:R,situationId:resting.situationId,dueAt:at(10)});
    w.lived.scheduleNextLivedBoundary({threadId:L,situationId:living.situationId,dueAt:at(20)});
    w.experience.enqueueSocialOpportunity({threadId:R,situationId:resting.situationId,dueAt:T0});
    const story={storyVersion:"encounter-story-v0.1",
      beats:[{actorThreadId:R,kind:"action",text:"A person arrives."}]};
    const seen=w.experience.recordEncounterStory({occurredAt:T0,
      threadPresence:[living,resting].map(s=>({threadId:s.threadId,situationId:s.situationId})),
      story,visualization:createEncounterVisualization({occurredAt:T0,story,
        scene:"At the café.",sourceReferences:[w.venueRef],depictedThreadRefs:[]})});
    w.experience.enqueueObservedSocialOpportunity({encounterRef:seen.encounterId,
      threadId:L,situationId:living.situationId,counterpartyThreadId:R,
      venueRef:w.venueRef,dueAt:T0});
    w.experience.enqueueEnvironmentalOpportunity({threadId:R,situationId:resting.situationId,dueAt:at(5)});
    w.experience.enqueueEnvironmentalOpportunity({threadId:L,situationId:living.situationId,dueAt:at(30)});
    w.db.prepare("INSERT INTO genesis_first_life_work(thread_id,due_at) VALUES(?,?)").run(R,at(1));
    // An admitted plan would let any request enact R's present without cognition.
    w.lived.recordPlan({planId:"plan_rest_"+R,kind:"personal",subjectThreadId:R,
      owner:{partyId:R,kind:"thread"},authoredAt:T0,horizonStart:T0,horizonEnd:at(240),
      stops:[{startAt:T0,endAt:at(240),physicalPlaceRef:w.place.ref,mediatedContext:null,
        activity:"Sit with a coffee.",purpose:"A slow morning.",companionRefs:[],
        travelFromPrevious:null}],
      sourceReferences:[w.world.listEvents(R)[0].eventId,w.place.ref],
      cognition:{provider:"fixture",modelId:"fixture-plan",providerRequestId:null}});

    const rested=w.rest.rest({threadId:R,reason:"compute budget",actor:"operator",at:at(40)});
    assert.equal(rested.settledSocialOpportunities,2,"pending social chances were left to fire stale");
    assert.equal(w.rest.rest({threadId:R,reason:"again",actor:"operator",at:at(41)}).changed,false,
      "resting twice recorded a second fact");
    const now=at(60);
    const present=()=>w.lived.listCurrentVenueSituations({venueRef:w.venueRef,at:now})
      .map(s=>s.threadId);
    assert.deepEqual(present(),[L],"a resting Thread remained co-present");
    assert.deepEqual(w.lived.listDueLivedBoundaries({at:now,limit:4}).map(b=>b.threadId),[L],
      "a resting life was due");
    assert.equal(w.lived.nextLivedBoundaryAt(),at(20),"a resting boundary scheduled the World");
    assert.equal(w.experience.nextSocialOpportunityAt(),null,"a resting social chance scheduled the World");
    assert.equal(w.experience.nextEnvironmentalOpportunityAt(),at(30),
      "a resting environmental chance scheduled the World");
    assert.equal(w.firstLife.nextDueAt(),null,"a resting first life scheduled the World");
    assert.deepEqual(w.experience.inspectSocialOpportunities(L).map(o=>o.outcome),["thread_resting"],
      "the living chooser could still address the resting Thread");

    const ensured=[];
    const boundary=await createLivedBoundaryProcess({livedNowStore:w.lived,
      livedNow:{async ensure({threadId}){ensured.push(threadId);
        return w.lived.getCurrentSituation(threadId);}},now:()=>now}).runOnce();
    assert.deepEqual(ensured,[L],"the World advanced a resting life");
    assert.equal(boundary.nextDueAt,null,"the resting overdue boundary kept the World awake");
    await assert.rejects(createLivedNowService({livedNowStore:w.lived}).ensure({threadId:R,at:now}),
      LivedNowCoverageError,"a request advanced a resting life");
    assert.equal(w.lived.getCurrentSituation(R).situationId,resting.situationId,
      "resting changed the Thread's recorded present");

    assert.equal(w.rest.wake({threadId:R,reason:"compute restored",actor:"operator",at:at(70)}).changed,true);
    assert.deepEqual(present(),[L,R],"a woken Thread is not co-present again");
    assert.deepEqual(w.lived.listDueLivedBoundaries({at:at(70),limit:4}).map(b=>b.threadId),[R],
      "a woken life was not due again at once");
    assert.equal(w.experience.nextSocialOpportunityAt(),null,"settled social chances fired on wake");
    assert.deepEqual(w.rest.history(R).map(e=>[e.kind,e.reason,e.actor]),
      [["rest","compute budget","operator"],["wake","compute restored","operator"]],
      "rest and wake history was not preserved");
    assert.throws(()=>w.db.prepare("DELETE FROM thread_life_rest_events").run(),
      /append-only/u,"rest history could be erased");
  }finally{w.close();}
});
