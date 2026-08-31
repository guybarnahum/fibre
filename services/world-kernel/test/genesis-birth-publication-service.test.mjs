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

test("Genesis birth publication admits WorldSpec and symbolic genomes before authoritative birth", async () => {
  const calls = [];
  const service = createGenesisBirthPublicationService({
    worldSpecAuthority: {
      recordWorldSpec(worldSpec) { calls.push(["world", worldSpec.worldSpecId]); },
    },
    genomeAuthority: {
      recordGenome(genome) { calls.push(["genome", genome.header.genomeId]); },
    },
    authority: {
      async publishBirth(bundle) {
        calls.push(["birth", bundle.manifest.threadId]);
        return { threadId: bundle.manifest.threadId };
      },
    },
  });

  const result = await service.publishBirth({
    worldSpec: { worldSpecId: "world_new_birth" },
    symbolicGenomes: [
      { header: { genomeId: "genome_parent" } },
      { header: { genomeId: "genome_child" } },
    ],
    manifest: { threadId: "thr_new_birth", publication: { status: "published" } },
    thread: { threadId: "thr_new_birth" },
  });

  assert.deepEqual(calls, [
    ["world", "world_new_birth"],
    ["genome", "genome_parent"],
    ["genome", "genome_child"],
    ["birth", "thr_new_birth"],
  ]);
  assert.deepEqual(result, { threadId: "thr_new_birth" });
});

test("Genesis birth publication rejects prerequisite material without its authoritative store", async () => {
  const service = createGenesisBirthPublicationService({
    authority: { async publishBirth() { throw new Error("must not publish"); } },
  });
  await assert.rejects(
    service.publishBirth({ worldSpec: { worldSpecId: "world_missing_authority" } }),
    /without a WorldSpec authority/,
  );
  await assert.rejects(
    service.publishBirth({ symbolicGenomes: [{ header: { genomeId: "genome_missing_authority" } }] }),
    /without a genome authority/,
  );
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
