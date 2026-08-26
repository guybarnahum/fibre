import { WorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { createCloudflareInfraDriver } from "../../../packages/infra/src/cloudflare-v1.mjs";
import { withCloudflareQueueBindings } from "../../../packages/infra/src/cloudflare-queue-port.mjs";
import {
  ASSET_GENERATION_COMPLETION_QUEUE,
  AssetGenerationAttemptFailed,
  createAssetGenerationCompletion,
  createAssetGenerationRuntime,
  createHttpContentCredentialSigner,
  createOpenAIImageProvider,
} from "../../../services/asset-generator/src/index.mjs";

const CREDENTIAL_SIGNER_ID = "fibre-c2pa-node-local-v1";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function createRuntime(env) {
  if (!env || typeof env !== "object") throw new TypeError("Cloudflare asset generation env is required");
  if (!env.ASSET_OBJECTS) throw new TypeError("ASSET_OBJECTS binding is required");
  if (!env.ASSET_COMPLETIONS) throw new TypeError("ASSET_COMPLETIONS binding is required");

  const baseInfra = createCloudflareInfraDriver({ objectBucket: env.ASSET_OBJECTS });
  const infra = withCloudflareQueueBindings(baseInfra, {
    [ASSET_GENERATION_COMPLETION_QUEUE]: env.ASSET_COMPLETIONS,
  });
  const provider = createOpenAIImageProvider({
    apiKey: nonEmpty("OPENAI_API_KEY", env.OPENAI_API_KEY),
  });
  const credentialSigner = createHttpContentCredentialSigner({
    baseUrl: nonEmpty("C2PA_SIGNER_URL", env.C2PA_SIGNER_URL),
    signerId: CREDENTIAL_SIGNER_ID,
  });

  return createAssetGenerationRuntime({ infra, provider, credentialSigner });
}

export class AssetGenerationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const runtime = createRuntime(this.env);
    const generated = await step.do(
      "generate credentialed asset",
      { timeout: "10 minutes" },
      async () => {
        try {
          return await runtime.execute(event.payload);
        } catch (error) {
          if (error instanceof AssetGenerationAttemptFailed || error?.retryable === false) {
            const message = error instanceof Error ? error.message : String(error);
            throw new NonRetryableError(message, "AssetGenerationAttemptFailed");
          }
          throw error;
        }
      },
    );

    const completion = createAssetGenerationCompletion({
      jobId: generated.receipt.jobId,
      receiptObjectRef: generated.receiptObjectRef,
      receiptDigest: generated.receiptDigest,
    });

    await step.do("signal asset generation completion", async () => {
      await runtime.publishCompletion(completion);
      return completion;
    });

    return generated;
  }
}
