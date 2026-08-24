#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalJson } from "../../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_SPARSE_HISTORY_NOTICE,
  constrainPassAContextToHistoricalEnvelope,
} from "../../services/world-kernel/src/genesis-historical-envelope-v1.mjs";
import {
  buildRichLifePassAInput,
  syntheticLineageWitnessFromRecombinedGenome,
} from "../../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { buildReplacementPassACognitionInput } from "../../services/world-kernel/src/genesis-replacement-pass-a.mjs";
import {
  GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES,
  GENESIS_REPLACEMENT_PASS_B_HORIZONS,
  GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE,
  assertReplacementPassBSchedule,
} from "../../services/world-kernel/src/genesis-replacement-pass-b.mjs";
import { LIFE_RELATION_KINDS } from "../../services/world-kernel/src/situated-life-domain.mjs";
import { verifyReplacementV2RedesignPreflight } from "./genesis-replacement-v2-redesign-preflight.mjs";
import { verifyReplacementR2ExecutionAuthority } from "./genesis-replacement-execution-authority.mjs";
import { replacementAttemptGuardPath } from "./genesis-replacement-runner.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const REDESIGN_PROTOCOL_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/redesign-v2.json";
function absolute(path) { return resolve(ROOT, path); }
function fail(message) { throw new Error(message); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }

function assertNoGenerationCommand() {
  const pkg = readJson("package.json");
  const forbidden = Object.keys(pkg.scripts ?? {}).filter((name) => /^genesis:replacement.*(?:run|generate|execute)/u.test(name));
  if (forbidden.length !== 0) fail(`R2 pre-review package exposes generation command(s): ${forbidden.join(", ")}`);
}

function assertCanonicalSituatedLifeBoundary() {
  const genesisSchema = readFileSync(absolute("services/world-kernel/src/genesis-schema.mjs"), "utf8");
  if (/genesis_life_continuity/u.test(genesisSchema)) {
    fail("R2 continuity created a parallel Genesis-owned situated-life table");
  }
  if (!LIFE_RELATION_KINDS.includes("social_contact")) {
    fail("R2 canonical situated-life authority lacks ordinary social-contact representation");
  }
  const birthSource = readFileSync(absolute("services/world-kernel/src/genesis-store.mjs"), "utf8");
  if (!birthSource.includes("publishGenesisSituatedContinuityInTransaction")) {
    fail("R2 birth is not wired to canonical situated-life continuity publication");
  }
  return Object.freeze({
    genesisParallelContinuityTable: false,
    socialContactRelationKind: true,
    atomicBirthUsesCanonicalSituatedLife: true,
  });
}

function assertPassBProtocolBinding(authority) {
  const protocol = readJson(REDESIGN_PROTOCOL_PATH);
  if (protocol.passB?.sparseHistoryNotice !== GENESIS_SPARSE_HISTORY_NOTICE) {
    fail("R2 protocol sparse-history notice drift from canonical historical-envelope authority");
  }
  if (GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE !== GENESIS_SPARSE_HISTORY_NOTICE) {
    fail("R2 executing Pass-B sparse-history notice drift from canonical authority");
  }
  if (canonicalJson(protocol.passB?.historyHorizons) !== canonicalJson(GENESIS_REPLACEMENT_PASS_B_HORIZONS)) {
    fail("R2 executing Pass-B history horizons drift from frozen protocol");
  }
  if (canonicalJson(protocol.passB?.formationModes) !== canonicalJson(GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES)) {
    fail("R2 executing Pass-B formation modes drift from frozen protocol");
  }
  assertReplacementPassBSchedule({
    horizons: protocol.passB.historyHorizons,
    formationModes: protocol.passB.formationModes,
    historyLength: 14,
  });
  const treatedOrdinals = GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES
    .map((mode, index) => mode === "life_plus_genome" ? index + 1 : null)
    .filter((ordinal) => ordinal !== null);
  const primaryHorizons = treatedOrdinals.map((ordinal) => GENESIS_REPLACEMENT_PASS_B_HORIZONS[ordinal - 1]);
  if (canonicalJson(treatedOrdinals) !== canonicalJson(protocol.diagnosticReconciliation?.primaryOrdinals)
    || canonicalJson(treatedOrdinals) !== canonicalJson(authority.diagnosticAuthority.primaryOrdinals)) {
    fail("R2 executing Pass-B treated ordinals drift from diagnostic authority");
  }
  if (canonicalJson(primaryHorizons) !== canonicalJson(protocol.diagnosticReconciliation?.primaryHorizons)
    || canonicalJson(primaryHorizons) !== canonicalJson(authority.diagnosticAuthority.primaryHorizons)) {
    fail("R2 executing Pass-B primary horizons drift from diagnostic authority");
  }
  return Object.freeze({
    sparseHistoryNotice: GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE,
    historyHorizons: Object.freeze([...GENESIS_REPLACEMENT_PASS_B_HORIZONS]),
    formationModes: Object.freeze([...GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES]),
    treatedOrdinals: Object.freeze(treatedOrdinals),
    primaryHorizons: Object.freeze(primaryHorizons),
  });
}

