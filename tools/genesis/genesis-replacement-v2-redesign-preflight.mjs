#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V3,
  eventStructurePoolV3Digest,
  sampleEventStructuresV3,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import {
  GENESIS_HISTORICAL_ENVELOPE_POLICY,
  GENESIS_SPARSE_HISTORY_NOTICE,
  buildHistoricalEnvelopePlan,
} from "../../services/world-kernel/src/genesis-historical-envelope-v1.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const PROTOCOL_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/redesign-v1.json";
const G2_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-cohort-genome-freeze-v1.json";
const G4_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-cognition-execution-binding-v1.json";
const RECOVERY_CLEAR_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/gate-g2-mechanical-recovery-clear-v1.json";
const EXPECTED_G2_DIGEST = "sha256:7d8f7fbf481e7a4bd404c0757fbc7c40418cd142b9b8f2a3da294820692e2f91";

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function fail(message) { throw new Error(message); }
function pad(value) { return String(value).padStart(2, "0"); }

export function verifyReplacementV2RedesignPreflight() {
  const protocol = readJson(PROTOCOL_PATH);
  if (protocol.protocolVersion !== "pr39-replacement-v2-redesign-v1" || protocol.status !== "FROZEN_PRE_IMPLEMENTATION_REVIEW_NO_COGNITION_AUTHORIZED") {
    fail("replacement-v2 redesign protocol version/status drift");
  }
  if (protocol.authorization.providerCallsAuthorized !== false || protocol.authorization.finalLifeCognitionAuthorized !== false || protocol.authorization.replacementV2ExecutionAuthorized !== false) {
    fail("replacement-v2 redesign unexpectedly authorizes cognition");
  }
  if (protocol.attempt1Standing.sameAttemptRecoveryRetired !== true || protocol.attempt1Standing.generatedPassAHistoryMayBeReused !== false) {
    fail("replacement-v1 attempt-1 REDESIGN standing drift");
  }
  if (existsSync(absolute(RECOVERY_CLEAR_PATH))) fail("retired same-attempt recovery has a CLEAR witness");
  if (protocol.startingMaterial.freshOutputRoot === protocol.attempt1Standing.attemptRoot) fail("replacement-v2 output root reuses failed attempt root");
  if (existsSync(absolute(protocol.startingMaterial.freshOutputRoot))) fail("replacement-v2 final-life output root already exists");

  const g2 = readJson(G2_PATH);
  if (digest(g2) !== EXPECTED_G2_DIGEST) fail("replacement-v1 frozen G2 protocol drift");
  const g4Binding = readJson(G4_BINDING_PATH);
  const rosterBySlot = new Map(g4Binding.initialRosters.map((item) => [item.slot, item]));
  const g2BySlot = new Map(g2.worldBindings.map((item) => [item.slot, item]));
  const windows = protocol.historicalPlan.windows;
  if (windows.length !== 14 || protocol.historicalPlan.episodeCount !== 14) fail("replacement-v2 fourteen-window history plan drift");
  if (windows[0].minAge !== 6 || windows.at(-1).maxAge !== 21.9999) fail("replacement-v2 history no longer covers age 6 through pre-entry age 22");
  if (canonicalJson(protocol.passB.historyHorizons) !== canonicalJson([4, 6, 8, 10, 12, 14])) fail("replacement-v2 Pass-B horizons drift");
  if (canonicalJson(protocol.passB.formationModes) !== canonicalJson(["life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome"])) fail("replacement-v2 Pass-B treatment pattern drift");
  if (protocol.passB.sparseHistoryNotice !== GENESIS_SPARSE_HISTORY_NOTICE || protocol.passB.frequencyInferenceFromSampleProhibited !== true) fail("replacement-v2 sparse-history semantics drift");

  const poolDigest = eventStructurePoolV3Digest(GENESIS_EVENT_STRUCTURE_POOL_V3);
  const plans = [];
  for (const binding of protocol.worldBindings) {
    const prior = g2BySlot.get(binding.slot);
    if (!prior || prior.threadId !== binding.threadId || prior.worldSpecId !== binding.worldSpecId || prior.worldSpecPath !== binding.worldSpecPath) {
      fail(`replacement-v2 slot ${binding.slot} changed frozen World/Thread assignment`);
    }
    const roster = rosterBySlot.get(binding.slot);
    if (!roster || roster.threadId !== binding.threadId || roster.worldSpecId !== binding.worldSpecId) fail(`replacement-v2 slot ${binding.slot} roster binding drift`);
    const worldSpec = readJson(binding.worldSpecPath);
    if (worldSpec.worldSpecId !== binding.worldSpecId) fail(`replacement-v2 slot ${binding.slot} WorldSpec ID drift`);
    const offersByWindow = new Map();
    for (const window of windows) {
      const seed = `${protocol.startingMaterial.freshEventOfferSeedDomain}:slot:${pad(binding.slot)}:structures:${window.windowId}`;
      const entries = sampleEventStructuresV3(GENESIS_EVENT_STRUCTURE_POOL_V3, window, { seed, count: 9 });
      offersByWindow.set(window.windowId, entries);
    }
    const plan = buildHistoricalEnvelopePlan({
      subject: { provisionalThreadId: binding.threadId, bornAt: protocol.historicalPlan.bornAt },
      worldSpec,
      windows,
      offersByWindow,
      initialRoster: roster.participants,
      timeZone: binding.timeZone,
      seedDomain: `${protocol.startingMaterial.freshHistoricalEnvelopeSeedDomain}:slot:${pad(binding.slot)}`,
    });
    if (plan.statistics.distinctPlaces < Math.min(GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumDistinctPlaces, worldSpec.places.length)) fail(`replacement-v2 slot ${binding.slot} place coverage drift`);
    if (plan.statistics.externalCounterpartOpportunityCount < GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities) fail(`replacement-v2 slot ${binding.slot} social expansion coverage drift`);
    plans.push({
      slot: binding.slot,
      threadId: binding.threadId,
      worldSpecId: binding.worldSpecId,
      timeZone: binding.timeZone,
      envelopeDigest: plan.digest,
      statistics: plan.statistics,
      localRange: {
        first: `${plan.envelopes[0].localWeekday} ${plan.envelopes[0].localDate} ${plan.envelopes[0].localTime}`,
        last: `${plan.envelopes.at(-1).localWeekday} ${plan.envelopes.at(-1).localDate} ${plan.envelopes.at(-1).localTime}`,
      },
    });
  }

  return Object.freeze({
    status: "CLEAR_R1_SUBSTRATE_PRE_REVIEW_ZERO_CALL",
    protocolDigest: digest(protocol),
    eventStructurePoolV3Digest: poolDigest,
    attempt1RecoveryRetired: true,
    attempt1HistoryReusable: false,
    replacementV2OutputRootAbsent: true,
    providerCallsAuthorized: false,
    finalLifeCognitionAuthorized: false,
    plans: Object.freeze(plans),
  });
}

