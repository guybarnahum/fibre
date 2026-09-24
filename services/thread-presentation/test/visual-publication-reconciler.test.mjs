import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationVisualPublicationReconciler } from "../src/visual-publication-reconciler.mjs";

function embodiment(threadId = "thr_visual_fid_001") {
  return {
    embodimentId:`emb_${threadId}`,
    revision:3,
    threadId,
    kind:"portrait",
    visibility:"public",
    status:"available",
    asset:{ referenceObjectRef:`visual_identity_reference_${threadId}` },
  };
}

function snapshot(threadId) {
  return {
    pointer:{
      threadId,
      objectRef:`snapshot_${threadId}`,
      snapshotDigest:`sha256:${"a".repeat(64)}`,
    },
    snapshot:{
      presentation:{
        manifest:{ threadId, generatedAt:"2026-09-24T16:00:00Z" },
        civilIdentity:{ registeredAt:"2026-09-24T15:59:00Z" },
      },
      media:{ assets:[] },
      provenance:{},
    },
  };
}

function demandService() {
  return { async reconcile() { throw new Error("not reached"); } };
}

test("admitted canonical identity automatically converges through the FID lifecycle", async () => {
  const visual = embodiment();
  const current = snapshot(visual.threadId);
  const fidCalls = [];
  let projections = 0;
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot() { return current; },
      async publishSnapshot() { throw new Error("not reached"); },
    },
    infra:{},
    selectProviderProfile() { return "unused"; },
    createDemandService:() => demandService(),
    createVisualRewrite() {
      return {
        async project() {
          projections += 1;
          return { reused:projections > 1 };
        },
      };
    },
    async ensureFid(input) {
      fidCalls.push(input);
      if (fidCalls.length === 1) {
        return { complete:false, state:"derivation_requested", derivation:{ jobId:"fid_photo_job_1" } };
      }
      return {
        complete:true,
        state:"active",
        credential:{ credentialId:"fidc_visual_001", revision:1 },
      };
    },
  });

  const first = await reconciler.reconcileAvailableEmbodiment({
    threadId:visual.threadId,
    embodiment:visual,
    observedAt:"2026-09-24T16:01:00Z",
  });
  const second = await reconciler.reconcileAvailableEmbodiment({
    threadId:visual.threadId,
    embodiment:visual,
    observedAt:"2026-09-24T16:02:00Z",
  });

  assert.equal(first.stage, "fid_pending", "FID derivation was not left retryable");
  assert.equal(second.complete, true, "FID lifecycle did not converge");
  assert.equal(second.detail.fidCredentialId, "fidc_visual_001", "active FIN Card was not projected");
  assert.equal(fidCalls[0].idempotencyKey, fidCalls[1].idempotencyKey, "FID retry changed issuance identity");
  assert.equal(fidCalls[0].threadId, visual.threadId, "FID issuance targeted another Thread");
});

test("visual reconciliation waits for newborn Presentation before issuing identity media", async () => {
  const visual = embodiment("thr_visual_waiting");
  let touched = false;
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot() { return null; },
      async publishSnapshot() { touched = true; },
    },
    infra:{},
    selectProviderProfile() { touched = true; return "unused"; },
    createDemandService:() => demandService(),
    createVisualRewrite() { touched = true; return {}; },
    async ensureFid() { touched = true; },
  });

  const result = await reconciler.reconcileAvailableEmbodiment({
    threadId:visual.threadId,
    embodiment:visual,
    observedAt:"2026-09-24T16:01:00Z",
  });

  assert.equal(result.stage, "awaiting_genesis_projection");
  assert.equal(touched, false, "identity work ran before newborn Presentation existed");
});

test("an enacted public present becomes durable Presentation and can request a scene depiction", async () => {
  const threadId = "thr_public_present_continuity";
  const present = {
    presentVersion:"thread-public-present-v0.1",
    situationId:"sit_public_present_continuity",
    establishedAt:"2026-09-20T17:00:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Harbor café", region:"Haifa District" } },
    mediatedContext:null,
    activity:"Sketching boats moving through the harbor.",
    reason:null,
    participants:[],
    depictionMediaId:"media_present_continuity",
  };
  let catalog = { publiclyVisible:true };
  let appended = null;
  let demand = null;

  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot() {
        return {
          pointer:{ threadId, objectRef:"snapshot_present", snapshotDigest:`sha256:${"e".repeat(64)}` },
          snapshot:{ presentation:{ manifest:{ threadId }, visualIdentity:null }, media:{ assets:[] }, provenance:{} },
        };
      },
      async publishSnapshot() { throw new Error("not reached"); },
      async appendEvent(event) {
        appended = event;
        return { event:{ ...event, sequence:7 }, duplicate:false };
      },
    },
    infra:{
      catalog:{
        async get() { return catalog; },
        async upsert(_key, value) { catalog = value; return value; },
      },
    },
    selectProviderProfile({ requiresReferenceObjects }) {
      assert.equal(requiresReferenceObjects, false);
      return "scene-provider";
    },
    createDemandService() {
      return {
        async reconcile(input) {
          demand = input;
          return { changed:true };
        },
      };
    },
    createVisualRewrite() { return { async project() { throw new Error("not reached"); } }; },
    async ensureFid() { throw new Error("not reached"); },
  });

  const result = await reconciler.publishCurrentPresent({ threadId, present });

  assert.equal(appended.kind, "present.updated");
  assert.equal(catalog.currentPresent.event.payload.activity, present.activity);
  assert.deepEqual(demand.scope, { entityKind:"experience", entityRef:present.situationId });
  assert.equal(demand.slots[0].role, "present_scene");
  assert.equal(result.event.sequence, 7);
});
