import assert from "node:assert/strict";
import test from "node:test";
import {PLACE_POPULATION_SCHEMA,choosePlaceCouple,chooseHouseholdPattern,validatePlacePopulation} from "../src/place-population.mjs";
import {composeParentage,drawBirthHousehold,parentAgesAtBirth} from "../src/birth-parentage.mjs";
import {composeBirthSubjectIdentity} from "../src/birth-material.mjs";
import {referencePopulationIds,sampleFounderPhysicalGenome} from "../../../core/src/human-appearance/index.mjs";
import {composeGenesisWorldSelection} from "../src/genesis-world-selection.mjs";
import {composeGenesisBirthRequest} from "../src/genesis-birth-authoring.mjs";
import {buildGenesisDevelopmentPlan} from "../src/genesis-development-plan.mjs";
import {deriveGenesisLifeContinuity} from "../../world-kernel/src/genesis-life-continuity-v1.mjs";
import {createBirthLifecycleStore} from "../src/birth-lifecycle-store.mjs";
import {tempBirthState} from "./support/birth-state-fixture.mjs";

const place={
  timeZone:"UTC",
  homeDescription:"Ordinary local homes.",
  schoolDescription:"Local schools.",
  transitDescription:"Local transport.",
  learningDescription:"Community library.",
  commerceDescription:"Local markets.",
  mobilityPattern:"Local walking.",
  schoolingOrCommunityContext:"Shared local schools.",
  culturalContext:"A mixed coastal town.",
  availableInstitutions:["school","library","market"],
  intellectualEnvironment:"Public libraries and conversation.",
  schoolingLanguages:["English"],
  localNamingOriginId:"a",
  mixedParentShare:0.35,
  householdPatterns:[
    {caregivers:["mother","father"],siblings:0,weight:5},
    {caregivers:["mother"],siblings:2,weight:3},
    {caregivers:["father","grandmother"],siblings:1,weight:2},
  ],
  originGroups:Array.from({length:8},(_,i)=>({
    originId:String.fromCharCode(97+i),label:"Origin "+i,share:1/8,
    heritageTags:["Origin "+i],heritageLanguages:["English"],
    householdRetentionRate:1,
    referencePopulations:[{
      population:"Ancestor "+i,share:1,
      referencePopulation:i===0?"eur_north":"east_asia",
    }],
  })),
  couples:[
    {motherOriginId:"a",fatherOriginId:"a",weight:4,
      childGivenNameTradition:{mother:1,father:0,local:0}},
    {motherOriginId:"a",fatherOriginId:"b",weight:2,
      childGivenNameTradition:{mother:1,father:0,local:0}},
    {motherOriginId:"b",fatherOriginId:"a",weight:1,
      childGivenNameTradition:{mother:1,father:0,local:0}},
  ],
};
const names=(prefix)=>({
  parentNamesByDecade:[1960,1970,1980].map(decade=>({
    decade,
    femaleGivenNames:Array.from({length:24},(_,i)=>prefix+"Mother"+decade+i),
    maleGivenNames:Array.from({length:24},(_,i)=>prefix+"Father"+decade+i),
  })),
  childFemaleGivenNames:Array.from({length:24},(_,i)=>prefix+"Girl"+i),
  childMaleGivenNames:Array.from({length:24},(_,i)=>prefix+"Boy"+i),
  familyNames:Array.from({length:24},(_,i)=>prefix+"Family"+i),
  transmission:"father",nameOrder:"given_family",joiner:"-",
  patronymicMaleSuffix:"",patronymicFemaleSuffix:"",
});
const chronology={bornAt:"2004-04-04T00:00:00Z",chronologyEndsAt:"2026-04-04T00:00:00Z"};
const selector={country:"United States",city:"Hilo",key:"united-states/hilo",slug:"united-states_hilo",
  display:"United States/Hilo",birthCity:"Hilo, United States"};

test("all schema-permitted physical origins produce valid founder genomes",()=>{
  const codes=PLACE_POPULATION_SCHEMA.properties.originGroups.items.properties
    .referencePopulations.items.properties.referencePopulation.enum;
  assert.deepEqual(codes,referencePopulationIds,
    "Birth authoring excludes or adds unsupported founder populations");
  for(const code of codes){
    const genome=sampleFounderPhysicalGenome({
      ancestry:[{population:code,share:1,referencePopulation:code}],
      seed:"population-schema:"+code,
    });
    assert.ok(genome.loci?.pigmentation?.length===2,
      "Birth Place reference "+code+" cannot produce a founder genome");
  }
});

