import {
  normalizeAssetGenerationCompletion,
  normalizeStoredAssetReceipt,
  verifyCredentialedAssetForPublication,
} from "#services/asset-generator/src/index.mjs";
import { requireInfraCapabilities } from "#infra";
import {
  normalizePresentationAssetDemandProjection,
  presentationAssetDemandCatalogKey,
} from "./presentation-asset-demand-service.mjs";
import { createPresentationAssetDemandCompletionStore } from "./presentation-asset-demand-completion.mjs";
import { assertNonEmpty, canonicalJson } from "./persistence-common.mjs";

function decodeJson(bytes, label) {
  let parsed;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : new TextDecoder().decode(bytes));
  } catch {
    throw new Error(`${label} is invalid JSON`);
  }
  return parsed;
}

function scopeFromReceipt(receipt) {
  const context = receipt.context;
  if (context.kind === "thread_presentation_media") {
    assertNonEmpty("completion receipt context.threadId", context.threadId);
    return Object.freeze({ entityKind: "thread", entityRef: context.threadId });
  }
  if (context.kind === "world_presentation_media") {
    assertNonEmpty("completion receipt context.worldRef", context.worldRef);
    return Object.freeze({ entityKind: "world", entityRef: context.worldRef });
  }
  if (context.kind === "experience_presentation_media") {
    assertNonEmpty("completion receipt context.eventRef", context.eventRef);
    return Object.freeze({ entityKind: "experience", entityRef: context.eventRef });
  }
  throw new TypeError("asset generation completion is not for a presentation asset demand scope");
}

async function loadDemandProjection(infra, scope) {
  const stored = await infra.catalog.get(presentationAssetDemandCatalogKey(scope));
  if (stored === null) throw new Error("presentation asset demand projection is not yet durable");
  return normalizePresentationAssetDemandProjection(stored);
}

function findDemandEntry(projection, jobId) {
  const matches = projection.demands.filter((entry) => entry.demand.job.jobId === jobId);
  if (matches.length !== 1) {
    throw new Error(`asset completion expected exactly one durable demand for job ${jobId}`);
  }
  return matches[0];
}

export function createPresentationAssetCompletionService({
  infra,
  credentialSigner,
  publishReady = null,
  verifyReceipt = verifyCredentialedAssetForPublication,
  now = () => new Date().toISOString(),
} = {}) {
  requireInfraCapabilities(infra, "objects", "catalog");
  if (typeof verifyReceipt !== "function") throw new TypeError("verifyReceipt must be a function");
  if (publishReady !== null && typeof publishReady !== "function") {
    throw new TypeError("publishReady must be a function or null");
  }
  if (typeof now !== "function") throw new TypeError("now must be a function");
  const completionStore = createPresentationAssetDemandCompletionStore({ infra });

  return Object.freeze({
    async consume(rawCompletion) {
      const completion = normalizeAssetGenerationCompletion(rawCompletion);
      const storedReceipt = await infra.objects.get(completion.receiptObjectRef);
      if (storedReceipt === null) throw new Error("asset completion receipt object is not yet readable");
      if (storedReceipt.digest !== completion.receiptDigest) {
        throw new Error("asset completion receipt digest does not match immutable storage");
      }
      const receipt = normalizeStoredAssetReceipt(
        decodeJson(storedReceipt.bytes, "asset completion receipt"),
      );
      if (receipt.jobId !== completion.jobId) {
        throw new Error("asset completion jobId does not match stored receipt");
      }
      const scope = scopeFromReceipt(receipt);
      const projection = await loadDemandProjection(infra, scope);
      const entry = findDemandEntry(projection, completion.jobId);
      if (entry.demand.job.receiptObjectRef !== completion.receiptObjectRef) {
        throw new Error("asset completion receipt ref does not match durable demand job");
      }

      if (entry.demand.state === "ready") {
        return Object.freeze({
          handled: true,
          duplicate: true,
          stale: false,
          scope,
          demand: entry.demand,
          receipt,
          proof: null,
          publication: null,
        });
      }
      if (!entry.demand.current || entry.demand.state !== "pending") {
        return Object.freeze({
          handled: false,
          duplicate: false,
          stale: true,
          scope,
          demand: entry.demand,
          receipt,
          proof: null,
          publication: null,
        });
      }

      const proof = await verifyReceipt({
        infra,
        credentialSigner,
        receipt,
      });
      if (proof.receipt.jobId !== completion.jobId) {
        throw new Error("verified receipt job does not match completion");
      }
      if (canonicalJson(proof.generationRecord.job) !== canonicalJson(entry.demand.job)) {
        throw new Error("verified generation job does not match durable presentation demand");
      }

      const publication = publishReady === null
        ? null
        : await publishReady({
            scope,
            demand: entry.demand,
            receipt: proof.receipt,
            proof,
          });

      const marked = await completionStore.markReady({
        scope,
        demandId: entry.demand.demandId,
        jobId: completion.jobId,
        observedAt: now(),
      });
      if (!marked.applied && !marked.duplicate) {
        return Object.freeze({
          handled: false,
          duplicate: false,
          stale: true,
          scope,
          demand: marked.demand,
          receipt: proof.receipt,
          proof,
          publication,
        });
      }

      return Object.freeze({
        handled: true,
        duplicate: marked.duplicate,
        stale: false,
        scope,
        demand: marked.demand,
        receipt: proof.receipt,
        proof,
        publication,
      });
    },
  });
}
