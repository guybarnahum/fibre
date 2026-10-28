import test from "node:test";
import assert from "node:assert/strict";

import { createGenesisBirthPublicationService } from "../src/genesis-birth-publication-service.mjs";
import { selectedUrgesForBirth, urgeVariantsFromGenome } from "../../../core/src/inherited-urges.mjs";
import { buildDeNovoSymbolicGenome } from "../src/symbolic-genome-domain.mjs";
import { canonicalJson as birthCenterCanonicalJson } from "../../birth-center/src/state-codec.mjs";

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

test("a canonically stored v2 birth reaches World while a changed urge is rejected",async()=>{
  const selected=selectedUrgesForBirth("v2-provisional-canonical-round-trip");
  const genome=buildDeNovoSymbolicGenome({
    threadId:"thr_v2_provisional_round_trip",
    genesisId:"genesis_v2_provisional_round_trip",
    values:selected.values,
    originMaterial:selected.originMaterial,
    createdAt:"2026-10-28T12:00:00Z",
  });
  const bundle={
    manifest:{threadId:"thr_v2_provisional_round_trip",genesisId:"genesis_v2_provisional_round_trip"},
    thread:{threadId:"thr_v2_provisional_round_trip",genome:{urgeProjection:urgeVariantsFromGenome(genome)}},
    symbolicGenomes:[genome],
  };
  const restored=JSON.parse(birthCenterCanonicalJson(bundle));
  assert.notEqual(JSON.stringify(restored.thread.genome.urgeProjection),
    JSON.stringify(bundle.thread.genome.urgeProjection),
    "test must cover persistence reordering");
  const calls=[];
  const service=createGenesisBirthPublicationService({
    genomeAuthority:{recordGenome(g){calls.push("genome:"+g.header.genomeId);}},
    authority:{publishBirth(b){calls.push("birth:"+b.thread.threadId);return {threadId:b.thread.threadId};}},
  });
  assert.deepEqual(await service.publishBirth(restored),
    {threadId:bundle.thread.threadId},"canonical v2 birth was rejected");
  assert.deepEqual(calls,["genome:"+genome.header.genomeId,"birth:"+bundle.thread.threadId],
    "v2 birth did not reach World admission");

  const changed=structuredClone(restored);
  changed.thread.genome.urgeProjection[0].positions.gain+=0.1;
  await assert.rejects(service.publishBirth(changed),
    /birth Body projection differs from admitted symbolic urge genome/,
    "changed inherited pressure was accepted");
  assert.equal(calls.length,2,"invalid genome was admitted");
});
