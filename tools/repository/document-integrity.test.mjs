import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { validateDocumentIntegrity } from "./document-integrity.mjs";

test("tracked documentation has unique canonical identities and resolvable current paths", () => {
  assert.deepEqual(validateDocumentIntegrity(), []);
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
