import test from "node:test";
import assert from "node:assert/strict";

import {
  presentationAssetSourceDigest,
  reconcilePresentationAssets,
} from "../src/presentation-asset-demand.mjs";

function slot(overrides = {}) {
  return {
    slotKey: "place:market:hero",
    entityKind: "place",
    entityRef: "place_market",
    mediaId: "media_market",
    assetKind: "image",
    role: "place",
    variant: "default",
    status: "missing",
    brief: {
      description: "Generated reconstruction of the presented market.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_1", "place_market"],
    referenceObjectRefs: [],
    sourceDigest: presentationAssetSourceDigest({
      placeRef: "place_market",
      summary: "A neighborhood market beside the river.",
    }),
    provenanceRef: "prov_market",
    deferredReason: null,
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_1",
      presentationId: "presentation_1",
      mediaPacketId: "media_1",
      mediaId: "media_market",
      provenanceRef: "prov_market",
      snapshotObjectRef: "snapshot_1",
      snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    ...overrides,
  };
}

test("missing eligible slot schedules exactly one deterministic demand and job", () => {
  const first = reconcilePresentationAssets({
    slots: [slot()],
    requestedAt: "2026-08-25T18:00:00Z",
    providerProfile: "presentation-image-default-v1",
  });
  const second = reconcilePresentationAssets({
    slots: [slot()],
    requestedAt: "2026-08-25T19:00:00Z",
    providerProfile: "presentation-image-default-v1",
  });

  assert.equal(first.jobs.length, 1);
  assert.equal(first.createdDemands.length, 1);
  assert.equal(first.jobs[0].jobId, second.jobs[0].jobId);
  assert.equal(first.jobs[0].outputObjectRef, second.jobs[0].outputObjectRef);
  assert.equal(first.jobs[0].receiptObjectRef, second.jobs[0].receiptObjectRef);
});

test("unchanged reconciliation retains the original exact job witness and produces no duplicate work", () => {
  const first = reconcilePresentationAssets({
    slots: [slot()],
    requestedAt: "2026-08-25T18:00:00Z",
  });
  const repeated = reconcilePresentationAssets({
    slots: [slot({
      context: {
        ...slot().context,
        snapshotObjectRef: "snapshot_2",
        snapshotDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    })],
    existingDemands: first.createdDemands,
    requestedAt: "2026-08-25T19:00:00Z",
  });

  assert.equal(repeated.jobs.length, 0);
  assert.equal(repeated.createdDemands.length, 0);
  assert.equal(repeated.retainedDemands.length, 1);
  assert.equal(repeated.retainedDemands[0].job.requestedAt, "2026-08-25T18:00:00Z");
  assert.equal(repeated.retainedDemands[0].job.context.snapshotObjectRef, "snapshot_1");
});

test("changed semantic source creates a new generation identity and supersedes current demand", () => {
  const first = reconcilePresentationAssets({
    slots: [slot()],
    requestedAt: "2026-08-25T18:00:00Z",
  });
  const changed = reconcilePresentationAssets({
    slots: [slot({
      sourceDigest: presentationAssetSourceDigest({
        placeRef: "place_market",
        summary: "A rebuilt neighborhood market with a covered arcade.",
      }),
      brief: {
        description: "Generated reconstruction of the rebuilt presented market.",
        constraints: ["Not documentary evidence."],
      },
    })],
    existingDemands: first.createdDemands,
    requestedAt: "2026-08-25T19:00:00Z",
  });

  assert.equal(changed.jobs.length, 1);
  assert.notEqual(changed.jobs[0].jobId, first.jobs[0].jobId);
  assert.equal(changed.createdDemands[0].supersedesDemandId, first.createdDemands[0].demandId);
  assert.equal(changed.supersededDemands[0].supersededByDemandId, changed.createdDemands[0].demandId);
});

test("ready and unavailable assets are not regenerated; deferred slot invalidates stale pending demand", () => {
  const first = reconcilePresentationAssets({
    slots: [slot()],
    requestedAt: "2026-08-25T18:00:00Z",
  });
  const ready = reconcilePresentationAssets({
    slots: [slot({ status: "ready", brief: null })],
    existingDemands: first.createdDemands,
    requestedAt: "2026-08-25T19:00:00Z",
  });
  assert.equal(ready.jobs.length, 0);
  assert.equal(ready.readySlots.length, 1);

  const unavailable = reconcilePresentationAssets({
    slots: [slot({ status: "unavailable", brief: null })],
    requestedAt: "2026-08-25T19:00:00Z",
  });
  assert.equal(unavailable.jobs.length, 0);
  assert.equal(unavailable.unavailableSlots.length, 1);

  const deferred = reconcilePresentationAssets({
    slots: [slot({
      status: "deferred",
      brief: null,
      deferredReason: "deferred_missing_authority",
    })],
    existingDemands: first.createdDemands,
    requestedAt: "2026-08-25T19:00:00Z",
  });
  assert.equal(deferred.jobs.length, 0);
  assert.equal(deferred.obsoleteDemands[0].reason, "slot_no_longer_eligible");
});

test("explicit regeneration key creates a distinct immutable generation identity", () => {
  const ordinary = reconcilePresentationAssets({
    slots: [slot()],
    requestedAt: "2026-08-25T18:00:00Z",
  });
  const regenerated = reconcilePresentationAssets({
    slots: [slot()],
    existingDemands: ordinary.createdDemands,
    requestedAt: "2026-08-25T19:00:00Z",
    regenerationKey: "editor-regeneration-2",
  });

  assert.equal(regenerated.jobs.length, 1);
  assert.notEqual(regenerated.jobs[0].jobId, ordinary.jobs[0].jobId);
  assert.notEqual(regenerated.jobs[0].outputObjectRef, ordinary.jobs[0].outputObjectRef);
});
