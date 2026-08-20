import assert from "node:assert/strict";
import test from "node:test";

import { E2_N1_ARM, E2_N1_PROTOCOL_VERSION } from "./genesis-rich-life-e2-n1.mjs";
import { validateN1ResumeArtifact } from "./genesis-rich-life-e2-n1-driver.mjs";

test("N1 resume refuses a failure artifact from a different frozen source", () => {
  const sourceArtifact = { status: "complete", arm: "A2b_plausibility_surface_seeded_contingency", marker: "source-a" };
  const resumeArtifact = {
    status: "failed",
    arm: E2_N1_ARM,
    protocolVersion: E2_N1_PROTOCOL_VERSION,
    provider: "openai",
    model: "gpt-5.1-2025-11-13",
    source: { artifactDigest: "sha256:not-the-source" },
    completedTrials: [],
    inFlight: null,
  };
  assert.throws(
    () => validateN1ResumeArtifact(resumeArtifact, {
      provider: "openai",
      model: "gpt-5.1-2025-11-13",
      sourceArtifact,
    }),
    /source artifact digest mismatch/,
  );
});
