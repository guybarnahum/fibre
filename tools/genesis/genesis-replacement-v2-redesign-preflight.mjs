#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V3,
  GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3,
  eventStructurePoolV3Digest,
  sampleEventStructuresV3,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import {
  GENESIS_HISTORICAL_ENVELOPE_POLICY,
  GENESIS_SPARSE_HISTORY_NOTICE,
  buildHistoricalEnvelopePlan,
} from "../../services/world-kernel/src/genesis-historical-envelope-v1.mjs";
import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
  GENESIS_HISTORICAL_REALIZATION_VERSION,
} from "../../services/world-kernel/src/genesis-historical-realization-v1.mjs";
import {
  GENESIS_RICH_COUNTERPART_POLICY_VERSION,
  richCounterpartMode,
  richCounterpartPolicyWitness,
} from "../../services/world-kernel/src/genesis-rich-participation-policy.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const PROTOCOL_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/redesign-v2.json";
const PLACE_AFFORDANCE_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/place-affordance-bindings-v1.json";
const DIAGNOSTIC_RECONCILIATION_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/g5-g6-horizon-reconciliation-v1.json";
const G2_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-cohort-genome-freeze-v1.json";
const G4_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-cognition-execution-binding-v1.json";
const RECOVERY_CLEAR_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/gate-g2-mechanical-recovery-clear-v1.json";
const EXPECTED_G2_DIGEST = "sha256:7d8f7fbf481e7a4bd404c0757fbc7c40418cd142b9b8f2a3da294820692e2f91";
const EXPECTED_TIME_ZONES = Object.freeze(new Map([
  [1, "Asia/Tbilisi"],
  [2, "Asia/Taipei"],
  [3, "America/Recife"],
  [4, "Africa/Casablanca"],
  [5, "Australia/Hobart"],
]));
const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;
const AGE_EPSILON = 0.002;

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function fail(message) { throw new Error(message); }
function pad(value) { return String(value).padStart(2, "0"); }
function measuredAge(bornAt, instant) { return (Date.parse(instant) - Date.parse(bornAt)) / YEAR_MS; }
function assertEqual(actual, expected, label) {
  if (canonicalJson(actual) !== canonicalJson(expected)) fail(`${label} drift`);
}

function assertSkeletonFreeRealizationSchema() {
  const properties = Object.keys(GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA.properties).sort();
  const expected = ["additionalIntroductions", "additionalParticipantRefs", "intellectualEncounter", "observableAction"];
  assertEqual(properties, expected, "replacement-v2 historical realization schema surface");
  for (const forbidden of ["episodeId", "occurredAt", "ageAtEvent", "placeRef", "structureRef", "introducedAt", "participantRefs", "introducedParticipants"]) {
    if (Object.hasOwn(GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA.properties, forbidden)) fail(`replacement-v2 model output regains forbidden skeleton field ${forbidden}`);
  }
  return digest({ version: GENESIS_HISTORICAL_REALIZATION_VERSION, schema: GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA });
}

function assertHistoricalEnvelopeBinding(protocol) {
  const expectedScalars = {
    implementation: "services/world-kernel/src/genesis-historical-envelope-v1.mjs",
    version: "genesis-historical-envelope-v1",
    selectionIsPreCognition: true,
    selectionMayReadGenome: false,
    selectionMayReadPriorGeneratedEpisodeContent: false,
    modelChoosesPlace: false,
    modelChoosesOccurredAt: false,
    modelChoosesEventStructure: false,
    worldEmergentSelectionIsPreCognition: true,
    localCivilTimeUsesIanaZone: true,
    localTimeNarrationMustNotContradictEnvelope: true,
    placeAndInstantAreEnforcedByConstrainedPassAInput: true,
    structureIsEnforcedBySelectedOpportunity: true,
  };
  for (const [key, value] of Object.entries(expectedScalars)) {
    if (protocol.historicalEnvelope[key] !== value) fail(`replacement-v2 historicalEnvelope.${key} drift`);
  }
  for (const [key, value] of Object.entries(GENESIS_HISTORICAL_ENVELOPE_POLICY)) {
    if (key === "version") continue;
    if (protocol.historicalEnvelope[key] !== value) fail(`replacement-v2 historicalEnvelope.${key} is not bound to enforcing policy`);
  }
}

