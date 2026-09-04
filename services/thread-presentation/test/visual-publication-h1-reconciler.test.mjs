import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationVisualPublicationReconciler } from "../src/visual-publication-h1-reconciler.mjs";

const THREAD_ID = "thr_h1_ready_slot";
const MEDIA_ID = "media_h1_ready_slot";
const ISSUED_AT = "2026-09-04T03:00:00Z";

function snapshot() {
  return {
    pointer: {
      objectRef: "snapshot_h1_ready_slot",
      snapshotDigest: `sha256:${"a".repeat(64)}`,
    },
    snapshot: {
      presentation: {
        manifest: { threadId: THREAD_ID, generatedAt: ISSUED_AT },
        civilIdentity: { registeredAt: ISSUED_AT },
      },
      media: {
        assets: [{ mediaId: MEDIA_ID, role: "official_id_photo", status: "ready" }],
      },
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

function reconciler(reconcileCalls) {
  const current = snapshot();
  return createThreadPresentationVisualPublicationReconciler({
    presentationServer: {
      async getSnapshot() { return current; },
      async publishSnapshot() { throw new Error("not reached"); },
    },
    infra: {},
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
      const status = asset.status === "placeholder" ? "missing" : "ready";
      return {
        slots: [{
          mediaId: MEDIA_ID,
          status,
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
  });
}

test("ordinary recovery key keeps an already-ready official photo complete", async () => {
  const calls = [];
  const result = await reconciler(calls).reconcileAvailableEmbodiment({
    threadId: THREAD_ID,
    embodiment: embodiment(),
    observedAt: ISSUED_AT,
    regenerationKey: "ordinary-recovery",
  });
  assert.equal(result.complete, true);
  assert.equal(result.stage, "complete");
  assert.equal(calls.length, 0);
});

test("H1 fault key forces ready media only once so recovery verification can observe complete", async () => {
  const calls = [];
  const subject = reconciler(calls);
  const input = {
    threadId: THREAD_ID,
    embodiment: embodiment(),
    observedAt: ISSUED_AT,
    regenerationKey: "slice-h1-fault-after-workflow-before-demand:h1-test",
  };

  const first = await subject.reconcileAvailableEmbodiment(input);
  assert.equal(first.complete, false);
  assert.equal(first.stage, "official_photo_pending");
  assert.equal(calls.length, 1);

  const second = await subject.reconcileAvailableEmbodiment(input);
  assert.equal(second.complete, true);
  assert.equal(second.stage, "complete");
  assert.equal(calls.length, 1);
});
