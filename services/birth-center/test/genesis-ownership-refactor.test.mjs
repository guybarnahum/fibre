import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

import {
  GENESIS_LIFE_PASS_A_PROMPT,
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
  richPassAGenerationDecision,
} from "fibre/birth-center/genesis-development";
import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  sha256,
} from "fibre/world-kernel/genesis-authority-contracts";

const PACKAGE_JSON = new URL("../../../package.json", import.meta.url);
const WORLD_SRC = new URL("../../world-kernel/src/", import.meta.url);
const WORLD_PROMPTS = new URL("../../world-kernel/prompts/", import.meta.url);

const retiredWorldGenerationModules = Object.freeze([
  "genesis-life-pass-a.mjs",
  "genesis-life-pass-b-input.mjs",
  "genesis-life-pass-b.mjs",
  "genesis-life-pass-c.mjs",
  "genesis-pass-a-runner.mjs",
  "genesis-pass-b-admission.mjs",
  "genesis-pass-b-prompts.mjs",
  "genesis-pass-c-prompts.mjs",
  "genesis-rich-pass-a-runner.mjs",
]);

async function exists(url) {
  try {
    await stat(url);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

const rawDigest = (value) => `sha256:${sha256(value)}`;

test("Birth Center is the sole provider-facing Genesis generation owner", async () => {
  const pkg = JSON.parse(await readFile(PACKAGE_JSON, "utf8"));
  assert.equal(pkg.exports["./world-kernel/genesis-development-contracts"], undefined);
  assert.equal(pkg.exports["./birth-center/genesis-development"], "./services/birth-center/public/genesis-development.mjs");
  assert.equal(pkg.exports["./world-kernel/genesis-authority-contracts"], "./services/world-kernel/public/genesis-authority-contracts.mjs");

  for (const name of retiredWorldGenerationModules) {
    assert.equal(await exists(new URL(name, WORLD_SRC)), false, `${name} must not survive as a World generation path`);
  }

  for (const name of await readdir(WORLD_PROMPTS)) {
    assert.equal(name.startsWith("genesis."), false, `Genesis provider prompt ${name} belongs to Birth Center, not World`);
  }

  for (const name of await readdir(WORLD_SRC)) {
    if (!name.startsWith("genesis-") || !name.endsWith(".mjs")) continue;
    const source = await readFile(new URL(name, WORLD_SRC), "utf8");
    assert.doesNotMatch(source, /adapter\.invoke\s*\(/u, `${name} must remain provider-free`);
    assert.doesNotMatch(source, /resolvePromptAsset/u, `${name} must not resolve provider prompts`);
  }
});

test("current Birth Genesis prompts and generation budgets retain the promoted behavior", () => {
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /priorEpisodes as continuity and anti-repetition context/iu);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /do not repeatedly default to the same subject matter/iu);

  assert.equal(
    rawDigest(GENESIS_LIFE_PASS_B_COGNITION_PROMPT),
    "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a",
  );
  assert.equal(
    rawDigest(GENESIS_PASS_C_INITIAL_PROMPT),
    "sha256:a631988658a66dab9262150f5b378443f71263f1671244a30cdac2618905a8d9",
  );
  assert.equal(
    rawDigest(GENESIS_PASS_C_REINTERPRETATION_PROMPT),
    "sha256:03e2790535fbe54156fac49d48fea2e1139fed29b9e634765658d6c14c58f0ae",
  );
  assert.equal(
    rawDigest(GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT),
    "sha256:79003bbc27920be774d372c0f19fc4a96567a550b0f7db3db51cb19a7a5327e4",
  );

  assert.deepEqual(richPassAGenerationDecision({
    generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
    generatedVersions: 1,
    formRepairs: 0,
    recordRetries: 0,
    nextKind: "form_repair",
  }), {
    allowed: true,
    reason: null,
    policyVersion: GENESIS_PASS_A_RELIABILITY_POLICY_V3.version,
  });
  assert.deepEqual(richPassAGenerationDecision({
    generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
    generatedVersions: 3,
    formRepairs: 2,
    recordRetries: 0,
    nextKind: "form_repair",
  }), {
    allowed: false,
    reason: "form_repair_budget_exhausted",
    policyVersion: GENESIS_PASS_A_RELIABILITY_POLICY_V3.version,
  });
  assert.deepEqual(richPassAGenerationDecision({
    generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
    generatedVersions: 5,
    formRepairs: 2,
    recordRetries: 2,
    nextKind: "record_retry",
  }), {
    allowed: false,
    reason: "total_generated_version_budget_exhausted",
    policyVersion: GENESIS_PASS_A_RELIABILITY_POLICY_V3.version,
  });
});
