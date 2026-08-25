// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-birth
// fibre-test-purpose: current-candidate-birth-hydration-equivalence

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  autobiographicalMeaningPartId,
  autobiographicalMemoryId,
} from "#services/world-kernel/src/autobiographical-memory-domain.mjs";
import { publicationValidatorSetWitness } from "#services/world-kernel/src/genesis-domain.mjs";
import { eventStructurePoolV3Digest } from "#services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import {
  genesisHistoricalEnvelopePlanDigest,
  genesisHistoricalEnvelopeStatistics,
} from "#services/world-kernel/src/genesis-historical-envelope-authority.mjs";
import { deriveGenesisLifeContinuity } from "#services/world-kernel/src/genesis-life-continuity-v1.mjs";
import { genesisLifeEpisodeEventId } from "#services/world-kernel/src/genesis-life-episode.mjs";
import { assertGenesisEpisodePlaceConsistency } from "#services/world-kernel/src/genesis-publication-place-consistency.mjs";
import { buildGenesisDevelopmentPlans } from "./genesis-life-plan.mjs";
import {
  publishHydrateAndCompareGenesisLife,
} from "./genesis-life-publication.mjs";

const sha = (char) => `sha256:${char.repeat(64)}`;

function cognition() {
  const surface = (char, temperature) => ({
    provider: "fixture",
    modelId: "fixture-model",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature, topP: 1 },
  });
  return {
    passA: surface("a", 0.3),
    passB: surface("c", 0.3),
    passC: surface("d", 0.3),
    recordRepair: surface("e", 0),
    policyVersion: "genesis-current-v1",
    eventStructurePoolDigest: eventStructurePoolV3Digest(),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  };
}

function fixtureCandidate(slotPlan) {
  const envelope = slotPlan.envelopePlan.envelopes[0];
  const participantRefs = [slotPlan.threadId];
  const introducedParticipants = [];
  if (envelope.counterpart !== null) {
    participantRefs.push(envelope.counterpart.participantId);
    if (envelope.counterpart.introducedHere === true) {
      introducedParticipants.push({
        provisionalPersonId: envelope.counterpart.participantId,
        roleRef: envelope.counterpart.roleRef,
        introducedAt: envelope.occurredAt,
      });
    }
  }
  const episode = {
    episodeId: "ep_current_birth_fixture_001",
    occurredAt: envelope.occurredAt,
    ageAtEvent: envelope.ageAtEvent,
    placeRef: envelope.placeRef,
    participantRefs,
    observableAction: "The child compares two handwritten notes and places one beside the other before copying a corrected line.",
    structureRef: envelope.structureRef,
    introducedParticipants,
  };
  const eventId = genesisLifeEpisodeEventId({
    threadId: slotPlan.threadId,
    genesisId: slotPlan.genesisId,
    episode,
  });
  const memoryRef = autobiographicalMemoryId({
    threadId: slotPlan.threadId,
    originReference: eventId,
    slot: "pass_b_call_01",
  });
  const meaningPartId = autobiographicalMeaningPartId({ memoryId: memoryRef, ordinal: 1 });
  const rememberedAt = new Date(Date.parse(episode.occurredAt) + 86_400_000).toISOString();
  const memory = {
    memoryRef,
    slot: "pass_b_call_01",
    origin: { ordinal: 1, episode, eventId },
    cited: [{ ordinal: 1, episode, eventId }],
    eventRefs: [eventId],
    callOrdinal: 1,
    horizon: 1,
    formationMode: "life_only",
    passBEpisodeRefs: [episode.episodeId],
    rememberedContent: "I remember comparing the two notes and copying the corrected line beside them.",
    uncertainty: ["I do not remember the exact words on the notes."],
    initialMeaningFormedAt: rememberedAt,
    ageAtInitialMeaning: episode.ageAtEvent,
    currentMeaning: {
      summary: "I associate checking two versions side by side with catching small mistakes before they spread.",
      parts: [{ meaningPartId, meaning: "Putting two versions beside each other makes discrepancies easier for me to notice." }],
      formedAt: rememberedAt,
      ageAtFormation: episode.ageAtEvent,
      chronologyIndex: 1,
    },
    reinterpretations: [],
  };
  const lifeContinuity = deriveGenesisLifeContinuity({
    threadId: slotPlan.threadId,
    worldSpec: slotPlan.worldSpec,
    initialRoster: slotPlan.roster.participants,
    episodes: [episode],
  });
  const core = {
    candidateVersion: "pr39-current-publication-fixture-v1",
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
    passCInitial: [{
      callOrdinal: 1,
      memoryRef,
      output: {
        outcome: "durable_meaning",
        summary: memory.currentMeaning.summary,
        parts: memory.currentMeaning.parts,
      },
    }],
    memories: [memory],
    reinterpretationSchedule: [],
    reinterpretationRuns: [],
  };
  return core;
}

