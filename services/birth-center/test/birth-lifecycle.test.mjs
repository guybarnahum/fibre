import assert from "node:assert/strict";
import test from "node:test";
import { createBirthLifecycleStore } from "../src/birth-lifecycle-store.mjs";
import { createBirthLifecycle } from "../src/birth-lifecycle.mjs";
import { DurableInvocationConflictError } from "../src/model-runtime/durable-invocation-journal.mjs";
import { GenesisDevelopmentRequestConflictError } from "../src/genesis-development-request-store.mjs";
import { createBirthLifecycleApi } from "../src/birth-lifecycle-api.mjs";
import {rehearseStoredBirth} from "../src/birth-preflight.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

const AT="2026-10-29T18:00:00.000Z";
const input=(requestId,more={})=>({
  requestId,requestedAt:AT,place:null,sex:null,heritage:null,
  forceNewWorld:false,...more,
});
const families=Array.from({length:3},(_,i)=>({
  id:"family-"+i,share:i+1,familyOriginContext:"Ordinary mixed local household with family roots in the city",
  languages:["English"],raisedLanguages:["English"],nameOrder:"given_family",
  femaleGivenNames:Array.from({length:24},(_,n)=>"Female"+i+n),
  maleGivenNames:Array.from({length:24},(_,n)=>"Male"+i+n),
  familyNames:Array.from({length:24},(_,n)=>"Family"+i+n),
  physicalAncestry:{
    maternal:[{population:"Local maternal lineage",share:1,referencePopulation:"eur_north"}],
    paternal:[{population:"Local paternal lineage",share:1,referencePopulation:"eur_north"}],
  },
}));
const authored={
  timeZone:"UTC",homeDescription:"An apartment near neighborhood services.",
  schoolDescription:"A local school serves its neighborhoods.",
  transitDescription:"Daily buses connect ordinary destinations.",
  learningDescription:"Public learning opportunities exist around town.",
  commerceDescription:"Groceries and shops support daily life.",
  mobilityPattern:"People walk and use local transport.",
  schoolingOrCommunityContext:"There are schools and neighborhoods.",
  culturalContext:"The city has local social institutions.",
  heritageContext:"Local family background is varied.",
  familyProfiles:families,
  availableInstitutions:["school","library","transit"],
  intellectualEnvironment:"Books and conversations offer opportunities.",
};

const populationAuthored={
  timeZone:"UTC",homeDescription:authored.homeDescription,
  schoolDescription:authored.schoolDescription,
  transitDescription:authored.transitDescription,
  learningDescription:authored.learningDescription,
  commerceDescription:authored.commerceDescription,
  mobilityPattern:authored.mobilityPattern,
  schoolingOrCommunityContext:authored.schoolingOrCommunityContext,
  culturalContext:authored.culturalContext,
  availableInstitutions:authored.availableInstitutions,
  intellectualEnvironment:authored.intellectualEnvironment,
  schoolingLanguages:["English"],
  localNamingOriginId:"origin-0",
  mixedParentShare:0.2,
  householdPatterns:[
    {caregivers:["mother","father"],siblings:0,weight:5},
    {caregivers:["mother"],siblings:2,weight:3},
    {caregivers:["father","grandmother"],siblings:1,weight:2},
  ],
  originGroups:Array.from({length:8},(_,i)=>({
    originId:"origin-"+i,label:"Origin "+i,share:1/8,
    heritageTags:["Origin "+i],
    referencePopulations:[{population:"Lineage "+i,share:1,referencePopulation:"eur_north"}],
    heritageLanguages:["English"],householdRetentionRate:1,
  })),
  couples:[
    {motherOriginId:"origin-0",fatherOriginId:"origin-0",weight:8,
      childGivenNameTradition:{mother:1,father:0,local:0}},
    {motherOriginId:"origin-0",fatherOriginId:"origin-1",weight:2,
      childGivenNameTradition:{mother:1,father:0,local:0}},
  ],
};

const namingAuthored={
  parentNamesByDecade:[1960,1970,1980].map(decade=>({
    decade,
    femaleGivenNames:Array.from({length:24},(_,i)=>"Mother"+decade+i),
    maleGivenNames:Array.from({length:24},(_,i)=>"Father"+decade+i),
  })),
  childFemaleGivenNames:Array.from({length:24},(_,i)=>"Female"+i),
  childMaleGivenNames:Array.from({length:24},(_,i)=>"Male"+i),
  familyNames:Array.from({length:24},(_,i)=>"Family"+i),
  transmission:"father",nameOrder:"given_family",joiner:"-",
  patronymicMaleSuffix:"",patronymicFemaleSuffix:"",
};

