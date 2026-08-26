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
const OPENAI_IMAGE_MODEL = "gpt-image-2-2026-04-21";
const FAILURE_OBSERVATION_VERSION = "asset-generation-failure-observation-v0.1";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function safeFailureDetail(error) {
  const value = error instanceof Error ? error.message : String(error);
  return value.length <= 2000 ? value : `${value.slice(0, 1999)}…`;
}

function generationFailureObservation(error) {
  return {
    failureVersion: FAILURE_OBSERVATION_VERSION,
    phase: "credentialed_asset_generation",
    provider: "openai",
    model: OPENAI_IMAGE_MODEL,
    retryable: error?.retryable === true,
    detail: safeFailureDetail(error),
  };
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
    model: OPENAI_IMAGE_MODEL,
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
            const observation = generationFailureObservation(error);
            throw new NonRetryableError(
              JSON.stringify(observation),
              "AssetGenerationAttemptFailed",
            );
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

// Wrangler requires a default module export to classify this script as an ES
// Module Worker. Asset generation itself is Workflow-only; direct HTTP access
// intentionally exposes no generation API.
export default {
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
};
