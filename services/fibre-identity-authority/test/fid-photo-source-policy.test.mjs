import assert from "node:assert/strict";
import test from "node:test";

import { fidPhotoSourceMatchesCanonicalReference } from "../src/fid-photo-source-policy.mjs";

test("FID photo reuse never crosses a canonical visual identity correction", () => {
  const oldRoot = "visual_identity_reference_old";
  const newRoot = "visual_identity_reference_new";
  const admitted = {
    canonicalVisualReferenceRef:oldRoot,
    sourceReferences:[oldRoot, "asset_receipt_old_photo"],
  };

  assert.equal(
    fidPhotoSourceMatchesCanonicalReference(admitted, oldRoot),
    true,
    "current canonical photo should remain reusable",
  );
  assert.equal(
    fidPhotoSourceMatchesCanonicalReference(admitted, newRoot),
    false,
    "old photo was reused after canonical identity changed",
  );
});
