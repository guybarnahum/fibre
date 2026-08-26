// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: zero-provider-call readiness check for the frozen PR39 final cohort
// fibre-tool-disposition: retire after PR39; retain summarized precommitment in milestone history

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
import {
  PR39_CLOSURE_COMPLETION_VERSION,
  assertPr39ClosureClaimMatchesExecution,
  readPr39ClosureAttempt,
  readPr39ClosureCompletion,
} from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";

function fail(message) { throw new Error(message); }
function absolute(path) { return fileURLToPath(repoFile(path)); }
function gitHead() { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: absolute("."), encoding: "utf8" }).trim(); }
function validDigest(value) { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value); }

const frozen = loadPr39ClosureFinalization();
const stateRoot = absolute(".fibre/genesis/pr39-closure");
const existingAttempt = readPr39ClosureAttempt({ stateRoot });
const completion = readPr39ClosureCompletion({ stateRoot });
const head = gitHead();
const expectedModel = frozen.precommitment.protocol.sampling.generatorModel;
let compatibleAttempt = null;

if (existingAttempt !== null) {
  compatibleAttempt = assertPr39ClosureClaimMatchesExecution({
    claim: existingAttempt,
    closureId: frozen.finalization.closureId,
    codeHead: head,
    precommitmentDigest: frozen.finalizationDigest,
    modelId: expectedModel,
  });
}
if (completion !== null) {
  if (compatibleAttempt === null) fail("PR39 closure completion exists without its claimed attempt");
  if (
    completion.version !== PR39_CLOSURE_COMPLETION_VERSION ||
    completion.status !== "COMPLETED_ONE_PASS_CLOSURE_COHORT" ||
    completion.closureId !== compatibleAttempt.closureId ||
    completion.codeHead !== compatibleAttempt.codeHead ||
    completion.precommitmentDigest !== compatibleAttempt.precommitmentDigest ||
    completion.modelId !== compatibleAttempt.modelId
  ) {
    fail("PR39 closure completion does not match the frozen claimed attempt");
  }
  if (
    !Array.isArray(completion.candidateDigests) ||
    completion.candidateDigests.length !== 5 ||
    completion.candidateDigests.some((value) => !validDigest(value)) ||
    new Set(completion.candidateDigests).size !== 5
  ) {
    fail("PR39 closure completion candidate digest set is invalid");
  }
}

console.log("PR39 CLOSURE FINALIZATION: READY");
console.log(`Closure ID: ${frozen.finalization.closureId}`);
console.log(`Code HEAD: ${head}`);
console.log(`Model: ${expectedModel}`);
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
else if (compatibleAttempt !== null) console.log(`Closure generation state: CLAIMED/INCOMPLETE since ${compatibleAttempt.claimedAt} · compatible with current frozen execution`);
else console.log("Closure generation state: NOT YET CLAIMED");
console.log(`Runner: ${frozen.finalization.runnerCommand}`);
