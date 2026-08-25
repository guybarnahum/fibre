// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: zero-provider-call readiness check for PR39 final-cohort precommitment
// fibre-tool-disposition: retire after PR39; retain summarized precommitment in milestone history

import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
import { readPr39ClosureAttempt } from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosurePrecommitment } from "./genesis-pr39-closure-protocol.mjs";

const precommitment = loadPr39ClosurePrecommitment();
const stateRoot = fileURLToPath(repoFile(".fibre/genesis/pr39-closure"));
const existingAttempt = readPr39ClosureAttempt({ stateRoot });

if (existingAttempt !== null) {
  throw new Error(`PR39 closure attempt is already claimed by ${existingAttempt.closureId}`);
}

console.log("PR39 CLOSURE PRECOMMITMENT: READY, GENERATION LOCKED");
console.log(`Closure ID: ${precommitment.protocol.closureId}`);
console.log(`Precommitment digest: ${precommitment.precommitmentDigest}`);
console.log("Final Worlds (frozen before final genome assignment):");
for (const world of precommitment.worlds) {
  console.log(`  slot ${world.slot}: ${world.label} · ${world.world.worldSpecId} · ${world.worldDigest}`);
}
console.log(`Convergent pair: ${precommitment.protocol.convergentPair.labels.join(" + ")}`);
console.log("Diagnostics: D1 raw+normalized life attribution · D2 sentiment coupling · D3 genome propagation · D4 life funnel · D5 self-account overreach");
console.log(`Expected Pass-B calls: ${precommitment.protocol.passBExpectedCells.totalCalls} total · 10 clean life_only_unexposed · 10 life_plus_genome · 10 later life_only`);
console.log("One-pass claim: second closure generation forbidden; weak valid cohort cannot be resampled");
console.log("Provider calls made: 0");
console.log(`Final genome assignment: ${precommitment.protocol.finalGenomeAssignmentStatus}`);
console.log(`Generation authorized: ${precommitment.protocol.generationAuthorized ? "YES" : "NO"}`);
if (!precommitment.protocol.generationAuthorized) {
  console.log(`Remaining locks: ${precommitment.protocol.generationBlockers.join(", ")}`);
}
