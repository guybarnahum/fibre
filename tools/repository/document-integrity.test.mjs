import assert from "node:assert/strict";
import test from "node:test";

import {
  declaredGeneratedRepoPaths,
  retiredTestArtifactPaths,
  validateDocumentIntegrity,
} from "./document-integrity.mjs";

test("tracked documentation has unique canonical identities, resolvable current paths, and no retired artifact references", () => {
  assert.deepEqual(validateDocumentIntegrity(), []);
});

test("declared context-pack outputs may be absent from a clean checkout", () => {
  const generated = declaredGeneratedRepoPaths();
  for (const path of [
    "artifacts/generated/fibre-core-context.md",
    "artifacts/generated/fibre-request-processing-context.md",
    "artifacts/generated/fibre-full-context.md",
    "artifacts/generated/fibre-context-pack.md",
  ]) {
    assert.ok(generated.has(path), `${path} must remain declared by docs/ai-context-manifest.json`);
  }
});

test("retired generated-evidence file references are detected even inside fenced text", () => {
  assert.deepEqual(
    retiredTestArtifactPaths([
      "Current prose: `artifacts/test-results/current.evidence.json`",
      "```text",
      "artifacts/test-results/fenced-report.json",
      "```",
      "Policy may still name the directory `artifacts/test-results/` without naming a retained file.",
    ].join("\n")),
    [
      "artifacts/test-results/current.evidence.json",
      "artifacts/test-results/fenced-report.json",
    ],
  );
});
