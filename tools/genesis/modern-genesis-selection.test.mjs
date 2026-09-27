import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { composeModernSubjectIdentity } from "./modern-birth-material.mjs";
import { sampleModernBirthplace } from "./modern-birthplace-sampler.mjs";
import {
  createWorldAuthoringFetch,
  normalizeModernHeritage,
  normalizeModernWorldSelector,
  parseModernGenesisArgs,
  resolveModernWorldSelection,
  selectDefaultModernBirthplace,
} from "./modern-genesis-selection.mjs";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
}

const cohort = fixture("fixtures/genesis/pr39/development-cohort-v1.json");
const materialFixture = fixture("fixtures/genesis/pr39/modern-birth-material-v1.json");

const authoredJerusalem = Object.freeze({
  timeZone:"Asia/Jerusalem",
  languages:["Hebrew", "English"],
  raisedLanguages:["Hebrew"],
  nameOrder:"given_family",
  femaleGivenNames:["Noa", "Maya", "Yael", "Tamar", "Shira", "Lior", "Michal", "Roni", "Neta", "Adi"],
  maleGivenNames:["Noam", "Eitan", "Daniel", "Yoni", "Ariel", "Omer", "Avi", "Nadav", "Gil", "Ron"],
  familyNames:["Levi", "Cohen", "Mizrahi", "Peretz", "Avital", "Shalev", "Saadon", "Sharabi", "Dahan", "Halevi"],
  homeDescription:"An ordinary apartment household in Jerusalem connected to neighborhood streets and everyday services.",
  schoolDescription:"A local school setting with classrooms, teachers, peers and ordinary extracurricular access.",
  transitDescription:"Walking and public transit connect residential areas with school, commerce and civic destinations.",
  learningDescription:"A public learning setting with books, study space and community programming.",
  commerceDescription:"Neighborhood commerce provides groceries, pharmacies, cafes and routine household errands.",
  mobilityPattern:"Daily movement combines walking and public transit, with travel time varying by destination and traffic.",
  schoolingOrCommunityContext:"Schools, neighborhood services, public learning spaces and community programs provide repeated contact with peers and adults.",
  culturalContext:"Jerusalem provides the surrounding civic setting, including Hebrew, Arabic and English across ordinary educational, commercial and public contexts.",
  heritageContext:"The household maintains Yemeni Jewish family heritage through some intergenerational language traces, foods, music, family stories, celebrations and community ties without assigning the subject personal belief or observance.",
  familyOriginContext:"The household has longstanding Yemeni Jewish family roots with migration to Israel in earlier generations; close relatives and family stories maintain that ancestry while the subject is born and raised in Jerusalem.",
  availableInstitutions:["school", "public_library", "public_transit", "neighborhood_health_service"],
  intellectualEnvironment:"School, books, news, internet access, public cultural institutions and ordinary conversation provide varied sources of ideas and disagreement.",
  familyProfiles:[
    {id:"yemeni-local",share:7,familyOriginContext:"The household has longstanding Yemeni Jewish family roots with migration to Israel in earlier generations; close relatives and family stories maintain that ancestry while the subject is born and raised in Jerusalem.",languages:["Hebrew","English"],raisedLanguages:["Hebrew"],nameOrder:"given_family",femaleGivenNames:["Noa","Maya","Yael","Tamar","Shira","Lior","Michal","Roni","Neta","Adi","Hila","Talia"],maleGivenNames:["Noam","Eitan","Daniel","Yoni","Ariel","Omer","Avi","Nadav","Gil","Ron","Itai","Amir"],familyNames:["Levi","Cohen","Mizrahi","Peretz","Avital","Shalev","Saadon","Sharabi","Dahan","Halevi","Amar","Yosef"],physicalAncestry:{maternal:[{population:"Yemeni Jewish family",share:1,referencePopulation:"west_asia"}],paternal:[{population:"Yemeni Jewish family",share:1,referencePopulation:"west_asia"}]}},
    {id:"yemeni-mixed",share:2,familyOriginContext:"The household joins Yemeni Jewish and other West Asian Jewish family lines established in Israel across earlier generations.",languages:["Hebrew","English"],raisedLanguages:["Hebrew"],nameOrder:"given_family",femaleGivenNames:["Noa","Maya","Yael","Tamar","Shira","Lior","Michal","Roni","Neta","Adi","Hila","Talia"],maleGivenNames:["Noam","Eitan","Daniel","Yoni","Ariel","Omer","Avi","Nadav","Gil","Ron","Itai","Amir"],familyNames:["Levi","Cohen","Mizrahi","Peretz","Avital","Shalev","Saadon","Sharabi","Dahan","Halevi","Amar","Yosef"],physicalAncestry:{maternal:[{population:"Yemeni Jewish family",share:1,referencePopulation:"west_asia"}],paternal:[{population:"West Asian Jewish family",share:1,referencePopulation:"west_asia"}]}},
    {id:"yemeni-southern-european-mixed",share:1,familyOriginContext:"The household joins Yemeni Jewish and southern European Jewish family lines whose relatives settled in Israel in earlier generations.",languages:["Hebrew","English"],raisedLanguages:["Hebrew"],nameOrder:"given_family",femaleGivenNames:["Noa","Maya","Yael","Tamar","Shira","Lior","Michal","Roni","Neta","Adi","Hila","Talia"],maleGivenNames:["Noam","Eitan","Daniel","Yoni","Ariel","Omer","Avi","Nadav","Gil","Ron","Itai","Amir"],familyNames:["Levi","Cohen","Mizrahi","Peretz","Avital","Shalev","Saadon","Sharabi","Dahan","Halevi","Amar","Yosef"],physicalAncestry:{maternal:[{population:"Yemeni Jewish family",share:1,referencePopulation:"west_asia"}],paternal:[{population:"Southern European Jewish family",share:1,referencePopulation:"eur_south"}]}}
  ]
});

