// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: zero-provider-call readiness check for the frozen PR39 final cohort
// fibre-tool-disposition: retire after PR39; retain summarized precommitment in milestone history

import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
import {
  readPr39ClosureAttempt,
  readPr39ClosureCompletion,
} from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";

const frozen = loadPr39ClosureFinalization();
const stateRoot = fileURLToPath(repoFile(".fibre/genesis/pr39-closure"));
const existingAttempt = readPr39ClosureAttempt({ stateRoot });
const completion = readPr39ClosureCompletion({ stateRoot });

console.log("PR39 CLOSURE FINALIZATION: READY");
console.log(`Closure ID: ${frozen.finalization.closureId}`);
console.log(`Original World-before-genome precommitment: ${frozen.precommitment.precommitmentDigest}`);
console.log(`Frozen finalization digest: ${frozen.finalizationDigest}`);
console.log("Final cohort bindings:");
for (const slot of frozen.plans.fixture.slots) {
  console.log(`  slot ${slot.slot}: ${slot.label} · world ${slot.worldBlobSha} · genome ${slot.genomeDigest}`);
}
console.log(`Convergent pair: ${frozen.precommitment.protocol.convergentPair.labels.join(" + ")}`);
console.log("Diagnostics: D1 raw+normalized attribution · D2 sentiment coupling · D3 genome propagation · D4 life funnel · D5 self-account overreach");
console.log(`Expected Pass-B calls: ${frozen.precommitment.protocol.passBExpectedCells.totalCalls} total`);
console.log("One-pass claim: a completed cohort cannot be regenerated; an interrupted matching claim may only resume through durable replay/recovery");
console.log("Provider calls made: 0");
console.log(`Final genome assignment: ${frozen.finalization.finalGenomeAssignmentStatus}`);
console.log(`Generation authorized: ${frozen.finalization.generationAuthorized ? "YES" : "NO"}`);
if (completion !== null) console.log(`Closure generation state: COMPLETE at ${completion.completedAt}`);
else if (existingAttempt !== null) console.log(`Closure generation state: CLAIMED/INCOMPLETE since ${existingAttempt.claimedAt}`);
else console.log("Closure generation state: NOT YET CLAIMED");
console.log(`Runner: ${frozen.finalization.runnerCommand}`);