function lifecycleFor(store,storage,{nowMs=()=>Date.parse(AT),invoke=async()=>({output:populationAuthored})}={}){
  const runtime={
    stateScopeId:"birth",infraDriver:storage.infraDriver,
    durableAdapter:adapter=>adapter,
    provisionalBirthStore:{get:()=>null},
    developmentRequestStore:{get:()=>null},
  };
  return createBirthLifecycle({
    store,runtime,
    developmentService:{develop:()=>{throw new Error("Unexpected development");}},
    authorAdapter:{invoke},
    worldFetch:()=>{throw new Error("Status read contacted World");},
    presentationFetch:()=>{throw new Error("Status read contacted Presentation");},
    privateToken:"private-test-token-123456",nowMs,
  });
}

test("stored-place birth rehearsal validates without model, development or name reservation",t=>{
  const state=tempBirthState(t),store=createBirthLifecycleStore(state.storage());
  t.after(()=>store.close());
  const key="united-states/hilo:2000";
  store.savePlace(key,"place_preflight_fixture",populationAuthored);
  for(const origin of ["origin-0","origin-1"])
    store.saveNaming(key,origin,"2000","naming_preflight_"+origin,namingAuthored);
  const readonly=new Proxy(store,{
    get(target,prop){
      if(["reserveName","seedNames","saveNaming","savePlace","enqueue","progress",
        "releaseName"].includes(prop))return ()=>{throw Error("preflight mutated birth state");};
      return target[prop];
    },
  });
  const result=rehearseStoredBirth({store:readonly,place:"United States/Hilo"});
  assert.equal(result.place,"United States/Hilo");
  assert.equal(store.get(result.requestId),null,"Preflight queued a birth");
  assert.equal(store.reserveName("united-states/hilo",result.issuedName,
    "real-birth-after-preflight"),true,"Preflight reserved the candidate name");
  store.releaseName("real-birth-after-preflight");
});

test("an admitted life becomes unpresented after two hours without retroactive failure",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  let time=Date.parse(AT);
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const runtime={
    stateScopeId:"birth",infraDriver:storage.infraDriver,
    durableAdapter:adapter=>adapter,
    provisionalBirthStore:{get:()=>null},
    developmentRequestStore:{get:()=>null},
  };
  const lifecycle=createBirthLifecycle({
    store,runtime,developmentService:{develop:()=>{throw Error("not developing");}},
    authorAdapter:{invoke:async()=>{throw Error("not authoring");}},
    worldFetch:()=>{throw Error("World was not required for Presentation absence");},
    presentationFetch:async()=>Response.json({}, {status:404}),
    privateToken:"private-test-token-123456",nowMs:()=>time,
  });
  store.enqueue(input("unpresented-proof"));
  store.progress("unpresented-proof",{
    stage:"admitted",status:"published",threadId:"thr_unpresented_proof",
    genesisId:"gen_unpresented_proof",observationStartedAt:time,nextAttemptAt:time,
  });
  await lifecycle.handleWake();
  assert.equal(store.get("unpresented-proof").stage,"admitted");
  time+=2*60*60_000+1;
  await lifecycle.handleWake();
  const birth=lifecycle.get("unpresented-proof");
  assert.equal(birth.stage,"unpresented");
  assert.equal(birth.status,"published");
  assert.equal(birth.result.event,"thread-birth-unpresented");
  assert.equal(store.get("unpresented-proof").nextAttemptAt,null);
});

