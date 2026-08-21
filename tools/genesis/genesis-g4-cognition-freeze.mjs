#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { GENESIS_PASS_A_POLICY } from "../services/world-kernel/src/genesis-pass-a-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  GENESIS_EVENT_STRUCTURE_POOL_V2_VERSION,
  eventStructurePoolV2Digest,
  sampleEventStructuresV2,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  GENESIS_RICH_PASS_A_RECORD_RETRY_CONSTRAINT_VERSION,
  richPassAPromptHash,
  richPassARepairPromptHash,
  richPassARepairSchemaHash,
  richPassARecordRetryPromptHash,
  richPassASchemaHash,
} from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  GENESIS_PASS_B_FORM_PROFILE,
  GENESIS_PASS_B_MAX_MODEL_CHARACTERS,
  GENESIS_PASS_B_PROMPT_VERSION,
  passBPromptHash,
  passBResponseSchemaHash,
} from "../services/world-kernel/src/genesis-pass-b-prompts.mjs";
import { GENESIS_PASS_B_POLICY } from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
import {
  passCInitialPromptHash,
  passCInitialResponseSchemaHash,
  passCReinterpretationPromptHash,
  passCReinterpretationResponseSchemaHash,
} from "../services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { GENESIS_PASS_C_POLICY } from "../services/world-kernel/src/genesis-pass-c-domain.mjs";
import { normalizeGenesisCognition, publicationValidatorSetWitness } from "../services/world-kernel/src/genesis-domain.mjs";
import { verifyG3TreatmentFreeze } from "./genesis-g3-treatment-freeze.mjs";

export const G4_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json";
const readJson = (path) => JSON.parse(readFileSync(resolve(path), "utf8"));
const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const fail = (message) => { throw new Error(message); };
const rounded = (value) => Number(value.toFixed(6));

export function deriveG4Windows(span, count = 10) {
  const start = Date.parse(span.startAt);
  const end = Date.parse(span.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) fail("invalid G4 historical span");
  const millis = end - start + 1;
  const ages = span.maxAge - span.minAge;
  return Array.from({ length: count }, (_, index) => ({
    ordinal: index + 1,
    windowId: `g4_childhood_adolescence_${String(index + 1).padStart(2, "0")}`,
    startAt: new Date(start + Math.floor((millis * index) / count)).toISOString(),
    endAt: new Date(start + Math.floor((millis * (index + 1)) / count) - 1).toISOString(),
    minAge: rounded(span.minAge + (ages * index) / count),
    maxAge: rounded(span.minAge + (ages * (index + 1)) / count),
  }));
}

function passCHashes() {
  const initialPromptHash = passCInitialPromptHash();
  const reinterpretationPromptHash = passCReinterpretationPromptHash();
  const initialResponseSchemaHash = passCInitialResponseSchemaHash();
  const reinterpretationResponseSchemaHash = passCReinterpretationResponseSchemaHash();
  return {
    initialPromptHash,
    reinterpretationPromptHash,
    initialResponseSchemaHash,
    reinterpretationResponseSchemaHash,
    promptHash: digest({ initialPromptHash, reinterpretationPromptHash }),
    schemaHash: digest({ initialResponseSchemaHash, reinterpretationResponseSchemaHash }),
  };
}

function repairHashes() {
  const passARepairPromptHash = richPassARepairPromptHash();
  const passARepairSchemaHash = richPassARepairSchemaHash();
  const passARecordRetryPromptHash = richPassARecordRetryPromptHash();
  const passARecordRetrySchemaHash = richPassASchemaHash();
  return {
    passARepairPromptHash,
    passARepairSchemaHash,
    passARecordRetryPromptHash,
    passARecordRetrySchemaHash,
    promptHash: digest({
      repairPromptHash: passARepairPromptHash,
      recordRetryPromptHash: passARecordRetryPromptHash,
      constraintVersion: GENESIS_RICH_PASS_A_RECORD_RETRY_CONSTRAINT_VERSION,
    }),
    schemaHash: digest({
      repairResponseSchemaHash: passARepairSchemaHash,
      recordRetryResponseSchemaHash: passARecordRetrySchemaHash,
    }),
  };
}

