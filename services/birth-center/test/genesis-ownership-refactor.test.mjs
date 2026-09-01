import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT as birthPassARepairPrompt,
  GENESIS_LIFE_PASS_A_PROMPT as birthPassAPrompt,
  GENESIS_LIFE_PASS_A_RETRY_PROMPT as birthPassARetryPrompt,
} from "../src/genesis-history-generation.mjs";
import {
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA as birthPassARepairSchema,
  richPassAGenerationDecision as birthPassAGenerationDecision,
} from "../src/genesis-history-generation-policy.mjs";
import {
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT as birthPassBPrompt,
  GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT as birthPassBRetryPrompt,
  GENESIS_LIFE_PASS_B_FORMATION_MODES as birthPassBFormationModes,
  GENESIS_LIFE_PASS_B_HORIZONS as birthPassBHorizons,
} from "../src/genesis-memory-generation.mjs";
import { GENESIS_PASS_B_RESPONSE_SCHEMA as birthPassBSchema } from "../src/genesis-memory-prompts.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT as birthPassCInitialPrompt,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA as birthPassCInitialSchema,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT as birthPassCReinterpretationPrompt,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA as birthPassCReinterpretationSchema,
} from "../src/genesis-meaning-prompts.mjs";

import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT as worldPassARepairPrompt,
  GENESIS_LIFE_PASS_A_PROMPT as worldPassAPrompt,
  GENESIS_LIFE_PASS_A_RETRY_PROMPT as worldPassARetryPrompt,
} from "../../world-kernel/src/genesis-life-pass-a.mjs";
import {
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA as worldPassARepairSchema,
  richPassAGenerationDecision as worldPassAGenerationDecision,
} from "../../world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT as worldPassBPrompt,
  GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT as worldPassBRetryPrompt,
  GENESIS_LIFE_PASS_B_FORMATION_MODES as worldPassBFormationModes,
  GENESIS_LIFE_PASS_B_HORIZONS as worldPassBHorizons,
} from "../../world-kernel/src/genesis-life-pass-b.mjs";
import { GENESIS_PASS_B_RESPONSE_SCHEMA as worldPassBSchema } from "../../world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT as worldPassCInitialPrompt,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA as worldPassCInitialSchema,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT as worldPassCReinterpretationPrompt,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA as worldPassCReinterpretationSchema,
} from "../../world-kernel/src/genesis-pass-c-prompts.mjs";
import { GENESIS_PASS_A_RELIABILITY_POLICY_V3 } from "../../world-kernel/src/genesis-pass-a-reliability-v3.mjs";

function sourceFiles(directoryUrl) {
  const directory = fileURLToPath(directoryUrl);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(new URL(`${entry.name}/`, directoryUrl));
    return entry.isFile() && /\.mjs$/u.test(entry.name) ? [path] : [];
  });
}

test("Birth Center owns the live Genesis development surface", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.exports["./world-kernel/genesis-development-contracts"], undefined);
  assert.equal(
    packageJson.exports["./birth-center/genesis-development"],
    "./services/birth-center/public/genesis-development.mjs",
  );
  assert.equal(
    packageJson.exports["./world-kernel/genesis-authority-contracts"],
    "./services/world-kernel/public/genesis-authority-contracts.mjs",
  );

  const birthSource = sourceFiles(new URL("../src/", import.meta.url));
  for (const path of birthSource) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /fibre\/world-kernel\/genesis-development-contracts/u, path);
    assert.doesNotMatch(source, /#services\/world-kernel\/src\//u, path);
    assert.doesNotMatch(source, /\.\.\/\.\.\/world-kernel\/src\//u, path);
  }

  const authority = readFileSync(new URL("../../world-kernel/public/genesis-authority-contracts.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(authority, /prompt-assets/u);
  assert.doesNotMatch(authority, /adapter\.invoke/u);
  assert.doesNotMatch(authority, /genesis-life-pass-[abc]\.mjs/u);
});

test("Birth-owned Genesis prompts, schemas, schedules, and repair budget remain equivalent", () => {
  assert.equal(birthPassAPrompt, worldPassAPrompt);
  assert.equal(birthPassARetryPrompt, worldPassARetryPrompt);
  assert.equal(birthPassARepairPrompt, worldPassARepairPrompt);
  assert.deepEqual(birthPassARepairSchema, worldPassARepairSchema);

  assert.equal(birthPassBPrompt, worldPassBPrompt);
  assert.equal(birthPassBRetryPrompt, worldPassBRetryPrompt);
  assert.deepEqual(birthPassBSchema, worldPassBSchema);
  assert.deepEqual(birthPassBHorizons, worldPassBHorizons);
  assert.deepEqual(birthPassBFormationModes, worldPassBFormationModes);

  assert.equal(birthPassCInitialPrompt, worldPassCInitialPrompt);
  assert.equal(birthPassCReinterpretationPrompt, worldPassCReinterpretationPrompt);
  assert.deepEqual(birthPassCInitialSchema, worldPassCInitialSchema);
  assert.deepEqual(birthPassCReinterpretationSchema, worldPassCReinterpretationSchema);

  for (const nextKind of ["form_repair", "record_retry"]) {
    for (const generatedVersions of [0, 1, 4, 5]) {
      for (const formRepairs of [0, 1, 2]) {
        for (const recordRetries of [0, 1, 2]) {
          const args = {
            generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
            generatedVersions,
            formRepairs,
            recordRetries,
            nextKind,
          };
          assert.deepEqual(birthPassAGenerationDecision(args), worldPassAGenerationDecision(args));
        }
      }
    }
  }
});