test("post-admission World outages cannot fail a Thread or bypass observation limits",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  let time=Date.parse(AT),worldCalls=0;
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const lifecycle=createBirthLifecycle({
    store,runtime:{stateScopeId:"birth",infraDriver:storage.infraDriver,
      durableAdapter:adapter=>adapter,provisionalBirthStore:{get:()=>null},
      developmentRequestStore:{get:()=>null}},
    developmentService:{develop:()=>{throw Error("Admitted life was re-developed");}},
    authorAdapter:{invoke:async()=>{throw Error("Admitted life was re-authored");}},
    worldFetch:async()=>{worldCalls++;return Response.json({error:"route_not_deployed"},{status:404});},
    presentationFetch:async()=>{throw Error("Presentation unexpectedly queried");},
    privateToken:"private-test-token-123456",nowMs:()=>time,
  });
  for(const stage of ["presented","located"]){
    const id="alive-"+stage;
    store.enqueue(input(id,{sex:"female"}));
    store.progress(id,{stage,status:"published",nextAttemptAt:time,
      threadId:"thr_"+stage,genesisId:"gen_"+stage,sex:"female",
      observationStartedAt:time,
      data:{
        selector:{display:"Egypt/Aswan"},worldMode:"created",
        developmentResult:{fibreIdentityNumber:"TEST-1"},
        newbornLocation:{locality:"Aswan",countryCode:"EG"},
        developmentRequest:{
          bornAt:"2004-03-01T00:00:00Z",
          subjectIdentity:{femaleName:"Tasneem Jundī",maleName:"Tariq Jundī",
            birthCity:"Aswān, Egypt",languages:["Arabic","English"]},
          originMaterial:{selectionDigest:"sha256:sample"},
          worldSpec:{worldSpecId:"world_aswan"},
        },
      },
    });
  }
  await lifecycle.handleWake();
  assert.equal(store.get("alive-presented").status,"published");
  assert.equal(store.get("alive-located").status,"published");
  assert.ok(worldCalls>0,"World unavailability was not exercised");
  time+=2*60*60_000+1;
  const before=worldCalls;
  await lifecycle.handleWake();
  assert.equal(worldCalls,before,"Observation continued making World calls after its deadline");
  const unlocated=lifecycle.get("alive-presented");
  assert.equal(unlocated.stage,"unlocated");
  assert.equal(unlocated.status,"published");
  const completed=lifecycle.get("alive-located");
  assert.equal(completed.stage,"complete");
  assert.equal(completed.status,"published");
  assert.equal(completed.result.reconciliationNote.kind,"world_inspection_unavailable");
  assert.equal(completed.failureRetryable,null);
});

test("an immutable development plan conflict is terminal, not an infinite retry",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const time=Date.parse(AT),store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  let attempts=0;
  const lifecycle=createBirthLifecycle({
    store,runtime:{stateScopeId:"birth",infraDriver:storage.infraDriver,
      durableAdapter:adapter=>adapter,provisionalBirthStore:{get:()=>null},
      developmentRequestStore:{get:()=>null}},
    developmentService:{develop:async()=>{attempts++;
      throw new GenesisDevelopmentRequestConflictError(
        "Genesis development request already exists for different development material");}},
    authorAdapter:{invoke:async()=>{throw Error("unexpected authoring");}},
    worldFetch:()=>{throw Error("unexpected World");},
    presentationFetch:()=>{throw Error("unexpected Presentation");},
    privateToken:"private-test-token-123456",nowMs:()=>time,
  });
  store.enqueue(input("pinned-contract-proof"));
  store.progress("pinned-contract-proof",{stage:"developing",status:"developing",
    data:{developmentRequest:{}},nextAttemptAt:time});
  await lifecycle.handleWake();
  const birth=lifecycle.get("pinned-contract-proof");
  assert.equal(birth.failureRetryable,false,
    "A pinned Genesis plan conflict was treated as transient");
  assert.equal(birth.errorCode,"DEVELOPMENT_PINNED_PLAN_CONFLICT");
  assert.equal(birth.nextAttemptAt,null);
  await lifecycle.handleWake();
  assert.equal(attempts,1,"A permanent plan conflict kept consuming development attempts");
});

test("provider schema HTTP 400 pauses authoring until code is fixed and resumed",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const time=Date.parse(AT),store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const requestIds=[];
  const lifecycle=lifecycleFor(store,storage,{nowMs:()=>time,invoke:async args=>{
    requestIds.push(args.clientRequestId);
    throw Object.assign(new Error("HTTP 400: Invalid schema for response_format"),{
      code:"MODEL_REQUEST_CONFIGURATION_ERROR",retryable:false,httpStatus:400});
  }});
  const requestId="invalid-provider-schema-proof";
  store.enqueue(input(requestId));
  store.progress(requestId,{stage:"place_resolved",status:"authoring",nextAttemptAt:time,
    data:{selector:{country:"United States",city:"Hilo",
      key:"united-states/hilo",birthCity:"Hilo, United States"},
      chronology:{bornAt:"2004-05-01T00:00:00Z",
        chronologyEndsAt:"2026-05-01T00:00:00Z"}},
  });
  await lifecycle.handleWake();
  const paused=lifecycle.get(requestId);
  assert.equal(paused.errorCode,"MODEL_REQUEST_CONFIGURATION_ERROR");
  assert.equal(paused.failureRetryable,true,
    "Invalid provider schema permanently rejected a viable birth");
  assert.equal(paused.nextAttemptAt,null,
    "Invalid provider schema retried automatically without a deployment fix");
  await lifecycle.handleWake();
  assert.equal(requestIds.length,1,"The same broken schema was sent repeatedly");
  // Records from a pre-fix deployment may have marked this exact provider
  // configuration failure nonretryable; recovery must work after upgrade.
  store.progress(requestId,{failureRetryable:false,nextAttemptAt:null});
  lifecycle.resume(requestId);
  await lifecycle.handleWake();
  assert.equal(requestIds.length,2);
  assert.notEqual(requestIds[0],requestIds[1],
    "Operator Resume reused a failed schema probe invocation ID");
});

