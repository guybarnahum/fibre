import assert from "node:assert/strict";
import test from "node:test";

import {
  retiredTestArtifactPaths,
  validateDocumentIntegrity,
} from "./document-integrity.mjs";

test("tracked documentation has unique canonical identities, resolvable current paths, and no retired artifact references", () => {
  assert.deepEqual(validateDocumentIntegrity(), []);
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
