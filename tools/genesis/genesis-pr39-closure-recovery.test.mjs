import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { claimPr39ClosureAttempt } from "./genesis-pr39-closure-authority.mjs";
import {
  PR39_CLOSURE_ORIGINAL_CLAIM_HEAD,
  assertPr39ClosureRecoveryMatchesExecution,
  authorizePr39ClosureRecovery,
} from "./genesis-pr39-closure-recovery.mjs";

test("PR39 recovery amendment binds one changed execution HEAD to the preserved original claim", () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-pr39-recovery-"));
  const digest = `sha256:${"1".repeat(64)}`;
  const modelId = "gpt-5.1-2025-11-13";
  const claim = claimPr39ClosureAttempt({
    stateRoot,
    closureId: "pr39-final-cohort-001",
    codeHead: PR39_CLOSURE_ORIGINAL_CLAIM_HEAD,
    precommitmentDigest: digest,
    modelId,
    claimedAt: "2026-08-26T22:34:02.418Z",
  });

  const amendment = authorizePr39ClosureRecovery({
    stateRoot,
    claim,
    recoveryCodeHead: "recovery-head-001",
    finalizationDigest: digest,
    modelId,
    authorizedAt: "2026-08-26T23:10:00.000Z",
  });
  const matched = assertPr39ClosureRecoveryMatchesExecution({
    stateRoot,
    claim,
    currentCodeHead: "recovery-head-001",
    finalizationDigest: digest,
    modelId,
  });

  assert.equal(matched.mode, "recovery");
  assert.deepEqual(matched.amendment, amendment);
  assert.throws(
    () => assertPr39ClosureRecoveryMatchesExecution({
      stateRoot,
      claim,
      currentCodeHead: "different-recovery-head",
      finalizationDigest: digest,
      modelId,
    }),
    /does not match this frozen execution/,
  );
});
