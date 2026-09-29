import assert from "node:assert/strict";
import test from "node:test";

import { presentationCompletionInvalidation } from "../admin-live-invalidation.mjs";

test("only a newly admitted Thread media publication invalidates its Admin presentation", () => {
  const accepted = {
    handled:true,
    duplicate:false,
    stale:false,
    scope:{ entityKind:"thread", entityRef:"thr_live" },
    publication:{ event:{ kind:"media.ready" } },
  };

  assert.deepEqual(
    presentationCompletionInvalidation(accepted),
    { entity:"thread", id:"thr_live", aspect:"presentation" },
    "admitted media did not invalidate its Thread presentation",
  );
  assert.equal(
    presentationCompletionInvalidation({ ...accepted, duplicate:true }),
    null,
    "duplicate media invalidated Admin",
  );
  assert.equal(
    presentationCompletionInvalidation({ ...accepted, scope:{ entityKind:"experience", entityRef:"exp_1" } }),
    null,
    "non-Thread media invalidated Admin",
  );
});