test("World authoring omits unsupported reasoning-model sampling parameters", async () => {
  let sent = null;
  const fetchImpl = createWorldAuthoringFetch(async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok:true };
  });
  await fetchImpl("https://example.invalid", {
    method:"POST",
    body:JSON.stringify({
      model:"gpt-5.1-2025-11-13",
      temperature:0,
      top_p:1,
      reasoning:{ effort:"low" },
      input:[],
    }),
  });
  assert.equal(Object.hasOwn(sent, "temperature"), false);
  assert.equal(Object.hasOwn(sent, "top_p"), false);
  assert.deepEqual(sent.reasoning, { effort:"low" });
});

test("modern Genesis keys create and reuse a place plus heritage World", async (t) => {
  const options = parseModernGenesisArgs([
    "--sex=female",
    "--place=Israel/jerusalem",
    "--heritage=Yemeni Jewish",
  ]);
  assert.equal(options.sex, "female");
  assert.equal(options.world.display, "Israel/Jerusalem");
  assert.equal(options.heritage.display, "Yemeni Jewish");

  const root = mkdtempSync(join(tmpdir(), "fibre-modern-world-"));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  const selector = normalizeModernWorldSelector("Israel/Jerusalem");
  const heritage = normalizeModernHeritage("Yemeni Jewish");
  let authoredCalls = 0;
  const created = await resolveModernWorldSelection({
    selector,
    heritage,
    cohort,
    repoRoot:root,
    requestId:"birth-jerusalem-1",
    baseSlotOrdinal:1,
    now:() => "2026-09-15T06:20:00Z",
    authorWorld:async ({ heritage: receivedHeritage }) => {
      authoredCalls += 1;
      assert.equal(receivedHeritage.display, "Yemeni Jewish");
      return authoredJerusalem;
    },
  });
  assert.equal(created.mode, "created");
  assert.equal(created.material.birthCity, "Jerusalem, Israel");
  assert.equal(created.material.heritage, "Yemeni Jewish");
  assert.equal(created.timeZone, "Asia/Jerusalem");
  assert.match(created.worldSpec.worldSpecId, /^world_modern_israel_jerusalem_yemeni-jewish_/u);
  assert.match(created.worldSpec.culturalContext, /Yemeni Jewish/u);
  assert.match(created.worldSpec.culturalContext, /family roots|migration/iu, "family origin must become causal World context");
  assert.match(created.worldSpec.householdShape, /Family origin context:/u);
  assert.match(created.material.familyOriginContext, /Yemeni Jewish family roots/u);
  assert.deepEqual(created.worldSpec.languages, ["Hebrew", "English"], "World language context lost later acquisition");
  assert.deepEqual(created.material.languages, ["Hebrew", "English"], "eventual spoken languages were lost");
  assert.deepEqual(created.material.raisedLanguages, ["Hebrew"], "raised languages absorbed a school-acquired language");

  const reused = await resolveModernWorldSelection({
    selector,
    heritage,
    cohort,
    repoRoot:root,
    requestId:"birth-jerusalem-2",
    baseSlotOrdinal:2,
    authorWorld:async () => { throw new Error("cached World should have been reused"); },
  });
  assert.equal(reused.mode, "cached");
  assert.equal(reused.worldSpec.worldSpecId, created.worldSpec.worldSpecId);
  assert.equal(authoredCalls, 1);
});


