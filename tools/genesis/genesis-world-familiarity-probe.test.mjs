import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  WORLD_FAMILIARITY_POLICY,
  WORLD_FAMILIARITY_SYSTEM_PROMPT,
  classifyWorldFamiliarity,
  projectWorldForFamiliarity,
  runWorldFamiliarityProbe,
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

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function familiarityOutput() {
  return {
    densityScore: 4,
    coverage: {
      household: 4,
      schooling: 4,
      mobility: 4,
      institutions: 4,
      languageContext: 4,
      everydayEconomy: 4,
      intellectualAccess: 4,
    },
    comparisonNotes: "Broad ordinary-world coverage.",
  };
}

test("G1 familiarity projection excludes experiment identity and authorship", () => {
  const projected = projectWorldForFamiliarity(world);
  assert.equal("worldSpecId" in projected, false);
  assert.equal("worldAuthorship" in projected, false);
  assert.equal("createdAt" in projected, false);
  assert.equal(projected.places[0].placeId, undefined);
  assert.equal(projected.places[0].description, "A public neighborhood setting.");
});

test("G1 cold familiarity surface contains no experiment or genome language", () => {
  const projected = projectWorldForFamiliarity(world);
  const surface = `${WORLD_FAMILIARITY_SYSTEM_PROMPT}\n${JSON.stringify(projected)}`;
  assert.doesNotMatch(surface, /Fibre|Genesis|genome|worldSpecId|worldAuthorship/i);
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

test("G1 familiarity reports per-world provider progress without changing result semantics", async () => {
  const root = mkdtempSync(join(tmpdir(), "fibre-g1-familiarity-progress-"));
  try {
    const candidates = Array.from({ length: 5 }, (_, index) => {
      const slot = index + 1;
      const candidate = {
        ...structuredClone(world),
        worldSpecId: `world_test_g1_familiarity_${slot}`,
        places: [{ placeId: `place_test_${slot}`, description: `Public neighborhood setting ${slot}.` }],
      };
      const path = join(root, `candidate-${slot}.json`);
      const finalPath = join(root, `final-${slot}.json`);
      writeFileSync(path, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
      return {
        slot,
        worldSpecId: candidate.worldSpecId,
        path,
        candidateDigest: digest(candidate),
        finalPath,
      };
    });

    const manifestPath = join(root, "manifest.json");
    const outPath = join(root, "result.json");
    writeFileSync(
      manifestPath,
      `${JSON.stringify({
        protocolVersion: "pr39-slice-g1-world-candidate-freeze-v1",
        candidateWorlds: candidates,
        familiarityPolicy: {
          version: "pr39-slice-g1-world-familiarity-v1",
          provider: "openai",
          model: "test-model",
        },
      }, null, 2)}\n`,
      "utf8",
    );

    const calls = [];
    const adapter = {
      async invoke(request) {
        calls.push(request);
        return {
          output: familiarityOutput(),
          provenance: { usage: null, transport: "test" },
        };
      },
    };
    const progress = [];

    const result = await runWorldFamiliarityProbe({
      provider: "openai",
      model: "test-model",
      manifestPath,
      outPath,
      adapter,
      now: () => "2026-08-20T00:00:00Z",
      progress: (phase, message) => progress.push({ phase, message }),
    });

    assert.equal(result.allAccepted, true);
    assert.equal(result.results.length, 5);
    assert.equal(result.finalWorlds.length, 5);
    assert.equal(calls.length, 5);
    assert.equal(progress.length, 10);
    assert.deepEqual(
      progress.map(({ phase }) => phase),
      ["world 1/5", "world 1/5", "world 2/5", "world 2/5", "world 3/5", "world 3/5", "world 4/5", "world 4/5", "world 5/5", "world 5/5"],
    );
    assert.match(progress[0].message, /^Calling openai\/test-model for world_test_g1_familiarity_1$/);
    assert.match(progress[1].message, /^accepted · density=4\/4$/);

    const persisted = JSON.parse(readFileSync(outPath, "utf8"));
    assert.equal(persisted.allAccepted, true);
    assert.equal(persisted.results.length, 5);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
