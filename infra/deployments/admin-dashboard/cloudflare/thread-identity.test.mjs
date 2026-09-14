import test from "node:test";
import assert from "node:assert/strict";

import { createAdminDashboardWorker } from "./worker.mjs";
import {
  combineAdminThreadIdentity,
  resolveAdminThreadIdentity,
  resolveAdminWorldThreadIdentity,
} from "./thread-identity.mjs";

const presentationSnapshot = Object.freeze({
  presentation:{
    subject:{ displayName:"Thread One", birthDate:"2012-02-03" },
    civilIdentity:{ fibreIdentityNumber:"4JX5-2N-04K2" },
    manifest:{ lifecycleStatus:"active" },
    visualIdentity:{
      embodimentId:"emb_thr_test_1_portrait_canonical",
      embodimentRevision:1,
      referenceObjectRefs:["visual_reference_1"],
    },
  },
  media:{ assets:[
    {
      mediaId:"media_portrait_primary",
      kind:"image",
      role:"official_id_photo",
      status:"ready",
      locator:"asset_object_1",
      mediaType:"image/png",
      sha256:"sha256:abc",
      width:1024,
      height:1024,
    },
    { mediaId:"media_pending", kind:"image", role:"memory_scene", status:"pending" },
  ] },
});

const identity = Object.freeze({
  threadId:"thr_test_1",
  displayName:"Thread One",
  fibreIdentityNumber:"4JX5-2N-04K2",
  birthDate:"2012-02-03",
  lifecycleStatus:"active",
  visualIdentity:{
    embodimentId:"emb_thr_test_1_portrait_canonical",
    embodimentRevision:1,
    referenceObjectRefs:["visual_reference_1"],
  },
  assets:[{
    mediaId:"media_portrait_primary",
    kind:"image",
    role:"official_id_photo",
    objectRef:"asset_object_1",
    mediaType:"image/png",
    sha256:"sha256:abc",
    width:1024,
    height:1024,
    durationMs:null,
    url:"https://api.staging.insidefibre.com/api/assets/asset_object_1",
  }],
  snapshot:presentationSnapshot,
  provenance:{
    displayName:"resolved_after_fact",
    fibreIdentityNumber:"resolved_after_fact",
    assets:"current_public_presentation",
    source:"current_public_presentation",
  },
});

test("O1 preserves the current public Presentation and ready media", async () => {
  const resolved = await resolveAdminThreadIdentity({
    environment:"staging",
    threadId:"thr_test_1",
    fetchImpl:async () => Response.json({ pointer:{ threadId:"thr_test_1" }, snapshot:presentationSnapshot }),
  });
  assert.deepEqual(resolved, identity);
});

test("O1 preserves rich authoritative World Thread state", async () => {
  const resolved = await resolveAdminWorldThreadIdentity({
    threadId:"thr_test_1",
    fetchImpl:async (input) => {
      assert.equal(new URL(input).pathname, "/internal/threads/thr_test_1/identity");
      return Response.json({
        contract:"fibre-world-thread-identity-v0.2",
        identity:{
          threadId:"thr_test_1",
          fibreIdentityNumber:"4JX5-2N-04K2",
          lifecycleStatus:"active",
          thread:{ threadId:"thr_test_1", version:7, status:"active", memoryRefs:["mem_1"] },
          civilRegistration:{ fibreIdentityNumber:"4JX5-2N-04K2", worldRef:"world_1" },
          embodiments:[{ embodimentId:"emb_1", revision:1 }],
          symbolicGenomes:[{ header:{ genomeId:"genome_1" }, traits:{ temperament:"patient;curious" } }],
        },
      });
    },
  });
  assert.equal(resolved.thread.version, 7);
  assert.deepEqual(resolved.thread.memoryRefs, ["mem_1"]);
  assert.equal(resolved.civilRegistration.worldRef, "world_1");
  assert.equal(resolved.embodiments[0].embodimentId, "emb_1");
  assert.equal(resolved.symbolicGenomes[0].traits.temperament, "patient;curious");
});

test("O2 treats only an explicit World THREAD_NOT_FOUND as not born", async () => {
  const resolved = await resolveAdminWorldThreadIdentity({
    threadId:"thr_candidate_1",
    fetchImpl:async () => Response.json({ error:{ code:"THREAD_NOT_FOUND" } }, { status:404 }),
  });
  assert.equal(resolved, null);
});

test("O2 never mistakes an old or missing World endpoint for a pre-birth Thread", async () => {
  await assert.rejects(
    resolveAdminWorldThreadIdentity({
      threadId:"thr_test_1",
      fetchImpl:async () => Response.json({ error:"not_found" }, { status:404 }),
    }),
    /World Thread identity lookup unavailable \(not_found\)/u,
  );
});

test("O1 keeps a World-admitted Thread visible when Presentation is missing", () => {
  const resolved = combineAdminThreadIdentity({
    world:{
      threadId:"thr_test_1",
      fibreIdentityNumber:"4JX5-2N-04K2",
      lifecycleStatus:"active",
      thread:{ threadId:"thr_test_1", version:7 },
      civilRegistration:{ fibreIdentityNumber:"4JX5-2N-04K2" },
      embodiments:[],
      symbolicGenomes:[],
    },
    presentation:null,
  });
  assert.equal(resolved.worldStatus, "admitted");
  assert.equal(resolved.presentationStatus, "unavailable");
  assert.equal(resolved.world.thread.version, 7);
  assert.equal(resolved.presentation, null);
});

test("O1 combines World authority with full public Presentation", () => {
  const resolved = combineAdminThreadIdentity({
    world:{
      threadId:"thr_test_1",
      fibreIdentityNumber:"4JX5-2N-04K2",
      lifecycleStatus:"active",
      thread:{ threadId:"thr_test_1", version:7 },
      civilRegistration:{ fibreIdentityNumber:"4JX5-2N-04K2" },
      embodiments:[{ embodimentId:"emb_1" }],
      symbolicGenomes:[{ header:{ genomeId:"genome_1" } }],
    },
    presentation:identity,
  });
  assert.equal(resolved.displayName, "Thread One");
  assert.equal(resolved.assets.length, 1);
  assert.equal(resolved.world.thread.version, 7);
  assert.deepEqual(resolved.presentation, presentationSnapshot);
});

test("O1 opens the same Thread identity through Admin", async () => {
  const worker = createAdminDashboardWorker({
    authenticate:async () => ({ email:"operator@example.com" }),
    authorize:async () => true,
    resolveIdentity:async ({ environment, threadId }) => {
      assert.equal(environment, "staging");
      assert.equal(threadId, identity.threadId);
      return identity;
    },
  });
  const response = await worker.fetch(
    new Request("https://admin.staging.insidefibre.com/api/threads/thr_test_1/identity"),
    { FIBRE_ENVIRONMENT:"staging" },
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).identity, identity);
});
