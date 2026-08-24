// fibre-test-lifecycle: milestone
// fibre-test-scope: pr39
// fibre-test-purpose: replacement-v2-r2-sparse-pass-b
// fibre-test-disposition: remove-or-consolidate-after-pr39

import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
} from "../src/genesis-pass-b-domain.mjs";
import {
  GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES,
  GENESIS_REPLACEMENT_PASS_B_HORIZONS,
  GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE,
  assertReplacementPassBSchedule,
  generateReplacementPassBMemory,
} from "../src/genesis-replacement-pass-b.mjs";

const digest = (char) => `sha256:${char.repeat(64)}`;

function world() {
  return {
    worldSpecId: "world_r2_pass_b_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-20T00:00:00Z" },
    places: [{ placeId: "place_library", description: "A neighborhood public library." }],
    householdShape: "Two caregivers and one sibling.",
    familyRelations: ["The household shares ordinary routines."],
    languages: ["English"],
    materialCircumstances: "Stable housing.",
    mobilityPattern: "Walkable local routines.",
    schoolingOrCommunityContext: "Public school and library.",
    culturalContext: "Mixed neighborhood peer groups.",
    availableInstitutions: ["public_library"],
    intellectualEnvironment: "Books and ordinary discussion are available.",
    affordedRoles: ["caregiver", "sibling", "peer", "librarian"],
  };
}

function history() {
  return [
    {
      episodeId: "ep_library_001",
      occurredAt: "2010-03-08T16:15:00Z",
      ageAtEvent: 6.5,
      placeRef: "place_library",
      participantRefs: ["thr_r2_pass_b_001"],
      observableAction: "The child returns two books and chooses another from a nearby shelf.",
      introducedParticipants: [],
    },
    {
      episodeId: "ep_library_002",
      occurredAt: "2011-10-19T15:40:00Z",
      ageAtEvent: 7.7,
      placeRef: "place_library",
      participantRefs: ["thr_r2_pass_b_001"],
      observableAction: "The child reads a posted notice before deciding which shelf to visit.",
      introducedParticipants: [],
    },
  ];
}

function lifeOnlyInput() {
  return {
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: { provisionalThreadId: "thr_r2_pass_b_001", bornAt: "2004-08-20T00:00:00Z" },
    world: world(),
    rememberingAt: "2012-01-01T00:00:00Z",
    ageAtRemembering: 7.37,
    chronologyEndsAt: "2026-08-19T23:59:59.999Z",
    history: history(),
    priorMemories: [],
    assignment: {
      formationMode: "life_only",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_only_unexposed",
    },
    genomeExposure: null,
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assign_r2_pass_b_001",
      genomeExposurePolicyRef: null,
    },
  };
}

function treatmentInput() {
  return {
    ...lifeOnlyInput(),
    assignment: {
      formationMode: "life_plus_genome",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_plus_genome",
    },
    genomeExposure: {
      policy: { kind: "ordinal_first_k", k: 2 },
      genomeRef: "genome_r2_pass_b_001",
      genomeDigest: digest("a"),
      totalLoci: 4,
      loci: [
        { locusId: "locus_r2_001", ordinal: 1, value: "practical routine quietly excludes someone nearby" },
        { locusId: "locus_r2_002", ordinal: 2, value: "unfinished questions remain active longer" },
      ],
    },
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assign_r2_pass_b_treatment_001",
      genomeExposurePolicyRef: "gexp_r2_pass_b_001",
    },
  };
}

test("replacement Pass-B schedule is exactly 4/6/8/10/12/14 with treatment at ordinals 3 and 6", () => {
  assert.equal(assertReplacementPassBSchedule({
    horizons: GENESIS_REPLACEMENT_PASS_B_HORIZONS,
    formationModes: GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES,
    historyLength: 14,
  }), true);
  assert.throws(() => assertReplacementPassBSchedule({
    horizons: [4, 6, 8, 10, 12, 13],
    formationModes: GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES,
    historyLength: 14,
  }), /horizons drift/u);
});