function assertWindowAndChronologyBinding(protocol, g4Binding) {
  const inherited = g4Binding.inheritedAuthority;
  const declaredInherited = protocol.inheritedChronologyAuthority;
  const expectedInherited = {
    sourcePath: G4_BINDING_PATH,
    entryStage: inherited.entryStage,
    entryAge: inherited.entryAge,
    bornAt: inherited.bornAt,
    entryChronologyEndsAt: inherited.entryChronologyEndsAt,
  };
  assertEqual(declaredInherited, expectedInherited, "replacement-v2 inherited chronology authority");
  if (protocol.historicalPlan.entryStage !== inherited.entryStage) fail("replacement-v2 entryStage drift from inherited G4");
  if (protocol.historicalPlan.entryAge !== inherited.entryAge) fail("replacement-v2 entryAge drift from inherited G4");
  if (protocol.historicalPlan.bornAt !== inherited.bornAt) fail("replacement-v2 bornAt drift from inherited G4");
  if (protocol.historicalPlan.chronologyEndsAt !== inherited.entryChronologyEndsAt) fail("replacement-v2 chronologyEndsAt drift from inherited G4");

  const windows = protocol.historicalPlan.windows;
  if (windows.length !== 14 || protocol.historicalPlan.episodeCount !== 14) fail("replacement-v2 fourteen-window history plan drift");
  for (let index = 0; index < windows.length; index += 1) {
    const window = windows[index];
    if (window.ordinal !== index + 1) fail(`replacement-v2 window ordinal drift at index ${index}`);
    if (window.windowId !== `rv2_life_${pad(index + 1)}`) fail(`replacement-v2 windowId drift at ordinal ${index + 1}`);
    const start = Date.parse(window.startAt);
    const end = Date.parse(window.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) fail(`replacement-v2 invalid window ${window.windowId}`);
    if (Math.abs(measuredAge(protocol.historicalPlan.bornAt, window.startAt) - window.minAge) > AGE_EPSILON) fail(`replacement-v2 ${window.windowId} minAge does not match bornAt/startAt`);
    if (Math.abs(measuredAge(protocol.historicalPlan.bornAt, window.endAt) - window.maxAge) > AGE_EPSILON) fail(`replacement-v2 ${window.windowId} maxAge does not match bornAt/endAt`);
    if (index > 0) {
      const prior = windows[index - 1];
      if (Date.parse(prior.endAt) + 1 !== start) fail(`replacement-v2 internal chronology gap/overlap between ${prior.windowId} and ${window.windowId}`);
      if (Math.abs((prior.maxAge + 0.0001) - window.minAge) > 1e-9) fail(`replacement-v2 age seam drift between ${prior.windowId} and ${window.windowId}`);
    }
  }
  const first = windows[0];
  const last = windows.at(-1);
  const span = protocol.historicalPlan.generatedSpan;
  if (span.startAt !== first.startAt || span.endAt !== last.endAt || span.minAge !== first.minAge || span.maxAge !== last.maxAge) fail("replacement-v2 generatedSpan does not exactly bind the windows");
  if (Date.parse(last.endAt) + 1 !== Date.parse(protocol.historicalPlan.chronologyEndsAt)) fail("replacement-v2 final window does not end exactly before chronologyEndsAt");
  return windows;
}