test("Place languages are atomic and one language never appears as multiple varieties",()=>{
  const invalid={...place,schoolingLanguages:["Arabic","Saidi Arabic dialects (Upper Egyptian Arabic)","English"]};
  assert.throws(()=>validatePlacePopulation(invalid),/bare language/,
    "Dialect descriptions were accepted as individual languages");
  const withVarieties={...place,schoolingLanguages:["Arabic","English"],
    originGroups:place.originGroups.map((group,index)=>({
      ...group,heritageLanguages:index===0?["Arabic","Saidi Arabic dialects (Upper Egyptian Arabic)","Egyptian Arabic"]:["Arabic"],
    }))};
  // Historic pinned records can contain varieties; new authoring cannot.
  assert.throws(()=>validatePlacePopulation(withVarieties),/bare language/);
  const selected={mother:withVarieties.originGroups[0],father:withVarieties.originGroups[1],
    couple:withVarieties.couples[1],childOriginId:"a"};
  const birth=composeParentage({requestId:"atomic-languages",chronology,selector,
    place:withVarieties,selected,traditions:{a:names("A"),b:names("B")},sex:"female"});
  assert.deepEqual(birth.family.languages,["Arabic","English"],
    "Arabic varieties consumed multiple spoken-language slots or excluded school English");
  assert.deepEqual(birth.family.raisedLanguages,["Arabic"],
    "Regional varieties became independent household languages");
});

test("a Place's mixed-parent frequency and sampled couples follow its own authored evidence",()=>{
  validatePlacePopulation(place);
  const known=new Set(place.couples.map(c=>c.motherOriginId+"|"+c.fatherOriginId));
  let mixed=0;
  const count=5000;
  for(let i=0;i<count;i++){
    const selected=choosePlaceCouple({place,requestId:"cohort-"+i});
    assert.ok(known.has(selected.couple.motherOriginId+"|"+selected.couple.fatherOriginId),
      "The sampler invented a parent pairing");
    if(selected.mixed)mixed++;
  }
  assert.ok(Math.abs(mixed/count-place.mixedParentShare)<0.03,
    "Mixed-parent births diverged from the Place's authored mixedParentShare");
  assert.equal(choosePlaceCouple({place,requestId:"heritage-fixed",heritage:"Origin 1"}).mixed,true,
    "Heritage filtering failed to retain available mixed couples");
  assert.throws(()=>validatePlacePopulation({...place,mixedParentShare:1,
    couples:[place.couples[0],{
      ...place.couples[0],motherOriginId:"b",fatherOriginId:"b",
    }]}),/mixedParentShare/,
    "Place authoring accepted an impossible mixed-parent fraction");
});

test("weighted households vary siblings and caregiving without inventing a fixed family",()=>{
  validatePlacePopulation(place);
  const observed=new Map();
  let noSiblings=false,younger=false,nonCaregiving=false;
  const count=5000,total=place.householdPatterns.reduce((sum,item)=>sum+item.weight,0);
  for(let i=0;i<count;i++){
    const requestId="household-"+i;
    const pattern=chooseHouseholdPattern({place,requestId});
    const household=drawBirthHousehold({place,requestId});
    const key=[...pattern.caregivers].sort().join(":")+":"+pattern.siblings;
    observed.set(key,(observed.get(key)??0)+1);
    assert.equal(household.siblings.length,pattern.siblings);
    if(!household.siblings.length)noSiblings=true;
    if(household.siblings.some(s=>s.relativeAge==="younger"))younger=true;
    if(!household.caregivers.includes("father")||!household.caregivers.includes("mother"))
      nonCaregiving=true;
    const ages=parentAgesAtBirth(requestId);
    for(const sibling of household.siblings){
      const whenBorn=sibling.relativeAge==="older"?-sibling.gapYears:sibling.gapYears;
      assert.ok(ages.mother+whenBorn>=18&&ages.father+whenBorn>=18,
        "A sampled sibling was born before a parent turned 18");
    }
  }
  for(const pattern of place.householdPatterns){
    const key=[...pattern.caregivers].sort().join(":")+":"+pattern.siblings;
    assert.ok(Math.abs((observed.get(key)??0)/count-pattern.weight/total)<0.03,
      "The place's household weights did not govern birth households");
  }
  assert.ok(noSiblings&&younger&&nonCaregiving,
    "Household sampling still forces older siblings or two caregiving parents");
  assert.throws(()=>validatePlacePopulation({...place,householdPatterns:[
    {caregivers:["grandmother"],siblings:0,weight:1},
    ...place.householdPatterns.slice(1),
  ]}),/household/,"An authored household without a caregiving parent was accepted");
});

