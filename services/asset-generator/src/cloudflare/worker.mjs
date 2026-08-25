import { WorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { createCloudflareAssetGenerationRuntime } from "./asset-generation-runtime.mjs";

export class AssetGenerationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    return step.do(
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
  }
}