function assertEventStructureBinding(protocol) {
  const v2Digest = eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2);
  const v3Digest = eventStructurePoolV3Digest(GENESIS_EVENT_STRUCTURE_POOL_V3);
  if (protocol.eventStructureAuthority.inheritedV2Version !== "genesis-event-structure-pool-v2") fail("replacement-v2 inherited EventStructurePool version drift");
  if (protocol.eventStructureAuthority.v3Version !== "genesis-event-structure-pool-v3") fail("replacement-v2 EventStructurePool-v3 version drift");
  if (protocol.eventStructureAuthority.inheritedV2Digest !== v2Digest) fail("replacement-v2 inherited EventStructurePool-v2 digest drift");
  if (protocol.eventStructureAuthority.v3Digest !== v3Digest) fail("replacement-v2 EventStructurePool-v3 digest drift");
  if (protocol.eventStructureAuthority.v2EntriesMustRemainExactPrefix !== true || protocol.eventStructureAuthority.childhoodRangesMayBeWidened !== false) fail("replacement-v2 inherited EventStructure authority semantics drift");
  return { v2Digest, v3Digest };
}

function assertCounterpartPolicyBinding(protocol) {
  if (GENESIS_RICH_COUNTERPART_POLICY_VERSION !== protocol.counterpartPolicy.version) fail("replacement-v2 counterpart policy version drift");
  const optional = [];
  const required = [];
  for (const entry of GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3) {
    const id = entry.structure.structureId;
    const expectedMode = entry.accessModes.includes("self_directed") ? "present_optional" : "present_required";
    const actualMode = richCounterpartMode(id);
    if (actualMode !== expectedMode) fail(`replacement-v2 counterpart mode ${id} does not match its reviewed accessModes`);
    (actualMode === "present_optional" ? optional : required).push(id);
  }
  optional.sort();
  required.sort();
  assertEqual([...protocol.counterpartPolicy.youngAdultPresentOptional].sort(), optional, "replacement-v2 optional young-adult counterpart mapping");
  assertEqual([...protocol.counterpartPolicy.youngAdultPresentRequired].sort(), required, "replacement-v2 required young-adult counterpart mapping");
  if (protocol.counterpartPolicy.defaultMode !== "present_required" || protocol.counterpartPolicy.coverageBoundsChangedInResponseToR1Review !== false) fail("replacement-v2 counterpart fallback/coverage semantics drift");
  return richCounterpartPolicyWitness().digest;
}

function assertDiagnosticReconciliation(protocol) {
  if (protocol.diagnosticReconciliation.path !== DIAGNOSTIC_RECONCILIATION_PATH) fail("replacement-v2 diagnostic reconciliation path drift");
  const reconciliation = readJson(DIAGNOSTIC_RECONCILIATION_PATH);
  if (reconciliation.amendmentVersion !== "pr39-replacement-v2-g5-g6-horizon-reconciliation-v1" || reconciliation.status !== "frozen_pre_cognition") fail("replacement-v2 diagnostic reconciliation version/status drift");
  assertEqual(reconciliation.replacementV2PassB.formationModes, protocol.passB.formationModes, "replacement-v2 diagnostic formation modes");
  assertEqual(reconciliation.replacementV2PassB.historyHorizons, protocol.passB.historyHorizons, "replacement-v2 diagnostic history horizons");
  assertEqual(reconciliation.effectiveReplacementV2D3.primaryOrdinals, protocol.diagnosticReconciliation.primaryOrdinals, "replacement-v2 D3 primary ordinals");
  assertEqual(reconciliation.effectiveReplacementV2D3.primaryHorizons, protocol.diagnosticReconciliation.primaryHorizons, "replacement-v2 D3 primary horizons");
  if (reconciliation.effectiveReplacementV2D3.thresholdChanged !== false || protocol.diagnosticReconciliation.d3ThresholdChanged !== false) fail("replacement-v2 D3 threshold changed");
  if (reconciliation.authorization.providerCallsAuthorized !== false || reconciliation.authorization.diagnosticsAuthorized !== false || reconciliation.authorization.publicationAuthorized !== false) fail("replacement-v2 diagnostic reconciliation unexpectedly authorizes execution");
  return digest(reconciliation);
}

