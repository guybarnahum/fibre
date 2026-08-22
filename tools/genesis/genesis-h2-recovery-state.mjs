import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  sampleEventStructuresV2,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { passACognitionInputDigest } from "../../services/world-kernel/src/genesis-pass-a-cognition.mjs";
import { projectRichLifePassAInputForCognition } from "../../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import {
  HISTORICAL_PASS_A_CONTINUATION_VERSION,
  inspectHistoricalPassAContinuation,
} from "../../services/birth-center/src/historical-pass-a-continuation.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const H2_FAILURE_PATH = "artifacts/validation/m2-pr39/h/cohort-v2/h-final-cohort-failure-v2.json";
const G2_PATH = "artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json";
const G4_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json";

function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
}

function fail(message) {
  throw new Error(message);
}

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function modelResponse(failure, clientRequestId) {
  const matches = failure.modelEvents.filter((event) =>
    event?.type === "model_response" && event.clientRequestId === clientRequestId);
  if (matches.length !== 1) fail(`expected exactly one frozen model response ${clientRequestId}`);
  return matches[0];
}

function uniqueIntroductions(episodes) {
  const byId = new Map();
  for (const episode of episodes) {
    for (const participant of episode.introducedParticipants ?? []) {
      if (!byId.has(participant.provisionalPersonId)) byId.set(participant.provisionalPersonId, participant);
    }
  }
  return [...byId.values()].map((item) => structuredClone(item));
}

function buildInput({ g2, g4, slot, priorEpisodes, ordinal }) {
  const binding = g2.worldBindings.find((item) => item.slot === slot);
  const roster = g4.initialRosters.find((item) => item.slot === slot);
  const window = g4.historicalPlan.windows.find((item) => item.ordinal === ordinal);
  if (!binding || !roster || !window) fail(`cannot resolve frozen Pass-A input for slot ${slot} episode ${ordinal}`);
  if (binding.originMode !== "de_novo") fail("H-v2 slot 4 recovery state expects de_novo origin");
  const worldSpec = readJson(binding.worldSpecPath);
  const subject = {
    provisionalThreadId: binding.threadId,
    bornAt: g4.historicalPlan.entry.bornAt,
  };
  const seed = `${g4.eventStructurePool.seedDomain}:slot:${String(slot).padStart(2, "0")}:structures:${window.windowId}`;
  const offeredEntries = sampleEventStructuresV2(
    GENESIS_EVENT_STRUCTURE_POOL_V2,
    window,
    { seed, count: g4.eventStructurePool.structuresPerWindow },
  );
  return buildRichLifePassAInput({
    originMode: binding.originMode,
    syntheticLineageWitness: null,
    worldSpec,
    subject,
    developmentalWindow: {
      windowId: window.windowId,
      startAt: window.startAt,
      endAt: window.endAt,
      minAge: window.minAge,
      maxAge: window.maxAge,
    },
    chronologyEndsAt: window.endAt,
    initialRoster: roster.participants,
    priorEpisodes,
    previouslyIntroducedParticipants: uniqueIntroductions(priorEpisodes),
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries,
  });
}

function cognitionDigest(input) {
  return passACognitionInputDigest(projectRichLifePassAInputForCognition(input));
}

function initialEpisode(response) {
  const episode = response.modelOutput?.episode;
  if (episode === null || typeof episode !== "object" || Array.isArray(episode)) {
    fail(`frozen response ${response.clientRequestId} lacks episode output`);
  }
  return structuredClone(episode);
}

function repairedEpisode(initial, response) {
  const observableAction = response.modelOutput?.observableAction;
  if (typeof observableAction !== "string" || observableAction.trim() === "") {
    fail(`frozen response ${response.clientRequestId} lacks repair observableAction`);
  }
  return { ...structuredClone(initial), observableAction };
}

function historicalCall(response, kind, ordinal = null) {
  return Object.freeze({
    kind,
    ...(ordinal === null ? {} : { ordinal }),
    clientRequestId: response.clientRequestId,
    provider: response.provider,
    modelId: response.modelId,
    providerRequestId: response.providerRequestId,
    inputDigest: response.inputDigest,
    promptHash: response.promptHash,
    responseSchemaHash: response.responseSchemaHash,
    modelOutput: structuredClone(response.modelOutput),
    usage: structuredClone(response.usage),
  });
}

function historicalState({ inputDigest, candidate, historicalCalls, generatedVersions, formRepairs, recordRetries }) {
  return Object.freeze({
    stateVersion: HISTORICAL_PASS_A_CONTINUATION_VERSION,
    sourcePolicyVersion: "genesis-rich-pass-a-shared-version-budget-v1",
    inputDigest,
    generatedVersions,
    formRepairs,
    recordRetries,
    candidate: structuredClone(candidate),
    historicalCalls: Object.freeze(historicalCalls.map((item) => Object.freeze(structuredClone(item)))),
  });
}

