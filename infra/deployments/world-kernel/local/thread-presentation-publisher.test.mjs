import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationPublisher } from "./thread-presentation-publisher.mjs";

test("World preserves a semantic Genesis lineage conflict from Presentation", async () => {
  const publisher = createThreadPresentationPublisher({
    baseUrl: "http://127.0.0.1:8788",
    privateToken: "private-token",
    async fetchImpl() {
      return Response.json({
        error:"genesis_lineage_conflict",
        code:"GENESIS_PRESENTATION_LINEAGE_CONFLICT",
        detail:"Existing public Presentation belongs to a different Genesis publication lineage.",
        retryable:false,
      }, { status:409 });
    },
  });

  await assert.rejects(
    () => publisher.publishGenesisPresentation({
      genesisId:"gen_1",
      publicationDigest:`sha256:${"a".repeat(64)}`,
      bundle:{},
    }),
    (error) => {
      assert.equal(error.code, "GENESIS_PRESENTATION_LINEAGE_CONFLICT");
      assert.equal(error.retryable, false);
      assert.match(error.message, /different Genesis publication lineage/);
      return true;
    },
  );
});
