import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  PR39_CLOSURE_ATTEMPT_VERSION,
  pr39ClosureAttemptPath,
  readPr39ClosureAttempt,
  runClaimedPr39ClosureGeneration,
} from "./genesis-pr39-closure-authority.mjs";

function args(stateRoot, generate) {
  return {
    stateRoot,
    closureId: "pr39-final-cohort-001",
    codeHead: "abc123",
    precommitmentDigest: `sha256:${"1".repeat(64)}`,
    modelId: "gpt-5.1-2025-11-13",
    claimedAt: "2026-08-25T20:15:00.000Z",
    generate,
  };
}

test("PR39 closure claim is persisted before generation and is readable", async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-pr39-closure-"));
  let observedClaim = null;
  const result = await runClaimedPr39ClosureGeneration(args(stateRoot, async (claim) => {
    observedClaim = claim;
    assert.deepEqual(readPr39ClosureAttempt({ stateRoot }), claim);
    return "generated";
  }));

  assert.equal(result, "generated");
  assert.equal(observedClaim.version, PR39_CLOSURE_ATTEMPT_VERSION);
  assert.equal(observedClaim.status, "CLAIMED_ONE_PASS_CLOSURE_COHORT");
  assert.equal(JSON.parse(readFileSync(pr39ClosureAttemptPath(stateRoot), "utf8")).closureId, "pr39-final-cohort-001");
});

test("PR39 closure claim refuses a second generation before its callback can run", async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-pr39-closure-"));
  let firstCalls = 0;
  let secondCalls = 0;

  await runClaimedPr39ClosureGeneration(args(stateRoot, async () => {
    firstCalls += 1;
    return null;
  }));

  await assert.rejects(
    runClaimedPr39ClosureGeneration(args(stateRoot, async () => {
      secondCalls += 1;
      return null;
    })),
    /second closure generation is forbidden/u,
  );

  assert.equal(firstCalls, 1);
  assert.equal(secondCalls, 0);
});
