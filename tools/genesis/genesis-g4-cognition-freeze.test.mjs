import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  GENESIS_PASS_B_PROMPT,
  GENESIS_PASS_B_RESPONSE_SCHEMA,
  passBPromptHash,
  passBResponseSchemaHash,
} from "../services/world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  G4_PROTOCOL_PATH,
  deriveG4Windows,
  verifyG4CognitionFreeze,
} from "./genesis-g4-cognition-freeze.mjs";

test("G4 canonical Pass B is constitutive, bounded, and treatment-aware without turning genome into history", () => {
  assert.match(GENESIS_PASS_B_PROMPT, /constitutive memory-formation task/i);
  assert.match(GENESIS_PASS_B_PROMPT, /not a request to detect/i);
  assert.match(GENESIS_PASS_B_PROMPT, /genomeExposure may be null/i);
  assert.match(GENESIS_PASS_B_PROMPT, /it is not a lived event/i);
  assert.match(GENESIS_PASS_B_PROMPT, /not_remembered is fully legal/i);
  assert.match(GENESIS_PASS_B_PROMPT, /Do not write durable meaning/i);
  assert.equal(GENESIS_PASS_B_RESPONSE_SCHEMA.properties.rememberedContent.maxLength, 600);
  assert.equal(passBPromptHash(), "sha256:e41e7ddb846cfa4c96bd12bc44fcdf2fca6dd8ea26148289a54f122386ca952d");
  assert.equal(passBResponseSchemaHash(), "sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a");
});

test("G4 frozen packet verifies and deterministically derives fifty offer schedules", () => {
  const result = verifyG4CognitionFreeze();
  assert.equal(result.protocol.status, "frozen_pre_life_generation");
  assert.equal(result.protocol.commonRuntime.modelId, "gpt-5.1-2025-11-13");
  assert.equal(result.protocol.historicalPlan.episodesPerThread, 10);
  assert.equal(result.offerScheduleEntries, 50);
  assert.match(result.offerScheduleDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(result.protocol.attemptAndRepairPolicy.wholeCandidateAttemptCap, 1);
  assert.equal(result.protocol.executionBoundary.noFinalCohortLifeBeforeGateGClear, true);
});

test("G4 developmental windows replay exactly from the frozen span", () => {
  const protocol = JSON.parse(readFileSync(G4_PROTOCOL_PATH, "utf8"));
  const windows = deriveG4Windows(protocol.historicalPlan.generatedSpan, 10);
  assert.deepEqual(windows, protocol.historicalPlan.windows);
  assert.equal(windows[0].minAge, 6);
  assert.equal(windows.at(-1).maxAge, 17.999);
  assert.equal(windows[0].startAt, "2010-08-20T00:00:00.000Z");
  assert.equal(windows.at(-1).endAt, "2022-08-19T23:59:59.999Z");
});

test("G4 verifier rejects post-freeze cognition drift", () => {
  const root = mkdtempSync(join(tmpdir(), "fibre-g4-drift-"));
  try {
    const protocol = JSON.parse(readFileSync(G4_PROTOCOL_PATH, "utf8"));
    protocol.cognition.passA.promptHash = "sha256:" + "0".repeat(64);
    const path = join(root, "g4.json");
    writeFileSync(path, `${JSON.stringify(protocol, null, 2)}\n`, "utf8");
    assert.throws(() => verifyG4CognitionFreeze({ protocolPath: path }), /Pass-A hash drift/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
