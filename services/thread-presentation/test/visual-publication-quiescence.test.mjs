import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationVisualPublicationReconciler } from "../src/visual-publication-reconciler.mjs";

test("unchanged pending official-photo demand emits no Activity rows", async () => {
  const threadId = "thr_quiet_visual";
  const mediaId = "media_quiet_visual";
  const embodiment = {
    embodimentId: "emb_quiet_visual",
    threadId,
    kind: "portrait",
    visibility: "public",
    status: "available",
    asset: { referenceObjectRef: "visual_identity_reference_quiet" },
  };
  const snapshot = {
    pointer: {
      objectRef: "snapshot_quiet_visual",
      snapshotDigest: `sha256:${"a".repeat(64)}`,
    },
    snapshot: {
      presentation: {
        manifest: { threadId, generatedAt: "2026-09-03T20:00:00Z" },
        civilIdentity: { registeredAt: "2026-09-03T20:00:00Z" },
      },
      media: { assets: [] },
      provenance: {},
    },
  };
  const activity = [];
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer: {
      async getSnapshot() { return snapshot; },
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
          return { reused: true, identityCard: { officialPhotoMediaRef: mediaId } };
        },
      };
    },
    planSlots() {
      return {
        slots: [{
          mediaId,
          status: "missing",
          referenceObjectRefs: [embodiment.asset.referenceObjectRef],
        }],
      };
    },
    createDemandService() {
      return {
        async reconcile() {
          return {
            changed: false,
            projection: {
              demands: [{
                demand: {
                  current: true,
                  demandId: "demand_quiet_visual",
                  job: {
                    jobId: "asset_job_quiet_visual",
                    context: { kind: "thread_presentation_media", mediaId },
                  },
                },
                dispatch: { workflowStatus: "queued" },
              }],
            },
          };
        },
      };
    },
    activityRecorder: {
      async record(record) { activity.push(record); return record; },
      async runStage(metadata, operation) {
        activity.push({ ...metadata, status: "unexpected_runStage" });
        return operation();
      },
    },
  });

  const result = await reconciler.reconcileAvailableEmbodiment({
    threadId,
    embodiment,
    observedAt: "2026-09-03T20:00:05Z",
  });

  assert.equal(result.complete, false);
  assert.equal(result.stage, "official_photo_pending");
  assert.deepEqual(activity, []);
});
