import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { presentationAssetSourceDigest } from "../src/presentation-asset-demand.mjs";
import { createPresentationAssetDemandService } from "../src/presentation-asset-demand-service.mjs";

function missingSlot() {
  return {
    slotKey: "thread:thr_quiet:media:media_quiet",
    entityKind: "thread",
    entityRef: "thr_quiet",
    mediaId: "media_quiet",
    assetKind: "image",
    role: "official_id_photo",
    variant: "identity-card",
    status: "missing",
    brief: {
      description: "Official identity portrait derived from the canonical visual root.",
      constraints: ["Preserve likeness."],
    },
    inputReferences: ["identity_thr_quiet"],
    referenceObjectRefs: ["visual_identity_reference_quiet"],
    sourceDigest: presentationAssetSourceDigest({ threadId: "thr_quiet", role: "official_id_photo" }),
    provenanceRef: "prov_quiet",
    deferredReason: null,
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_quiet",
      mediaId: "media_quiet",
    },
  };
}

test("unchanged pending demand does not rewrite catalog or refresh dispatch witness", async () => {
  const base = createMemoryInfraDriver();
  let upserts = 0;
  const infra = {
    ...base,
    catalog: {
      ...base.catalog,
      async upsert(key, value) {
        upserts += 1;
        return base.catalog.upsert(key, value);
      },
    },
  };
  const service = createPresentationAssetDemandService({ infra });
  const scope = { entityKind: "thread", entityRef: "thr_quiet" };

  const first = await service.reconcile({
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:00:00Z",
    providerProfile: "bfl-flux-2-pro-v1",
  });
  assert.equal(first.changed, true);
  assert.equal(upserts, 1);
  const firstUpdatedAt = first.projection.updatedAt;
  const firstDispatchObservedAt = first.projection.demands[0].dispatch.observedAt;

  const second = await service.reconcile({
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:00:05Z",
    providerProfile: "bfl-flux-2-pro-v1",
  });

  assert.equal(second.changed, false);
  assert.equal(upserts, 1);
  assert.equal(second.projection.updatedAt, firstUpdatedAt);
  assert.equal(second.projection.demands[0].dispatch.observedAt, firstDispatchObservedAt);
  assert.equal(second.reconciliation.createdDemands.length, 0);
  assert.equal(second.reconciliation.retainedDemands.length, 1);
});

test("Presentation catalog D1 quota failure opens one shared write circuit across service instances", async () => {
  const base = createMemoryInfraDriver();
  let upserts = 0;
  const quotaError = () => new Error(
    "D1_ERROR: Your account has exceeded D1's free tier daily row write limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue.",
  );
  const infra = {
    ...base,
    catalog: {
      ...base.catalog,
      async upsert() {
        upserts += 1;
        throw quotaError();
      },
    },
  };
  let clock = 0;
  const options = {
    infra,
    writeCircuitKey: "presentation-catalog-quota-test",
    writeQuotaBackoffMs: 300_000,
    nowMs: () => clock,
  };
  const input = {
    scope: { entityKind: "thread", entityRef: "thr_quiet" },
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:00:00Z",
    providerProfile: "bfl-flux-2-pro-v1",
  };

  await assert.rejects(
    () => createPresentationAssetDemandService(options).reconcile(input),
    (error) => {
      assert.equal(error.code, "D1_WRITE_QUOTA_EXHAUSTED");
      assert.equal(error.retryable, true);
      return true;
    },
  );
  assert.equal(upserts, 1);

  clock = 5_000;
  await assert.rejects(
    () => createPresentationAssetDemandService(options).reconcile({
      ...input,
      requestedAt: "2026-09-03T20:00:05Z",
    }),
    (error) => {
      assert.equal(error.code, "PRESENTATION_CATALOG_WRITE_CIRCUIT_OPEN");
      assert.equal(error.retryable, true);
      assert.equal(error.suppressActivity, true);
      return true;
    },
  );
  assert.equal(upserts, 1);

  clock = 300_001;
  await assert.rejects(
    () => createPresentationAssetDemandService(options).reconcile({
      ...input,
      requestedAt: "2026-09-03T20:05:00.001Z",
    }),
    (error) => {
      assert.equal(error.code, "D1_WRITE_QUOTA_EXHAUSTED");
      return true;
    },
  );
  assert.equal(upserts, 2);
});
