import assert from "node:assert/strict";
import test from "node:test";

import {
  embodimentId,
  embodimentSpecificationDigest,
} from "#services/world-kernel/src/embodiment-domain.mjs";
import { createThreadPresentationVisualPublicationReconciler } from "../src/visual-publication-reconciler.mjs";

function availableEmbodiment(threadId = "thr_presentation_visual_001") {
  const specification = {
    subject: {
      partyId: threadId,
      description: "A person with a softly angular oval face; medium warm-brown skin with ordinary visible texture; wide-set dark brown almond-shaped eyes; straight medium-width brows with a subtly higher left arch; a narrow straight nose with rounded tip; a defined cupid's bow and fuller lower lip; a tapered jaw and rounded chin; attached earlobes; thick dark-brown wavy hair with a subtly uneven natural hairline; and a small pale diagonal scar above the outer left eyebrow.",
    },
    method: "canonical synthetic portrait specification",
    description: "Preserve ordinary asymmetry and skin detail. Use a neutral head-and-shoulders reference composition with both ears and hairline visible, neutral expression, even lighting, ordinary perspective, and no accessories obscuring identity landmarks.",
    model: "replaceable-renderer",
  };
  return {
    embodimentId: embodimentId({ threadId, kind: "portrait", lineage: "canonical" }),
    revision: 2,
    supersedesRevision: 1,
    threadId,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: [`evt_seed_${threadId}`],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "available",
    unavailableReason: null,
    asset: {
      assetRef: "asset://visual_identity_reference_fixture",
      referenceObjectRef: "visual_identity_reference_fixture",
      sha256: `sha256:${"a".repeat(64)}`,
      mediaType: "image/webp",
      width: 1024,
      height: 1024,
      durationMs: null,
    },
    visibility: "public",
    recordedAt: "2026-08-30T20:01:01Z",
  };
}

test("Presentation visual reconciliation projects admitted identity then schedules one reference-conditioned official photo", async () => {
  const embodiment = availableEmbodiment();
  const mediaId = "media_official_id_photo_fixture";
  const calls = [];
  const currentSnapshot = {
    pointer: {
      objectRef: "snapshot_identity_fixture",
      snapshotDigest: `sha256:${"b".repeat(64)}`,
    },
    snapshot: {
      presentation: {
        manifest: {
          threadId: embodiment.threadId,
          generatedAt: "2026-08-30T20:03:00Z",
        },
        civilIdentity: {
          registeredAt: "2026-08-30T20:04:00Z",
        },
      },
      media: { assets: [] },
      provenance: {},
    },
  };
  const presentationServer = {
    async getSnapshot() { return currentSnapshot; },
    async publishSnapshot() { throw new Error("injected rewrite owns publication in this test"); },
  };
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer,
    infra: {},
    selectProviderProfile({ requiresReferenceObjects }) {
      assert.equal(requiresReferenceObjects, true);
      return "bfl-flux-2-pro-v1";
    },
    createVisualRewrite({ embodimentReader }) {
      return {
        async project({ embodimentId: requestedId }) {
          const [supplied] = embodimentReader.listCurrent(embodiment.threadId);
          assert.equal(supplied.embodimentId, embodiment.embodimentId);
          assert.equal(requestedId, embodiment.embodimentId);
          calls.push("visual");
          return { reused: false };
        },
      };
    },
    createIdentityRewrite() {
      return {
        async ensureOfficialIdentityMedia({ issuedAt }) {
          assert.equal(issuedAt, "2026-08-30T20:04:00Z");
          calls.push("identity");
          return {
            reused: false,
            identityCard: { officialPhotoMediaRef: mediaId },
          };
        },
      };
    },
    planSlots() {
      calls.push("plan");
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
        async reconcile({ scope, providerProfile, slots, requestedAt }) {
          calls.push("demand");
          assert.deepEqual(scope, { entityKind: "thread", entityRef: embodiment.threadId });
          assert.equal(providerProfile, "bfl-flux-2-pro-v1");
          assert.equal(requestedAt, "2026-08-30T20:04:00Z");
          assert.deepEqual(slots[0].referenceObjectRefs, [embodiment.asset.referenceObjectRef]);
          return {
            projection: {
              demands: [{
                demand: {
                  current: true,
                  demandId: "demand_official_fixture",
                  job: {
                    jobId: "asset_job_official_fixture",
                    context: { kind: "thread_presentation_media", mediaId },
                  },
                },
              }],
            },
          };
        },
      };
    },
  });

  const result = await reconciler.reconcileAvailableEmbodiment({
    threadId: embodiment.threadId,
    embodiment,
    observedAt: "2026-08-30T20:02:00Z",
  });
  assert.equal(result.complete, false);
  assert.equal(result.stage, "official_photo_pending");
  assert.equal(result.detail.providerProfile, "bfl-flux-2-pro-v1");
  assert.equal(result.detail.jobId, "asset_job_official_fixture");
  assert.deepEqual(calls, ["visual", "identity", "plan", "demand"]);
});

test("Presentation visual reconciliation waits for the newborn projection before touching media", async () => {
  const embodiment = availableEmbodiment("thr_presentation_visual_waiting_001");
  let touched = false;
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer: {
      async getSnapshot() { return null; },
      async publishSnapshot() { touched = true; },
    },
    infra: {},
    selectProviderProfile() { touched = true; return "unused"; },
    createDemandService() { return { async reconcile() { touched = true; } }; },
    createVisualRewrite() { touched = true; return {}; },
    createIdentityRewrite() { touched = true; return {}; },
    planSlots() { touched = true; return { slots: [] }; },
  });
  touched = false;

  const result = await reconciler.reconcileAvailableEmbodiment({
    threadId: embodiment.threadId,
    embodiment,
    observedAt: "2026-08-30T20:02:00Z",
  });
  assert.equal(result.complete, false);
  assert.equal(result.stage, "awaiting_genesis_projection");
  assert.equal(touched, false);
});
