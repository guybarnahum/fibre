import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
  normalizePassBInput,
  normalizePassBModelOutput,
} from "../src/genesis-pass-b-domain.mjs";
import {
  projectPassBInputForCognition,
} from "../src/genesis-pass-b-cognition.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  genesisMeaningPartId,
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
  normalizeReinterpretationPassCModelOutput,
} from "../src/genesis-pass-c-domain.mjs";
import {
  projectPassCInputForCognition,
} from "../src/genesis-pass-c-cognition.mjs";

const digest = (char) => `sha256:${char.repeat(64)}`;

function world() {
  return {
    worldSpecId: "world_slice_d_001",
    timeFrame: {
      startAt: "1990-01-01T00:00:00Z",
      endAt: "2026-08-18T00:00:00Z",
    },
    places: [
      {
        placeId: "place_library",
        description: "A neighborhood with a public library and ordinary school routines.",
      },
    ],
    householdShape: "Two caregivers and one younger sibling.",
    familyRelations: ["The siblings share ordinary household routines."],
    languages: ["English", "Korean"],
    materialCircumstances: "Stable housing and modest discretionary resources.",
    mobilityPattern: "Daily life is mostly walkable and transit-accessible.",
    schoolingOrCommunityContext: "Public neighborhood schools and a local library.",
    culturalContext: "Bilingual family conversation and mixed peer groups.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary family discussion are available.",
    affordedRoles: ["caregiver", "sibling", "peer", "school_teacher", "librarian"],
  };
}

function history() {
  return [
    {
      episodeId: "ep_library_001",
      occurredAt: "2004-03-08T16:15:00Z",
      ageAtEvent: 7.1,
      placeRef: "place_library",
      participantRefs: [],
      observableAction: "The child returns two library books and chooses another book from a nearby shelf.",
      introducedParticipants: [],
    },
    {
      episodeId: "ep_bus_001",
      occurredAt: "2006-10-19T15:40:00Z",
      ageAtEvent: 9.7,
      placeRef: "place_library",
      participantRefs: [],
      observableAction: "After school, the child reads a temporary transit notice and walks toward the next stop.",
      introducedParticipants: [],
    },
  ];
}

function priorMemory(overrides = {}) {
  return {
    memoryRef: "mem_prior_001",
    episodeRefs: ["ep_library_001"],
    rememberedContent: "I remember returning the books and lingering near the shelves before leaving.",
    uncertainty: ["I may be compressing more than one library visit."],
    formationMode: "life_only",
    ...overrides,
  };
}

function basePassBInput(overrides = {}) {
  return {
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: {
      provisionalThreadId: "thr_slice_d_001",
      bornAt: "1997-01-01T00:00:00Z",
    },
    world: world(),
    rememberingAt: "2008-01-01T00:00:00Z",
    ageAtRemembering: 11,
    chronologyEndsAt: "2019-12-31T23:59:59Z",
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
      assignmentRef: "assign_slice_d_001",
      genomeExposurePolicyRef: null,
    },
    ...overrides,
  };
}

function treatmentExposure() {
  return {
    policy: { kind: "ordinal_first_k", k: 2 },
    genomeRef: "genome_slice_d_001",
    genomeDigest: digest("a"),
    totalLoci: 4,
    loci: [
      { locusId: "gloc_slice_d_001", ordinal: 1, value: "She notices when a practical routine quietly excludes someone." },
      { locusId: "gloc_slice_d_002", ordinal: 2, value: "She keeps unfinished questions active longer than comfortable." },
    ],
  };
}

function treatmentPassBInput(overrides = {}) {
  return basePassBInput({
    assignment: {
      formationMode: "life_plus_genome",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_plus_genome",
    },
    genomeExposure: treatmentExposure(),
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assign_slice_d_treatment_001",
      genomeExposurePolicyRef: "gexp_policy_slice_d_001",
    },
    ...overrides,
  });
}

