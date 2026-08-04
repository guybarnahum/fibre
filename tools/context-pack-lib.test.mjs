import assert from "node:assert/strict";
import test from "node:test";
import { validateContextManifest } from "./context-pack-lib.mjs";

function manifestWithOutput(output) {
  return {
    version: 1,
    canonical: true,
    profiles: {
      core: {
        title: "Core",
        description: "Test profile.",
        output,
        sources: ["package.json"]
      }
    }
  };
}

test("context output rejects forward-slash traversal", () => {
  assert.throws(
    () => validateContextManifest(manifestWithOutput("artifacts/generated/../../../outside.md")),
    /must not escape|must remain under/,
  );
});

test("context output rejects backslash traversal on POSIX", () => {
  assert.throws(
    () => validateContextManifest(manifestWithOutput("artifacts/generated/..\\..\\..\\outside.md")),
    /must not escape|must remain under/,
  );
});

test("context output accepts a Markdown file under generated artifacts", () => {
  const manifest = manifestWithOutput("artifacts/generated/test-context.md");
  assert.equal(
    validateContextManifest(manifest).profiles.core.output,
    "artifacts/generated/test-context.md",
  );
});
