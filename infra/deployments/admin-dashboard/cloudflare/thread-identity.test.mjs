import test from "node:test";
import assert from "node:assert/strict";

import { createAdminDashboardWorker } from "./worker.mjs";
import {
  combineAdminThreadIdentity,
  resolveAdminThreadIdentity,
  resolveAdminWorldThreadIdentity,
} from "./thread-identity.mjs";

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
  provenance:{
    displayName:"resolved_after_fact",
    fibreIdentityNumber:"resolved_after_fact",
    assets:"current_public_presentation",
    source:"current_public_presentation",
  },
});

test("O1 resolves a Thread into human identity and public media while preserving provenance", async () => {
  const resolved = await resolveAdminThreadIdentity({
    environment:"staging",
    threadId:"thr_test_1",
    fetchImpl:async () => Response.json({
      pointer:{ threadId:"thr_test_1" },
      snapshot:{
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
      },
    }),
  });
  assert.deepEqual(resolved, identity);
});

test("O1 resolves authoritative Thread existence from World", async () => {
  const resolved = await resolveAdminWorldThreadIdentity({
    threadId:"thr_test_1",
    fetchImpl:async (input) => {
      assert.equal(new URL(input).pathname, "/internal/threads/thr_test_1/identity");
      return Response.json({
        contract:"fibre-world-thread-identity-v0.1",
        identity:{
          threadId:"thr_test_1",
          fibreIdentityNumber:"4JX5-2N-04K2",
          lifecycleStatus:"active",
        },
      });
    },
  });
  assert.deepEqual(resolved, {
    threadId:"thr_test_1",
    fibreIdentityNumber:"4JX5-2N-04K2",
    lifecycleStatus:"active",
  });
});

test("O2 treats an allocated thr_ identifier absent from World as not born", async () => {
  const resolved = await resolveAdminWorldThreadIdentity({
    threadId:"thr_candidate_1",
    fetchImpl:async () => Response.json({ error:"thread_not_found" }, { status:404 }),
  });
  assert.equal(resolved, null);
});

test("O1 keeps a World-admitted Thread visible when Presentation is missing", () => {
  const resolved = combineAdminThreadIdentity({
    world:{
      threadId:"thr_test_1",
      fibreIdentityNumber:"4JX5-2N-04K2",
      lifecycleStatus:"active",
    },
    presentation:null,
  });
  assert.equal(resolved.worldStatus, "admitted");
  assert.equal(resolved.presentationStatus, "unavailable");
  assert.equal(resolved.fibreIdentityNumber, "4JX5-2N-04K2");
  assert.equal(resolved.displayName, null);
  assert.deepEqual(resolved.assets, []);
  assert.equal(resolved.provenance.source, "world_only");
});

test("O1 prefers World for FIN and lifecycle while Presentation enriches public identity", () => {
  const resolved = combineAdminThreadIdentity({
    world:{
      threadId:"thr_test_1",
      fibreIdentityNumber:"4JX5-2N-04K2",
      lifecycleStatus:"active",
    },
    presentation:identity,
  });
  assert.equal(resolved.worldStatus, "admitted");
  assert.equal(resolved.presentationStatus, "current");
  assert.equal(resolved.displayName, "Thread One");
  assert.equal(resolved.fibreIdentityNumber, "4JX5-2N-04K2");
  assert.equal(resolved.lifecycleStatus, "active");
  assert.equal(resolved.assets.length, 1);
  assert.equal(resolved.provenance.fibreIdentityNumber, "world_civil_registry");
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
