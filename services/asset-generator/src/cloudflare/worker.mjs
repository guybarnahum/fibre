import { WorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { createAssetGenerationCompletion } from "../asset-generation-completion.mjs";
import { createCloudflareAssetGenerationRuntime } from "./asset-generation-runtime.mjs";

function completionQueue(env) {
  const queue = env?.ASSET_COMPLETIONS;
  if (!queue || typeof queue.send !== "function") {
    throw new TypeError("ASSET_COMPLETIONS queue binding is required");
  }
  return queue;
}

export class AssetGenerationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const generated = await step.do(
      "generate credentialed asset",
      { timeout: "10 minutes" },
      async () => {
        try {
          const runtime = createCloudflareAssetGenerationRuntime(this.env);
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
      // Queue delivery is a separate durable step. Its default retry policy is safe:
      // the message is a deterministic pointer to already-immutable output, and the
      // Presentation consumer is idempotent under at-least-once delivery.
      await completionQueue(this.env).send(completion);
      return completion;
    });

    return generated;
  }
}