function initialPassCInput(overrides = {}) {
  return {
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "initial",
    targetMemory: {
      memoryRef: "mem_slice_d_001",
      episodeRefs: ["ep_library_001"],
      rememberedContent: "I remember returning the books and choosing another one while the room was nearly empty.",
      uncertainty: ["The exact title is not retained."],
    },
    formation: {
      asOf: "2009-01-01T00:00:00Z",
      ageAtFormation: 12,
      chronologyIndex: 3,
    },
    priorMeaning: null,
    trigger: null,
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
    ...overrides,
  };
}

function durableInitialMeaning() {
  return {
    outcome: "durable_meaning",
    summary: "I came to treat quiet access to books as something ordinary but personally dependable.",
    parts: [
      { meaning: "The library felt dependable without needing to become emotionally simple or idealized." },
      { meaning: "Choosing what to read remained partly private even inside a shared family routine." },
    ],
  };
}

function reinterpretationPassCInput(overrides = {}) {
  const memoryRef = "mem_slice_d_001";
  return {
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "reinterpretation",
    targetMemory: initialPassCInput().targetMemory,
    formation: {
      asOf: "2015-06-01T00:00:00Z",
      ageAtFormation: 18.4,
      chronologyIndex: 9,
    },
    priorMeaning: {
      summary: "I came to treat quiet access to books as something ordinary but personally dependable.",
      parts: [
        {
          meaningPartId: genesisMeaningPartId({ memoryRef, ordinal: 1 }),
          meaning: "The library felt dependable without needing to become emotionally simple or idealized.",
        },
        {
          meaningPartId: genesisMeaningPartId({ memoryRef, ordinal: 2 }),
          meaning: "Choosing what to read remained partly private even inside a shared family routine.",
        },
      ],
    },
    trigger: {
      episodeRef: "ep_later_library_001",
      occurredAt: "2015-05-01T00:00:00Z",
      observableAction: "The teenager returns to the same library with a younger cousin and waits while the cousin chooses a book.",
      relation: "same_person_or_relationship",
    },
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
    ...overrides,
  };
}

test("Pass B clean control is structurally genome-blind and hides treatment metadata about prior memories", () => {
  const input = basePassBInput({ priorMemories: [priorMemory()] });
  const normalized = normalizePassBInput(input);
  assert.equal(normalized.assignment.analysisStratum, "life_only_unexposed");

  const cognition = projectPassBInputForCognition(input);
  assert.equal(cognition.genomeExposure, null);
  assert.equal(Object.hasOwn(cognition, "assignment"), false);
  assert.equal(Object.hasOwn(cognition.priorMemories[0], "formationMode"), false);
  assert.deepEqual(Object.keys(cognition.priorMemories[0]).sort(), [
    "episodeRefs",
    "memoryRef",
    "rememberedContent",
    "uncertainty",
  ]);
});

test("Pass B analysis stratum is derived from prior treatment memory exposure rather than caller prose", () => {
  const exposedPrior = priorMemory({ formationMode: "life_plus_genome" });
  const good = basePassBInput({
    priorMemories: [exposedPrior],
    assignment: {
      formationMode: "life_only",
      priorTreatmentMemoryExposure: true,
      analysisStratum: "life_only_exposed",
    },
  });
  assert.equal(normalizePassBInput(good).assignment.analysisStratum, "life_only_exposed");

  assert.throws(
    () => normalizePassBInput({
      ...good,
      assignment: {
        formationMode: "life_only",
        priorTreatmentMemoryExposure: false,
        analysisStratum: "life_only_unexposed",
      },
    }),
    /does not match visible prior remembered memory history/,
  );
});

test("Pass B treatment exposes only a content-independent ordinal-prefix genome projection", () => {
  const treatment = treatmentPassBInput();
  const cognition = projectPassBInputForCognition(treatment);
  assert.equal(cognition.genomeExposure.policy.kind, "ordinal_first_k");
  assert.deepEqual(cognition.genomeExposure.loci.map((locus) => locus.ordinal), [1, 2]);

  assert.throws(
    () => normalizePassBInput({
      ...treatment,
      genomeExposure: {
        ...treatment.genomeExposure,
        loci: [
          treatment.genomeExposure.loci[0],
          { ...treatment.genomeExposure.loci[1], ordinal: 3 },
        ],
      },
    }),
    /ordinal-prefix deterministic/,
  );

  assert.throws(
    () => normalizePassBInput({
      ...treatment,
      genomeExposure: {
        ...treatment.genomeExposure,
        relevanceSelector: "choose loci matching this episode",
      },
    }),
    /not allowed/,
  );
});

