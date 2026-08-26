import test from "node:test";
import assert from "node:assert/strict";

import { createAssetGenerationJobFromIdentity } from "../src/asset-generation-identity.mjs";
import { fibreShortIdCandidates } from "../src/fibre-short-id.mjs";

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

test("presentation-owned SHA-256 identity maps to stable 12-hex provider-neutral refs", () => {
  const a = createAssetGenerationJobFromIdentity(input());
  const b = createAssetGenerationJobFromIdentity(input());
  assert.deepEqual(a, b);
  assert.equal(a.jobId, `assetjob_${"a".repeat(12)}`);
  assert.equal(a.outputObjectRef, `asset_${"a".repeat(12)}`);
  assert.equal(a.receiptObjectRef, `assetreceipt_${"a".repeat(12)}`);
  assert.equal(Object.hasOwn(a, "identityDigest"), false);
  assert.equal(JSON.stringify(a).includes("r2://"), false);
  assert.equal(JSON.stringify(a).includes("s3://"), false);
});

test("identity mapping validates the digest rather than deriving Fibre semantic sameness", () => {
  assert.throws(() => createAssetGenerationJobFromIdentity(input({ identityDigest: "world_1:hero" })), /sha256/);
});

test("collision resolution can select another deterministic 12-hex candidate without carrying the digest", () => {
  const collisionDigest = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const candidates = fibreShortIdCandidates(collisionDigest);
  const job = createAssetGenerationJobFromIdentity(input({ identityDigest: collisionDigest, idSuffix: candidates[1] }));
  assert.equal(job.jobId, `assetjob_${candidates[1]}`);
  assert.equal(Object.hasOwn(job, "identityDigest"), false);
});
