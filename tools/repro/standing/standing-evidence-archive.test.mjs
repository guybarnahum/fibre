import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const ARCHIVE = Object.freeze([
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v1.evidence.json",
    id: "history_bends_judgment_standing_gate_v1",
    sha256: "b478850b532ae216eba2f84c84a3da9175cfd5448ff56bb06e51967cd73bd909",
  },
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v2.evidence.json",
    id: "history_bends_judgment_standing_gate_v2",
    sha256: "4952f2de094446687505265c6c6770b3d77d62692aa98df5ecb9d0cd09fb3adb",
  },
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v3.evidence.json",
    id: "history_bends_judgment_standing_gate_v3",
    sha256: "1ca89de7c2f427ae29fdee34bfe894aa8c03b5efc8c325fdc39919b9c2d66e16",
  },
  {
    path: "../artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json",
    id: "history_bends_judgment_standing_gate_v4",
    sha256: "2d56c970f8e8edbd1803c79a687f49e273a6406897dadaddf5286fd20433a586",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v1.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v1",
    sha256: "081a1631778cf2b9ec1121abdd88ef50eb225899163ef89bd45945e84795cb3d",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v2.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v2",
    sha256: "6d19f9f233cbd8f2a4fe19bf966f1ae8de6b1a339244b8a3875b91809a876c9e",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v3.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v3",
    sha256: "7cbd5262ab8ecda45a03e90bade16ce48365a75fe966060dbfeda84f34610796",
  },
  {
    path: "../artifacts/test-results/semantic_guardian_v4_standing_gate_v4.evidence.json",
    id: "semantic_guardian_v4_standing_gate_v4",
    sha256: "6f96a88a86639f4639a14be952a2fc9843ddf75f30164ed63aa0b18763f0733b",
  },
]);

function bytes(entry) {
  const url = new URL(entry.path, import.meta.url);
  assert.equal(existsSync(url), true, `missing sealed evidence bundle: ${entry.id}`);
  return readFileSync(url);
}

function load(entry) {
  return JSON.parse(bytes(entry).toString("utf8"));
}

function sha256(entry) {
  return createHash("sha256").update(bytes(entry)).digest("hex");
}

test("every canonical standing evidence bundle matches its pinned SHA-256", () => {
  for (const entry of ARCHIVE) {
    assert.equal(sha256(entry), entry.sha256, `${entry.id}: sealed evidence SHA-256 mismatch`);
  }
});

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

test("standing evidence archive contains no credential-shaped keys or values", () => {
  const credentialKeyPattern =
    /(?:apikey|openaikey|anthropickey|googlekey|accesskey|secret|password|credential|privatekey|bearertoken|authorizationheader|token)$/i;
  const credentialValuePatterns = [
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
    /\bAIza[0-9A-Za-z_-]{30,}\b/,
    /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  ];

  function walk(value, path = []) {
    if (typeof value === "string") {
      for (const pattern of credentialValuePatterns) {
        assert.equal(
          pattern.test(value),
          false,
          `credential-shaped value found at ${path.join(".")}`,
        );
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, index]));
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = key.replace(/[^a-z0-9]/gi, "");
      assert.equal(
        credentialKeyPattern.test(normalizedKey),
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