export function verifyReplacementV2RedesignPreflight() {
  const protocol = readJson(PROTOCOL_PATH);
  if (protocol.protocolVersion !== "pr39-replacement-v2-redesign-v2" || protocol.status !== "FROZEN_R1_HOLD_CORRECTION_NO_COGNITION_AUTHORIZED") {
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

  const placeAffordanceProtocol = readJson(PLACE_AFFORDANCE_PATH);
  if (placeAffordanceProtocol.version !== "pr39-replacement-v2-place-affordance-bindings-v1" || placeAffordanceProtocol.status !== "frozen_pre_cognition") {
    fail("replacement-v2 place-affordance binding version/status drift");
  }
  if (placeAffordanceProtocol.authoringBoundary.genomeVisible !== false || placeAffordanceProtocol.authoringBoundary.replacementV1EpisodeContentUsed !== false || placeAffordanceProtocol.authorization.providerCallsAuthorized !== false) {
    fail("replacement-v2 place-affordance authorship boundary drift");
  }
  const placeBindingsByWorld = new Map(placeAffordanceProtocol.worlds.map((item) => [item.worldSpecId, item.places]));
  if (placeBindingsByWorld.size !== 5) fail("replacement-v2 place-affordance World count drift");

  const g2 = readJson(G2_PATH);
  if (digest(g2) !== EXPECTED_G2_DIGEST) fail("replacement-v1 frozen G2 protocol drift");
  const g4Binding = readJson(G4_BINDING_PATH);
  const rosterBySlot = new Map(g4Binding.initialRosters.map((item) => [item.slot, item]));
  const g2BySlot = new Map(g2.worldBindings.map((item) => [item.slot, item]));

  assertHistoricalEnvelopeBinding(protocol);
  const windows = assertWindowAndChronologyBinding(protocol, g4Binding);
  const poolDigests = assertEventStructureBinding(protocol);
  const counterpartPolicyDigest = assertCounterpartPolicyBinding(protocol);
  const diagnosticReconciliationDigest = assertDiagnosticReconciliation(protocol);

  assertEqual(protocol.passB.historyHorizons, [4, 6, 8, 10, 12, 14], "replacement-v2 Pass-B horizons");
  assertEqual(protocol.passB.formationModes, ["life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome"], "replacement-v2 Pass-B formation modes");
  if (protocol.passB.sparseHistoryNotice !== GENESIS_SPARSE_HISTORY_NOTICE || protocol.passB.frequencyInferenceFromSampleProhibited !== true) fail("replacement-v2 sparse-history semantics drift");
  if (protocol.passB.formationModeOrdinalPatternChanged !== false || protocol.passB.historyHorizonsChangedFromReplacementV1 !== true || protocol.passB.genomeExposureSurfaceChanged !== false) fail("replacement-v2 Pass-B redesign disclosure drift");
  if (protocol.providerCompatibility.maxItemsMustBeLocallyEnforcedBeforeR2 !== true) fail("replacement-v2 maxItems compatibility obligation drift");

  const realizationSchemaDigest = assertSkeletonFreeRealizationSchema();
  const placeAffordanceDigest = digest(placeAffordanceProtocol);
  const plans = [];
  for (const binding of protocol.worldBindings) {
    const expectedZone = EXPECTED_TIME_ZONES.get(binding.slot);
    if (binding.timeZone !== expectedZone) fail(`replacement-v2 slot ${binding.slot} timezone drift: expected ${expectedZone}`);
    const prior = g2BySlot.get(binding.slot);
    if (!prior || prior.threadId !== binding.threadId || prior.worldSpecId !== binding.worldSpecId || prior.worldSpecPath !== binding.worldSpecPath) {
      fail(`replacement-v2 slot ${binding.slot} changed frozen World/Thread assignment`);
    }
    const roster = rosterBySlot.get(binding.slot);
    if (!roster || roster.threadId !== binding.threadId || roster.worldSpecId !== binding.worldSpecId) fail(`replacement-v2 slot ${binding.slot} roster binding drift`);
    const worldSpec = readJson(binding.worldSpecPath);
    if (worldSpec.worldSpecId !== binding.worldSpecId) fail(`replacement-v2 slot ${binding.slot} WorldSpec ID drift`);
    const placeAffordances = placeBindingsByWorld.get(binding.worldSpecId);
    if (!placeAffordances) fail(`replacement-v2 slot ${binding.slot} lacks place-affordance binding`);
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
      placeAffordances,
      timeZone: binding.timeZone,
      seedDomain: `${protocol.startingMaterial.freshHistoricalEnvelopeSeedDomain}:slot:${pad(binding.slot)}`,
    });
    if (plan.statistics.distinctPlaces < Math.min(GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumDistinctPlaces, worldSpec.places.length)) fail(`replacement-v2 slot ${binding.slot} place coverage drift`);
    if (plan.statistics.externalCounterpartOpportunityCount < GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities) fail(`replacement-v2 slot ${binding.slot} social expansion coverage drift`);
    if (plan.statistics.externalRoleVariety < GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalRoleVariety) fail(`replacement-v2 slot ${binding.slot} external role variety drift`);
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
    status: "CLEAR_R1_HOLD_CORRECTION_PRE_REVIEW_ZERO_CALL",
    protocolDigest: digest(protocol),
    placeAffordanceDigest,
    inheritedEventStructurePoolV2Digest: poolDigests.v2Digest,
    eventStructurePoolV3Digest: poolDigests.v3Digest,
    counterpartPolicyDigest,
    realizationSchemaDigest,
    diagnosticReconciliationDigest,
    attempt1RecoveryRetired: true,
    attempt1HistoryReusable: false,
    replacementV2OutputRootAbsent: true,
    providerCallsAuthorized: false,
    finalLifeCognitionAuthorized: false,
    plans: Object.freeze(plans),
  });
}

