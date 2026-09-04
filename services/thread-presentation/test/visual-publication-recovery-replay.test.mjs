import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationVisualPublicationReconciler } from "../src/visual-publication-reconciler.mjs";

const THREAD_ID = "thr_visual_recovery_replay";
const MEDIA_ID = "media_visual_recovery_replay";
const ISSUED_AT = "2026-09-03T20:04:00Z";

function embodiment() {
  return {
    embodimentId: "emb_visual_recovery_replay",
    threadId: THREAD_ID,
    kind: "portrait",
    visibility: "public",
    status: "available",
    asset: { referenceObjectRef: "visual_identity_reference_recovery_replay" },
  };
}

function snapshot() {
  return {
    pointer: {
      objectRef: "snapshot_visual_recovery_replay",
      snapshotDigest: `sha256:${"a".repeat(64)}`,
    },
    snapshot: {
      presentation: {
        manifest: { threadId: THREAD_ID, generatedAt: ISSUED_AT },
        civilIdentity: { registeredAt: "2026-09-03T20:03:00Z" },
      },
      media: { assets: [] },
      provenance: {},
    },
  };
}

test("recovery replay uses stable Identity Card issuedAt for deterministic Workflow input", async () => {
  const requestedAtValues = [];
  const current = snapshot();
  const reconciler = createThreadPresentationVisualPublicationReconciler({
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
    planSlots() {
      return {
        slots: [{
          mediaId: MEDIA_ID,
          status: "missing",
          referenceObjectRefs: ["visual_identity_reference_recovery_replay"],
        }],
      };
    },
    createDemandService() {
      return {
        async reconcile({ requestedAt }) {
          requestedAtValues.push(requestedAt);
          return {
            changed: false,
            projection: {
              demands: [{
                demand: {
                  current: true,
                  demandId: "presassetdemand_recovery_replay",
                  job: {
                    jobId: "assetjob_recovery_replay",
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

  await reconciler.reconcileAvailableEmbodiment({
    threadId: THREAD_ID,
    embodiment: embodiment(),
    observedAt: "2026-09-03T20:05:00Z",
    regenerationKey: "recovery-A",
  });
  await reconciler.reconcileAvailableEmbodiment({
    threadId: THREAD_ID,
    embodiment: embodiment(),
    observedAt: "2026-09-03T20:10:00Z",
    regenerationKey: "recovery-A",
  });

  assert.deepEqual(requestedAtValues, [ISSUED_AT, ISSUED_AT]);
});
