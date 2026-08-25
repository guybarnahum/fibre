import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("declared generated context outputs may be documented before generation but undeclared paths still fail", () => {
  const root = mkdtempSync(join(tmpdir(), "fibre-document-integrity-"));
  try {
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "docs/ai-context-manifest.json"), JSON.stringify({
      profiles: {
        core: {
          output: "artifacts/generated/fibre-core-context.md",
          aliases: ["artifacts/generated/fibre-context-pack.md"],
        },
      },
    }));
    writeFileSync(
      join(root, "README.md"),
      "Generated outputs: `artifacts/generated/fibre-core-context.md` and `artifacts/generated/fibre-context-pack.md`.\n",
    );

    assert.deepEqual(validateDocumentIntegrity({ root, markdownPaths: ["README.md"] }), []);

    writeFileSync(
      join(root, "README.md"),
      "Missing current path: `artifacts/generated/not-declared.md`.\n",
    );
    assert.deepEqual(validateDocumentIntegrity({ root, markdownPaths: ["README.md"] }), [
      "Missing documented repository path in README.md: artifacts/generated/not-declared.md",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
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
