import assert from "node:assert/strict";
import test from "node:test";

import {
  E2_N1_PASS_B_FORM_REPAIR_CAP,
  assertN1PassBFormRepairPreservesSelection,
  isN1PassBRememberedContentByteFailure,
} from "./genesis-rich-life-e2-n1-repair-driver.mjs";
import { E2_N1_ARM, E2_N1_PROTOCOL_VERSION } from "./genesis-rich-life-e2-n1.mjs";

function failedArtifact(content) {
  return {
    status: "failed",
    arm: E2_N1_ARM,
    protocolVersion: E2_N1_PROTOCOL_VERSION,
    failure: { message: "MemoryFormation.rememberedContent exceeds 2048 UTF-8 bytes" },
    inFlight: {
      trialOrdinal: 1,
      passBRaw: {
        output: {
          outcome: "remembered",
          episodeRefs: ["n1_ep_02", "n1_ep_05"],
          rememberedContent: content,
          uncertainty: ["The order of two small details is uncertain."],
        },
      },
    },
  };
}

test("N1 classifies only the canonical rememberedContent byte failure for form repair", () => {
  assert.equal(E2_N1_PASS_B_FORM_REPAIR_CAP, 2);
  assert.equal(isN1PassBRememberedContentByteFailure(failedArtifact("x".repeat(2049))), true);
  assert.equal(isN1PassBRememberedContentByteFailure(failedArtifact("x".repeat(2048))), false);
  const wrongGate = failedArtifact("x".repeat(2049));
  wrongGate.failure.message = "some other failure";
  assert.equal(isN1PassBRememberedContentByteFailure(wrongGate), false);
});

test("N1 Pass-B form repair may shorten content but cannot change the frozen memory selection", () => {
  const original = failedArtifact("x".repeat(2049)).inFlight.passBRaw.output;
  const repaired = {
    ...structuredClone(original),
    rememberedContent: "I remember the ferry platform, the dropped parcel, and the adult beside me while I picked it up.",
  };
  assert.doesNotThrow(() => assertN1PassBFormRepairPreservesSelection(original, repaired));

  const changedRefs = { ...structuredClone(repaired), episodeRefs: ["n1_ep_02"] };
  assert.throws(() => assertN1PassBFormRepairPreservesSelection(original, changedRefs), /changed episodeRefs/);

  const changedOutcome = { ...structuredClone(repaired), outcome: "not_remembered" };
  assert.throws(() => assertN1PassBFormRepairPreservesSelection(original, changedOutcome), /changed outcome/);
});
