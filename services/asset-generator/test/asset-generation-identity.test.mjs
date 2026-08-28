import test from "node:test";
import assert from "node:assert/strict";

import { createAssetGenerationJobFromIdentity } from "../src/asset-generation-identity.mjs";

const digest = `sha256:${"a".repeat(64)}`;

function input(overrides = {}) {
  return {
    identityDigest: digest,
    assetKind: "image",
    role: "place",
    variant: "default",
    brief: {
      description: "Generated place reconstruction.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_1", "place_1"],
    referenceObjectRefs: [],
    requestedAt: "2026-08-25T18:00:00Z",
    providerProfile: "presentation-image-default-v1",
    context: { kind: "fixture" },
    ...overrides,
  };
}

test("presentation-owned SHA-256 identity maps to stable provider-neutral job and object refs", () => {
  const a = createAssetGenerationJobFromIdentity(input());
  const b = createAssetGenerationJobFromIdentity(input());
  assert.deepEqual(a, b);
  assert.equal(a.jobId, `assetjob_${"a".repeat(64)}`);
  assert.equal(a.outputObjectRef, `asset_${"a".repeat(64)}`);
  assert.equal(a.receiptObjectRef, `assetreceipt_${"a".repeat(64)}`);
  assert.equal(JSON.stringify(a).includes("r2://"), false);
  assert.equal(JSON.stringify(a).includes("s3://"), false);
});

test("identity mapping validates the digest rather than deriving Fibre semantic sameness", () => {
  assert.throws(() => createAssetGenerationJobFromIdentity(input({
    identityDigest: "world_1:hero",
  })), /sha256/);
});
