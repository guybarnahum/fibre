import assert from "node:assert/strict";
import test from "node:test";

import { projectPassBInputForCognition } from "../services/world-kernel/src/genesis-pass-b-cognition.mjs";
import { buildE2A0Plan } from "./genesis-rich-life-e2-a0.mjs";
import {
  E2_N1_HORIZONS,
  buildN1PassBInput,
  buildN1TrialPlan,
  exactBinomialTailHalf,
  neutralizeN1Life,
} from "./genesis-rich-life-e2-n1.mjs";
import {
  E2_N1_BOUNDED_EVIDENCE_VERSION,
  E2_N1_BOUNDED_PASS_B_PROMPT,
  E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA,
  E2_N1_PASS_B_FORM_PROFILE,
  E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
} from "./genesis-rich-life-e2-n1-bounded-driver.mjs";
import {
  E2_N1_NOT_REMEMBERED_RESIDUE_FAILURE,
  E2_N1_NOT_REMEMBERED_RESIDUE_POLICY,
  canonicalizeN1NotRememberedResidue,
  isCanonicalizableN1NotRememberedResidue,
} from "./genesis-rich-life-e2-n1-residue-driver.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

function fixtureLife(worldFixture, runOrdinal = 1) {
  const seed = `fixture_n1_seed_${runOrdinal}`;
  const subjectId = `${worldFixture.subject.provisionalThreadId}_a2b_fixture_${runOrdinal}`;
  const plan = buildE2A0Plan(worldFixture, "slice-e2-a0-seed-01");
  const initialRoster = worldFixture.initialRoster.map((participant) => ({
    ...structuredClone(participant),
    participantId: participant.participantId === worldFixture.subject.provisionalThreadId ? subjectId : participant.participantId,
  }));
  const episodes = plan.map(({ developmentalWindow }, index) => {
    const occurredAt = new Date(Date.parse(developmentalWindow.startAt) + (24 * 60 * 60 * 1000)).toISOString();
    const place = worldFixture.worldSpec.places[index % worldFixture.worldSpec.places.length];
    const caregiver = initialRoster[1].participantId;
    const introducedPeerId = `person_${worldFixture.id.toLowerCase()}_fixture_peer`;
    const introduced = index === 3
      ? [{ provisionalPersonId: introducedPeerId, roleRef: "peer", introducedAt: occurredAt }]
      : [];
    const participantRefs = index >= 3
      ? [subjectId, caregiver, introducedPeerId]
      : [subjectId, caregiver];
    return {
      episodeId: `episode_${worldFixture.id.toLowerCase()}_fixture_${runOrdinal}_${index + 1}`,
      occurredAt,
      ageAtEvent: developmentalWindow.minAge + 0.1,
      placeRef: place.placeId,
      participantRefs,
      observableAction: `${subjectId} walks with ${caregiver} at ${place.placeId}${index >= 3 ? ` while ${introducedPeerId} joins them` : ""}.`,
      structureRef: "ges_v2_small_help_request",
      introducedParticipants: introduced,
      intellectualEncounter: index === 4 ? {
        kind: "book",
        subjectKind: "text",
        subjectLabel: "fixture book",
        participantRef: null,
        accessMode: "self_directed",
      } : null,
    };
  });
  return {
    worldId: worldFixture.id,
    worldSpecId: worldFixture.worldSpec.worldSpecId,
    seed,
    runOrdinal,
    subject: { provisionalThreadId: subjectId, bornAt: worldFixture.subject.bornAt },
    initialRoster,
    developmentalSpan: structuredClone(worldFixture.span),
    offeredWindows: plan.map(({ developmentalWindow }) => ({ developmentalWindow: structuredClone(developmentalWindow) })),
    episodes,
  };
}

test("N1 freezes 18 distinct source-life/horizon trials with balanced truth and candidate ordering", () => {
  const plan = buildN1TrialPlan();
  assert.equal(plan.length, 18);
  assert.deepEqual([...new Set(plan.map((trial) => trial.horizon))].sort((a, b) => a - b), [...E2_N1_HORIZONS]);

  const sourceCounts = new Map();
  const sourceHorizonCounts = new Map();
  const truth = { A: 0, B: 0 };
  const candidateA = { left: 0, right: 0 };
  for (const trial of plan) {
    const sourceRunOrdinal = trial.sourceSide === "left" ? trial.leftRunOrdinal : trial.rightRunOrdinal;
    const key = `${trial.worldId}:${sourceRunOrdinal}`;
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    const horizonKey = `${key}:${trial.horizon}`;
    sourceHorizonCounts.set(horizonKey, (sourceHorizonCounts.get(horizonKey) ?? 0) + 1);
    truth[trial.truthCandidate] += 1;
    candidateA[trial.candidateASide] += 1;
  }
  assert.equal(sourceCounts.size, 6);
  assert.deepEqual([...sourceCounts.values()], [3, 3, 3, 3, 3, 3]);
  assert.equal(sourceHorizonCounts.size, 18);
  assert.ok([...sourceHorizonCounts.values()].every((count) => count === 1));
  assert.deepEqual(truth, { A: 9, B: 9 });
  assert.deepEqual(candidateA, { left: 9, right: 9 });
});

