import assert from "node:assert/strict";
import test from "node:test";
import { createBirthLifecycleStore } from "../src/birth-lifecycle-store.mjs";
import { createBirthLifecycle } from "../src/birth-lifecycle.mjs";
import { createBirthLifecycleApi } from "../src/birth-lifecycle-api.mjs";
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


test("Birth Center preserves the CLI's fixed authored-place and birth material",async(t)=>{
  const state=tempBirthState(t);
  const {resolveGenesisWorldSelection}=await import("../../../tools/genesis/genesis-selection.mjs");
  const {composeGenesisWorldSelection,normalizeGenesisWorldSelector}=
    await import("../src/genesis-world-selection.mjs");
  const {composeGenesisBirthRequest}=await import("../src/genesis-birth-authoring.mjs");
  const {composeBirthSubjectIdentity}=await import("../src/birth-material.mjs");
  const {selectedUrgesForBirth}=await import("../../../core/src/inherited-urges.mjs");
  const selector=normalizeGenesisWorldSelector("United Kingdom/London");
  const birth={requestId:"birth-parity-fixed",requestedAt:AT,
    bornAt:"2004-02-08T00:00:00.000Z",chronologyEndsAt:"2026-02-08T00:00:00.000Z"};
  const old=await resolveGenesisWorldSelection({
    selector,heritage:null,forceNewWorld:true,repoRoot:state.root,
    ...birth,now:()=>AT,authorWorld:async()=>authored,
  });
  const current=composeGenesisWorldSelection({
    selector,heritage:null,authored,
    ...birth,createdAt:AT,
  });
  for(const key of ["worldSpec","material","timeZone","participants","placeAffordances"])
    assert.deepEqual(current[key],old[key],"Birth Center changed CLI "+key);
  const request=composeGenesisBirthRequest({
    requestId:birth.requestId,requestedAt:AT,
    selection:current,sexSelection:"female",calibrationModel:null,
  });
  assert.deepEqual(request.worldSpec,old.worldSpec);
  assert.deepEqual(request.genomeValues,selectedUrgesForBirth(birth.requestId).values);
  assert.deepEqual(
    request.subjectIdentity.physicalGenome,
    composeBirthSubjectIdentity({requestId:birth.requestId,material:old.material}).physicalGenome,
    "Moving birth authoring changed genetic inheritance",
  );
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