test("current Genesis candidate births atomically and hydrates to the admitted life", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-current-genesis-birth-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const development = buildGenesisDevelopmentPlans();
    const base = development.slots[0];
    const envelopes = [base.envelopePlan.envelopes[0]];
    const envelopePlan = {
      ...base.envelopePlan,
      envelopes,
      statistics: genesisHistoricalEnvelopeStatistics(envelopes),
      digest: genesisHistoricalEnvelopePlanDigest({
        threadId: base.envelopePlan.threadId,
        worldSpecId: base.envelopePlan.worldSpecId,
        timeZone: base.envelopePlan.timeZone,
        seedDomain: base.envelopePlan.seedDomain,
        envelopes,
      }),
    };
    const slotPlan = { ...base, envelopePlan };
    const candidate = fixtureCandidate(slotPlan);
    const result = publishHydrateAndCompareGenesisLife({
      databasePath,
      candidate,
      slotPlan,
      cognition: cognition(),
      publicationAt: "2026-08-23T21:00:00.000Z",
    });
    assert.equal(result.hydrated.episodes.length, 1);
    assert.equal(result.hydrated.memories.length, 1);
    assert.equal(result.hydrated.memoryVisuals.length, 1);
    assert.equal(result.hydrated.genome.header.genomeId, slotPlan.genome.header.genomeId);
    assert.ok(result.hydrated.lifeRelations.length >= slotPlan.roster.participants.length - 1);
    assert.equal(result.hydrated.placeEpisodes.length, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("publication place gate refuses explicit prose location that contradicts placeRef", () => {
  assert.throws(() => assertGenesisEpisodePlaceConsistency({
    episode: {
      episodeId: "ep_place_conflict_001",
      placeRef: "place_library",
      observableAction: "At the beach, the child walks along the shore and watches the waves.",
    },
    envelope: { placeRef: "place_library", placeKind: "library_or_learning" },
  }), /incompatible with authoritative placeRef/u);

  assert.equal(assertGenesisEpisodePlaceConsistency({
    episode: {
      episodeId: "ep_place_match_001",
      placeRef: "place_library",
      observableAction: "In the library, the child returns a book and checks a notice beside the desk.",
    },
    envelope: { placeRef: "place_library", placeKind: "library_or_learning" },
  }), true);
});

test("publication place gate does not confuse referenced institutions with narrated location", () => {
  assert.equal(assertGenesisEpisodePlaceConsistency({
    episode: {
      episodeId: "ep_place_reference_001",
      placeRef: "place_library",
      observableAction: "At a shared computer table in the library, the caregiver opens a browser window on the school's website while the child watches.",
    },
    envelope: { placeRef: "place_library", placeKind: "library_or_learning" },
  }), true);

  assert.throws(() => assertGenesisEpisodePlaceConsistency({
    episode: {
      episodeId: "ep_place_campus_conflict_001",
      placeRef: "place_library",
      observableAction: "On campus, the child crosses a courtyard and enters the classroom building.",
    },
    envelope: { placeRef: "place_library", placeKind: "library_or_learning" },
  }), /incompatible with authoritative placeRef/u);
});