test("uncommon local physical ancestry remains valid when family origin makes it causal", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-tbilisi-family-origin-"));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  const selector = normalizeModernWorldSelector("Georgia/Tbilisi");
  const authored = {
    ...authoredJerusalem,
    timeZone:"Asia/Tbilisi",
    languages:["Georgian", "English"],
    raisedLanguages:["Georgian"],
    femaleGivenNames:["Nino", "Mariam", "Salome", "Ana", "Tamar", "Elene"],
    maleGivenNames:["Giorgi", "Irakli", "Levan", "Sandro", "Dato", "Nikoloz"],
    familyNames:["Beridze", "Kapanadze", "Mensah", "Gelashvili", "Lomidze", "Tsiklauri"],
    culturalContext:"The household lives ordinary urban life in Tbilisi.",
    heritageContext:"No operator-supplied heritage label.",
    familyOriginContext:"One caregiver is Georgian; the other was born in Ghana, came to Tbilisi as a university student in the 1990s, remained after graduation, and built a mixed Georgian-Ghanaian family whose relatives and family stories connect both places.",
    familyProfiles:[{
      id:"georgian-ghanaian", share:1,
      familyOriginContext:"One caregiver is Georgian; the other was born in Ghana, came to Tbilisi as a university student in the 1990s, remained after graduation, and built a mixed Georgian-Ghanaian family whose relatives and family stories connect both places.",
      languages:["Georgian","English"], raisedLanguages:["Georgian"], nameOrder:"given_family",
      femaleGivenNames:["Nino","Mariam","Salome","Ana","Tamar","Elene","Nana","Ketevan","Lika","Sopho","Eka","Maka"],
      maleGivenNames:["Giorgi","Irakli","Levan","Sandro","Dato","Nikoloz","Luka","Tornike","Zurab","Beka","Giga","Vano"],
      familyNames:["Beridze","Kapanadze","Mensah","Gelashvili","Lomidze","Tsiklauri","Owusu","Asare","Boateng","Gyamfi","Ababio","Kwarteng"],
      physicalAncestry:{
        maternal:[{population:"Georgian family",share:1,referencePopulation:"west_asia"}],
        paternal:[{population:"Ghanaian family",share:1,referencePopulation:"afr_west"}],
      },
    }],
  };
  const created = await resolveModernWorldSelection({
    selector,
    heritage:null,
    forceNewWorld:true,
    cohort,
    repoRoot:root,
    requestId:"birth-tbilisi-mixed-origin",
    baseSlotOrdinal:1,
    now:() => "2026-09-18T20:10:00Z",
    authorWorld:async () => authored,
  });

  assert.match(created.material.familyOriginContext, /Ghana/u);
  assert.match(created.worldSpec.culturalContext, /Ghana/u, "family origin must be available to life generation");
  assert.match(created.worldSpec.householdShape, /Ghana/u, "household story must carry the same causal origin");
  assert.equal(created.material.physicalAncestry.maternal[0].referencePopulation, "west_asia");
  assert.equal(created.material.physicalAncestry.paternal[0].referencePopulation, "afr_west");
});

