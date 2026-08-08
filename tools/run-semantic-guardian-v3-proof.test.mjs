import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runSealedSemanticGuardianV3Proof } from "./run-semantic-guardian-v3-proof.mjs";

function response(body, { ok = false, status = 429 } = {}) {
  return {
    ok,
    status,
    headers: { get() { return null; } },
    async json() { return structuredClone(body); },
  };
}

test("terminal billing failure before any judgment blocks once and leaves the acceptance cycle unsealed", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-guardian-terminal-block-"));
  const artifact = join(directory, "evidence.json");
  const journal = join(directory, "judgments.ndjson");
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    return response({
      error: {
        code: "insufficient_quota",
        type: "insufficient_quota",
        message: "You have no credits remaining. Add credits to continue using the API.",
      },
    });
  };

  try {
    const result = await runSealedSemanticGuardianV3Proof({
      environment: { FIBRE_GUARDIAN_OPENAI_API_KEY: "test-key" },
      evidenceArtifactPath: artifact,
      evidenceJournalPath: journal,
    });

    assert.equal(calls, 1, "terminal billing failure must stop provider traffic after one call");
    assert.equal(result.report.status, "blocked");
    assert.equal(result.report.standingDifferentialGatePassed, false);
    assert.equal(result.report.scoreMovementPermitted, false);
    assert.equal(result.report.providerFailure.code, "MODEL_BILLING_QUOTA_EXHAUSTED");
    assert.equal(result.report.providerFailure.retryable, false);
    assert.match(result.report.reason, /add OpenAI API credits/i);
    assert.equal(result.evidenceArtifactPath, null);
    assert.equal(existsSync(artifact), false, "zero-judgment terminal block must not seal an evidence artifact");
    assert.equal(existsSync(journal), false, "temporary terminal-failure journal must be removed after reporting the block");
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});