function print(result) {
  console.log("PR39 REPLACEMENT-V2 REDESIGN R1 PREFLIGHT: CLEAR_R1_SUBSTRATE_PRE_REVIEW_ZERO_CALL");
  console.log(`Protocol: ${result.protocolDigest}`);
  console.log(`EventStructurePool v3: ${result.eventStructurePoolV3Digest}`);
  console.log("Attempt 1 same-attempt recovery: RETIRED");
  console.log("Attempt 1 generated history reusable: false");
  for (const plan of result.plans) {
    const s = plan.statistics;
    console.log(`${plan.slot}. ${plan.threadId} · ${plan.worldSpecId} · ${plan.timeZone}`);
    console.log(`   envelope=${plan.envelopeDigest}`);
    console.log(`   places=${s.distinctPlaces} distinct / max ${s.maxPlaceUse}; structures=${s.distinctStructures} distinct / max ${s.maxStructureUse}; world-emergent=${s.worldEmergentCount}`);
    console.log(`   external-opportunities=${s.externalCounterpartOpportunityCount}; external-role-variety=${s.externalRoleVariety}; weekday-max=${s.maxWeekdayUse}; daypart-max=${s.maxDaypartUse}`);
    console.log(`   local first=${plan.localRange.first}; local last=${plan.localRange.last}`);
  }
  console.log("Replacement-v2 cognition: NOT AUTHORIZED");
  console.log("Preflight made zero provider calls and wrote no life artifacts.");
}

const invokedAsScript = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  try { print(verifyReplacementV2RedesignPreflight()); }
  catch (error) {
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exitCode = 1;
  }
}
