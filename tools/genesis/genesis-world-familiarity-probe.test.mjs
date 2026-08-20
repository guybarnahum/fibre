import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_FAMILIARITY_POLICY,
  classifyWorldFamiliarity,
  projectWorldForFamiliarity,
} from "./genesis-world-familiarity-probe.mjs";

const world = {
  worldSpecId: "world_test_g1_familiarity",
  timeFrame: { startAt: "2004-01-01T00:00:00Z", endAt: "2026-01-01T00:00:00Z" },
  places: [{ placeId: "place_test", description: "A public neighborhood setting." }],
  householdShape: "One caregiver and one child share a home.",
  familyRelations: [],
  languages: ["English"],
  materialCircumstances: "Stable essentials with ordinary budget constraints.",
  mobilityPattern: "Walking and public transit.",
  schoolingOrCommunityContext: "Public school and neighborhood services.",
  culturalContext: "Mixed public and private institutions with ordinary disagreement.",
  availableInstitutions: ["public_school", "public_library"],
  intellectualEnvironment: "Books, classes, conversation and public information are available.",
  affordedRoles: ["caregiver", "peer", "teacher", "librarian"],
  worldAuthorship: {
    authorId: "fibre_test",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic test world.",
    relocationWitness: "Relocatable without preserving an intended person.",
    familiarityProbe: null,
    createdAt: "2026-08-20T00:00:00Z",
  },
  createdAt: "2026-08-20T00:00:00Z",
};

test("G1 familiarity projection excludes experiment identity and authorship", () => {
  const projected = projectWorldForFamiliarity(world);
  assert.equal("worldSpecId" in projected, false);
  assert.equal("worldAuthorship" in projected, false);
  assert.equal("createdAt" in projected, false);
  assert.equal(projected.places[0].placeId, undefined);
  assert.equal(projected.places[0].description, "A public neighborhood setting.");
});

test("G1 familiarity HOLD rule is deterministic and predeclared", () => {
  const coverage = {
    household: 3,
    schooling: 3,
    mobility: 3,
    institutions: 3,
    languageContext: 3,
    everydayEconomy: 3,
    intellectualAccess: 3,
  };
  assert.deepEqual(
    classifyWorldFamiliarity({ densityScore: 2, coverage, comparisonNotes: "adequate" }),
    { materiallyUnderrepresented: false, thinCoverageDomains: [] },
  );

  const twoThin = { ...coverage, mobility: 1, intellectualAccess: 1 };
  assert.equal(
    classifyWorldFamiliarity({ densityScore: 2, coverage: twoThin, comparisonNotes: "thin" }).materiallyUnderrepresented,
    true,
  );
  assert.equal(WORLD_FAMILIARITY_POLICY.thinCoverageDomainCountToHold, 2);
});
