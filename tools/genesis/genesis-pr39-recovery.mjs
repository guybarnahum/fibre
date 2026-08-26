// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: zero-provider authorization of the one explicit PR39 recovery execution
// fibre-tool-disposition: retire after PR39; retain summarized recovery in milestone history

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
import {
  readPr39ClosureAttempt,
} from "./genesis-pr39-closure-authority.mjs";
import {
  PR39_CLOSURE_ORIGINAL_CLAIM_HEAD,
  authorizePr39ClosureRecovery,
} from "./genesis-pr39-closure-recovery.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";

function fail(message) { throw new Error(message); }
function absolute(path) { return fileURLToPath(repoFile(path)); }
function git(args) { return execFileSync("git", args, { cwd: absolute("."), encoding: "utf8" }).trim(); }

const ALLOWED_RECOVERY_PATHS = Object.freeze([
  "docs/ai-context-manifest.json",
  "docs/architecture/model-output-recovery.md",
  "docs/architecture/system-overview.md",
  "packages/model-runtime/",
  "services/world-kernel/src/model-runtime/openai.mjs",
  "services/world-kernel/test/openai-structured-schema-projection.test.mjs",
  "tools/genesis/genesis-pr39-closure-recovery.mjs",
  "tools/genesis/genesis-pr39-closure-recovery.test.mjs",
  "tools/genesis/genesis-pr39-recovery.mjs",
  "tools/genesis/genesis-pr39-closure.mjs",
  "tools/genesis/genesis-pr39-closure-check.mjs",
  "package.json",
]);

function allowedPath(path) {
  return ALLOWED_RECOVERY_PATHS.some((allowed) =>
    allowed.endsWith("/") ? path.startsWith(allowed) : path === allowed);
}

function parseArgs(argv) {
  if (argv.length !== 1 || argv[0] !== "--authorize") {
    fail("PR39 recovery requires explicit --authorize");
  }
}

parseArgs(process.argv.slice(2));
const frozen = loadPr39ClosureFinalization();
const stateRoot = absolute(".fibre/genesis/pr39-closure");
const claim = readPr39ClosureAttempt({ stateRoot });
if (claim === null) fail("PR39 recovery requires the preserved original closure claim");
if (claim.codeHead !== PR39_CLOSURE_ORIGINAL_CLAIM_HEAD) fail("PR39 recovery original claim HEAD drift");

const dirty = git(["status", "--porcelain"]);
if (dirty !== "") fail("PR39 recovery authorization requires a clean Git working tree");

const head = git(["rev-parse", "HEAD"]);
if (head === PR39_CLOSURE_ORIGINAL_CLAIM_HEAD) fail("PR39 recovery code has not advanced from the blocking execution");
try {
  git(["merge-base", "--is-ancestor", PR39_CLOSURE_ORIGINAL_CLAIM_HEAD, head]);
} catch {
  fail("PR39 recovery HEAD is not a descendant of the original claimed execution");
}

const changedPaths = git(["diff", "--name-only", `${PR39_CLOSURE_ORIGINAL_CLAIM_HEAD}..${head}`])
  .split("\n")
  .filter(Boolean);
const unexpected = changedPaths.filter((path) => !allowedPath(path));
if (unexpected.length > 0) {
  fail(`PR39 recovery contains changes outside the authorized mechanical-recovery surface: ${unexpected.join(", ")}`);
}

const expectedModel = frozen.precommitment.protocol.sampling.generatorModel;
const amendment = authorizePr39ClosureRecovery({
  stateRoot,
  claim,
  recoveryCodeHead: head,
  finalizationDigest: frozen.finalizationDigest,
  modelId: expectedModel,
  authorizedAt: new Date().toISOString(),
});

console.log("PR39 CLOSURE RECOVERY: AUTHORIZED");
console.log(`Closure: ${amendment.closureId}`);
console.log(`Original claim HEAD: ${amendment.originalCodeHead}`);
console.log(`Recovery execution HEAD: ${amendment.recoveryCodeHead}`);
console.log(`Finalization: ${amendment.finalizationDigest}`);
console.log(`Model: ${amendment.modelId}`);
console.log(`Blocking failure: slot 2 Kochi · Pass B · ${amendment.blockingFailure.path} ${amendment.blockingFailure.constraint} · observed twice`);
console.log(`Changed paths verified: ${changedPaths.length}`);
console.log("Frozen cohort/science: unchanged");
console.log("Provider calls made: 0");