function historicalRepairWitness({
  kind,
  episodeOrdinal,
  recordedAt,
  operationOrdinal,
  failedGate,
  rejectedCandidate,
  response,
}) {
  const rejectedContentDigest = digest(rejectedCandidate);
  return Object.freeze({
    kind,
    episodeOrdinal,
    recordedAt,
    ...(kind === "pass_a_form_repair"
      ? { repairOrdinal: operationOrdinal }
      : { recordRetryOrdinal: operationOrdinal }),
    failedGate,
    rejectedContentDigest,
    rejectedContent: structuredClone(rejectedCandidate),
    inputDigest: response.inputDigest,
    outputDigest: rejectedContentDigest,
    historicalSource: H2_FAILURE_PATH,
  });
}

function requireTransition({ input, state, nextKind, nextOrdinal, label }) {
  const inspection = inspectHistoricalPassAContinuation({ input, state });
  if (inspection.nextKind !== nextKind || inspection.nextOrdinal !== nextOrdinal) {
    fail(`${label} recovery transition drift: expected ${nextKind} ${nextOrdinal}, got ${inspection.nextKind} ${inspection.nextOrdinal}`);
  }
  return inspection;
}

export function buildH2Slot4Episode3RecoveryState() {
  const failure = readJson(H2_FAILURE_PATH);
  const g2 = readJson(G2_PATH);
  const g4 = readJson(G4_PATH);
  const slot = 4;
  const base = "pr39-h:slot-04:pass-a";
  const historicalRecordedAt = failure.attemptStartedAt ?? failure.failedAt;
  if (typeof historicalRecordedAt !== "string" || historicalRecordedAt.trim() === "") {
    fail("H-v2 failure lacks historical attempt time");
  }

  const ep1Initial = modelResponse(failure, `${base}:episode-01:initial`);
  const input1 = buildInput({ g2, g4, slot, priorEpisodes: [], ordinal: 1 });
  const input1Digest = cognitionDigest(input1);
  if (input1Digest !== ep1Initial.inputDigest) fail("slot 4 episode 1 cognition input digest drift");
  const episode1 = initialEpisode(ep1Initial);
  const ep1Call = historicalCall(ep1Initial, "initial");
  const ep1State = historicalState({
    inputDigest: input1Digest,
    candidate: episode1,
    historicalCalls: [ep1Call],
    generatedVersions: 1,
    formRepairs: 0,
    recordRetries: 0,
  });
  const ep1Inspection = inspectHistoricalPassAContinuation({ input: input1, state: ep1State });
  if (ep1Inspection.nextKind !== "already_admitted") fail("slot 4 episode 1 historical admission drift");

  const ep2Initial = modelResponse(failure, `${base}:episode-02:initial`);
  const ep2Repair1 = modelResponse(failure, `${base}:episode-02:repair:1`);
  const input2 = buildInput({ g2, g4, slot, priorEpisodes: [episode1], ordinal: 2 });
  const input2Digest = cognitionDigest(input2);
  if (input2Digest !== ep2Initial.inputDigest) fail("slot 4 episode 2 cognition input digest drift");
  const ep2InitialCandidate = initialEpisode(ep2Initial);
  const ep2InitialCall = historicalCall(ep2Initial, "initial");
  const ep2BeforeRepair = historicalState({
    inputDigest: input2Digest,
    candidate: ep2InitialCandidate,
    historicalCalls: [ep2InitialCall],
    generatedVersions: 1,
    formRepairs: 0,
    recordRetries: 0,
  });
  const ep2BeforeRepairInspection = requireTransition({
    input: input2,
    state: ep2BeforeRepair,
    nextKind: "form_repair",
    nextOrdinal: 1,
    label: "slot 4 episode 2 initial",
  });
  const episode2 = repairedEpisode(ep2InitialCandidate, ep2Repair1);
  const ep2Calls = [ep2InitialCall, historicalCall(ep2Repair1, "record_repair", 1)];
  const ep2FinalState = historicalState({
    inputDigest: input2Digest,
    candidate: episode2,
    historicalCalls: ep2Calls,
    generatedVersions: 2,
    formRepairs: 1,
    recordRetries: 0,
  });
  const ep2FinalInspection = inspectHistoricalPassAContinuation({ input: input2, state: ep2FinalState });
  if (ep2FinalInspection.nextKind !== "already_admitted") fail("slot 4 episode 2 repaired admission drift");

  const ep3Initial = modelResponse(failure, `${base}:episode-03:initial`);
  const ep3Repair1 = modelResponse(failure, `${base}:episode-03:repair:1`);
  const ep3Retry1 = modelResponse(failure, `${base}:episode-03:record-retry:1`);
  const input3 = buildInput({ g2, g4, slot, priorEpisodes: [episode1, episode2], ordinal: 3 });
  const inputDigest = cognitionDigest(input3);
  if (inputDigest !== ep3Initial.inputDigest) fail("slot 4 episode 3 cognition input digest drift");

  const initialCandidate = initialEpisode(ep3Initial);
  const ep3InitialCall = historicalCall(ep3Initial, "initial");
  const ep3BeforeRepair = historicalState({
    inputDigest,
    candidate: initialCandidate,
    historicalCalls: [ep3InitialCall],
    generatedVersions: 1,
    formRepairs: 0,
    recordRetries: 0,
  });
  const ep3BeforeRepairInspection = requireTransition({
    input: input3,
    state: ep3BeforeRepair,
    nextKind: "form_repair",
    nextOrdinal: 1,
    label: "slot 4 episode 3 initial",
  });

  const repairedCandidate = repairedEpisode(initialCandidate, ep3Repair1);
  const ep3RepairCall = historicalCall(ep3Repair1, "record_repair", 1);
  const ep3BeforeRetry = historicalState({
    inputDigest,
    candidate: repairedCandidate,
    historicalCalls: [ep3InitialCall, ep3RepairCall],
    generatedVersions: 2,
    formRepairs: 1,
    recordRetries: 0,
  });
  const ep3BeforeRetryInspection = requireTransition({
    input: input3,
    state: ep3BeforeRetry,
    nextKind: "record_retry",
    nextOrdinal: 1,
    label: "slot 4 episode 3 after repair 1",
  });

  const retryCandidate = initialEpisode(ep3Retry1);
  const ep3Calls = [ep3InitialCall, ep3RepairCall, historicalCall(ep3Retry1, "record_retry", 1)];
  const state = Object.freeze({
    ...historicalState({
      inputDigest,
      candidate: retryCandidate,
      historicalCalls: ep3Calls,
      generatedVersions: 3,
      formRepairs: 1,
      recordRetries: 1,
    }),
    historicalCandidates: Object.freeze({
      initial: structuredClone(initialCandidate),
      afterRepair1: structuredClone(repairedCandidate),
      afterRecordRetry1: structuredClone(retryCandidate),
    }),
  });
  const inspection = inspectHistoricalPassAContinuation({ input: input3, state });

  const historicalRepairWitnesses = Object.freeze([
    historicalRepairWitness({
      kind: "pass_a_form_repair",
      episodeOrdinal: 2,
      recordedAt: historicalRecordedAt,
      operationOrdinal: 1,
      failedGate: ep2BeforeRepairInspection.currentGate,
      rejectedCandidate: ep2InitialCandidate,
      response: ep2Repair1,
    }),
    historicalRepairWitness({
      kind: "pass_a_form_repair",
      episodeOrdinal: 3,
      recordedAt: historicalRecordedAt,
      operationOrdinal: 1,
      failedGate: ep3BeforeRepairInspection.currentGate,
      rejectedCandidate: initialCandidate,
      response: ep3Repair1,
    }),
    historicalRepairWitness({
      kind: "pass_a_record_retry",
      episodeOrdinal: 3,
      recordedAt: historicalRecordedAt,
      operationOrdinal: 1,
      failedGate: ep3BeforeRetryInspection.currentGate,
      rejectedCandidate: repairedCandidate,
      response: ep3Retry1,
    }),
  ]);

  const acceptedEpisodeEvidence = Object.freeze([
    Object.freeze({
      ordinal: 1,
      episode: structuredClone(episode1),
      historicalCalls: Object.freeze([ep1Call]),
      repairWitnesses: Object.freeze([]),
    }),
    Object.freeze({
      ordinal: 2,
      episode: structuredClone(episode2),
      historicalCalls: Object.freeze(ep2Calls.map((item) => Object.freeze(structuredClone(item)))),
      repairWitnesses: Object.freeze([historicalRepairWitnesses[0]]),
    }),
  ]);

  const successfulHistoricalCalls = Object.freeze([
    ...acceptedEpisodeEvidence.flatMap((item) => item.historicalCalls),
    ...state.historicalCalls,
  ].map((item) => Object.freeze(structuredClone(item))));
  if (successfulHistoricalCalls.length !== 6) fail("slot 4 historical successful-call accounting drift");

  return Object.freeze({
    slot,
    threadId: g2.worldBindings.find((item) => item.slot === slot).threadId,
    genesisId: g2.worldBindings.find((item) => item.slot === slot).genesisId,
    acceptedEpisodes: Object.freeze([structuredClone(episode1), structuredClone(episode2)]),
    acceptedEpisodeEvidence,
    successfulHistoricalCalls,
    historicalRepairWitnesses,
    episode3: Object.freeze({
      input: structuredClone(input3),
      state,
      inspection,
    }),
  });
}