test("a deploy-time journal conflict pauses without looping, then Resume advances generation",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  let time=Date.parse(AT),calls=0,ordinal=null;
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const runtime={
    stateScopeId:"birth",infraDriver:storage.infraDriver,
    durableAdapter:adapter=>adapter,provisionalBirthStore:{get:()=>null},
    developmentRequestStore:{get:()=>null},
  };
  const lifecycle=createBirthLifecycle({
    store,runtime,developmentService:{develop:async(_request,options)=>{
      calls++;ordinal=options.generationOrdinal;
      throw new DurableInvocationConflictError("same model ID has a different prompt witness");
    }},
    authorAdapter:{invoke:async()=>{throw Error("unexpected authoring");}},
    worldFetch:()=>{throw Error("unexpected World");},
    presentationFetch:()=>{throw Error("unexpected Presentation");},
    privateToken:"private-test-token-123456",nowMs:()=>time,
  });
  store.enqueue(input("conflict-proof"));
  store.progress("conflict-proof",{
    stage:"developing",status:"developing",threadId:"thr_conflict_proof",
    data:{developmentRequest:{}},nextAttemptAt:time,
  });
  await lifecycle.handleWake();
  assert.equal(lifecycle.get("conflict-proof").failureRetryable,true);
  assert.equal(lifecycle.get("conflict-proof").errorCode,"DURABLE_INVOCATION_CONFLICT");
  assert.equal(store.get("conflict-proof").nextAttemptAt,null);
  time+=60_000;
  await lifecycle.handleWake();
  assert.equal(calls,1,"Durable journal conflict caused unbounded automatic retries");
  lifecycle.resume("conflict-proof");
  await lifecycle.handleWake();
  assert.equal(calls,2);
  assert.equal(ordinal,1,"Resume reused the conflicted model invocation generation");
});

test("Place authoring witness conflict advances its own request ID on Resume",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const time=Date.parse(AT);
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const calls=[];
  const lifecycle=lifecycleFor(store,storage,{nowMs:()=>time,invoke:async args=>{
    calls.push(args.clientRequestId);
    throw new DurableInvocationConflictError("pinned Place model witness changed after deploy");
  }});
  const requestId="place-prompt-deploy-conflict";
  store.enqueue(input(requestId));
  store.progress(requestId,{stage:"place_resolved",status:"authoring",nextAttemptAt:time,
    data:{
      selector:{country:"United States",city:"Hilo",birthCity:"Hilo, United States",
        key:"united-states/hilo",slug:"united-states_hilo",display:"United States/Hilo"},
      chronology:{bornAt:"2004-01-01T00:00:00.000Z",
        chronologyEndsAt:"2026-01-01T00:00:00.000Z"},
    },
  });
  await lifecycle.handleWake();
  assert.equal(store.get(requestId).nextAttemptAt,null,
    "A deployed prompt change kept retrying its conflicted durable witness");
  lifecycle.resume(requestId);
  await lifecycle.handleWake();
  assert.equal(calls.length,2);
  assert.notEqual(calls[0],calls[1],
    "A resumed Place repeated the same rejected durable request ID");
});

