import assert from "node:assert/strict";
import test from "node:test";

import {
  G3_V2_DIGEST,
  G4_V2_DIGEST,
  verifyG34ReviewAmendments,
} from "./genesis-g34-review-amendments.mjs";

test("G3/G4 hostile-review amendments preserve v1 production freezes and close review findings", () => {
  const result = verifyG34ReviewAmendments();
  assert.equal(result.g3v2Digest, G3_V2_DIGEST);
  assert.equal(result.g4v2Digest, G4_V2_DIGEST);
  assert.equal(result.primaryContrast, "between_thread_at_fixed_call_ordinal");
  assert.match(result.entryJustification, /not a claim that nothing occurred/);
});
