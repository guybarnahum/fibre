import assert from "node:assert/strict";
import test from "node:test";

import { createAssetGenerationJobFromIdentity } from "#services/asset-generator/src/index.mjs";
import { buildFidPhotoDerivationJob } from "../src/index.mjs";

test("correcting an FID photograph preserves the canonical person without replaying the rejected image",()=>{
  const threadId="thr_vitor";
  const source={
    threadId,
    canonicalVisualReferenceRef:"visual_root_vitor",
    canonicalVisualReferenceDigest:`sha256:${"a".repeat(64)}`,
    sourceReferences:["visual_root_vitor","emb_vitor"],
    targetAgeYears:22,
  };
  const options={
    threadId,source,requestedAt:"2026-10-17T01:00:00Z",
    providerProfile:"openai-gpt-image-2-medium-v1",
    createGenerationJob:createAssetGenerationJobFromIdentity,
  };
  const rejected=buildFidPhotoDerivationJob(options);
  const correctionId="fid_photo_correction_001";
  const corrected=buildFidPhotoDerivationJob({...options,correctionId});
  const repeated=buildFidPhotoDerivationJob({...options,correctionId});
  assert.notEqual(corrected.outputObjectRef,rejected.outputObjectRef,
    "FID correction reused the rejected photograph");
  assert.equal(corrected.outputObjectRef,repeated.outputObjectRef,
    "FID correction is not idempotent");
  assert.deepEqual(corrected.referenceObjectRefs,[source.canonicalVisualReferenceRef],
    "FID correction lost the canonical face");
  assert.equal(corrected.context.threadId,threadId);
  assert.equal(corrected.context.correctionId,correctionId);
  assert.equal(corrected.context.kind,"fid_photo_correction",
    "unapproved ID photo was placed on the World reconciliation path");
  assert.equal(corrected.providerProfile,"openai-gpt-image-2-medium-v1");
  const changedRoot=buildFidPhotoDerivationJob({...options,correctionId,
    source:{...source,canonicalVisualReferenceDigest:`sha256:${"b".repeat(64)}`},
  });
  assert.notEqual(changedRoot.outputObjectRef,corrected.outputObjectRef,
    "FID correction was not bound to the canonical portrait");
});
