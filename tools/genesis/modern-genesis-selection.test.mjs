import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createWorldAuthoringFetch,
  normalizeModernWorldSelector,
  parseModernGenesisArgs,
  resolveModernWorldSelection,
} from "./modern-genesis-selection.mjs";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
}

const cohort = fixture("fixtures/genesis/pr39/development-cohort-v1.json");
const materialFixture = fixture("fixtures/genesis/pr39/modern-birth-material-v1.json");

const authoredJerusalem = Object.freeze({
  timeZone:"Asia/Jerusalem",
  languages:["Hebrew", "Arabic", "English"],
  nameOrder:"given_family",
  femaleGivenNames:["Noa", "Maya", "Yael", "Tamar", "Shira", "Lior"],
  maleGivenNames:["Noam", "Eitan", "Daniel", "Yoni", "Ariel", "Omer"],
  familyNames:["Levi", "Cohen", "Mizrahi", "Peretz", "Avital", "Shalev"],
  homeDescription:"An ordinary apartment household in Jerusalem connected to neighborhood streets and everyday services.",
  schoolDescription:"A local school setting with classrooms, teachers, peers and ordinary extracurricular access.",
  transitDescription:"Walking and public transit connect residential areas with school, commerce and civic destinations.",
  learningDescription:"A public learning setting with books, study space and community programming.",
  commerceDescription:"Neighborhood commerce provides groceries, pharmacies, cafes and routine household errands.",
  mobilityPattern:"Daily movement combines walking and public transit, with travel time varying by destination and traffic.",
  schoolingOrCommunityContext:"Schools, neighborhood services, public learning spaces and community programs provide repeated contact with peers and adults.",
  culturalContext:"Jerusalem, Israel — Hebrew, Arabic and English may be encountered across ordinary civic, educational and commercial settings. The World does not assign the household a religion, politics, ethnicity or values.",
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

test("modern Genesis accepts explicit sex plus Country/City and reuses authored Worlds", async (t) => {
  const options = parseModernGenesisArgs(["--female", "--Israel/jerusalem"]);
  assert.equal(options.sex, "female");
  assert.equal(options.world.display, "Israel/Jerusalem");

  const existingRoot = mkdtempSync(join(tmpdir(), "fibre-existing-world-"));
  t.after(() => rmSync(existingRoot, { recursive:true, force:true }));
  const existing = await resolveModernWorldSelection({
    selector:normalizeModernWorldSelector("Brazil/Recife"),
    cohort,
    materialFixture,
    fixture,
    repoRoot:existingRoot,
    requestId:"birth-existing-world",
    baseSlotOrdinal:1,
  });
  assert.equal(existing.mode, "fixture");
  assert.equal(existing.worldSpec.worldSpecId, "world_pr39_rg1_03_recife");

  const root = mkdtempSync(join(tmpdir(), "fibre-modern-world-"));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  const selector = normalizeModernWorldSelector("Israel/Jerusalem");
  let authoredCalls = 0;
  const created = await resolveModernWorldSelection({
    selector,
    cohort,
    materialFixture,
    fixture,
    repoRoot:root,
    requestId:"birth-jerusalem-1",
    baseSlotOrdinal:1,
    now:() => "2026-09-15T06:20:00Z",
    authorWorld:async () => { authoredCalls += 1; return authoredJerusalem; },
  });
  assert.equal(created.mode, "created");
  assert.equal(created.material.birthCity, "Jerusalem, Israel");
  assert.equal(created.timeZone, "Asia/Jerusalem");
  assert.match(created.worldSpec.worldSpecId, /^world_modern_israel_jerusalem_/u);

  const reused = await resolveModernWorldSelection({
    selector,
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
  assert.equal(authoredCalls, 1);
});
