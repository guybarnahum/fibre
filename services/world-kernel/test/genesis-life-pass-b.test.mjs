import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
} from "../src/genesis-pass-b-domain.mjs";
import {
  GENESIS_LIFE_PASS_B_FORMATION_MODES,
  GENESIS_LIFE_PASS_B_HORIZONS,
  GENESIS_LIFE_SPARSE_HISTORY_NOTICE,
  assertGenesisLifePassBSchedule,
  generateGenesisPassBMemory,
} from "../src/genesis-life-pass-b.mjs";

const digest = (char) => `sha256:${char.repeat(64)}`;

function world() {
  return {
    worldSpecId: "world_life_pass_b_001",
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
      participantRefs: ["thr_life_pass_b_001"],
      observableAction: "The child returns two books and chooses another from a nearby shelf.",
      introducedParticipants: [],
    },
    {
      episodeId: "ep_library_002",
      occurredAt: "2011-10-19T15:40:00Z",
      ageAtEvent: 7.7,
      placeRef: "place_library",
      participantRefs: ["thr_life_pass_b_001"],
      observableAction: "The child reads a posted notice before deciding which shelf to visit.",
      introducedParticipants: [],
    },
  ];
}

function lifeOnlyInput() {
  return {
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: { provisionalThreadId: "thr_life_pass_b_001", bornAt: "2004-08-20T00:00:00Z" },
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
      assignmentRef: "assign_life_pass_b_001",
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
      genomeRef: "genome_life_pass_b_001",
      genomeDigest: digest("a"),
      totalLoci: 4,
      loci: [
        { locusId: "locus_life_001", ordinal: 1, value: "practical routine quietly excludes someone nearby" },
        { locusId: "locus_life_002", ordinal: 2, value: "unfinished questions remain active longer" },
      ],
    },
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assign_life_pass_b_treatment_001",
      genomeExposurePolicyRef: "gexp_life_pass_b_001",
    },
  };
}

test("Genesis Pass B schedule is 4/6/8/10/12/14 with treatment at ordinals 3 and 6", () => {
  assert.equal(assertGenesisLifePassBSchedule({
    horizons: GENESIS_LIFE_PASS_B_HORIZONS,
    formationModes: GENESIS_LIFE_PASS_B_FORMATION_MODES,
    historyLength: 14,
  }), true);
  assert.throws(() => assertGenesisLifePassBSchedule({
    horizons: [4, 6, 8, 10, 12, 13],
    formationModes: GENESIS_LIFE_PASS_B_FORMATION_MODES,
    historyLength: 14,
  }), /horizons drift/u);
});

test("Genesis Pass B hides experimental-arm metadata from cognition", async () => {
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
  const result = await generateGenesisPassBMemory({
    adapter,
    input: lifeOnlyInput(),
    clientRequestId: "life-pass-b-life-only",
  });
  assert.equal(result.output.outcome, "remembered");
  assert.equal(prompts.length, 1);
  assert.ok(prompts[0].includes(GENESIS_LIFE_SPARSE_HISTORY_NOTICE));
  assert.match(prompts[0], /do not infer frequency, dominance, rarity, or non-occurrence/iu);
  assert.equal(cognitionInputs.length, 1);
  assert.equal(Object.hasOwn(cognitionInputs[0], "assignment"), false);
  assert.deepEqual(cognitionInputs[0].policyWitness, { policyVersion: GENESIS_PASS_B_POLICY.version });
  assert.equal(Object.hasOwn(cognitionInputs[0].policyWitness, "assignmentRef"), false);
  assert.equal(Object.hasOwn(cognitionInputs[0].policyWitness, "genomeExposurePolicyRef"), false);
});

test("Genesis Pass B treatment exposes genome content but not treatment labels", async () => {
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
  await generateGenesisPassBMemory({
    adapter,
    input: treatmentInput(),
    clientRequestId: "life-pass-b-treatment-projection",
  });
  assert.equal(cognitionInputs.length, 1);
  assert.equal(Object.hasOwn(cognitionInputs[0], "assignment"), false);
  assert.ok(cognitionInputs[0].genomeExposure);
  assert.equal(cognitionInputs[0].genomeExposure.loci.length, 2);
  assert.deepEqual(cognitionInputs[0].policyWitness, { policyVersion: GENESIS_PASS_B_POLICY.version });
});

test("Genesis Pass B genome-copy retry preserves sparse-history authority on both generated versions", async () => {
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
  const result = await generateGenesisPassBMemory({
    adapter,
    input: treatmentInput(),
    clientRequestId: "life-pass-b-treatment",
  });
  assert.equal(prompts.length, 2);
  assert.ok(prompts.every((prompt) => prompt.includes(GENESIS_LIFE_SPARSE_HISTORY_NOTICE)));
  assert.equal(result.calls.length, 2);
  assert.equal(result.calls[1].kind, "mechanical-genome-copy-retry-1");
  assert.equal(result.output.rememberedContent, outputs[1].rememberedContent);
});

test("Genesis Pass B returns a legal not_remembered decision without retry", async () => {
  let invocations = 0;
  const adapter = {
    invoke: async () => {
      invocations += 1;
      return {
        output: {
          outcome: "not_remembered",
          episodeRefs: [],
          rememberedContent: null,
          uncertainty: [],
        },
        provenance: { provider: "fixture" },
      };
    },
  };
  const result = await generateGenesisPassBMemory({
    adapter,
    input: lifeOnlyInput(),
    clientRequestId: "life-pass-b-not-remembered",
  });
  assert.equal(invocations, 1);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].kind, "initial");
  assert.deepEqual(result.output, {
    outcome: "not_remembered",
    episodeRefs: [],
    rememberedContent: null,
    uncertainty: [],
    formationMode: "life_only",
    priorTreatmentMemoryExposure: false,
    analysisStratum: "life_only_unexposed",
  });
});