test("automatic long-tail birth authors one World, reuses it, and leaves genome selection independent", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-auto-long-tail-world-"));
  t.after(() => rmSync(root, { recursive:true, force:true }));

  const fixtureKeys = new Set(materialFixture.slots.map(({ birthCity }) =>
    normalizeModernWorldSelector(birthCity.split(", ").reverse().join("/")).key));
  let sampledRequestId = null;
  let sampled = null;
  for (let index = 0; index < 10_000; index += 1) {
    const requestId = `birth-auto-long-tail-${index}`;
    const candidate = sampleModernBirthplace(requestId);
    const selector = normalizeModernWorldSelector(candidate.place);
    if (candidate.kind === "long_tail" && !fixtureKeys.has(selector.key)) {
      sampledRequestId = requestId;
      sampled = candidate;
      break;
    }
  }
  assert.ok(sampledRequestId && sampled, "sampler produced no non-fixture long-tail locality");

  const selector = selectDefaultModernBirthplace(sampledRequestId);
  const authored = {
    ...authoredJerusalem,
    timeZone:"UTC",
    languages:["English"],
    raisedLanguages:["English"],
    culturalContext:`Ordinary civic, school, family and neighborhood life in ${selector.birthCity}.`,
    heritageContext:"No operator-supplied heritage label.",
    familyOriginContext:`The household has longstanding family roots in ${selector.country}, with relatives connected to ${selector.city} and elsewhere in the country.`,
  };

  let authoredCalls = 0;
  const first = await resolveModernWorldSelection({
    selector,
    heritage:null,
    cohort,
    repoRoot:root,
    requestId:sampledRequestId,
    baseSlotOrdinal:1,
    authorWorld:async ({ selector: received }) => {
      authoredCalls += 1;
      assert.equal(received.key, selector.key, "sampled birthplace changed before World authoring");
      return authored;
    },
  });

  const second = await resolveModernWorldSelection({
    selector:selectDefaultModernBirthplace(sampledRequestId),
    heritage:null,
    cohort,
    repoRoot:root,
    requestId:sampledRequestId,
    baseSlotOrdinal:2,
    authorWorld:async () => { throw new Error("automatic World should have been reused"); },
  });

  assert.equal(first.mode, "created", "first automatic birth did not author its World");
  assert.equal(second.mode, "cached", "second automatic birth did not reuse its World");
  assert.equal(first.material.birthCity, selector.birthCity, "sampled locality was lost");
  assert.equal(second.worldSpec.worldSpecId, first.worldSpec.worldSpecId, "reused World changed identity");
  assert.equal(first.genomePath, cohort.slots[0].genomePath, "first birthplace selected the genome");
  assert.equal(second.genomePath, cohort.slots[1].genomePath, "reused birthplace selected the genome");
  assert.equal(authoredCalls, 1, "automatic locality was authored more than once");
});


