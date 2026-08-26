import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  completePr39ClosureAttempt,
  openOrResumePr39ClosureAttempt,
  readPr39ClosureCompletion,
} from "./genesis-pr39-closure-authority.mjs";

function args(stateRoot) {
  return {
    stateRoot,
    closureId: "pr39-final-cohort-001",
    codeHead: "abc123",
    precommitmentDigest: `sha256:${"1".repeat(64)}`,
    modelId: "gpt-5.1-2025-11-13",
    claimedAt: "2026-08-25T23:19:00Z",
  };
}

function candidateDigests() {
  return Array.from({ length: 5 }, (_, index) => `sha256:${String(index + 1).repeat(64)}`);
}

function fabricatedClaim(stateRoot) {
  return {
    ...args(stateRoot),
    version: "pr39-closure-attempt-v1",
    status: "CLAIMED_ONE_PASS_CLOSURE_COHORT",
  };
}

test("matching interrupted PR39 closure may resume without minting a second attempt", () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-pr39-resume-"));
  const first = openOrResumePr39ClosureAttempt(args(stateRoot));
  assert.equal(first.resumed, false);
  const second = openOrResumePr39ClosureAttempt({ ...args(stateRoot), claimedAt: "2026-08-26T00:00:00Z" });
  assert.equal(second.resumed, true);
  assert.deepEqual(second.claim, first.claim);
});

test("different frozen execution cannot reuse an interrupted PR39 closure claim", () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-pr39-resume-"));
  openOrResumePr39ClosureAttempt(args(stateRoot));
  assert.throws(
    () => openOrResumePr39ClosureAttempt({ ...args(stateRoot), codeHead: "different" }),
    /different frozen execution/u,
  );
});

test("closure completion requires the exact stored claimed attempt", () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-pr39-resume-"));
  assert.throws(() => completePr39ClosureAttempt({
    stateRoot,
    claim: fabricatedClaim(stateRoot),
    candidateDigests: candidateDigests(),
    completedAt: "2026-08-26T01:00:00Z",
  }), /existing claimed attempt/u);

  const opened = openOrResumePr39ClosureAttempt(args(stateRoot));
  assert.throws(() => completePr39ClosureAttempt({
    stateRoot,
    claim: { ...opened.claim, claimedAt: "2026-08-26T00:00:00Z" },
    candidateDigests: candidateDigests(),
    completedAt: "2026-08-26T01:00:00Z",
  }), /does not match the stored claimed attempt/u);
});

test("completed PR39 closure permanently refuses another generation", () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-pr39-resume-"));
  const opened = openOrResumePr39ClosureAttempt(args(stateRoot));
  const completion = completePr39ClosureAttempt({
    stateRoot,
    claim: opened.claim,
    candidateDigests: candidateDigests(),
    completedAt: "2026-08-26T01:00:00Z",
  });
  assert.deepEqual(readPr39ClosureCompletion({ stateRoot }), completion);
  assert.throws(() => openOrResumePr39ClosureAttempt(args(stateRoot)), /already complete/u);
});