test("development budget exhaustion grants one resumed generation, never a third",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const time=Date.parse(AT);
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const generations=[];
  const lifecycle=createBirthLifecycle({
    store,runtime:{stateScopeId:"birth",infraDriver:storage.infraDriver,
      durableAdapter:adapter=>adapter,provisionalBirthStore:{get:()=>null},
      developmentRequestStore:{get:()=>null}},
    developmentService:{develop:async(_request,options)=>{
      generations.push(options.generationOrdinal);
      throw Object.assign(new Error("replacement Pass-A exhausted 20 generated versions"),
        {gate:"record_repair_exhausted"});
    }},
    authorAdapter:{invoke:async()=>{throw Error("unexpected authoring");}},
    worldFetch:()=>{throw Error("unexpected World");},
    presentationFetch:()=>{throw Error("unexpected Presentation");},
    privateToken:"private-test-token-123456",nowMs:()=>time,
  });
  store.enqueue(input("bounded-development-proof"));
  store.progress("bounded-development-proof",{stage:"developing",status:"developing",
    threadId:"thr_bounded_proof",data:{developmentRequest:{}},nextAttemptAt:time});
  await lifecycle.handleWake();
  assert.equal(lifecycle.get("bounded-development-proof").failureRetryable,true);
  assert.equal(lifecycle.get("bounded-development-proof").errorCode,"DEVELOPMENT_BUDGET_EXHAUSTED");
  assert.equal(store.get("bounded-development-proof").nextAttemptAt,null);
  lifecycle.resume("bounded-development-proof");
  await lifecycle.handleWake();
  assert.deepEqual(generations,[0,1],
    "A resumed Genesis reused an exhausted budget or exceeded its second generation");
  assert.equal(lifecycle.get("bounded-development-proof").failureRetryable,false,
    "Second bounded exhaustion remained indefinitely retryable");
});

test("one wake executes at most one development despite multiple due births",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const time=Date.parse(AT);
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  let calls=0;
  const lifecycle=createBirthLifecycle({
    store,runtime:{stateScopeId:"birth",infraDriver:storage.infraDriver,
      durableAdapter:adapter=>adapter,provisionalBirthStore:{get:()=>null},
      developmentRequestStore:{get:()=>null}},
    developmentService:{develop:async()=>{calls++;return {status:"pending"};}},
    authorAdapter:{invoke:async()=>{throw Error("unexpected authoring");}},
    worldFetch:()=>{throw Error("unexpected World");},
    presentationFetch:()=>{throw Error("unexpected Presentation");},
    privateToken:"private-test-token-123456",nowMs:()=>time,
  });
  for(const id of ["a-first","z-second"]){
    store.enqueue(input(id));
    store.progress(id,{stage:"developing",status:"developing",
      threadId:"thr_"+id,genesisId:"gen_"+id,
      data:{developmentRequest:{}},nextAttemptAt:time});
  }
  await lifecycle.handleWake();
  assert.equal(calls,1,"A wake executed two unbounded Genesis development stages");
  assert.equal(store.get("z-second").stage,"developing");
  assert.ok(store.get("z-second").nextAttemptAt>time,
    "Deferred second Genesis was left due for an immediate alarm spin");
});

test("an unknown Place is rejected by POST before any birth row is queued",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const store=createBirthLifecycleStore(storage);
  t.after(()=>store.close());
  let resolutionAttempts=0,rateLimited=false;
  const runtime={stateScopeId:"birth",infraDriver:storage.infraDriver,
    durableAdapter:adapter=>adapter,provisionalBirthStore:{get:()=>null},
    developmentRequestStore:{get:()=>null}};
  const lifecycle=createBirthLifecycle({
    store,runtime,developmentService:{develop:()=>{throw Error("no development");}},
    authorAdapter:{invoke:async()=>{throw Error("no authoring");}},
    worldFetch:()=>{throw Error("no World call");},
    presentationFetch:()=>{throw Error("no Presentation call");},
    privateToken:"private-test-token-123456",geoNamesUsername:"fixture",
    resolvePlace:async()=>{resolutionAttempts++;
      const error=new Error(rateLimited?"GeoNames quota exceeded":
        "GeoNames could not resolve Unknown City, Egypt");
      error.code=rateLimited?"GEONAMES_STATUS_18":"GEONAMES_PLACE_NOT_FOUND";
      error.retryable=rateLimited;
      throw error;
    },
  });
  const api=createBirthLifecycleApi({lifecycle,privateToken:"private-test-token-123456"});
  const body=input("unknown-place-proof",{place:"Egypt/Unknown City"});
  const response=await api.fetch(new Request("https://birth.local/births",{
    method:"POST",headers:{"x-fibre-private-token":"private-test-token-123456",
      "content-type":"application/json"},body:JSON.stringify(body),
  }));
  assert.equal(response.status,400);
  assert.equal(resolutionAttempts,1);
  assert.equal(store.get(body.requestId),null,"Invalid place leaked a queued birth");
  rateLimited=true;
  const deferred=input("provider-outage-proof",{place:"Egypt/Aswan"});
  const accepted=await api.fetch(new Request("https://birth.local/births",{
    method:"POST",headers:{"x-fibre-private-token":"private-test-token-123456",
      "content-type":"application/json"},body:JSON.stringify(deferred),
  }));
  assert.equal(accepted.status,202,"GeoNames credit exhaustion rejected a viable birth");
  assert.equal(store.get(deferred.requestId).stage,"requested",
    "A queued birth lost its alarm-time place resolution stage");
});