function assertCurrentRichBuilder(authority) {
  const witnesses = [];
  for (const slot of authority.plans.slots) {
    const window = slot.windows.at(-1);
    const envelope = slot.envelopePlan.envelopes.at(-1);
    const offeredEntries = slot.offersByWindow.get(window.windowId);
    const lineageWitness = slot.originMode === "synthetic_lineage"
      ? syntheticLineageWitnessFromRecombinedGenome(slot.genome)
      : null;
    const constrainedContext = constrainPassAContextToHistoricalEnvelope({
      worldSpec: slot.worldSpec,
      envelope,
    });
    const input = buildRichLifePassAInput({
      originMode: slot.originMode,
      syntheticLineageWitness: lineageWitness,
      worldSpec: constrainedContext.worldSpec,
      subject: { provisionalThreadId: slot.threadId, bornAt: slot.bornAt },
      developmentalWindow: constrainedContext.developmentalWindow,
      chronologyEndsAt: constrainedContext.chronologyEndsAt,
      initialRoster: slot.roster.participants,
      priorEpisodes: [],
      previouslyIntroducedParticipants: [],
      offeredEntries,
    });
    if (!/event-structure-pool-v3/u.test(input.policyWitness.policyVersion)) {
      fail(`R2 slot ${slot.slot} rich-life compiler is not on the current EventStructure pool`);
    }
    if (Object.hasOwn(input.developmentalWindow, "ordinal")) {
      fail(`R2 slot ${slot.slot} compiler-only window ordinal leaked into Pass-A input`);
    }
    if (input.world.places.length !== 1 || input.world.places[0].placeId !== envelope.placeRef) {
      fail(`R2 slot ${slot.slot} Pass-A cognition world is not constrained to the frozen envelope place`);
    }
    if (input.developmentalWindow.startAt !== envelope.occurredAt
      || input.developmentalWindow.endAt !== envelope.occurredAt
      || input.chronologyEndsAt !== envelope.occurredAt) {
      fail(`R2 slot ${slot.slot} Pass-A cognition time is not constrained to the frozen envelope instant`);
    }
    if (envelope.structureRef !== null && !input.offeredStructures.some((item) => item.structureId === envelope.structureRef)) {
      fail(`R2 slot ${slot.slot} reviewed envelope structure is absent from current Pass-A offers`);
    }
    const cognition = buildReplacementPassACognitionInput({ passAInput: input, envelope });
    if (/genome/iu.test(JSON.stringify(cognition))) fail(`R2 slot ${slot.slot} Pass-A cognition contains genome material`);
    if (Object.hasOwn(cognition.frozenEnvelope, "ordinal")) {
      fail(`R2 slot ${slot.slot} compiler-only envelope ordinal leaked into Pass-A cognition`);
    }
    if (cognition.frozenEnvelope.placeRef !== envelope.placeRef) {
      fail(`R2 slot ${slot.slot} frozen Pass-A cognition envelope lost place authority`);
    }
    witnesses.push({
      slot: slot.slot,
      windowId: window.windowId,
      envelopeStructureRef: envelope.structureRef,
      envelopePlaceRef: envelope.placeRef,
      currentPoolPolicyVersion: input.policyWitness.policyVersion,
      offeredStructureCount: input.offeredStructures.length,
      constrainedWorldPlaceCount: input.world.places.length,
    });
  }
  return witnesses;
}

