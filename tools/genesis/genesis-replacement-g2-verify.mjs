#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { verifyG2GenomeFreeze } from "./genesis-cohort-genome-ceiling.mjs";

export const REPLACEMENT_G2_PROTOCOL_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-cohort-genome-freeze-v1.json";

export function verifyReplacementG2Freeze() {
  const verified = verifyG2GenomeFreeze({ protocolPath: REPLACEMENT_G2_PROTOCOL_PATH });
  if (verified.protocol.replacementAttemptVersion !== "pr39-replacement-cohort-v1") {
    throw new Error("replacement G2 attempt version drift");
  }
  if (verified.protocol.materialVersion !== "pr39-replacement-g2-material-v1") {
    throw new Error("replacement G2 material version drift");
  }
  if (verified.protocol.inheritedAuthority?.empiricalOldG2PairResultsInherited !== false) {
    throw new Error("replacement G2 must not inherit old empirical pair results");
  }
  if (verified.protocol.downstreamBoundary?.finalLifeCognitionAuthorized !== false ||
      verified.protocol.downstreamBoundary?.freshG2CeilingRequiredBeforeGateG2 !== true ||
      verified.protocol.downstreamBoundary?.oldEmpiricalPairDetectabilityMayBeAppliedToReplacementGenomes !== false) {
    throw new Error("replacement G2 downstream boundary drift");
  }
  return verified;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 1 && args[0] === "--verify")) {
    throw new Error("usage: genesis-replacement-g2-verify.mjs [--verify]");
  }
  const verified = verifyReplacementG2Freeze();
  process.stdout.write("PR39 REPLACEMENT G2 FREEZE: CLEAR — ZERO CALL\n\n");
  process.stdout.write(`Protocol digest: ${verified.protocolDigest}\n`);
  process.stdout.write(`Bindings: ${verified.protocol.worldBindings.length}\n`);
  process.stdout.write(`Mapping: ${verified.protocol.assignmentPolicy.mapping.map(({ cohortSlot, genomeSourceSlot }) => `${cohortSlot}<-${genomeSourceSlot}`).join(" ")}\n`);
  for (const lineage of verified.lineageEvidence) {
    process.stdout.write(`Synthetic slot ${lineage.slot} <- source ${lineage.genomeSourceSlot} · contribution ${lineage.contributionCounts.join("+")}\n`);
  }
  process.stdout.write("Fresh G2 ceiling is required next.\n");
  process.stdout.write("Final-life cognition remains unauthorized.\n");
  process.stdout.write("\nVerifier made zero provider calls.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
