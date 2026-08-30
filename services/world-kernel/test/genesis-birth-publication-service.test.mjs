import test from "node:test";
import assert from "node:assert/strict";

import { createGenesisBirthPublicationService } from "../src/genesis-birth-publication-service.mjs";

test("Genesis birth publication attaches Birth Center civil registration before authoritative publish", async () => {
  let published = null;
  const service = createGenesisBirthPublicationService({
    authority: {
      async publishBirth(bundle) {
        published = structuredClone(bundle);
        return { idempotent: false, threadId: bundle.manifest.threadId };
      },
    },
  });
  const civilRegistration = {
    registrationId: "reg_test",
    threadId: "thr_test",
    fin: "FIN-TEST",
  };
  const result = await service.publishBirth({
    manifest: {
      threadId: "thr_test",
      publication: { status: "published" },
    },
    thread: { threadId: "thr_test" },
    civilRegistration,
  });

  assert.deepEqual(published.manifest.publication.civilRegistration, civilRegistration);
  assert.deepEqual(result, { idempotent: false, threadId: "thr_test" });
});

test("Genesis birth publication rejects conflicting civil registration witnesses", async () => {
  const service = createGenesisBirthPublicationService({
    authority: { async publishBirth() { throw new Error("must not publish"); } },
  });
  await assert.rejects(
    service.publishBirth({
      manifest: {
        publication: {
          civilRegistration: { registrationId: "reg_original" },
        },
      },
      civilRegistration: { registrationId: "reg_conflict" },
    }),
    /conflicting civil registration records/,
  );
});