export function verifyReplacementR2Preflight() {
  const r1 = verifyReplacementV2RedesignPreflight();
  if (r1.status !== "CLEAR_R1_HOLD_CORRECTION_PRE_REVIEW_ZERO_CALL") fail("R2 preflight lost the R1 substrate");
  const authority = verifyReplacementR2ExecutionAuthority({ requireClear: false });
  if (authority.executionAuthorized !== false || authority.status !== "CLEAR_R2_PACKET_COGNITION_HOLD") {
    fail("R2 pre-review authority unexpectedly permits cognition");
  }
  if (existsSync(absolute(authority.outputRoot))) fail("R2 candidate output root already exists before reviewed execution");
  const attemptGuard = replacementAttemptGuardPath(authority.outputRoot);
  if (existsSync(absolute(attemptGuard))) fail("R2 durable one-shot attempt guard already exists before reviewed execution");
  assertNoGenerationCommand();
  const passBProtocolWitness = assertPassBProtocolBinding(authority);
  const situatedLifeBoundary = assertCanonicalSituatedLifeBoundary();
  const richBuilderWitnesses = assertCurrentRichBuilder(authority);
  return Object.freeze({
    status: "CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL",
    r1ProtocolDigest: r1.protocolDigest,
    bindingDigest: authority.bindingDigest,
    clearWitnessStatus: authority.clearWitnessStatus,
    sourcePaths: authority.sourcePaths,
    reviewedEnvelopeDigests: authority.reviewedEnvelopeDigests,
    diagnosticAuthority: authority.diagnosticAuthority,
    passBProtocolWitness,
    situatedLifeBoundary,
    richBuilderWitnesses: Object.freeze(richBuilderWitnesses),
    providerCallsAuthorized: false,
    candidateGenerationAuthorized: false,
    publicationAuthorized: false,
    outputRootAbsent: true,
    attemptGuardAbsent: true,
  });
}

function print(result) {
  console.log("PR39 REPLACEMENT R2 PREFLIGHT: CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL");
  console.log(`R1 protocol: ${result.r1ProtocolDigest}`);
  console.log(`R2 execution binding: ${result.bindingDigest}`);
  console.log(`R2 hostile-review witness: ${result.clearWitnessStatus}`);
  console.log(`Reviewed source paths: ${result.sourcePaths.length}`);
  console.log(`Pass-B protocol: horizons=${result.passBProtocolWitness.historyHorizons.join("/")} treated=${result.passBProtocolWitness.treatedOrdinals.join("/")} sparse-history=bound`);
  console.log(`D3 authority: ${result.diagnosticAuthority.eachOrdinalMinimumCorrectCoreEdges}/5 minimum at both treated ordinals; one ${result.diagnosticAuthority.atLeastOneOrdinalCorrectCoreEdges}/5 required`);
  console.log(`Situated life: canonical=${result.situatedLifeBoundary.atomicBirthUsesCanonicalSituatedLife}; parallel-genesis-table=${result.situatedLifeBoundary.genesisParallelContinuityTable}`);
  result.reviewedEnvelopeDigests.forEach((value, index) => console.log(`${index + 1}. envelope=${value}`));
  for (const item of result.richBuilderWitnesses) {
    console.log(`slot ${item.slot} current-rich-builder=${item.currentPoolPolicyVersion} offers=${item.offeredStructureCount} place=${item.envelopePlaceRef} last-structure=${item.envelopeStructureRef ?? "world_emergent"}`);
  }
  console.log("Replacement R2 cognition: NOT AUTHORIZED");
  console.log("Replacement R2 publication: NOT AUTHORIZED");
  console.log("Preflight made zero provider calls and wrote no life artifacts.");
}

const invokedAsScript = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  try { print(verifyReplacementR2Preflight()); }
  catch (error) {
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exitCode = 1;
  }
}