test("Admin and CLI share one indexed lifecycle with bounded, World-free page reads",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const store=createBirthLifecycleStore(storage);
  t.after(()=>store.close());
  let modelCalls=0,worldCalls=0;
  const runtime={stateScopeId:"birth",infraDriver:storage.infraDriver,
    durableAdapter:adapter=>adapter,
    provisionalBirthStore:{get:()=>null},developmentRequestStore:{get:()=>null}};
  const lifecycle=createBirthLifecycle({
    store,runtime,
    developmentService:{develop:()=>{throw Error("unexpected development");}},
    authorAdapter:{invoke:async()=>{modelCalls++;throw Error("unexpected authoring");}},
    worldFetch:async()=>{worldCalls++;throw Error("unexpected World read");},
    presentationFetch:async()=>{throw Error("unexpected Presentation");},
    privateToken:"private-test-token-123456",
    geoNamesUsername:"fixture",
    resolvePlace:async()=>({birthCity:"Hilo, United States",countryCode:"US",
      locality:"Hilo",timeZone:"Pacific/Honolulu"}),
  });
  const api=createBirthLifecycleApi({lifecycle,privateToken:"private-test-token-123456"});
  const headers={"x-fibre-private-token":"private-test-token-123456",
    "content-type":"application/json"};
  const shared={requestId:"same-birth-adm-cli",requestedAt:AT,
    place:"United States/Hilo",sex:"male",heritage:null,forceNewWorld:false};
  const submit=()=>new Request("https://birth.local/births",{
    method:"POST",headers,body:JSON.stringify(shared)});
  const admin=await api.fetch(submit()),cli=await api.fetch(submit());
  assert.equal(admin.status,202);
  assert.equal(cli.status,202);
  assert.deepEqual((await admin.json()).birth,(await cli.json()).birth,
    "Admin and CLI created different birth authorities");
  for(let i=0;i<65;i++)store.enqueue(input("page-birth-"+i));
  const page=await api.fetch(new Request("https://birth.local/births?limit=32",{headers}));
  assert.equal(page.status,200);
  const listed=await page.json();
  assert.equal(listed.births.length,32,"Birth list scanned past its page bound");
  assert.ok(listed.nextCursor,"Births lost cursor pagination");
  assert.equal(worldCalls+modelCalls,0,
    "Birth list read contacted World or a model");
});

test("birth status and listing expose pinned family facts without World reads",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  const store=createBirthLifecycleStore(storage);
  t.after(()=>store.close());
  const api=createBirthLifecycleApi({lifecycle:lifecycleFor(store,storage),
    privateToken:"private-test-token-123456"});
  store.enqueue(input("review-family"));
  const parentage={
    mother:{name:"Mara Quinn",originLabel:"Origin 0",birthDecade:1970},
    father:{name:"Noah Quinn",originLabel:"Origin 1",birthDecade:1970},
    mixed:true,childGivenNameTradition:{originId:"origin-0",originLabel:"Origin 0"},
    household:{caregivers:["mother"],siblings:[
      {name:"Rae Quinn",sex:"female",relativeAge:"younger",gapYears:3},
    ]},mixedParentShare:0.2,
  };
  store.progress("review-family",{stage:"genome_selected",data:{parentage},nextAttemptAt:null});
  const headers={"x-fibre-private-token":"private-test-token-123456"};
  const one=await api.fetch(new Request("https://birth.local/births/review-family",{headers}));
  assert.equal(one.status,200);
  assert.deepEqual((await one.json()).birth.parentage,parentage,
    "Birth details hid the pinned parentage or household");
  const list=await api.fetch(new Request("https://birth.local/births",{headers}));
  assert.equal(list.status,200);
  assert.deepEqual((await list.json()).births[0].parentage,parentage,
    "Birth listing discarded the reviewable family facts");
});

