import assert from "node:assert/strict";
import test from "node:test";

import {
  MissingCanonicalVisualIdentityError,
  createGenesisCanonicalEmbodimentMaterializer,
} from "../src/genesis-canonical-visual-identity.mjs";

test("born authoritative Thread missing canonical visual identity fails fast", () => {
  const threadId = "thr_missing_canonical_visual_identity";
  const materializer = createGenesisCanonicalEmbodimentMaterializer({
    worldStore: {
      getThread(requestedThreadId) {
        assert.equal(requestedThreadId, threadId);
        return {
          threadId,
          identity: {
            name: "Fibre Thread",
            originOrientation: "original",
            selfDescription: "I am a Fibre Thread.",
          },
        };
      },
      listEvents() {
        return [{ eventId: "evt_seed_missing_visual", occurredAt: "2026-09-03T16:00:00Z" }];
      },
    },
    embodimentStore: {
      listCurrent() { return []; },
      record() { throw new Error("record must not be reached"); },
    },
  });

  assert.throws(
    () => materializer.materialize({ threadId }),
    (error) => {
      assert.ok(error instanceof MissingCanonicalVisualIdentityError);
      assert.equal(error.code, "INVALID_BIRTH_MISSING_CANONICAL_VISUAL_IDENTITY");
      assert.equal(error.retryable, false);
      assert.equal(error.threadId, threadId);
      return true;
    },
  );
});
