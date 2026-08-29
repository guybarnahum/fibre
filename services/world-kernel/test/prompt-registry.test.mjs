// fibre-test-lifecycle: regression
// fibre-test-scope: world-kernel
// fibre-test-purpose: prompt-assets-and-model-profiles

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";

const digest = (text) => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

function withPromptDirectory(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-prompts-"));
  try {
    return run({ root, directory: pathToFileURL(`${root}${sep}`) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("prompt assets resolve raw text and an explicit additive model profile", () => {
  withPromptDirectory(({ root, directory }) => {
    writeFileSync(join(root, "ordinary.appraisal.md"), "Base semantic prompt", "utf8");
    mkdirSync(join(root, "profiles", "openai-gpt-5"), { recursive: true });
    writeFileSync(
      join(root, "profiles", "openai-gpt-5", "ordinary.appraisal.md"),
      "Model-specific adaptation",
      "utf8",
    );

    const base = resolvePromptAsset({ directory, id: "ordinary.appraisal" });
    assert.equal(base.text, "Base semantic prompt");
    assert.equal(base.digest, digest(base.text));
    assert.equal(base.profile, null);
    assert.equal(base.profileDigest, null);

    const profiled = resolvePromptAsset({
      directory,
      id: "ordinary.appraisal",
      profile: "openai-gpt-5",
    });
    assert.equal(profiled.text, "Base semantic prompt\n\nModel-specific adaptation");
    assert.equal(profiled.baseDigest, digest("Base semantic prompt"));
    assert.equal(profiled.profileDigest, digest("Model-specific adaptation"));
    assert.equal(profiled.digest, digest(profiled.text));
    assert.equal(profiled.profileAsset, "profiles/openai-gpt-5/ordinary.appraisal.md");
  });
});

test("prompt asset names cannot traverse outside their prompt directory", () => {
  withPromptDirectory(({ root, directory }) => {
    writeFileSync(join(root, "safe.md"), "safe", "utf8");
    assert.throws(
      () => resolvePromptAsset({ directory, id: "../outside" }),
      /stable lowercase prompt name/,
    );
    assert.throws(
      () => resolvePromptAsset({ directory, id: "safe", profile: "../profile" }),
      /stable lowercase prompt name/,
    );
  });
});
