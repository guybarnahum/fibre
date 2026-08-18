import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
  normalizePassBInput,
  normalizePassBModelOutput,
} from "../src/genesis-pass-b-domain.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  genesisMeaningPartId,
  normalizePassCInput,
  normalizeReinterpretationPassCModelOutput,
} from "../src/genesis-pass-c-domain.mjs";

function passBWorld() {
  return {
    worldSpecId: "world_d_policy_read_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-18T00:00:00Z" },
    places: [{ placeId: "place_d_policy_read", description: "A neighborhood with ordinary school and library routines." }],
    householdShape: "A small household.",
    familyRelations: [],
    languages: ["English"],
    materialCircumstances: "Stable housing.",
    mobilityPattern: "Walkable daily routines.",
    schoolingOrCommunityContext: "A public school and library are available.",
    culturalContext: "Ordinary neighborhood life.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books are available.",
    affordedRoles: ["caregiver", "peer", "school_teacher", "librarian"],
  };
}

function passBInputWithPrior(priorMemory) {
  return {
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: { provisionalThreadId: "thr_d_policy_read", bornAt: "1997-01-01T00:00:00Z" },
    world: passBWorld(),
    rememberingAt: "2008-01-01T00:00:00Z",
    ageAtRemembering: 11,
    chronologyEndsAt: "2019-12-31T23:59:59Z",
    history: [{
      episodeId: "ep_d_policy_read",
      occurredAt: "2004-01-01T00:00:00Z",
      ageAtEvent: 7,
      placeRef: "place_d_policy_read",
      participantRefs: [],
      observableAction: "The child returns a book and chooses another from a shelf.",
      introducedParticipants: [],
    }],
    priorMemories: [priorMemory],
    assignment: {
      formationMode: "life_only",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_only_unexposed",
    },
    genomeExposure: null,
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assign_d_policy_read",
      genomeExposurePolicyRef: null,
    },
  };
}

test("Pass B applies current content policy to new output, not to prior admitted memories it reads", () => {
  const prior = {
    memoryRef: "mem_d_policy_read_prior",
    episodeRefs: ["ep_d_policy_read"],
    rememberedContent: "x".repeat(GENESIS_PASS_B_POLICY.maxRememberedContentBytes + 500),
    uncertainty: Array.from({ length: GENESIS_PASS_B_POLICY.maxUncertaintyItems + 3 }, (_, index) => `historical uncertainty ${index}`),
    formationMode: "life_only",
  };
  const input = passBInputWithPrior(prior);
  assert.doesNotThrow(() => normalizePassBInput(input));

  assert.throws(
    () => normalizePassBModelOutput({
      outcome: "remembered",
      episodeRefs: ["ep_d_policy_read"],
      rememberedContent: prior.rememberedContent,
      uncertainty: [],
    }, input),
    /rememberedContent exceeds/,
  );
});

function reinterpretationInputWithPriorMeaning(summary) {
  const memoryRef = "mem_d_policy_read_meaning";
  return {
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "reinterpretation",
    targetMemory: {
      memoryRef,
      episodeRefs: ["ep_d_policy_read"],
      rememberedContent: "I remember returning a book and choosing another while the library was quiet.",
      uncertainty: [],
    },
    formation: { asOf: "2015-01-02T00:00:00Z", ageAtFormation: 18, chronologyIndex: 8 },
    priorMeaning: {
      summary,
      parts: [{
        meaningPartId: genesisMeaningPartId({ memoryRef, ordinal: 1 }),
        meaning: "I will always preserve this historically admitted wording even if a later policy would reject it.",
      }],
    },
    trigger: {
      episodeRef: "ep_d_policy_read_later",
      occurredAt: "2015-01-01T00:00:00Z",
      observableAction: "Years later, the young adult waits while a younger relative chooses a book from the same shelves.",
      relation: "same_person_or_relationship",
    },
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  };
}

test("Pass C may reconsider prior admitted meaning without re-applying today's meaning-form gate", () => {
  const historicalSummary = "From now on I will always treat this as an admitted historical meaning even if future policy forbids that form.";
  const input = reinterpretationInputWithPriorMeaning(historicalSummary);
  assert.doesNotThrow(() => normalizePassCInput(input));

  assert.throws(
    () => normalizeReinterpretationPassCModelOutput({
      outcome: "revised",
      summary: historicalSummary,
      parts: [{ meaning: "I will always repeat the same universal policy in newly authored meaning." }],
    }, input),
    /forbidden universal future-policy form/,
  );
});
