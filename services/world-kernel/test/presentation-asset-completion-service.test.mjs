import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#packages/infra/src/memory-driver.mjs";
import {
  ASSET_GENERATION_COMPLETION_VERSION,
  STORED_ASSET_RECEIPT_VERSION,
} from "#services/asset-generator/src/index.mjs";
import { presentationAssetSourceDigest } from "../src/presentation-asset-demand.mjs";
import { createPresentationAssetDemandService } from "../src/presentation-asset-demand-service.mjs";
import { createPresentationAssetCompletionService } from "../src/presentation-asset-completion-service.mjs";

const RECEIPT_DIGEST = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ASSET_DIGEST = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const RECORD_DIGEST = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const PROVIDER_DIGEST = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const MANIFEST_DIGEST = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

function missingThreadSlot({ source = "first" } = {}) {
  return {
    slotKey: "thread:thr_completion:media:media_completion",
    entityKind: "thread",
    entityRef: "thr_completion",
    mediaId: "media_completion",
    assetKind: "image",
    role: "place",
    variant: "default",
    status: "missing",
    brief: {
      description: "Generated reconstruction for completion testing.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["source_completion"],
    referenceObjectRefs: [],
    sourceDigest: presentationAssetSourceDigest({ source }),
    provenanceRef: "prov_generated",
    deferredReason: null,
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_completion",
      mediaId: "media_completion",
      provenanceRef: "prov_generated",
    },
  };
}

function receiptFor(job) {
  return {
    receiptVersion: STORED_ASSET_RECEIPT_VERSION,
    jobId: job.jobId,
    status: "ready",
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    objectRef: job.outputObjectRef,
    sha256: ASSET_DIGEST,
    mediaType: "image/webp",
    width: 512,
    height: 512,
    durationMs: null,
    completedAt: "2026-08-25T22:00:03Z",
    generationRecordObjectRef: "generation_record_completion",
    generationRecordDigest: RECORD_DIGEST,
    providerOutputDigest: PROVIDER_DIGEST,
    credential: {
      format: "fixture-content-credential",
      signerId: "fixture-signer",
      manifestDigest: MANIFEST_DIGEST,
      embeddedAt: "2026-08-25T22:00:01Z",
      verifiedAt: "2026-08-25T22:00:02Z",
    },
    inputReferences: job.inputReferences,
    context: job.context,
  };
}

async function persistReceipt(infra, job) {
  const receipt = receiptFor(job);
  await infra.objects.putImmutable(
    job.receiptObjectRef,
    JSON.stringify(receipt),
    RECEIPT_DIGEST,
    { kind: "stored_asset_receipt", jobId: job.jobId },
  );
  return receipt;
}

function completionFor(job) {
  return {
    completionVersion: ASSET_GENERATION_COMPLETION_VERSION,
    jobId: job.jobId,
    receiptObjectRef: job.receiptObjectRef,
    receiptDigest: RECEIPT_DIGEST,
  };
}

async function pendingDemand(infra, { source = "first" } = {}) {
  const demandService = createPresentationAssetDemandService({ infra });
  const reconciled = await demandService.reconcile({
    scope: { entityKind: "thread", entityRef: "thr_completion" },
    slots: [missingThreadSlot({ source })],
    requestedAt: "2026-08-25T22:00:00Z",
  });
  return { demandService, entry: reconciled.projection.demands.find((item) => item.demand.current) };
}

test("completion publishes a current pending Thread demand once, then marks it ready", async () => {
  const infra = createMemoryInfraDriver();
  const { entry } = await pendingDemand(infra);
  const job = entry.demand.job;
  const receipt = await persistReceipt(infra, job);
  let publications = 0;
  const service = createPresentationAssetCompletionService({
    infra,
    credentialSigner: {},
    verifyReceipt: async () => ({
      proofVersion: "fixture-publication-proof",
      receipt,
      generationRecord: { job: structuredClone(job) },
      verification: { valid: true },
    }),
    publishReady: async ({ demand, receipt: verifiedReceipt }) => {
      publications += 1;
      assert.equal(demand.demandId, entry.demand.demandId);
      assert.equal(verifiedReceipt.jobId, job.jobId);
      return { eventId: "media_ready_completion" };
    },
    now: () => "2026-08-25T22:00:04Z",
  });

  const first = await service.consume(completionFor(job));
  assert.equal(first.handled, true);
  assert.equal(first.duplicate, false);
  assert.equal(first.demand.state, "ready");
  assert.equal(publications, 1);

  const second = await service.consume(completionFor(job));
  assert.equal(second.handled, true);
  assert.equal(second.duplicate, true);
  assert.equal(publications, 1, "at-least-once queue delivery must not republish a ready demand");
});

test("completion for a superseded demand is acknowledged as stale and never published", async () => {
  const infra = createMemoryInfraDriver();
  const { demandService, entry: oldEntry } = await pendingDemand(infra, { source: "old" });
  const oldJob = oldEntry.demand.job;
  await persistReceipt(infra, oldJob);
  await demandService.reconcile({
    scope: { entityKind: "thread", entityRef: "thr_completion" },
    slots: [missingThreadSlot({ source: "new" })],
    requestedAt: "2026-08-25T22:01:00Z",
  });

  let publications = 0;
  const service = createPresentationAssetCompletionService({
    infra,
    credentialSigner: {},
    verifyReceipt: async () => { throw new Error("stale completion must not reach credential verification"); },
    publishReady: async () => { publications += 1; },
    now: () => "2026-08-25T22:01:01Z",
  });
  const result = await service.consume(completionFor(oldJob));
  assert.equal(result.handled, false);
  assert.equal(result.stale, true);
  assert.equal(result.demand.state, "superseded");
  assert.equal(publications, 0);
});

test("completion refuses a queue signal whose receipt digest does not match immutable storage", async () => {
  const infra = createMemoryInfraDriver();
  const { entry } = await pendingDemand(infra);
  const job = entry.demand.job;
  await persistReceipt(infra, job);
  const service = createPresentationAssetCompletionService({
    infra,
    credentialSigner: {},
    verifyReceipt: async () => { throw new Error("should not verify mismatched receipt"); },
  });
  await assert.rejects(() => service.consume({
    ...completionFor(job),
    receiptDigest: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  }), /receipt digest does not match immutable storage/);
});
