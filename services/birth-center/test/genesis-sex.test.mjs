import assert from "node:assert/strict";
import test from "node:test";

import { buildNeutralGenesisThreadSeed } from "../src/genesis-publication.mjs";
import { genesisSexForThread } from "../src/genesis-sex.mjs";

test("Genesis assigns sex as authoritative Thread identity before visual derivation", () => {
  const threadId = "thr_genesis_sex_authority";
  const thread = buildNeutralGenesisThreadSeed({
    threadId,
    createdAt: "2026-09-13T00:00:00.000Z",
  });

  assert.equal(thread.identity.sex, genesisSexForThread({ threadId }));
  assert.ok(thread.identity.sex === "female" || thread.identity.sex === "male");
});
