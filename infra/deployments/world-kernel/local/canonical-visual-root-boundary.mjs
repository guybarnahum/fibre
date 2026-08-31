import {
  createAssetGenerationService,
  normalizeStoredAssetReceipt,
  verifyCredentialedAssetForPublication,
} from "#services/asset-generator/src/index.mjs";

function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
  return value;
}

function parseJsonObject(bytes, label) {
  const text = new TextDecoder().decode(bytes);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must contain a JSON object`);
  }
  return parsed;
}

/**
 * World-side deployment adapter for canonical visual-root generation.
 *
 * World owns the semantic request and admission decision, but never executes an
 * image provider. It schedules the deterministic Asset Generator workflow and
 * reconciles only from durable workflow/object state. Re-running after restart
 * therefore reuses the same workflow instance and completed receipt.
 */
export function createCanonicalVisualRootBoundary({
  infra,
  credentialSigner,
  workflowName = "asset_generation_v1",
} = {}) {
  if (!infra?.objects || typeof infra.objects.get !== "function") {
    throw new TypeError("canonical visual root boundary requires object storage");
  }
  if (!infra?.workflows || typeof infra.workflows.start !== "function" || typeof infra.workflows.get !== "function") {
    throw new TypeError("canonical visual root boundary requires durable workflows");
  }
  requireMethod("credentialSigner", credentialSigner, "verify");
  const assetGeneration = createAssetGenerationService({ infra, workflowName });

  return Object.freeze({
    async reconcile({ job } = {}) {
      const receiptStored = await infra.objects.get(job.receiptObjectRef);
      if (receiptStored === null) {
        const scheduled = await assetGeneration.request(job);
        return Object.freeze({
          state: "pending",
          retryable: true,
          workflowName: scheduled.instance.workflowName,
          instanceId: scheduled.instance.instanceId,
          workflowStatus: scheduled.instance.status,
          duplicate: scheduled.instance.duplicate === true,
        });
      }

      const receipt = normalizeStoredAssetReceipt(parseJsonObject(
        receiptStored.bytes,
        `canonical visual root receipt ${job.receiptObjectRef}`,
      ));
      if (receipt.jobId !== job.jobId || receipt.objectRef !== job.outputObjectRef) {
        throw new Error(`canonical visual root receipt ${job.receiptObjectRef} does not match the requested job`);
      }
      const proof = await verifyCredentialedAssetForPublication({
        infra,
        credentialSigner,
        receipt,
      });
      if (proof.verification.valid !== true) {
        throw new Error("canonical visual root credential verification failed");
      }
      return Object.freeze({
        state: "ready",
        recordedAt: proof.receipt.completedAt,
        proof: Object.freeze({
          receipt: proof.receipt,
          generationRecord: proof.generationRecord,
          verification: proof.verification,
        }),
      });
    },
  });
}