test("operator birth status is a bounded lifecycle projection, not a second authority",t=>{
  const state=tempBirthState(t),store=createBirthLifecycleStore(state.storage());
  t.after(()=>store.close());
  store.enqueue(input("completed-visible",{sex:"female"}));
  store.progress("completed-visible",{
    stage:"complete",status:"published",
    threadId:"thr_visible",genesisId:"gen_visible",
    sex:"female",location:"United Kingdom/London",
    data:{developmentRequest:{subjectIdentity:{femaleName:"Joanna Lewandowski"}}},
    result:{name:"Joanna Lewandowski"},
    nextAttemptAt:null,
  });
  const visible=store.recentStatus({limit:2});
  assert.equal(visible.length,1);
  assert.deepEqual({
    stage:visible[0].stage,threadId:visible[0].threadId,
    name:visible[0].name,location:visible[0].location,
  },{
    stage:"complete",threadId:"thr_visible",
    name:"Joanna Lewandowski",location:"United Kingdom/London",
  },"Operator status did not reflect the completed lifecycle row");
  assert.equal(Object.hasOwn(visible[0],"data"),false,
    "Operator listing loaded a full Genesis development request");
});

test("one birth request has an indexed durable lifecycle and immutable inputs",async(t)=>{
  const state=tempBirthState(t),storage=state.storage();
  const store=createBirthLifecycleStore(storage);
  t.after(()=>store.close());
  let modelCalls=0;
  const lifecycle=lifecycleFor(store,storage,{invoke:async()=>{
    modelCalls++;throw new Error("Unexpected model invocation");
  }});
  const api=createBirthLifecycleApi({lifecycle,privateToken:"private-test-token-123456"});
  const headers={"x-fibre-private-token":"private-test-token-123456","content-type":"application/json"};
  const submit=()=>new Request("https://birth.local/births",{
    method:"POST",headers,body:JSON.stringify(input("same-birth")),
  });
  assert.equal((await api.fetch(submit())).status,202);
  assert.equal((await api.fetch(submit())).status,202);
  const status=await api.fetch(new Request("https://birth.local/births/same-birth",{headers}));
  assert.equal(status.status,200);
  assert.equal((await status.json()).birth.stage,"requested");
  assert.equal(modelCalls,0,"Birth status regenerated model work");
  const conflict=await api.fetch(new Request("https://birth.local/births",{
    method:"POST",headers,body:JSON.stringify(input("same-birth",{sex:"female"})),
  }));
  assert.equal(conflict.status,409,"Same requestId admitted different initial life");
  assert.equal(store.list().births.length,1,"Idempotent birth was duplicated");
});

test("an interrupted Place save replays the committed authoring call",async(t)=>{
  const state=tempBirthState(t),storage=state.storage();
  let time=Date.parse(AT),modelCalls=0,saveFails=true;
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const durableInvocations=new Map();
  const adapter={invoke:async args=>{
    if(durableInvocations.has(args.clientRequestId))
      return durableInvocations.get(args.clientRequestId);
    modelCalls++;
    const result={output:populationAuthored};
    durableInvocations.set(args.clientRequestId,result);
    return result;
  }};
  const runtime={
    stateScopeId:"birth",infraDriver:storage.infraDriver,
    durableAdapter:a=>a,
    provisionalBirthStore:{get:()=>null},
    developmentRequestStore:{get:()=>null},
  };
  const wrappedStore={...store,savePlace(...args){
    if(saveFails){saveFails=false;throw new Error("Simulated storage interruption");}
    return store.savePlace(...args);
  }};
  const options={
    store:wrappedStore,runtime,
    developmentService:{develop:()=>{throw new Error("Unexpected development");}},
    authorAdapter:adapter,
    worldFetch:()=>{throw new Error("Unexpected World call");},
    presentationFetch:()=>{throw new Error("Unexpected Presentation call");},
    privateToken:"private-test-token-123456",nowMs:()=>time,
  };
  store.enqueue(input("replay-birth"));
  // Deterministic stage witness: a birthplace has already been resolved.
  store.progress("replay-birth",{
    stage:"place_resolved",status:"authoring",nextAttemptAt:time,
    data:{
      selector:{country:"United Kingdom",city:"London",birthCity:"London, United Kingdom",
        key:"united-kingdom/london",slug:"united-kingdom_london",display:"United Kingdom/London"},
      chronology:{bornAt:"2004-01-01T00:00:00.000Z",chronologyEndsAt:"2026-01-01T00:00:00.000Z"},
    },
  });
  await createBirthLifecycle(options).handleWake();
  assert.equal(modelCalls,1);
  assert.equal(store.get("replay-birth").status,"failed");
  time+=5_000;
  await createBirthLifecycle(options).handleWake();
  assert.equal(store.get("replay-birth").stage,"place_authored");
  assert.equal(modelCalls,1,"Restart regenerated a committed Place authoring call");
});