test("replacement Pass-B live invocation hides experimental-arm metadata from cognition", async () => {
  const prompts = [];
  const cognitionInputs = [];
  const adapter = {
    invoke: async ({ systemPrompt, input }) => {
      prompts.push(systemPrompt);
      cognitionInputs.push(input);
      return {
        output: {
          outcome: "remembered",
          episodeRefs: ["ep_library_001"],
          rememberedContent: "I remember returning the books and choosing another one from the shelf.",
          uncertainty: ["I do not remember the title."],
        },
        provenance: { provider: "fixture" },
      };
    },
  };
  const result = await generateReplacementPassBMemory({
    adapter,
    input: lifeOnlyInput(),
    clientRequestId: "r2-pass-b-life-only",
  });
  assert.equal(result.output.outcome, "remembered");
  assert.equal(prompts.length, 1);
  assert.ok(prompts[0].includes(GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE));
  assert.match(prompts[0], /do not infer frequency, dominance, rarity, or non-occurrence/iu);
  assert.equal(cognitionInputs.length, 1);
  assert.equal(Object.hasOwn(cognitionInputs[0], "assignment"), false);
  assert.deepEqual(cognitionInputs[0].policyWitness, { policyVersion: GENESIS_PASS_B_POLICY.version });
  assert.equal(Object.hasOwn(cognitionInputs[0].policyWitness, "assignmentRef"), false);
  assert.equal(Object.hasOwn(cognitionInputs[0].policyWitness, "genomeExposurePolicyRef"), false);
});

test("replacement Pass-B treatment exposes genome content but not treatment labels", async () => {
  const cognitionInputs = [];
  const adapter = {
    invoke: async ({ input }) => {
      cognitionInputs.push(input);
      return {
        output: {
          outcome: "remembered",
          episodeRefs: ["ep_library_001"],
          rememberedContent: "I remember returning the books and choosing another from the shelf.",
          uncertainty: [],
        },
        provenance: { provider: "fixture" },
      };
    },
  };
  await generateReplacementPassBMemory({
    adapter,
    input: treatmentInput(),
    clientRequestId: "r2-pass-b-treatment-projection",
  });
  assert.equal(cognitionInputs.length, 1);
  assert.equal(Object.hasOwn(cognitionInputs[0], "assignment"), false);
  assert.ok(cognitionInputs[0].genomeExposure);
  assert.equal(cognitionInputs[0].genomeExposure.loci.length, 2);
  assert.deepEqual(cognitionInputs[0].policyWitness, { policyVersion: GENESIS_PASS_B_POLICY.version });
});

test("replacement Pass-B genome-copy retry preserves sparse-history authority on both generated versions", async () => {
  const prompts = [];
  const outputs = [
    {
      outcome: "remembered",
      episodeRefs: ["ep_library_001"],
      rememberedContent: "I remember that a practical routine quietly excludes someone nearby at the library.",
      uncertainty: [],
    },
    {
      outcome: "remembered",
      episodeRefs: ["ep_library_001"],
      rememberedContent: "I remember returning the books and choosing another from the shelf before leaving.",
      uncertainty: ["The exact title is not retained."],
    },
  ];
  const adapter = {
    invoke: async ({ systemPrompt }) => ({
      output: outputs[prompts.push(systemPrompt) - 1],
      provenance: { provider: "fixture" },
    }),
  };
  const result = await generateReplacementPassBMemory({
    adapter,
    input: treatmentInput(),
    clientRequestId: "r2-pass-b-treatment",
  });
  assert.equal(prompts.length, 2);
  assert.ok(prompts.every((prompt) => prompt.includes(GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE)));
  assert.equal(result.calls.length, 2);
  assert.equal(result.calls[1].kind, "mechanical-genome-copy-retry-1");
  assert.equal(result.output.rememberedContent, outputs[1].rememberedContent);
});
