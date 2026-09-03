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

test("ordinary reconciliation inherits the current regeneration epoch after explicit recovery", async () => {
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

  const original = await service.reconcile({
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:00:00Z",
    providerProfile: "bfl-flux-2-pro-v1",
  });
  const originalDemandId = original.projection.demands.find((entry) => entry.demand.current).demand.demandId;

  const recovered = await service.reconcile({
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:01:00Z",
    providerProfile: "bfl-flux-2-pro-v1",
    regenerationKey: "recovery-A",
  });
  assert.equal(recovered.changed, true);
  assert.equal(recovered.projection.regenerationKey, "recovery-A");
  assert.equal(recovered.reconciliation.createdDemands.length, 1);
  assert.equal(recovered.reconciliation.supersededDemands.length, 1);
  const recoveredDemandId = recovered.projection.demands.find((entry) => entry.demand.current).demand.demandId;
  assert.notEqual(recoveredDemandId, originalDemandId);
  assert.equal(upserts, 2);

  const ordinarySweep = await service.reconcile({
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:01:05Z",
    providerProfile: "bfl-flux-2-pro-v1",
    regenerationKey: null,
  });

  assert.equal(ordinarySweep.changed, false);
  assert.equal(ordinarySweep.projection.regenerationKey, "recovery-A");
  assert.equal(ordinarySweep.reconciliation.createdDemands.length, 0);
  assert.equal(ordinarySweep.reconciliation.supersededDemands.length, 0);
  assert.equal(ordinarySweep.reconciliation.retainedDemands.length, 1);
  assert.equal(
    ordinarySweep.projection.demands.find((entry) => entry.demand.current).demand.demandId,
    recoveredDemandId,
  );
  assert.equal(upserts, 2, "ordinary sweep must not rewrite the recovered generation epoch");

  const repeatedRecovery = await service.reconcile({
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:01:10Z",
    providerProfile: "bfl-flux-2-pro-v1",
    regenerationKey: "recovery-A",
  });
  assert.equal(repeatedRecovery.changed, false);
  assert.equal(repeatedRecovery.reconciliation.createdDemands.length, 0);
  assert.equal(upserts, 2);

  const nextRecovery = await service.reconcile({
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-09-03T20:02:00Z",
    providerProfile: "bfl-flux-2-pro-v1",
    regenerationKey: "recovery-B",
  });
  assert.equal(nextRecovery.changed, true);
  assert.equal(nextRecovery.projection.regenerationKey, "recovery-B");
  assert.equal(nextRecovery.reconciliation.createdDemands.length, 1);
  assert.equal(nextRecovery.reconciliation.supersededDemands.length, 1);
  assert.equal(upserts, 3);
});
