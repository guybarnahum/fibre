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

export function buildH2Slot4Episode3RecoveryState() {
  const failure = readJson(H2_FAILURE_PATH);
  const g2 = readJson(G2_PATH);
  const g4 = readJson(G4_PATH);
  const slot = 4;
  const base = "pr39-h:slot-04:pass-a";

  const ep1Initial = modelResponse(failure, `${base}:episode-01:initial`);
  const input1 = buildInput({ g2, g4, slot, priorEpisodes: [], ordinal: 1 });
  if (cognitionDigest(input1) !== ep1Initial.inputDigest) fail("slot 4 episode 1 cognition input digest drift");
  const episode1 = initialEpisode(ep1Initial);

  const ep2Initial = modelResponse(failure, `${base}:episode-02:initial`);
  const ep2Repair1 = modelResponse(failure, `${base}:episode-02:repair:1`);
  const input2 = buildInput({ g2, g4, slot, priorEpisodes: [episode1], ordinal: 2 });
  if (cognitionDigest(input2) !== ep2Initial.inputDigest) fail("slot 4 episode 2 cognition input digest drift");
  const episode2 = repairedEpisode(initialEpisode(ep2Initial), ep2Repair1);

  const ep3Initial = modelResponse(failure, `${base}:episode-03:initial`);
  const ep3Repair1 = modelResponse(failure, `${base}:episode-03:repair:1`);
  const ep3Retry1 = modelResponse(failure, `${base}:episode-03:record-retry:1`);
  const input3 = buildInput({ g2, g4, slot, priorEpisodes: [episode1, episode2], ordinal: 3 });
  const inputDigest = cognitionDigest(input3);
  if (inputDigest !== ep3Initial.inputDigest) fail("slot 4 episode 3 cognition input digest drift");

  const initialCandidate = initialEpisode(ep3Initial);
  const repairedCandidate = repairedEpisode(initialCandidate, ep3Repair1);
  const retryCandidate = initialEpisode(ep3Retry1);
  const state = Object.freeze({
    stateVersion: HISTORICAL_PASS_A_CONTINUATION_VERSION,
    sourcePolicyVersion: "genesis-rich-pass-a-shared-version-budget-v1",
    inputDigest,
    generatedVersions: 3,
    formRepairs: 1,
    recordRetries: 1,
    candidate: structuredClone(retryCandidate),
    historicalCalls: Object.freeze([
      historicalCall(ep3Initial, "initial"),
      historicalCall(ep3Repair1, "record_repair", 1),
      historicalCall(ep3Retry1, "record_retry", 1),
    ]),
    historicalCandidates: Object.freeze({
      initial: structuredClone(initialCandidate),
      afterRepair1: structuredClone(repairedCandidate),
      afterRecordRetry1: structuredClone(retryCandidate),
    }),
  });
  const inspection = inspectHistoricalPassAContinuation({ input: input3, state });

  return Object.freeze({
    slot,
    threadId: g2.worldBindings.find((item) => item.slot === slot).threadId,
    genesisId: g2.worldBindings.find((item) => item.slot === slot).genesisId,
    acceptedEpisodes: Object.freeze([structuredClone(episode1), structuredClone(episode2)]),
    episode3: Object.freeze({
      input: structuredClone(input3),
      state,
      inspection,
    }),
  });
}