test("N1 neutralization removes source identifiers and rich-only scaffolding from clean Pass-B cognition", () => {
  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const life = fixtureLife(worldFixture);
  const neutralized = neutralizeN1Life({ worldFixture, life, horizon: 6 });
  assert.equal(neutralized.history.length, 6);
  assert.equal(neutralized.history[0].episodeId, "n1_ep_01");
  assert.equal(neutralized.subject.provisionalThreadId, "thr_n1_subject");

  const serialized = JSON.stringify(neutralized);
  assert.equal(serialized.includes(life.seed), false);
  assert.equal(serialized.includes(life.subject.provisionalThreadId), false);
  assert.equal(serialized.includes(worldFixture.worldSpec.places[0].placeId), false);
  assert.equal(serialized.includes("ges_v2_"), false);
  assert.equal(serialized.includes("structureRef"), false);
  assert.equal(serialized.includes("intellectualEncounter"), false);
  assert.equal(serialized.includes("_a2b_fixture_"), false);

  const passBInput = buildN1PassBInput(neutralized);
  const cognition = projectPassBInputForCognition(passBInput);
  assert.equal(cognition.genomeExposure, null);
  assert.equal("assignment" in cognition, false);
  assert.equal("genome" in cognition, false);
  assert.equal(cognition.history.length, 6);
  assert.deepEqual(Object.keys(cognition.history[0]).sort(), [
    "ageAtEvent",
    "episodeId",
    "introducedParticipants",
    "observableAction",
    "occurredAt",
    "participantRefs",
    "placeRef",
  ]);
});

test("N1 exact-binomial development threshold is frozen at 13 of 18", () => {
  assert.equal(exactBinomialTailHalf(18, 12), 0.1189422607421875);
  assert.equal(exactBinomialTailHalf(18, 13), 0.048126220703125);
  assert.equal(exactBinomialTailHalf(18, 14), 0.01544189453125);

  // The v2 execution amendment changes form only, before the first scored N1-v2 trial.
  assert.equal(E2_N1_BOUNDED_EVIDENCE_VERSION, "pr39-slice-e2-n1-v2");
  assert.equal(E2_N1_PASS_B_FORM_PROFILE, "n1-pass-b-bounded-output-v1");
  assert.equal(E2_N1_PASS_B_MAX_MODEL_CHARACTERS, 600);
  assert.equal(E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA.properties.rememberedContent.maxLength, 600);
  assert.match(E2_N1_BOUNDED_PASS_B_PROMPT, /at most 600 characters total/);

  // After trial 1 was scored, a separate mechanical amendment may only erase
  // forbidden residue from an otherwise-valid not_remembered decision.
  assert.equal(E2_N1_NOT_REMEMBERED_RESIDUE_POLICY, "n1-not-remembered-residue-canonicalization-v1");
  const failed = {
    evidenceVersion: E2_N1_BOUNDED_EVIDENCE_VERSION,
    status: "failed",
    failure: { message: E2_N1_NOT_REMEMBERED_RESIDUE_FAILURE },
    inFlight: {
      trialOrdinal: 2,
      passBRaw: {
        output: {
          outcome: "not_remembered",
          episodeRefs: [],
          rememberedContent: null,
          uncertainty: ["explanatory residue"],
        },
      },
    },
    modelEvents: [],
  };
  assert.equal(isCanonicalizableN1NotRememberedResidue(failed), true);
  const canonicalized = canonicalizeN1NotRememberedResidue(failed);
  assert.deepEqual(canonicalized.inFlight.passBRaw.output, {
    outcome: "not_remembered",
    episodeRefs: [],
    rememberedContent: null,
    uncertainty: [],
  });
  assert.equal(canonicalized.modelEvents.at(-1).modelCallUsed, false);
  assert.equal(canonicalized.modelEvents.at(-1).semanticDecisionChanged, false);

  const wrongRefs = structuredClone(failed);
  wrongRefs.inFlight.passBRaw.output.episodeRefs = ["n1_ep_01"];
  assert.equal(isCanonicalizableN1NotRememberedResidue(wrongRefs), false);
});