test("Pass B refuses genome exposure in life_only and requires it in life_plus_genome", () => {
  assert.throws(
    () => normalizePassBInput({
      ...basePassBInput(),
      genomeExposure: treatmentExposure(),
    }),
    /life_only Pass-B cognition must not receive a genome exposure/,
  );

  const treatment = treatmentPassBInput();
  assert.throws(
    () => normalizePassBInput({ ...treatment, genomeExposure: null }),
    /requires the frozen genome exposure/,
  );
});

test("Pass B cannot see later history and remembered output can cite only visible episodes", () => {
  assert.throws(
    () => normalizePassBInput(basePassBInput({
      rememberingAt: "2005-01-01T00:00:00Z",
    })),
    /cannot see history after the remembering moment/,
  );

  assert.throws(
    () => normalizePassBModelOutput({
      outcome: "remembered",
      episodeRefs: ["ep_future_001"],
      rememberedContent: "I remember something that was not actually available in the supplied history.",
      uncertainty: [],
    }, basePassBInput()),
    /is not visible history/,
  );
});

test("Pass B produces memory content only; meaning is not an output authority", () => {
  const remembered = normalizePassBModelOutput({
    outcome: "remembered",
    episodeRefs: ["ep_library_001"],
    rememberedContent: "I remember the near-empty room and taking another book after returning the first two.",
    uncertainty: ["The exact shelf is unclear."],
  }, basePassBInput());
  assert.equal(remembered.outcome, "remembered");
  assert.equal(remembered.analysisStratum, "life_only_unexposed");
  assert.equal(Object.hasOwn(remembered, "meaning"), false);

  assert.throws(
    () => normalizePassBModelOutput({
      outcome: "remembered",
      episodeRefs: ["ep_library_001"],
      rememberedContent: remembered.rememberedContent,
      uncertainty: [],
      meaning: "This made me independent.",
    }, basePassBInput()),
    /not allowed/,
  );
});

test("not_remembered is a complete legal Pass-B outcome with no synthetic residue", () => {
  assert.deepEqual(normalizePassBModelOutput({
    outcome: "not_remembered",
    episodeRefs: [],
    rememberedContent: null,
    uncertainty: [],
  }, basePassBInput()), {
    outcome: "not_remembered",
    episodeRefs: [],
    rememberedContent: null,
    uncertainty: [],
    formationMode: "life_only",
    priorTreatmentMemoryExposure: false,
    analysisStratum: "life_only_unexposed",
  });
});

test("Pass C initial input is one-memory-scoped and structurally genome/history blind", () => {
  const cognition = projectPassCInputForCognition(initialPassCInput());
  assert.equal(cognition.mode, "initial");
  assert.equal(cognition.priorMeaning, null);
  assert.equal(cognition.trigger, null);
  assert.deepEqual(Object.keys(cognition.targetMemory).sort(), [
    "episodeRefs",
    "memoryRef",
    "rememberedContent",
    "uncertainty",
  ]);

  assert.throws(
    () => normalizePassCInput({
      ...initialPassCInput(),
      genome: { loci: ["forbidden"] },
    }),
    /not allowed/,
  );

  assert.throws(
    () => normalizePassCInput({
      ...initialPassCInput(),
      targetMemory: {
        ...initialPassCInput().targetMemory,
        underlyingEpisode: history()[0],
      },
    }),
    /not allowed/,
  );

  assert.throws(
    () => normalizePassCInput({
      ...initialPassCInput(),
      siblingMemories: [priorMemory()],
    }),
    /not allowed/,
  );
});

