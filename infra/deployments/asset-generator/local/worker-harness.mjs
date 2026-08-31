import {
  createAssetGenerationCompletion,
  createAssetGenerationRuntime,
} from "#services/asset-generator/src/index.mjs";

function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

/**
 * Local deployment harness for the generic Asset Generator workflow worker.
 *
 * It intentionally knows nothing about canonical identity or Presentation
 * semantics. The caller selects a provider from the queued job and may supply a
 * completion sink that emulates the deployment's completion queue consumer.
 */
export function createLocalAssetGenerationWorker({
  infra,
  selectProvider,
  credentialSigner,
  completionSink = null,
  workflowName = "asset_generation_v1",
} = {}) {
  requireMethod("infra.workflows", infra?.workflows, "get");
  if (typeof selectProvider !== "function") {
    throw new TypeError("local Asset Generator worker requires selectProvider()");
  }
  requireMethod("credentialSigner", credentialSigner, "verify");
  if (completionSink !== null && typeof completionSink !== "function") {
    throw new TypeError("local Asset Generator worker completionSink must be a function or null");
  }

  return Object.freeze({
    async run({ jobId, attemptNumber = 1 } = {}) {
      const workflow = await infra.workflows.get(workflowName, jobId);
      if (workflow === null) throw new Error(`asset workflow ${jobId} is not scheduled`);
      const provider = await selectProvider(workflow.input);
      const runtime = createAssetGenerationRuntime({
        infra,
        provider,
        credentialSigner,
      });
      const generated = await runtime.execute(workflow.input, { attemptNumber });
      const completion = createAssetGenerationCompletion({
        jobId: generated.receipt.jobId,
        receiptObjectRef: generated.receiptObjectRef,
        receiptDigest: generated.receiptDigest,
      });
      const completionResult = completionSink === null
        ? null
        : await completionSink(completion, { job: workflow.input, generated });
      return Object.freeze({ workflow, generated, completion, completionResult });
    },
  });
}
