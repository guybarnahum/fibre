// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-birth
// fibre-test-purpose: prior-life-birth-requires-situated-continuity

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { deriveGenesisLifeContinuity } from "#services/world-kernel/src/genesis-life-continuity-v1.mjs";
import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-historical-realization-v1.mjs";
import { GENESIS_PASS_B_RESPONSE_SCHEMA } from "#services/world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA } from "#services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { buildGenesisDevelopmentPlans } from "./genesis-life-plan.mjs";
import { buildGenesisBirthBundle, buildGenesisPublicationCognition } from "./genesis-life-publication.mjs";

function cognition() {
  const adapter = Object.freeze({
    provider: "fixture",
    modelId: "fixture-model",
    configuration: Object.freeze({ temperature: 0.3, topP: 1, reasoningEffort: "none" }),
  });
  const repairAdapter = Object.freeze({
    ...adapter,
    configuration: Object.freeze({ temperature: 0, topP: 1, reasoningEffort: "none" }),
  });
  return buildGenesisPublicationCognition({
    creativeAdapter: adapter,
    repairAdapter,
    passAPromptMaterial: { initial: "fixture-pass-a", recordRetry: "fixture-pass-a-retry" },
    passASchemaMaterial: GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
    passBPromptMaterial: { initial: "fixture-pass-b", genomeCopyRetry: "fixture-pass-b-retry" },
    passBSchemaMaterial: GENESIS_PASS_B_RESPONSE_SCHEMA,
    passCPromptMaterial: { initial: "fixture-pass-c", reinterpretation: "fixture-pass-c-reinterpret" },
    passCSchemaMaterial: {
      initial: GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
      reinterpretation: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
    },
    repairPromptMaterial: "fixture-repair",
    repairSchemaMaterial: GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  });
}

test("GenesisStore refuses prior-life episodes without roster and life continuity", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-b8-"));
  const databasePath = join(directory, "world.sqlite");
  const plans = buildGenesisDevelopmentPlans();
  const slotPlan = plans.slots[0];
  const envelope = slotPlan.envelopePlan.envelopes[0];
  const episode = {
    episodeId: "ep_b8_prior_life_001",
    occurredAt: envelope.occurredAt,
    ageAtEvent: envelope.ageAtEvent,
    placeRef: envelope.placeRef,
    participantRefs: [slotPlan.threadId],
    observableAction: "The child compares two notes at the table and copies one corrected line.",
    structureRef: envelope.structureRef,
    introducedParticipants: [],
  };
  const lifeContinuity = deriveGenesisLifeContinuity({
    threadId: slotPlan.threadId,
    worldSpec: slotPlan.worldSpec,
    initialRoster: slotPlan.roster.participants,
    episodes: [episode],
  });
  const candidate = {
    candidateVersion: "pr39-b8-fixture-v1",
    attemptStartedAt: "2026-08-23T20:00:00.000Z",
    slot: slotPlan.slot,
    threadId: slotPlan.threadId,
    genesisId: slotPlan.genesisId,
    originMode: slotPlan.originMode,
    worldSpecId: slotPlan.worldSpec.worldSpecId,
    worldSpecDigest: slotPlan.worldSpecDigest,
    genomeId: slotPlan.genome.header.genomeId,
    genomeDigest: slotPlan.genomeDigest,
    envelopePlanDigest: slotPlan.envelopePlan.digest,
    passA: [{ ordinal: 1, episode }],
    episodes: [episode],
    lifeContinuity,
    passB: [],
    passCInitial: [],
    memories: [],
    reinterpretationSchedule: [],
    reinterpretationRuns: [],
  };
  const shortenedPlan = {
    ...slotPlan,
    envelopePlan: { ...slotPlan.envelopePlan, envelopes: [envelope] },
  };
  let store;
  try {
    store = new GenesisStore(databasePath);
    store.recordWorldSpec(slotPlan.worldSpec);
    // The current compiler normally makes omission unreachable. Deliberately
    // remove both inputs here to exercise GenesisStore's authority boundary.
    const birth = buildGenesisBirthBundle({
      candidate,
      slotPlan: shortenedPlan,
      cognition: cognition(),
      publicationAt: "2026-08-23T21:00:00.000Z",
    });
    assert.throws(() => store.publishBirth({
      manifest: birth.manifest,
      thread: birth.thread,
      episodes: birth.episodes,
      memories: birth.memories,
      lifeRelations: birth.lifeRelations,
      initialRoster: null,
      lifeContinuity: null,
    }), /prior-life birth requires initialRoster and lifeContinuity/u);
  } finally {
    store?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