test("a truncated Place exhausts three unique authoring calls before long retryable backoff",async t=>{
  const state=tempBirthState(t),storage=state.storage();
  let time=Date.parse(AT);
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const prompts=[],ids=[];
  const lifecycle=lifecycleFor(store,storage,{nowMs:()=>time,invoke:async args=>{
    prompts.push(args.systemPrompt);
    ids.push(args.clientRequestId);
    throw Object.assign(
      new Error("OpenAI model response did not complete: incomplete (max_output_tokens)"),
      {code:"MODEL_INCOMPLETE_RESPONSE",providerErrorCode:"max_output_tokens",retryable:false},
    );
  }});
  const requestId="truncated-place";
  store.enqueue(input(requestId));
  store.progress(requestId,{stage:"place_resolved",status:"authoring",nextAttemptAt:time,
    data:{
      selector:{country:"United States",city:"Hilo",birthCity:"Hilo, United States",
        key:"united-states/hilo",slug:"united-states_hilo",display:"United States/Hilo"},
      chronology:{bornAt:"2004-01-01T00:00:00.000Z",chronologyEndsAt:"2026-01-01T00:00:00.000Z"},
    },
  });
  for(let attempt=0;attempt<3;attempt++){
    await lifecycle.handleWake();
    if(attempt<2)time+=5_000;
  }
  assert.equal(prompts.length,3,"Place exceeded its three-call authoring budget");
  assert.equal(new Set(ids).size,3,"Repair reused a durable invocation identifier");
  assert.match(prompts[1],/previous output was cut off.*more concise/iu,
    "Repair ignored the truncated output");
  assert.equal(store.get(requestId).failureRetryable,true,
    "Exhausted authoring incorrectly became a permanent failure");
  assert.ok(store.get(requestId).nextAttemptAt-time>=6*60*60_000,
    "Exhausted authoring was scheduled for immediate retry");
  assert.equal(store.get(requestId).threadId,null,
    "A failed Place created a reserved Thread");
});

test("a failed birth cannot block another due birth",async(t)=>{
  const state=tempBirthState(t),storage=state.storage();
  const store=createBirthLifecycleStore(storage,{nowMs:()=>Date.parse(AT)});
  t.after(()=>store.close());
  let calls=0;
  const lifecycle=lifecycleFor(store,storage,{invoke:async()=>{
    calls++;throw Object.assign(new Error("Provider temporarily unavailable"),{retryable:true});
  }});
  store.enqueue(input("a-invalid",{place:"Israel/Jerusalem"}));
  store.enqueue(input("z-independent"));
  await lifecycle.handleWake();
  assert.equal(store.get("a-invalid").failureRetryable,false);
  assert.notEqual(store.get("z-independent").stage,"requested",
    "A failed birth blocked an independent birth");
  assert.ok(calls<=1,"A wake made more than one Place authoring call");
});


test("new births reuse one civic Place across heritage filters",async(t)=>{
  const state=tempBirthState(t),storage=state.storage();
  let time=Date.parse(AT),calls=0;
  const store=createBirthLifecycleStore(storage,{nowMs:()=>time});
  t.after(()=>store.close());
  const lifecycle=lifecycleFor(store,storage,{nowMs:()=>time,invoke:async args=>{
    if(args.clientRequestId.startsWith("birth_population_")){
      calls++;return {output:populationAuthored};
    }
    return {output:namingAuthored};
  }});
  const selector={
    country:"Israel",city:"Jerusalem",display:"Israel/Jerusalem",
    key:"israel/jerusalem",slug:"israel_jerusalem",birthCity:"Jerusalem, Israel",
  };
  const chronology={bornAt:"2004-01-01T00:00:00.000Z",
    chronologyEndsAt:"2026-01-01T00:00:00.000Z"};
  store.enqueue(input("first-family",{place:"Israel/Jerusalem",heritage:"Origin 0"}));
  store.progress("first-family",{stage:"place_resolved",status:"authoring",nextAttemptAt:time,
    data:{selector,chronology}});
  await lifecycle.handleWake();
  assert.equal(store.get("first-family").stage,"place_authored");
  store.progress("first-family",{nextAttemptAt:null});
  store.enqueue(input("second-family",{place:"Israel/Jerusalem",heritage:"Origin 1"}));
  store.progress("second-family",{stage:"place_resolved",status:"authoring",nextAttemptAt:time,
    data:{selector,chronology}});
  await lifecycle.handleWake();
  assert.equal(store.get("second-family").placeVersion,store.get("first-family").placeVersion,
    "Different heritage filters reauthored the same civic Place");
  assert.equal(calls,1,"Reused Place caused another model call");
});