test("non-caregiving biological parents retain their genetic ancestry",()=>{
  const selected={
    mother:place.originGroups[0],father:place.originGroups[1],
    couple:place.couples[1],childOriginId:"a",
  };
  const props={requestId:"caregiver-difference",chronology,selector,place,selected,
    traditions:{a:names("A"),b:names("B")},sex:"female"};
  const withFather=composeParentage({...props,householdPattern:{
    caregivers:["mother","father"],siblings:[],
  }});
  const withoutFather=composeParentage({...props,householdPattern:{
    caregivers:["mother"],siblings:[],
  }});
  const father=withoutFather.participants.find(p=>p.participantId==="father");
  assert.deepEqual(father.factualRoles,["father"]);
  assert.equal(withoutFather.father.geneticProvenance,"synthetic_genetic_ancestor");
  assert.equal(withoutFather.mother.geneticProvenance,"synthetic_genetic_ancestor");
  assert.ok(father.relationshipFacts.some(fact=>fact.includes("Does not live")));
  assert.deepEqual(withFather.family.physicalAncestry,withoutFather.family.physicalAncestry,
    "Removing caregiving changed biological origin");
  const identity=parentage=>composeBirthSubjectIdentity({requestId:props.requestId,
    material:{...parentage.family,birthCity:selector.birthCity},
    explicitNames:{femaleName:parentage.femaleName,maleName:parentage.maleName},
  });
  assert.deepEqual(identity(withFather).physicalGenome,identity(withoutFather).physicalGenome,
    "Removing a caregiver rewrote the child's inherited body");
  const worldFor=parentage=>composeGenesisWorldSelection({
    selector,heritage:null,authored:place,requestId:props.requestId,
    ...chronology,createdAt:"2026-10-29T00:00:00Z",
    familyOverride:parentage.family,
    householdOverride:{...parentage.household,participants:parentage.participants},
  });
  const a=worldFor(withFather),b=worldFor(withoutFather);
  assert.notEqual(a.worldSpec.householdShape,b.worldSpec.householdShape,
    "Different households produced identical WorldSpec families");
  assert.ok(a.placeAffordances[0].ordinaryCounterpartRoles.includes("father"));
  assert.ok(!b.placeAffordances[0].ordinaryCounterpartRoles.includes("father"),
    "A non-caregiving father remained a default home counterpart");
  assert.ok(b.worldSpec.familyRelations.every(fact=>!fact.includes("two years older")),
    "A Slice 2 household retained the fixed older sibling");
  const withYounger=composeParentage({...props,householdPattern:{
    caregivers:["mother"],siblings:[{sex:"female",relativeAge:"younger",gapYears:3}],
  }});
  const sibling=withYounger.household.siblings[0];
  assert.ok(sibling.name.includes("Family"),"A named sibling lost the family naming convention");
  assert.equal(sibling.relativeAge,"younger");
  assert.ok(withYounger.participants.some(person=>person.factualRoles.includes("sibling")
    &&person.relationshipFacts.join(" ").includes(sibling.name)),
    "The younger sibling was not an actual Genesis participant");
  assert.ok(worldFor(withYounger).worldSpec.familyRelations.some(fact=>fact.includes("younger")),
    "WorldSpec ignored the child's drawn younger sibling");
});

test("drawn households pass real World Genesis envelope and continuity role authority",()=>{
  const traditions={a:names("A"),b:names("B")};
  const seen={grandparent:false,sibling:false,nonCaregiving:false};
  for(let i=0;i<36;i++){
    const requestId="genesis-family-roles-"+i;
    const selected=choosePlaceCouple({place,requestId});
    const mother=place.originGroups.find(group=>group.originId===selected.couple.motherOriginId);
    const father=place.originGroups.find(group=>group.originId===selected.couple.fatherOriginId);
    const parentage=composeParentage({
      requestId,chronology,selector,place,
      selected:{...selected,mother,father,childOriginId:"a"},
      traditions,sex:"female",
    });
    const selection=composeGenesisWorldSelection({
      selector,heritage:null,authored:place,requestId,...chronology,
      createdAt:"2026-10-29T00:00:00Z",
      familyOverride:parentage.family,
      householdOverride:{...parentage.household,participants:parentage.participants},
    });
    const request=composeGenesisBirthRequest({
      requestId,requestedAt:"2026-10-29T18:00:00Z",
      selection,sexSelection:"female",calibrationModel:null,parentage,
    });
    // This constructs the historical envelope through World's real validator,
    // including the exact home affordance roles the birth would publish.
    const plan=buildGenesisDevelopmentPlan(request);
    assert.equal(plan.envelopePlan.envelopes.length,plan.windows.length,
      "World rejected a drawn household's place affordances");
    const episode={
      episodeId:"episode_"+i,occurredAt:plan.windows[0].startAt,
      placeRef:plan.worldSpec.places[0].placeId,
      participantRefs:plan.roster.participants.map(person=>person.participantId),
      introducedParticipants:[],
    };
    // World validates the actual hashed Genesis roster, not a mocked family.
    const continuity=deriveGenesisLifeContinuity({
      threadId:plan.threadId,worldSpec:plan.worldSpec,
      initialRoster:plan.roster.participants,episodes:[episode],
    });
    assert.equal(continuity.guarantees.everyPublishedParticipantHasRoleAuthority,true,
      "World rejected a drawn household member's historical role");
    assert.ok(!plan.roster.participants.some(person=>
      person.factualRoles.includes("synthetic_genetic_ancestor")),
    "Genetic ancestry leaked into historical roles");
    seen.grandparent||=parentage.household.caregivers.some(role=>
      role==="grandmother"||role==="grandfather");
    seen.sibling||=parentage.household.siblings.length>0;
    seen.nonCaregiving||=parentage.participants.some(person=>
      (person.factualRoles.includes("mother")||person.factualRoles.includes("father"))
      &&!person.factualRoles.includes("caregiver"));
  }
  assert.ok(Object.values(seen).every(Boolean),
    "Genesis role sample did not exercise grandparent, sibling and non-caregiving parent");
});

