import { createAssetGenerationCompletion } from "#services/asset-generator/src/index.mjs";

const ASSET_GENERATION_WORKFLOW = "asset_generation_v1";

function requireFunction(name, value) {
  if (typeof value !== "function") throw new TypeError(`${name} must be a function`);
  return value;
}

function isCompletedPending(result) {
  return result?.complete === false
    && result?.stage === "official_photo_pending"
    && result?.detail?.workflowStatus === "complete"
    && typeof result?.detail?.jobId === "string"
    && result.detail.jobId !== "";
}

export function createCompletedWorkflowRecoveryReconciler({
  reconciler,
  infra,
  completionConsumer,
} = {}) {
  const reconcile = requireFunction(
    "reconciler.reconcileAvailableEmbodiment",
    reconciler?.reconcileAvailableEmbodiment?.bind(reconciler),
  );
  const workflowGet = requireFunction("infra.workflows.get", infra?.workflows?.get?.bind(infra.workflows));
  const objectGet = requireFunction("infra.objects.get", infra?.objects?.get?.bind(infra.objects));
  const consume = requireFunction("completionConsumer.consume", completionConsumer?.consume?.bind(completionConsumer));

  return Object.freeze({
    async reconcileAvailableEmbodiment(input) {
      const first = await reconcile(input);
      if (!isCompletedPending(first)) return first;

      const jobId = first.detail.jobId;
      const workflow = await workflowGet(ASSET_GENERATION_WORKFLOW, jobId);
      if (workflow === null || workflow.status !== "complete") return first;
      if (!workflow.input || workflow.input.jobId !== jobId) {
        throw new Error(`completed workflow ${jobId} has no matching durable input`);
      }
      const receiptObjectRef = workflow.input.receiptObjectRef;
      if (typeof receiptObjectRef !== "string" || receiptObjectRef === "") {
        throw new Error(`completed workflow ${jobId} durable input has no receiptObjectRef`);
      }

      const storedReceipt = await objectGet(receiptObjectRef);
      if (storedReceipt === null) return first;
      const completion = createAssetGenerationCompletion({
        jobId,
        receiptObjectRef,
        receiptDigest: storedReceipt.digest,
      });
      await consume(completion);

      return reconcile(input);
    },
  });
}
