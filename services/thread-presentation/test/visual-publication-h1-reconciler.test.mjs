import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationVisualPublicationReconciler } from "../src/visual-publication-h1-reconciler.mjs";

const THREAD_ID = "thr_h1_ready_slot";
const MEDIA_ID = "media_h1_ready_slot";
const ISSUED_AT = "2026-09-04T03:00:00Z";
const H1_KEY = "slice-h1-fault-after-workflow-before-demand:h1-test";

function readyAsset() {
  return {
    mediaId: MEDIA_ID,
    kind: "image",
    role: "official_id_photo",
    status: "ready",
    locator: "asset_h1_ready_slot",
    mediaType: "image/png",
    sha256: `sha256:${"b".repeat(64)}`,
    width: 512,
    height: 512,
    durationMs: null,
    posterRef: null,
    unavailableReason: null,
    sourceReferences: ["source_h1"],
    provenanceRef: "prov_h1",
    generation: null,
  };
}

function snapshot() {
  return {
    pointer: {
      objectRef: "snapshot_h1_ready_slot",
      snapshotDigest: `sha256:${"a".repeat(64)}`,
      sequence: 0,
    },
    snapshot: {
      presentation: {
        manifest: { threadId: THREAD_ID, generatedAt: ISSUED_AT },
        civilIdentity: { registeredAt: ISSUED_AT },
      },
      media: { assets: [readyAsset()] },
      provenance: {},
    },
  };
}

function embodiment() {
  return {
    embodimentId: "emb_h1_ready_slot",
    threadId: THREAD_ID,
    kind: "portrait",
    visibility: "public",
    status: "available",
    asset: { referenceObjectRef: "visual_identity_reference_h1_ready_slot" },
  };
}

function harness(reconcileCalls) {
  let current = snapshot();
  const catalogValues = new Map();
  const options = {
    presentationServer: {
      async getSnapshot() { return current; },
      async publishSnapshot({ bundle, objectRef, snapshotVersion }) {
        current = {
          pointer: {
            objectRef,
            snapshotVersion,
            snapshotDigest: `sha256:${"c".repeat(64)}`,
            sequence: 0,
          },
          snapshot: bundle,
        };
        return current;
      },
    },
    infra: {
      catalog: {
        async get(key) { return catalogValues.get(key) ?? null; },
        async upsert(key, value) { catalogValues.set(key, structuredClone(value)); return value; },
      },
    },
    selectProviderProfile() { return "bfl-flux-2-pro-v1"; },
    createVisualRewrite() {
      return { async project() { return { reused: true }; } };
    },
    createIdentityRewrite() {
      return {
        async ensureOfficialIdentityMedia() {
          return {
            reused: true,
            identityCard: {
              officialPhotoMediaRef: MEDIA_ID,
              issuedAt: ISSUED_AT,
            },
          };
        },
      };
    },
    planSlots({ bundle }) {
      const asset = bundle.media.assets.find((entry) => entry.mediaId === MEDIA_ID);
      return {
        slots: [{
          mediaId: MEDIA_ID,
          status: asset.status === "placeholder" ? "missing" : "ready",
          referenceObjectRefs: ["visual_identity_reference_h1_ready_slot"],
        }],
      };
    },
    createDemandService() {
      return {
        async reconcile() {
          reconcileCalls.push(true);
          return {
            changed: true,
            projection: {
              demands: [{
                demand: {
                  current: true,
                  demandId: "presassetdemand_h1_ready_slot",
                  job: {
                    jobId: "assetjob_h1_ready_slot",
                    context: { kind: "thread_presentation_media", mediaId: MEDIA_ID },
                  },
                },
                dispatch: { workflowStatus: "queued" },
              }],
            },
          };
        },
      };
    },
  };
  return {
    options,
    catalogValues,
    setReady() {
      current = {
        ...current,
        snapshot: {
          ...current.snapshot,
          media: { ...current.snapshot.media, assets: [readyAsset()] },
        },
      };
    },
    current() { return current; },
  };
}

test("ordinary recovery key keeps an already-ready official photo complete", async () => {
  const calls = [];
  const h = harness(calls);
  const result = await createThreadPresentationVisualPublicationReconciler(h.options)
    .reconcileAvailableEmbodiment({
      threadId: THREAD_ID,
      embodiment: embodiment(),
      observedAt: ISSUED_AT,
      regenerationKey: "ordinary-recovery",
    });
  assert.equal(result.complete, true);
  assert.equal(result.stage, "complete");
  assert.equal(calls.length, 0);
  assert.equal(h.current().snapshot.media.assets[0].status, "ready");
});

test("H1 precondition is durable across reconciler instances and does not hide recovered ready media", async () => {
  const calls = [];
  const h = harness(calls);
  const input = {
    threadId: THREAD_ID,
    embodiment: embodiment(),
    observedAt: ISSUED_AT,
    regenerationKey: H1_KEY,
  };

  const first = await createThreadPresentationVisualPublicationReconciler(h.options)
    .reconcileAvailableEmbodiment(input);
  assert.equal(first.complete, false);
  assert.equal(first.stage, "official_photo_pending");
  assert.equal(calls.length, 1);
  assert.equal(h.current().snapshot.media.assets[0].status, "placeholder");
  assert.equal(h.catalogValues.get("sliceh1precondition_h1-test")?.applied, true);

  h.setReady();
  const second = await createThreadPresentationVisualPublicationReconciler(h.options)
    .reconcileAvailableEmbodiment(input);
  assert.equal(second.complete, true);
  assert.equal(second.stage, "complete");
  assert.equal(calls.length, 1);
  assert.equal(h.current().snapshot.media.assets[0].status, "ready");
});
