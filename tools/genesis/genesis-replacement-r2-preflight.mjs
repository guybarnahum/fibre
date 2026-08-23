#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildRichLifePassAInput,
  syntheticLineageWitnessFromRecombinedGenome,
} from "../../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { buildReplacementPassACognitionInput } from "../../services/world-kernel/src/genesis-replacement-pass-a.mjs";
import { assertReplacementPassBSchedule } from "../../services/world-kernel/src/genesis-replacement-pass-b.mjs";
import { verifyReplacementV2RedesignPreflight } from "./genesis-replacement-v2-redesign-preflight.mjs";
import { verifyReplacementR2ExecutionAuthority } from "./genesis-replacement-execution-authority.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
function absolute(path) { return resolve(ROOT, path); }
function fail(message) { throw new Error(message); }

function assertNoGenerationCommand() {
  const pkg = JSON.parse(readFileSync(absolute("package.json"), "utf8"));
  const forbidden = Object.keys(pkg.scripts ?? {}).filter((name) => /^genesis:replacement.*(?:run|generate|execute)/u.test(name));
  if (forbidden.length !== 0) fail(`R2 pre-review package exposes generation command(s): ${forbidden.join(", ")}`);
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
    const input = buildRichLifePassAInput({
      originMode: slot.originMode,
      syntheticLineageWitness: lineageWitness,
      worldSpec: slot.worldSpec,
      subject: { provisionalThreadId: slot.threadId, bornAt: slot.bornAt },
      developmentalWindow: window,
      chronologyEndsAt: envelope.occurredAt,
      initialRoster: slot.roster.participants,
      priorEpisodes: [],
      previouslyIntroducedParticipants: [],
      offeredEntries,
    });
    if (!/event-structure-pool-v3/u.test(input.policyWitness.policyVersion)) {
      fail(`R2 slot ${slot.slot} rich-life compiler is not on the current EventStructure pool`);
    }
    if (envelope.structureRef !== null && !input.offeredStructures.some((item) => item.structureId === envelope.structureRef)) {
      fail(`R2 slot ${slot.slot} reviewed envelope structure is absent from current Pass-A offers`);
    }
    const cognition = buildReplacementPassACognitionInput({ passAInput: input, envelope });
    if (/genome/iu.test(JSON.stringify(cognition))) fail(`R2 slot ${slot.slot} Pass-A cognition contains genome material`);
    witnesses.push({
      slot: slot.slot,
      windowId: window.windowId,
      envelopeStructureRef: envelope.structureRef,
      currentPoolPolicyVersion: input.policyWitness.policyVersion,
      offeredStructureCount: input.offeredStructures.length,
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
  assertNoGenerationCommand();
  assertReplacementPassBSchedule({ historyLength: 14 });
  const richBuilderWitnesses = assertCurrentRichBuilder(authority);
  return Object.freeze({
    status: "CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL",
    r1ProtocolDigest: r1.protocolDigest,
    bindingDigest: authority.bindingDigest,
    clearWitnessStatus: authority.clearWitnessStatus,
    sourcePaths: authority.sourcePaths,
    reviewedEnvelopeDigests: authority.reviewedEnvelopeDigests,
    diagnosticAuthority: authority.diagnosticAuthority,
    richBuilderWitnesses: Object.freeze(richBuilderWitnesses),
    providerCallsAuthorized: false,
    candidateGenerationAuthorized: false,
    publicationAuthorized: false,
    outputRootAbsent: true,
  });
}

function print(result) {
  console.log("PR39 REPLACEMENT R2 PREFLIGHT: CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL");
  console.log(`R1 protocol: ${result.r1ProtocolDigest}`);
  console.log(`R2 execution binding: ${result.bindingDigest}`);
  console.log(`R2 hostile-review witness: ${result.clearWitnessStatus}`);
  console.log(`Reviewed source paths: ${result.sourcePaths.length}`);
  console.log(`D3 authority: ${result.diagnosticAuthority.eachOrdinalMinimumCorrectCoreEdges}/5 minimum at both treated ordinals; one ${result.diagnosticAuthority.atLeastOneOrdinalCorrectCoreEdges}/5 required`);
  result.reviewedEnvelopeDigests.forEach((value, index) => console.log(`${index + 1}. envelope=${value}`));
  for (const item of result.richBuilderWitnesses) {
    console.log(`slot ${item.slot} current-rich-builder=${item.currentPoolPolicyVersion} offers=${item.offeredStructureCount} last-structure=${item.envelopeStructureRef ?? "world_emergent"}`);
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
