import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
} from "fibre/world-kernel/genesis-authority-contracts";
import {
  GENESIS_PASS_B_GENOME_COPY_GATE,
  GenesisPassBAdmissionError,
  assertPassBGenomeCopyBoundary,
  findVerbatimGenomeNgram,
} from "../src/genesis-memory-admission.mjs";
import {
  GENESIS_LIFE_PASS_B_FORMATION_MODES,
  GENESIS_LIFE_PASS_B_HORIZONS,
  GENESIS_LIFE_PASS_B_PROMPT_ID,
  GENESIS_LIFE_PASS_B_PROMPT_RESOLUTION,
  GENESIS_LIFE_SPARSE_HISTORY_NOTICE,
  assertGenesisLifePassBSchedule,
  generateGenesisPassBMemory,
} from "../src/genesis-memory-generation.mjs";

const digest = (char) => `sha256:${char.repeat(64)}`;

function world() {
  return {
    worldSpecId: "world_birth_memory_001",
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
      participantRefs: ["thr_birth_memory_001"],
      observableAction: "The child returns two books and chooses another from a nearby shelf.",
      introducedParticipants: [],
    },
    {
      episodeId: "ep_library_002",
      occurredAt: "2011-10-19T15:40:00Z",
      ageAtEvent: 7.7,
      placeRef: "place_library",
      participantRefs: ["thr_birth_memory_001"],
      observableAction: "The child reads a posted notice before deciding which shelf to visit.",
      introducedParticipants: [],
    },
  ];
}

function lifeOnlyInput() {
  return {
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: { provisionalThreadId: "thr_birth_memory_001", bornAt: "2004-08-20T00:00:00Z" },
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
      assignmentRef: "assign_birth_memory_001",
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
      genomeRef: "genome_birth_memory_001",
      genomeDigest: digest("a"),
      totalLoci: 4,
      loci: [
        { locusId: "locus_birth_001", ordinal: 1, value: "practical routine quietly excludes someone nearby" },
        { locusId: "locus_birth_002", ordinal: 2, value: "unfinished questions remain active longer" },
      ],
    },
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assign_birth_memory_treatment_001",
      genomeExposurePolicyRef: "gexp_birth_memory_001",
    },
  };
}

test("Birth memory formation keeps the promoted schedule and exact validated prompt asset", () => {
  assert.equal(assertGenesisLifePassBSchedule({
    horizons: GENESIS_LIFE_PASS_B_HORIZONS,
    formationModes: GENESIS_LIFE_PASS_B_FORMATION_MODES,
    historyLength: 14,
  }), true);
  assert.equal(GENESIS_LIFE_PASS_B_PROMPT_ID, "genesis.memory-formation");
  assert.equal(GENESIS_LIFE_PASS_B_PROMPT_RESOLUTION.profile, null);
  assert.equal(
    GENESIS_LIFE_PASS_B_PROMPT_RESOLUTION.digest,
    "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a",
  );
});

test("Birth memory cognition hides experimental-arm metadata", async () => {
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
    clientRequestId: "birth-memory-life-only",
  });
  assert.equal(result.output.outcome, "remembered");
  assert.ok(prompts[0].includes(GENESIS_LIFE_SPARSE_HISTORY_NOTICE));
  assert.equal(Object.hasOwn(cognitionInputs[0], "assignment"), false);
  assert.deepEqual(cognitionInputs[0].policyWitness, { policyVersion: GENESIS_PASS_B_POLICY.version });
});

test("Birth memory admission rejects verbatim genome text and retries once without echoing rejected content", async () => {
  const input = treatmentInput();
  const leaking = {
    outcome: "remembered",
    episodeRefs: ["ep_library_001"],
    rememberedContent: "I remember that a practical routine quietly excludes someone nearby at the library.",
    uncertainty: [],
  };
  const safe = {
    outcome: "remembered",
    episodeRefs: ["ep_library_001"],
    rememberedContent: "I remember returning the books and choosing another from the shelf before leaving.",
    uncertainty: ["The exact title is not retained."],
  };

  const match = findVerbatimGenomeNgram({ rememberedContent: leaking.rememberedContent, loci: input.genomeExposure.loci });
  assert.equal(match?.locusId, "locus_birth_001");
  assert.equal(match?.normalizedNgram, "practical routine quietly excludes");
  assert.throws(
    () => assertPassBGenomeCopyBoundary(leaking, input),
    (error) => error instanceof GenesisPassBAdmissionError && error.gate === GENESIS_PASS_B_GENOME_COPY_GATE,
  );

  const outputs = [leaking, safe];
  const requests = [];
  const adapter = {
    async invoke(request) {
      requests.push(structuredClone(request));
      return { output: outputs.shift(), provenance: { provider: "fixture" } };
    },
  };
  const result = await generateGenesisPassBMemory({
    adapter,
    input,
    clientRequestId: "birth-memory-genome-copy",
  });
  assert.equal(result.calls.length, 2);
  assert.match(requests[1].clientRequestId, /mechanical-genome-copy-retry-1$/u);
  assert.equal(JSON.stringify(requests[1]).includes(leaking.rememberedContent), false);
  assert.equal(result.output.rememberedContent, safe.rememberedContent);
  assert.equal(result.output.formationMode, "life_plus_genome");
});
