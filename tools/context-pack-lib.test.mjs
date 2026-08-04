import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateContextManifest } from "./context-pack-lib.mjs";

function manifestWithOutput(output, sources = ["package.json"]) {
  return {
    version: 1,
    canonical: true,
    profiles: {
      core: {
        title: "Core",
        description: "Test profile.",
        output,
        sources
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

test("context output rejects a symlinked directory", () => {
  const outside = mkdtempSync(join(tmpdir(), "fibre-context-output-"));
  const link = "artifacts/generated/test-symlink-output";
  rmSync(link, { recursive: true, force: true });
  symlinkSync(outside, link, "dir");
  try {
    assert.throws(
      () => validateContextManifest(
        manifestWithOutput(`${link}/escaped.md`),
      ),
      /must not traverse a symlink/,
    );
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("context source rejects a symlink even when its target exists", () => {
  const outside = mkdtempSync(join(tmpdir(), "fibre-context-source-"));
  const target = join(outside, "secret.md");
  const link = "tools/test-context-source-symlink.md";
  writeFileSync(target, "secret");
  rmSync(link, { force: true });
  symlinkSync(target, link, "file");
  try {
    assert.throws(
      () => validateContextManifest(
        manifestWithOutput("artifacts/generated/test-context.md", [link]),
      ),
      /must not traverse a symlink|must not resolve through a symlink/,
    );
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
