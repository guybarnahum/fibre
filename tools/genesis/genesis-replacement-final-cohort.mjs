#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  REPLACEMENT_CORE_PATH,
  REPLACEMENT_EXECUTION_BINDING_PATH,
  verifyReplacementInheritedAuthorityBinding,
} from "./genesis-replacement-inherited-authority.mjs";
import {
  verifyReplacementFinalCohortPreflight as verifyCoreReplacementFinalCohortPreflight,
  runReplacementFinalCohort as runCoreReplacementFinalCohort,
} from "./genesis-replacement-final-cohort-core.mjs";

export { REPLACEMENT_CORE_PATH, REPLACEMENT_EXECUTION_BINDING_PATH, verifyReplacementInheritedAuthorityBinding };

function fail(message) { throw new Error(message); }

export function verifyReplacementFinalCohortPreflight(options = {}) {
  const inheritedAuthority = verifyReplacementInheritedAuthorityBinding();
  const core = verifyCoreReplacementFinalCohortPreflight(options);
  return Object.freeze({ ...core, inheritedAuthority });
}

export async function runReplacementFinalCohort() {
  verifyReplacementFinalCohortPreflight({ requireGateClear: true });
  return runCoreReplacementFinalCohort();
}

function printPreflight(result) {
  process.stdout.write(`PR39 REPLACEMENT FINAL COHORT PREFLIGHT: ${result.status}\n\n`);
  process.stdout.write(`Execution binding digest: ${result.executionBindingDigest}\n`);
  process.stdout.write(`Inherited authority: ${result.inheritedAuthority.status} — ZERO CALL\n`);
  process.stdout.write(`Generation core blob: ${result.inheritedAuthority.coreBlobSha}\n`);
  process.stdout.write(`G3 production: ${result.inheritedAuthority.g3ProductionDigest}\n`);
  process.stdout.write(`G3 analysis: ${result.inheritedAuthority.g3AnalysisDigest}\n`);
  process.stdout.write(`G4 base: ${result.inheritedAuthority.g4BaseDigest}\n`);
  process.stdout.write(`G4-v3 prompt: ${result.inheritedAuthority.g4v3PromptHash}\n`);
  process.stdout.write(`G5: ${result.inheritedAuthority.g5Digest}\n`);
  process.stdout.write(`G6: ${result.inheritedAuthority.g6Digest}\n`);
  process.stdout.write(`Pass-B input helper blob: ${result.inheritedAuthority.hPassBHelperBlobSha}\n`);
  process.stdout.write(`Post-generation uncertainty scan required: ${result.inheritedAuthority.residualIntegrity.uncertaintyPostGenerationScanRequired}\n`);
  process.stdout.write(`Gate-G(2): ${result.gateStatus}\n`);
  process.stdout.write(`Final-life cognition: ${result.executionAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED"}\n`);
  process.stdout.write(`Generation policy: ${result.generationPolicyVersion} · form=${result.generationPolicy.maxFormRepairsPerRecord} · record=${result.generationPolicy.maxRecordRetriesPerRecord} · total=${result.generationPolicy.maxTotalGeneratedVersionsPerRecord}\n`);
  process.stdout.write(`Runtime: ${result.runtime.provider}/${result.runtime.modelId}\n`);
  process.stdout.write(`Offer seed domain: ${result.eventStructureSeedDomain}\n`);
  process.stdout.write(`Client request domain: ${result.clientRequestDomain}\n`);
  process.stdout.write(`Output root: ${result.oneShot.outputRoot}${result.outputState.rootExists ? " [exists]" : " [absent]"}\n`);
  process.stdout.write(`Process-restart replay: enabled; host-crash fsync durability claimed: ${result.durability.hostCrashFsyncDurabilityClaimed}\n\n`);
  for (const slot of result.slots) {
    process.stdout.write(`${slot.slot}. ${slot.threadId} · ${slot.originMode} · ${slot.worldSpecId} · genome=${slot.genomeId} · roster=${slot.rosterSize}\n`);
    process.stdout.write(`   Pass A=${slot.passAEpisodes}; Pass B=${slot.passBHorizons.join("/")}; modes=${slot.passBModes.map((mode) => mode === "life_plus_genome" ? "T" : "L").join(" ")}\n`);
  }
  process.stdout.write("\nPreflight made zero provider calls and wrote no replacement life artifacts.\n");
}

function usage() {
  process.stdout.write("Usage: node tools/genesis/genesis-replacement-final-cohort.mjs --preflight\n       node tools/genesis/genesis-replacement-final-cohort.mjs\n\nThe shared replacement authority gate is invoked by both this operator entrypoint and the import-only generation core. --preflight makes zero provider calls and writes nothing. Execution remains blocked until a bound Gate-G(2) CLEAR witness exists.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) return usage();
  const unknown = args.filter((arg) => arg !== "--preflight");
  if (unknown.length !== 0) fail(`unsupported replacement argument(s): ${unknown.join(", ")}`);
  if (args.includes("--preflight")) {
    printPreflight(verifyReplacementFinalCohortPreflight());
    return;
  }
  const result = await runReplacementFinalCohort();
  process.stdout.write(`\nPR39 REPLACEMENT FINAL COHORT: ${result.status}\n`);
  process.stdout.write(`Result: ${result.preflight.oneShot.resultPath}\n`);
  process.stdout.write(`Database: ${result.databasePath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