test("cached place context samples distinct family histories per birth without re-authoring", async (t) => {
  const root=mkdtempSync(join(tmpdir(),"fibre-family-distribution-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const selector=normalizeModernWorldSelector("United Kingdom/London");
  const ancestry=(population,referencePopulation)=>({maternal:[{population,share:1,referencePopulation}],paternal:[{population,share:1,referencePopulation}]});
  const authored={...authoredJerusalem,timeZone:"Europe/London",familyProfiles:[
    {id:"local-british",share:6,familyOriginContext:"A locally rooted British family with multigenerational ties to London.",languages:["English"],raisedLanguages:["English"],nameOrder:"given_family",femaleGivenNames:Array.from({length:12},(_,i)=>"LBF"+i),maleGivenNames:Array.from({length:12},(_,i)=>"LBM"+i),familyNames:Array.from({length:12},(_,i)=>"LBL"+i),physicalAncestry:ancestry("British family","eur_north")},
    {id:"south-asian-british",share:2,familyOriginContext:"A British family with South Asian grandparents and longstanding London family ties.",languages:["English"],raisedLanguages:["English"],nameOrder:"given_family",femaleGivenNames:Array.from({length:12},(_,i)=>"SAF"+i),maleGivenNames:Array.from({length:12},(_,i)=>"SAM"+i),familyNames:Array.from({length:12},(_,i)=>"SAL"+i),physicalAncestry:ancestry("South Asian British family","south_asia")},
    {id:"west-african-british",share:1,familyOriginContext:"A British family with West African grandparents and longstanding London family ties.",languages:["English"],raisedLanguages:["English"],nameOrder:"given_family",femaleGivenNames:Array.from({length:12},(_,i)=>"WAF"+i),maleGivenNames:Array.from({length:12},(_,i)=>"WAM"+i),familyNames:Array.from({length:12},(_,i)=>"WAL"+i),physicalAncestry:ancestry("West African British family","afr_west")},
  ]};
  let calls=0;
  const first=await resolveModernWorldSelection({selector,cohort,repoRoot:root,requestId:"family-distribution-0",baseSlotOrdinal:1,authorWorld:async()=>{calls+=1;return authored;}});
  let second=null;
  for(let i=1;i<100;i+=1){
    const candidate=await resolveModernWorldSelection({selector,cohort,repoRoot:root,requestId:`family-distribution-${i}`,baseSlotOrdinal:1,authorWorld:async()=>{throw Error("cached population context must be reused");}});
    if(candidate.material.familyProfileId!==first.material.familyProfileId){second=candidate;break;}
  }
  assert.ok(second,"population context must allow more than one family history");
  assert.equal(calls,1,"family sampling must not re-author the place");
  assert.notEqual(second.material.familyProfileId,first.material.familyProfileId,"births collapsed onto one family profile");
  assert.notEqual(second.material.familyOriginContext,first.material.familyOriginContext,"sampled family history did not change lived context");
  assert.notDeepEqual(second.material.physicalAncestry,first.material.physicalAncestry,"sampled family history did not change physical ancestry");
  assert.notDeepEqual(second.material.familyNames,first.material.familyNames,"sampled family history did not change naming context");
  const firstIdentity=composeModernSubjectIdentity({requestId:"same-name-seed",material:first.material});
  const secondIdentity=composeModernSubjectIdentity({requestId:"same-name-seed",material:second.material});
  assert.notEqual(firstIdentity.femaleName,secondIdentity.femaleName,"family history did not causally change the name");
  assert.ok(second.worldSpec.householdShape.includes(second.material.familyOriginContext),"sampled family history must shape the Genesis household");
});

test("authored World rejects demographic language inventories for one subject", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-language-inventory-"));
  t.after(() => rmSync(root, { recursive:true, force:true }));

  await assert.rejects(
    () => resolveModernWorldSelection({
      selector:normalizeModernWorldSelector("Israel/Jerusalem"),
      heritage:normalizeModernHeritage("Russian Jewish"),
      cohort,
      materialFixture,
      fixture,
      repoRoot:root,
      requestId:"birth-language-inventory",
      baseSlotOrdinal:1,
      now:() => "2026-09-18T19:00:00Z",
      authorWorld:async () => ({
        ...authoredJerusalem,
        familyProfiles:authoredJerusalem.familyProfiles.map((profile,index)=>index===0
          ? {...profile,languages:["Hebrew","Arabic","English","Russian","Amharic"]}
          : profile),
      }),
    }),
    /1 to 3 languages/u,
  );
});

test("default births form a stable population-shaped world with a real small-place long tail", () => {
  const requestId = "birth-global-distribution-stability";
  assert.deepEqual(
    sampleModernBirthplace(requestId),
    sampleModernBirthplace(requestId),
    "same birth request changed birthplace",
  );

  const samples = Array.from({ length:5000 }, (_, index) =>
    sampleModernBirthplace(`birth-global-distribution-${index}`));
  const regions = new Map();
  const places = new Set();
  let longTail = 0;
  for (const sample of samples) {
    regions.set(sample.region, (regions.get(sample.region) ?? 0) + 1);
    places.add(sample.place);
    if (sample.kind === "long_tail") longTail += 1;
  }

  assert.equal(regions.size, 10, "births lost broad geographic coverage");
  assert.ok(places.size > 50, "birthplaces collapsed into too few localities");
  assert.ok(longTail > samples.length * 0.2, "small-place births became exceptional");
  assert.ok(longTail < samples.length * 0.5, "long-tail births displaced the global anchor base");
  assert.ok(
    regions.get("south_asia") > regions.get("north_america")
      && regions.get("east_asia") > regions.get("oceania"),
    "birth regions no longer resemble broad human population distribution",
  );

  const fixturePlaces = new Set(materialFixture.slots.map(({ birthCity }) => birthCity));
  assert.ok(
    samples.some(({ place }) => {
      const selector = normalizeModernWorldSelector(place);
      return !fixturePlaces.has(selector.birthCity);
    }),
    "default births are still trapped in development Worlds",
  );

  assert.deepEqual(
    selectDefaultModernBirthplace(requestId),
    normalizeModernWorldSelector(sampleModernBirthplace(requestId).place),
    "Genesis default selection diverged from the birthplace sampler",
  );
});
