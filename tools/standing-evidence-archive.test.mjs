import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const ARCHIVE = Object.freeze([
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v1.evidence.json",
    id: "history_bends_judgment_standing_gate_v1",
  },
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v2.evidence.json",
    id: "history_bends_judgment_standing_gate_v2",
  },
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v3.evidence.json",
    id: "history_bends_judgment_standing_gate_v3",
  },
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json",
    id: "history_bends_judgment_standing_gate_v4",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v1.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v1",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v2.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v2",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v3.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v3",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v4.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v4",
  },
]);

function load(entry) {
  const url = new URL(entry.path, import.meta.url);
  assert.equal(existsSync(url), true, `missing sealed evidence bundle: ${entry.id}`);
  return JSON.parse(readFileSync(url, "utf8"));
}

test("every canonical standing cycle retains a committed sealed evidence bundle", () => {
  for (const entry of ARCHIVE) {
    const bundle = load(entry);
    assert.equal(bundle.acceptanceSetId, entry.id, `${entry.id}: acceptanceSetId mismatch`);
    assert.equal(bundle.cycleSealed, true, `${entry.id}: cycle must be sealed`);
    assert.ok(bundle.frozenCandidateId, `${entry.id}: missing frozenCandidateId`);
    assert.ok(bundle.report, `${entry.id}: missing report`);
    assert.equal(
      bundle.report.acceptanceSetId,
      entry.id,
      `${entry.id}: report acceptanceSetId mismatch`,
    );
    assert.ok(bundle.report.modelId, `${entry.id}: missing modelId`);
  }
});

test("standing evidence archive contains no credential-shaped keys", () => {
  const forbiddenKeys = new Set([
    "apikey",
    "api_key",
    "authorizationheader",
    "authorization_header",
    "bearertoken",
    "bearer_token",
  ]);

  function walk(value, path = []) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, index]));
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(
        forbiddenKeys.has(key.toLowerCase()),
        false,
        `credential-shaped key found at ${[...path, key].join(".")}`,
      );
      walk(child, [...path, key]);
    }
  }

  for (const entry of ARCHIVE) walk(load(entry));
});

test("accepted standing bundles retain the machine evidence used for score movement", () => {
  const history = load(ARCHIVE.find((entry) => entry.id.endsWith("history_bends_judgment_standing_gate_v4")) ?? ARCHIVE[3]);
  assert.equal(history.report.status, "passed");
  assert.equal(history.report.standingGatePassed, true);
  assert.ok(history.report.withHistory?.rationale);
  assert.ok(history.report.withoutHistory?.rationale);
  assert.ok(history.report.counterfactual?.requestFingerprint);

  const guardian = load(ARCHIVE[7]);
  assert.equal(guardian.report.status, "passed");
  assert.equal(guardian.report.casesAttempted, guardian.report.casesPlanned);
  assert.ok(guardian.report.promptHash);
  assert.ok(guardian.report.responseSchemaGeneratorHash);
});