test("Pass C assigns meaning-part IDs itself; cognition cannot author citation identity", () => {
  const result = normalizeInitialPassCModelOutput(durableInitialMeaning(), initialPassCInput());
  assert.equal(result.outcome, "durable_meaning");
  assert.deepEqual(result.parts.map((part) => part.meaningPartId), [
    genesisMeaningPartId({ memoryRef: "mem_slice_d_001", ordinal: 1 }),
    genesisMeaningPartId({ memoryRef: "mem_slice_d_001", ordinal: 2 }),
  ]);

  assert.throws(
    () => normalizeInitialPassCModelOutput({
      ...durableInitialMeaning(),
      parts: [{
        meaningPartId: "mpart_model_chosen",
        meaning: "The model must not be able to mint its own durable citation identity.",
      }],
    }, initialPassCInput()),
    /not allowed/,
  );
});

test("no_durable_meaning is legal and does not erase the remembered content that reached Pass C", () => {
  const input = initialPassCInput();
  const result = normalizeInitialPassCModelOutput({
    outcome: "no_durable_meaning",
    summary: null,
    parts: [],
  }, input);
  assert.deepEqual(result, { outcome: "no_durable_meaning", summary: null, parts: [] });
  assert.match(input.targetMemory.rememberedContent, /near-empty room/);
});

test("Pass C rejects explicit universal future policy while leaving ordinary ambivalent meaning legal", () => {
  assert.throws(
    () => normalizeInitialPassCModelOutput({
      outcome: "durable_meaning",
      summary: "From now on I will always solve every uncertainty alone before asking anyone for help.",
      parts: [{ meaning: "I will always keep this rule regardless of later circumstance or relationship." }],
    }, initialPassCInput()),
    /forbidden universal future-policy form/,
  );

  assert.doesNotThrow(() => normalizeInitialPassCModelOutput({
    outcome: "durable_meaning",
    summary: "The room felt dependable to me, although I was never sure whether I valued the privacy or simply the routine.",
    parts: [
      { meaning: "I associated the place with dependable access rather than with an obligation to become a certain kind of person." },
      { meaning: "The privacy mattered, but I remained unsure whether it was freedom or merely familiarity." },
    ],
  }, initialPassCInput()));
});

test("Pass C reinterpretation sees one prior meaning and one typed later episode only", () => {
  const input = reinterpretationPassCInput();
  const cognition = projectPassCInputForCognition(input);
  assert.equal(cognition.mode, "reinterpretation");
  assert.equal(cognition.priorMeaning.parts.length, 2);
  assert.equal(cognition.trigger.relation, "same_person_or_relationship");
  assert.equal(Object.hasOwn(cognition, "genome"), false);
  assert.equal(Object.hasOwn(cognition, "history"), false);

  assert.throws(
    () => normalizePassCInput({
      ...input,
      trigger: { ...input.trigger, relation: "semantic_similarity" },
    }),
    /relation is invalid/,
  );

  assert.throws(
    () => normalizePassCInput({
      ...input,
      trigger: { ...input.trigger, occurredAt: "2016-01-01T00:00:00Z" },
    }),
    /after its asOf boundary/,
  );
});

test("reinterpretation keeps revised, unchanged and none distinct without mandatory rewriting", () => {
  const input = reinterpretationPassCInput();
  const revised = normalizeReinterpretationPassCModelOutput({
    outcome: "revised",
    summary: "Helping a younger relative there made the old sense of privacy feel less solitary and more shareable.",
    parts: [
      { meaning: "The place still felt dependable, but its privacy no longer implied being alone." },
      { meaning: "Choosing books could be private and still coexist with helping someone else choose for themselves." },
    ],
  }, input);
  assert.equal(revised.outcome, "revised");
  assert.equal(revised.parts.length, 2);

  assert.deepEqual(normalizeReinterpretationPassCModelOutput({
    outcome: "unchanged",
    summary: null,
    parts: [],
  }, input), { outcome: "unchanged", summary: null, parts: [] });

  assert.deepEqual(normalizeReinterpretationPassCModelOutput({
    outcome: "none",
    summary: null,
    parts: [],
  }, input), { outcome: "none", summary: null, parts: [] });
});