test("a different biological father changes inherited body and family name without changing the Place",()=>{
  const requestId="lineage-differential";
  const mother=place.originGroups[0],fatherA=place.originGroups[0],fatherB=place.originGroups[1];
  const templates={a:names("A"),b:names("B")};
  const first=composeParentage({requestId,chronology,selector,place,
    selected:{mother,father:fatherA,childOriginId:"a",
      couple:place.couples[0]},traditions:templates,sex:"female"});
  const second=composeParentage({requestId,chronology,selector,place,
    selected:{mother,father:fatherB,childOriginId:"a",
      couple:place.couples[1]},traditions:templates,sex:"female"});
  const identity=parentage=>composeBirthSubjectIdentity({requestId,
    material:{...parentage.family,birthCity:selector.birthCity},
    explicitNames:{femaleName:parentage.femaleName,maleName:parentage.maleName},
  });
  assert.notEqual(first.issuedName,second.issuedName,
    "Changing the father did not change the family name");
  assert.notDeepEqual(identity(first).physicalGenome,identity(second).physicalGenome,
    "The father's distinct ancestry did not change the inherited genome");
  assert.notEqual(first.father.name,second.father.name,
    "The historical father remained the same after changing parental origin");
});

test("issued full names are unique within a Place even for in-flight births",t=>{
  const state=tempBirthState(t),store=createBirthLifecycleStore(state.storage());
  t.after(()=>store.close());
  assert.equal(store.seedNames(selector.key,["Already Born"]),true);
  assert.equal(store.seedNames(selector.key,["Do Not Reseed"]),false);
  assert.equal(store.reserveName(selector.key,"Already Born","pending-a"),false);
  assert.equal(store.reserveName(selector.key,"New Child","pending-a"),true);
  assert.equal(store.reserveName(selector.key,"new   child","pending-b"),false,
    "An in-flight birth did not reserve its name");
  assert.equal(store.reserveName(selector.key,"New Child","pending-a"),true,
    "An exact replay lost its own name reservation");
  store.releaseName("pending-a");
  assert.equal(store.reserveName(selector.key,"New Child","pending-b"),true,
    "Cancellation did not release the local name");
});

test("parentage and name replay from pinned Place/naming material without reauthoring",t=>{
  const state=tempBirthState(t),storage=state.storage();
  const store=createBirthLifecycleStore(storage);
  t.after(()=>store.close());
  const key=selector.key+":2000",version="place-fixed",decade="2000";
  store.savePlace(key,version,place);
  for(const group of place.originGroups.slice(0,2)){
    store.saveNaming(key,group.originId,decade,"names-fixed-"+group.originId,names(group.originId));
  }
  const replay=()=>{
    const pinned=store.place(key,version);
    const selected=choosePlaceCouple({place:pinned.authored,requestId:"repeat-child"});
    const mother=pinned.authored.originGroups.find(group=>group.originId===selected.couple.motherOriginId);
    const father=pinned.authored.originGroups.find(group=>group.originId===selected.couple.fatherOriginId);
    const traditions={
      a:store.naming(key,"a",decade,"names-fixed-a").authored,
      b:store.naming(key,"b",decade,"names-fixed-b").authored,
    };
    return composeParentage({requestId:"repeat-child",chronology,selector,place:pinned.authored,
      selected:{...selected,mother,father,childOriginId:"a"},
      traditions,sex:"male"});
  };
  assert.deepEqual(replay(),replay(),
    "A replay changed parents or issued name without changing pinned evidence");
});
