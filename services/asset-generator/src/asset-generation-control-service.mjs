import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import { createAssetGenerationService } from "./asset-generation-service.mjs";
import {
  normalizeStoredAssetReceipt,
  verifyProvenancedAssetForPublication,
} from "./provenanced-asset-generation.mjs";

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
 * Generic durable control plane for deterministic Asset Generator jobs.
 *
 * The caller supplies the semantic job. This service owns only workflow
 * scheduling and durable completion observation; it does not interpret World
 * or Presentation semantics. Content credentials are an optional publication
 * enhancement: when absent, immutable generation-record, provider-output and
 * final-asset digests remain mandatory.
 */
export function createAssetGenerationControlService({
  infra,
  credentialSigner = null,
  workflowName = "asset_generation_v1",
} = {}) {
  if (!infra?.objects || typeof infra.objects.get !== "function") {
    throw new TypeError("asset generation control service requires object storage");
  }
  if (!infra?.workflows || typeof infra.workflows.start !== "function" || typeof infra.workflows.get !== "function") {
    throw new TypeError("asset generation control service requires durable workflows");
  }
  const assetGeneration = createAssetGenerationService({ infra, workflowName });

  return Object.freeze({
    async reconcile(rawJob) {
      const job = normalizeAssetGenerationJob(rawJob);
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
        `asset generation receipt ${job.receiptObjectRef}`,
      ));
      if (receipt.jobId !== job.jobId || receipt.objectRef !== job.outputObjectRef) {
        throw new Error(`asset generation receipt ${job.receiptObjectRef} does not match the requested job`);
      }
      const proof = await verifyProvenancedAssetForPublication({
        infra,
        credentialSigner,
        receipt,
      });
      return Object.freeze({
        state: "ready",
        recordedAt: proof.receipt.completedAt,
        proof: Object.freeze({
          receipt: proof.receipt,
          generationRecord: proof.generationRecord,
          verification: proof.verification,
          credentialMode: proof.credentialMode,
        }),
      });
    },
  });
}