function verifyCognition(protocol) {
  const c = protocol.cognition;
  if (c.passA.promptHash !== richPassAPromptHash() || c.passA.schemaHash !== richPassASchemaHash()) fail("G4 Pass-A hash drift");
  if (c.passA.genomeBlind !== true || c.passA.selectedOpportunityLayer !== false) fail("G4 Pass-A authority drift");
  if (c.passB.promptHash !== passBPromptHash() || c.passB.schemaHash !== passBResponseSchemaHash()) fail("G4 Pass-B hash drift");
  if (c.passB.promptVersion !== GENESIS_PASS_B_PROMPT_VERSION || c.passB.formProfile !== GENESIS_PASS_B_FORM_PROFILE || c.passB.maxRememberedContentModelCharacters !== GENESIS_PASS_B_MAX_MODEL_CHARACTERS) fail("G4 Pass-B profile drift");
  const pc = passCHashes();
  if (c.passC.promptHash !== pc.promptHash || c.passC.schemaHash !== pc.schemaHash) fail("G4 Pass-C composite drift");
  for (const key of ["initialPromptHash", "reinterpretationPromptHash", "initialResponseSchemaHash", "reinterpretationResponseSchemaHash"]) if (c.passC.composite[key] !== pc[key]) fail(`G4 Pass-C ${key} drift`);
  const rr = repairHashes();
  if (c.recordRepair.promptHash !== rr.promptHash || c.recordRepair.schemaHash !== rr.schemaHash) fail("G4 record-repair composite drift");
  for (const key of ["passARepairPromptHash", "passARepairSchemaHash", "passARecordRetryPromptHash", "passARecordRetrySchemaHash"]) if (c.recordRepair[key] !== rr[key]) fail(`G4 record-repair ${key} drift`);
  if (c.recordRepair.constraintVersion !== GENESIS_RICH_PASS_A_RECORD_RETRY_CONSTRAINT_VERSION || c.recordRepair.maxGeneratedVersionsPerPassARecord !== GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord) fail("G4 record-repair policy drift");
  if (c.recordRepair.passBModelRepair !== false || c.recordRepair.passCModelRepair !== false) fail("G4 Pass B/C repair must remain disabled");
  for (const surface of [c.passA, c.passB, c.passC, c.recordRepair]) if (surface.provider !== "openai" || surface.modelId !== "gpt-5.1-2025-11-13") fail("G4 model must be common across cognition");
}

function verifyHistory(protocol) {
  const plan = protocol.historicalPlan;
  if (plan.episodesPerThread !== 10) fail("G4 episode count drift");
  const windows = deriveG4Windows(plan.generatedSpan, 10);
  if (canonicalJson(windows) !== canonicalJson(plan.windows)) fail("G4 developmental-window drift");
  if (protocol.eventStructurePool.version !== GENESIS_EVENT_STRUCTURE_POOL_V2_VERSION || protocol.eventStructurePool.digest !== eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2)) fail("G4 EventStructurePool drift");
  const schedules = [];
  for (let slot = 1; slot <= 5; slot += 1) {
    for (const window of windows) {
      const seed = `${protocol.eventStructurePool.seedDomain}:slot:${String(slot).padStart(2, "0")}:structures:${window.windowId}`;
      const offered = sampleEventStructuresV2(GENESIS_EVENT_STRUCTURE_POOL_V2, window, { seed, count: 9 });
      if (offered.length !== 9) fail(`G4 slot ${slot} window ${window.ordinal} offer count drift`);
      schedules.push({ slot, windowOrdinal: window.ordinal, seed, offeredStructureIds: offered.map((entry) => entry.structure.structureId).sort() });
    }
  }
  return { offerScheduleDigest: digest(schedules), offerScheduleEntries: schedules.length };
}

