import { WorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { createAssetGenerationCompletion } from "../asset-generation-completion.mjs";
import { createCloudflareAssetGenerationRuntime } from "./asset-generation-runtime.mjs";

export class AssetGenerationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const runtime = createCloudflareAssetGenerationRuntime(this.env);
    const generated = await step.do(
      "generate credentialed asset",
      { timeout: "10 minutes" },
      async () => {
        try {
          return await runtime.execute(event.payload);
        } catch (error) {
          // Provider generation is nondeterministic while the final Fibre object identity is
          // immutable. Until explicit attempt/staging identities exist, an implicit Workflow
          // retry could produce different bytes under the same semantic job identity.
          const message = error instanceof Error ? error.message : String(error);
          throw new NonRetryableError(message, "AssetGenerationAttemptFailed");
        }
      },
    );

    const completion = createAssetGenerationCompletion({
      jobId: generated.receipt.jobId,
      receiptObjectRef: generated.receiptObjectRef,
      receiptDigest: generated.receiptDigest,
    });

    await step.do("signal asset generation completion", async () => {
      // Completion publication uses the provider-neutral InfraDriver queues port.
      // This Cloudflare Workflow knows nothing about the eventual queue backend
      // beyond the deployment adapter assembled by createCloudflareAssetGenerationRuntime().
      await runtime.publishCompletion(completion);
      return completion;
    });

    return generated;
  }
}
