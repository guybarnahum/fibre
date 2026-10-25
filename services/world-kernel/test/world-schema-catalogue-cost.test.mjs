import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {localWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {installWorldSchemas} from "../src/world-schema-installation.mjs";
import {openWorldStore} from "../src/persistence.mjs";
import {openLivedNowStore} from "../src/lived-now-store.mjs";
import {openLivedExperienceStore} from "../src/lived-experience-store.mjs";
import {createEncounterVisualization} from "../src/lived-encounter-visualization.mjs";
import {livedPlanId,livedSituationId} from "../src/lived-now.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));

test("a deployed World does not consult schema metadata during lived and due-queue work",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-catalogue-cost-"));
  try{
    const storage=localWorldStateStorage(join(directory,"world.sqlite"));
    installWorldSchemas(storage);

    const world=openWorldStore(storage);
    const thread=world.seedThread(structuredClone(seed)).thread;
    const threadId=thread.threadId;
    const eventRef=world.listEvents(threadId)[0].eventId;
    world.close();

    const livedSetup=openLivedNowStore(storage);
    const placeRef=livedSetup.resolvePlace({
      threadId,name:"A quiet library",kind:"place",
      city:"Tucson",country:"United States",
    }).place.ref;
    livedSetup.close();

    const experienceSetup=openLivedExperienceStore(storage);
    const occurredAt="2026-10-24T09:00:00.000Z";
    const story={storyVersion:"encounter-story-v0.1",beats:[
      {actorThreadId:threadId,kind:"action",text:"Someone browses a book."},
    ]};
    const previous=experienceSetup.recordEncounterStory({
      occurredAt,threadPresence:[{threadId,situationId:"sit_earlier_library"}],
      story,visualization:createEncounterVisualization({
        occurredAt,story,scene:"At a shared library.",
        sourceReferences:[eventRef],depictedThreadRefs:[],
      }),
    });
    experienceSetup.close();

    // Capture the actual SQL prepared by all deployed-style state handles,
    // not a count of helper invocations or an inferred cost estimate.
    const prepared=[];
    const state=Object.create(storage.infraDriver.state);
    Object.defineProperty(state,"open",{value:(...args)=>{
      const database=storage.infraDriver.state.open(...args);
      return new Proxy(database,{get(target,key){
        if(key==="prepare")return sql=>{
          prepared.push(sql);
          return target.prepare(sql);
        };
        const value=Reflect.get(target,key,target);
        return typeof value==="function"?value.bind(target):value;
      }});
    }});
    const infraDriver=Object.create(storage.infraDriver);
    Object.defineProperty(infraDriver,"state",{value:state});
    const deployed={infraDriver,stateScopeId:storage.stateScopeId,schemaReady:true};
    const lived=openLivedNowStore(deployed);
    const experience=openLivedExperienceStore(deployed);
    try{
      const authoredAt="2026-10-24T10:00:00.000Z";
      const plan=lived.recordPlan({
        planId:livedPlanId({threadId,kind:"personal",authoredAt}),
        kind:"personal",subjectThreadId:threadId,
        owner:{partyId:threadId,kind:"thread"},
        authoredAt,horizonStart:authoredAt,horizonEnd:"2026-10-24T12:00:00.000Z",
        stops:[{startAt:authoredAt,endAt:"2026-10-24T12:00:00.000Z",
          physicalPlaceRef:placeRef,mediatedContext:null,
          activity:"Read while reflecting on the earlier encounter.",
          outwardActivity:"reading",wakefulness:"awake",
          purpose:"Continue a personally meaningful line of thought.",
          companionRefs:[],travelFromPrevious:null}],
        sourceReferences:[eventRef,placeRef,previous.encounterId],
        cognition:{provider:"fixture",modelId:"catalogue-cost-fixture",providerRequestId:null},
      });
      lived.enactCurrentSituation({
        threadId,situationId:livedSituationId({threadId,at:authoredAt}),
        establishedAt:authoredAt,observation:{
          phase:"at_place",location:{kind:"place",placeRef},
          mediatedContext:null,activity:plan.stops[0].activity,
          outwardActivity:"reading",wakefulness:"awake",
          reason:"World witnessed reading.",participantRefs:[],
          evidenceRefs:[eventRef,placeRef,previous.encounterId],
        },
      });
      experience.nextArrivalPerceptionAt();
      experience.listDueArrivalPerceptions({at:authoredAt});
      experience.nextSocialOpportunityAt();
      experience.listDueSocialOpportunities({at:authoredAt});
      experience.socialChoicesThisVisit({
        threadId,counterpartyThreadId:"thr_other",
        visitSince:authoredAt,
      });
      assert.ok(prepared.length>0,"the lived path did not execute SQL");
      assert.equal(prepared.some(sql=>/sqlite_master/iu.test(sql)),false,
        "a deployed World consulted schema metadata on a lived path");
    }finally{experience.close();lived.close();}
  }finally{rmSync(directory,{recursive:true,force:true});}
});