function verifyRosters(protocol, g3) {
  const bindings = new Map(g3.g2Protocol.worldBindings.map((item) => [item.slot, item]));
  if (protocol.initialRosters.length !== 5) fail("G4 roster count drift");
  for (const roster of protocol.initialRosters) {
    const binding = bindings.get(roster.slot);
    if (!binding || binding.worldSpecId !== roster.worldSpecId || binding.threadId !== roster.threadId) fail(`G4 roster binding drift at slot ${roster.slot}`);
    const world = readJson(binding.worldSpecPath);
    const afforded = new Set(world.affordedRoles);
    const ids = roster.participants.map((item) => item.participantId);
    if (new Set(ids).size !== ids.length) fail(`G4 duplicate roster ID at slot ${roster.slot}`);
    const subject = roster.participants.find((item) => item.participantId === roster.threadId);
    if (!subject || canonicalJson(subject.factualRoles) !== canonicalJson(["subject"])) fail(`G4 subject missing at slot ${roster.slot}`);
    for (const person of roster.participants) {
      if (!person.factualRoles?.length || !person.relationshipFacts?.length) fail(`G4 roster shape drift at slot ${roster.slot}`);
      if (person.participantId !== roster.threadId) for (const role of person.factualRoles) if (!afforded.has(role)) fail(`G4 unafforded role ${role} at slot ${roster.slot}`);
    }
  }
}

export function verifyG4CognitionFreeze({ protocolPath = G4_PROTOCOL_PATH } = {}) {
  const protocol = readJson(protocolPath);
  if (protocol.protocolVersion !== "pr39-slice-g4-cognition-freeze-v1" || protocol.status !== "frozen_pre_life_generation") fail("unexpected G4 protocol/version status");
  if (protocol.preconditions.finalCohortLifeExists !== false) fail("G4 must predate final cohort life");
  const g3 = verifyG3TreatmentFreeze({ protocolPath: protocol.preconditions.g3ProtocolPath });
  if (g3.protocolDigest !== protocol.preconditions.g3ProtocolDigest) fail("G4 G3 digest drift");
  if (protocol.commonRuntime.provider !== "openai" || protocol.commonRuntime.modelId !== "gpt-5.1-2025-11-13" || protocol.commonRuntime.temperature !== 0 || protocol.commonRuntime.topP !== 1 || protocol.commonRuntime.reasoningEffort !== "none") fail("G4 runtime drift");
  verifyCognition(protocol);
  const history = verifyHistory(protocol);
  verifyRosters(protocol, g3);
  if (canonicalJson(protocol.passBTiming.historyHorizons) !== canonicalJson([4, 5, 6, 7, 8, 10]) || protocol.passBTiming.assignmentAuthority !== "g3-pass-b-treatment-freeze-v1") fail("G4 Pass-B timing drift");
  if (protocol.passCTiming.minimumYearsAfterPriorMeaning !== GENESIS_PASS_C_POLICY.reinterpretationMinimumYears || protocol.passCTiming.runCapPerThread !== GENESIS_PASS_C_POLICY.reinterpretationRunCapPerThread) fail("G4 Pass-C timing drift");
  if (protocol.attemptAndRepairPolicy.wholeCandidateAttemptCap !== 1 || protocol.attemptAndRepairPolicy.qualityDrivenRegeneration !== false) fail("G4 candidate regeneration policy drift");
  if (GENESIS_PASS_B_POLICY.version !== "genesis-pass-b-policy-v1" || GENESIS_PASS_C_POLICY.version !== "genesis-pass-c-policy-v1") fail("G4 Pass B/C policy version drift");
  if (canonicalJson(protocol.publicationValidatorSetWitness) !== canonicalJson(publicationValidatorSetWitness())) fail("G4 publication witness drift");
  normalizeGenesisCognition(protocol.manifestCognitionTemplate);
  for (const value of Object.values(protocol.structuralAbsences)) if (value !== true) fail("G4 structural absence drift");
  if (protocol.executionBoundary.g4MayGenerateLife !== false || protocol.executionBoundary.noFinalCohortLifeBeforeGateGClear !== true) fail("G4 execution boundary drift");
  return Object.freeze({ protocol, protocolDigest: digest(protocol), ...history });
}

async function main() {
  const result = verifyG4CognitionFreeze();
  process.stdout.write("G4 COGNITION FREEZE: VERIFIED\n");
  process.stdout.write(`Model: ${result.protocol.commonRuntime.provider}/${result.protocol.commonRuntime.modelId}\n`);
  process.stdout.write(`Historical episodes: ${result.protocol.historicalPlan.episodesPerThread} x 5 Threads\n`);
  process.stdout.write(`Offer schedule entries: ${result.offerScheduleEntries}\n`);
  process.stdout.write(`Offer schedule digest: ${result.offerScheduleDigest}\n`);
  process.stdout.write(`G4 protocol digest: ${result.protocolDigest}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  process.stderr.write(`G4 COGNITION FREEZE: FAILED\n${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
});
