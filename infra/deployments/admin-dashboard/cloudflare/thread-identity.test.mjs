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
    source:"current_public_presentation",
  }],
  snapshot:presentationSnapshot,
  provenance:{
    displayName:"current_public_presentation",
    fibreIdentityNumber:"current_public_presentation",
    assets:"current_public_presentation",
    source:"current_public_presentation",
  },
});

test("O1 keeps public identity and publishes only ready media", async () => {
  const resolved = await resolveAdminThreadIdentity({
    environment:"staging",
    threadId:"thr_test_1",
    fetchImpl:async () => Response.json({ pointer:{ threadId:"thr_test_1" }, snapshot:presentationSnapshot }),
  });
  assert.equal(resolved.displayName, "Thread One", "public name must survive projection");
  assert.equal(resolved.fibreIdentityNumber, "4JX5-2N-04K2", "civil identity must survive projection");
  assert.equal(resolved.assets.length, 1, "pending media must not become public identity media");
  assert.equal(resolved.assets[0].objectRef, "asset_object_1", "ready portrait must remain addressable");
});

test("O1 preserves authoritative birth and raised cultural context", async () => {
  const resolved = await resolveAdminWorldThreadIdentity({
    threadId:"thr_test_1",
    fetchImpl:async (input) => {
      assert.equal(new URL(input).pathname, "/internal/threads/thr_test_1/identity");
      return Response.json({
        contract:"fibre-world-thread-identity-v0.3",
        identity:{
          threadId:"thr_test_1",
          fibreIdentityNumber:"4JX5-2N-04K2",
          displayName:"Thread One",
          sex:"female",
          status:"active",
          birthDate:"2012-02-03",
          birthPlace:"Tbilisi",
          culture:["Georgian"],
          languages:["ka"],
          raisedAs:{
            culturalContext:"Tbilisi Georgian family",
            languages:["ka","en"],
            schoolingOrCommunityContext:"Tbilisi public school",
          },
          originOrientation:"original",
          summary:"I persist.",
          version:7,
          stateHash:"sha256:world-state",
          updatedAt:"2026-09-18T00:00:00Z",
        },
      });
    },
  });
  assert.equal(resolved.displayName, "Thread One");
  assert.equal(resolved.birthPlace, "Tbilisi");
  assert.deepEqual(resolved.culture, ["Georgian"]);
  assert.deepEqual(resolved.raisedAs, {
    culturalContext:"Tbilisi Georgian family",
    languages:["ka","en"],
    schoolingOrCommunityContext:"Tbilisi public school",
  });
  assert.equal(resolved.version, 7);
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

test("O1 uses available public World embodiment media when Presentation is missing", () => {
  const resolved = combineAdminThreadIdentity({
    world:{
      threadId:"thr_test_1",
      fibreIdentityNumber:"4JX5-2N-04K2",
      lifecycleStatus:"active",
      thread:{ threadId:"thr_test_1", version:7 },
      civilRegistration:{ fibreIdentityNumber:"4JX5-2N-04K2" },
      embodiments:[{
        embodimentId:"emb_1",
        revision:2,
        kind:"portrait",
        representationKind:"synthetic_generation",
        status:"available",
        visibility:"public",
        asset:{
          assetRef:"asset://visual_identity_reference_1",
          referenceObjectRef:"visual_identity_reference_1",
          sha256:"sha256:abc",
          mediaType:"image/png",
          width:1024,
          height:1024,
        },
      }],
      symbolicGenomes:[],
    },
    presentation:null,
  });
  assert.equal(resolved.presentationStatus, "unavailable");
  assert.equal(resolved.assets.length, 1);
  assert.equal(resolved.assets[0].objectRef, "visual_identity_reference_1");
  assert.equal(resolved.assets[0].role, "canonical_portrait");
  assert.equal(resolved.assets[0].source, "world_embodiment");
  assert.deepEqual(resolved.visualIdentity, {
    embodimentId:"emb_1",
    embodimentRevision:2,
    referenceObjectRefs:["visual_identity_reference_1"],
  });
  assert.equal(resolved.provenance.assets, "world_embodiment");
});

test("O1 combines World authority with full public Presentation and deduplicates embodiment media", () => {
  const resolved = combineAdminThreadIdentity({
    world:{
      threadId:"thr_test_1",
      fibreIdentityNumber:"4JX5-2N-04K2",
      lifecycleStatus:"active",
      thread:{ threadId:"thr_test_1", version:7 },
      civilRegistration:{ fibreIdentityNumber:"4JX5-2N-04K2" },
      embodiments:[{
        embodimentId:"emb_1",
        revision:1,
        kind:"portrait",
        status:"available",
        visibility:"public",
        asset:{ referenceObjectRef:"asset_object_1", mediaType:"image/png", width:1024, height:1024 },
      }],
      symbolicGenomes:[{ header:{ genomeId:"genome_1" } }],
    },
    presentation:identity,
  });
  assert.equal(resolved.displayName, "Thread One");
  assert.equal(resolved.assets.length, 1);
  assert.equal(resolved.assets[0].source, "current_public_presentation");
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