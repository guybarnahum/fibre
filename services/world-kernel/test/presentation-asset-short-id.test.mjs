import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#packages/infra/src/memory-driver.mjs";
import { fibreShortIdCandidates, fibreShortRef } from "#services/asset-generator/src/index.mjs";
import {
  presentationAssetIdentityDigest,
  presentationAssetSourceDigest,
} from "../src/presentation-asset-demand.mjs";
import { createPresentationAssetDemandService } from "../src/presentation-asset-demand-service.mjs";

function slot() {
  return {
    slotKey: "thread:thr_short:media:media_short",
    entityKind: "thread",
    entityRef: "thr_short",
    mediaId: "media_short",
    assetKind: "image",
    role: "memory_reconstruction",
    variant: "default",
    status: "missing",
    brief: {
      description: "Generated reconstruction for short-id collision proof.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["memory_short"],
    referenceObjectRefs: [],
    sourceDigest: presentationAssetSourceDigest({ memory: "short-id-proof" }),
    provenanceRef: "prov_short",
    deferredReason: null,
    context: { kind: "thread_presentation_media", threadId: "thr_short", mediaId: "media_short" },
  };
}

test("demand creation resolves a 12-hex collision before Workflow creation without persisting the full identity digest", async () => {
  const infra = createMemoryInfraDriver();
  const target = slot();
  const identityDigest = presentationAssetIdentityDigest(target, {
    providerProfile: "presentation-image-default-v1",
    regenerationKey: null,
  });
  const [firstSuffix, secondSuffix] = fibreShortIdCandidates(identityDigest);

  await infra.objects.putImmutable(
    fibreShortRef("assetidentity_", firstSuffix),
    "different-semantic-identity",
    `sha256:${"f".repeat(64)}`,
    { kind: "asset_generation_identity_reservation" },
  );

  const service = createPresentationAssetDemandService({ infra });
  const input = {
    scope: { entityKind: "thread", entityRef: "thr_short" },
    slots: [target],
    requestedAt: "2026-08-26T18:50:00Z",
  };
  const first = await service.reconcile(input);
  const demand = first.reconciliation.createdDemands[0];

  assert.equal(demand.job.jobId, fibreShortRef("assetjob_", secondSuffix));
  assert.equal(demand.demandId, fibreShortRef("presassetdemand_", secondSuffix));
  assert.equal(demand.job.outputObjectRef, fibreShortRef("asset_", secondSuffix));
  assert.equal(demand.job.receiptObjectRef, fibreShortRef("assetreceipt_", secondSuffix));
  assert.equal(JSON.stringify(first.projection).includes(identityDigest), false);
  assert.equal(JSON.stringify(first.projection).includes("identityDigest"), false);

  const repeated = await service.reconcile({ ...input, requestedAt: "2026-08-26T18:51:00Z" });
  assert.equal(repeated.reconciliation.createdDemands.length, 0);
  assert.equal(repeated.reconciliation.retainedDemands[0].job.jobId, demand.job.jobId);
});
