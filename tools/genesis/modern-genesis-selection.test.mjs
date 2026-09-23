import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

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
  appearanceContext:"Yemeni Jewish family backgrounds can include a broad range of West Asian and southern Arabian-associated complexions, dark hair textures and eye colors, with substantial individual and family variation; no single facial type is implied.",
  availableInstitutions:["school", "public_library", "public_transit", "neighborhood_health_service"],
  intellectualEnvironment:"School, books, news, internet access, public cultural institutions and ordinary conversation provide varied sources of ideas and disagreement.",
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

  const existingRoot = mkdtempSync(join(tmpdir(), "fibre-existing-world-"));
  t.after(() => rmSync(existingRoot, { recursive:true, force:true }));
  const existing = await resolveModernWorldSelection({
    selector:normalizeModernWorldSelector("Brazil/Recife"),
    heritage:null,
    cohort,
    materialFixture,
    fixture,
    repoRoot:existingRoot,
    requestId:"birth-existing-world",
    baseSlotOrdinal:1,
  });
  assert.equal(existing.mode, "fixture");
  assert.equal(
    existing.genomePath,
    cohort.slots[0].genomePath,
    "birthplace must not select the Thread genome",
  );
  assert.match(existing.worldSpec.worldSpecId, /^world_pr39_rg1_03_recife_family_/u);
  assert.match(existing.worldSpec.culturalContext, /Family origin context:/u);
  assert.match(existing.material.familyOriginContext, /northeastern Brazil/u);

  const root = mkdtempSync(join(tmpdir(), "fibre-modern-world-"));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  const selector = normalizeModernWorldSelector("Israel/Jerusalem");
  const heritage = normalizeModernHeritage("Yemeni Jewish");
  let authoredCalls = 0;
  const created = await resolveModernWorldSelection({
    selector,
    heritage,
    cohort,
    materialFixture,
    fixture,
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
  assert.deepEqual(created.worldSpec.languages, ["Hebrew", "English"], "personal languages must not become a Jerusalem demographic inventory");
  assert.doesNotMatch(created.material.appearanceContext, /Yemeni Jewish|Jerusalem|Israel/iu, "portrait appearance prior must not carry place/heritage labels");

  const reused = await resolveModernWorldSelection({
    selector,
    heritage,
    cohort,
    materialFixture,
    fixture,
    repoRoot:root,
    requestId:"birth-jerusalem-2",
    baseSlotOrdinal:2,
    authorWorld:async () => { throw new Error("cached World should have been reused"); },
  });
  assert.equal(reused.mode, "cached");
  assert.equal(reused.worldSpec.worldSpecId, created.worldSpec.worldSpecId);
  assert.equal(reused.material.appearanceContext, created.material.appearanceContext);
  assert.equal(authoredCalls, 1);
});


test("uncommon local appearance remains valid when family origin makes it causal", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-tbilisi-family-origin-"));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  const selector = normalizeModernWorldSelector("Georgia/Tbilisi");
  const authored = {
    ...authoredJerusalem,
    timeZone:"Asia/Tbilisi",
    languages:["Georgian", "English"],
    femaleGivenNames:["Nino", "Mariam", "Salome", "Ana", "Tamar", "Elene"],
    maleGivenNames:["Giorgi", "Irakli", "Levan", "Sandro", "Dato", "Nikoloz"],
    familyNames:["Beridze", "Kapanadze", "Mensah", "Gelashvili", "Lomidze", "Tsiklauri"],
    culturalContext:"The household lives ordinary urban life in Tbilisi.",
    heritageContext:"No operator-supplied heritage label.",
    familyOriginContext:"One caregiver is Georgian; the other was born in Ghana, came to Tbilisi as a university student in the 1990s, remained after graduation, and built a mixed Georgian-Ghanaian family whose relatives and family stories connect both places.",
    appearanceContext:"A mixed family appearance range combining substantial West African and South Caucasus ancestry, including darker skin and tightly curled to wavy dark hair alongside broad variation in facial features and complexion; no single phenotype is implied.",
  };
  const created = await resolveModernWorldSelection({
    selector,
    heritage:null,
    forceNewWorld:true,
    cohort,
    materialFixture,
    fixture,
    repoRoot:root,
    requestId:"birth-tbilisi-mixed-origin",
    baseSlotOrdinal:1,
    now:() => "2026-09-18T20:10:00Z",
    authorWorld:async () => authored,
  });

  assert.match(created.material.familyOriginContext, /Ghana/u);
  assert.match(created.worldSpec.culturalContext, /Ghana/u, "family origin must be available to life generation");
  assert.match(created.worldSpec.householdShape, /Ghana/u, "household story must carry the same causal origin");
  assert.match(created.material.appearanceContext, /West African|South Caucasus/u);
  assert.doesNotMatch(created.material.appearanceContext, /Tbilisi|Georgia/iu, "appearance prior must remain physical rather than geographic");
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
        languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
      }),
    }),
    /1 to 3 personally plausible languages/u,
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
