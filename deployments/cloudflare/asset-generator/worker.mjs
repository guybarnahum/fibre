import { WorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { createCloudflareInfraDriver } from "../../../packages/infra/src/cloudflare-v1.mjs";
import { withCloudflareQueueBindings } from "../../../packages/infra/src/cloudflare-queue-port.mjs";
import {
  ASSET_GENERATION_COMPLETION_QUEUE,
  assetGenerationRetryDecision,
  createAssetGenerationCompletion,
  createAssetGenerationRuntime,
  createHttpContentCredentialSigner,
  createOpenAIImageProvider,
} from "../../../services/asset-generator/src/index.mjs";

const CREDENTIAL_SIGNER_ID = "fibre-c2pa-node-local-v1";
const OPENAI_IMAGE_MODEL = "gpt-image-2-2026-04-21";
const FAILURE_OBSERVATION_VERSION = "asset-generation-failure-observation-v0.1";
const WORKFLOW_RETRY_LIMIT = 5;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function safeFailureDetail(error) {
  const value = error?.safeDetail ?? (error instanceof Error ? error.message : String(error));
  return value.length <= 2000 ? value : `${value.slice(0, 1999)}…`;
}

function generationFailureObservation(error, { attempt, decision }) {
  return {
    failureVersion: FAILURE_OBSERVATION_VERSION,
    phase: error?.phase ?? "unknown",
    category: error?.category ?? "unknown",
    provider: error?.provider ?? "openai",
    model: error?.model ?? OPENAI_IMAGE_MODEL,
    httpStatus: Number.isSafeInteger(error?.httpStatus) ? error.httpStatus : null,
    providerRequestId: typeof error?.providerRequestId === "string" ? error.providerRequestId : null,
    retryAfterMs: Number.isSafeInteger(error?.retryAfterMs) ? error.retryAfterMs : null,
    providerOutputDurable: error?.providerOutputDurable === true,
    categoryRetryable: error?.retryable === true,
    retryable: decision.retry,
    retryDecision: decision.reason,
    attempt,
    maxAttempts: decision.maxAttempts,
    detail: safeFailureDetail(error),
  };
}

function workflowRetryDelay({ ctx, error }) {
  return assetGenerationRetryDecision(error, { attempt: ctx.attempt }).delayMs;
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
      {
        timeout: "10 minutes",
        retries: {
          limit: WORKFLOW_RETRY_LIMIT,
          delay: workflowRetryDelay,
        },
      },
      async (ctx) => {
        try {
          return await runtime.execute(event.payload, { attemptNumber: ctx.attempt });
        } catch (error) {
          const decision = assetGenerationRetryDecision(error, { attempt: ctx.attempt });
          const observation = generationFailureObservation(error, { attempt: ctx.attempt, decision });
          console.error(JSON.stringify({ event: "asset_generation_attempt_failed", ...observation }));
          if (!decision.retry) {
            throw new NonRetryableError(
              JSON.stringify(observation),
              "AssetGenerationError",
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

    await step.do(
      "signal asset generation completion",
      {
        retries: {
          limit: WORKFLOW_RETRY_LIMIT,
          delay: workflowRetryDelay,
        },
      },
      async (ctx) => {
        try {
          await runtime.publishCompletion(completion);
          return completion;
        } catch (error) {
          const decision = assetGenerationRetryDecision(error, {
            attempt: ctx.attempt,
            providerOutputDurable: true,
          });
          if (!decision.retry) {
            throw new NonRetryableError(
              JSON.stringify(generationFailureObservation(error, { attempt: ctx.attempt, decision })),
              "AssetGenerationError",
            );
          }
          throw error;
        }
      },
    );

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