function print(result) {
  console.log("PR39 REPLACEMENT-V2 REDESIGN R1 PREFLIGHT: CLEAR_R1_HOLD_CORRECTION_PRE_REVIEW_ZERO_CALL");
  console.log(`Protocol: ${result.protocolDigest}`);
  console.log(`Place affordances: ${result.placeAffordanceDigest}`);
  console.log(`EventStructurePool v2: ${result.inheritedEventStructurePoolV2Digest}`);
  console.log(`EventStructurePool v3: ${result.eventStructurePoolV3Digest}`);
  console.log(`Counterpart policy: ${result.counterpartPolicyDigest}`);
  console.log(`Skeleton-free realization schema: ${result.realizationSchemaDigest}`);
  console.log(`D3 horizon reconciliation: ${result.diagnosticReconciliationDigest}`);
  console.log("Attempt 1 same-attempt recovery: RETIRED");
  console.log("Attempt 1 generated history reusable: false");
  for (const plan of result.plans) {
    const s = plan.statistics;
    console.log(`${plan.slot}. ${plan.threadId} · ${plan.worldSpecId} · ${plan.timeZone}`);
    console.log(`   envelope=${plan.envelopeDigest}`);
    console.log(`   places=${s.distinctPlaces} distinct / max ${s.maxPlaceUse}; structures=${s.distinctStructures} distinct / max ${s.maxStructureUse}; world-emergent=${s.worldEmergentCount}`);
    console.log(`   external-opportunities=${s.externalCounterpartOpportunityCount}; external-role-variety=${s.externalRoleVariety}; generated-external-people=${s.generatedExternalPersonCount}; weekday-max=${s.maxWeekdayUse}; daypart-max=${s.maxDaypartUse}`);
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
