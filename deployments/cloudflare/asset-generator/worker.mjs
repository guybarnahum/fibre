import { WorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { createCloudflareInfraDriver } from "@fibre/infra/cloudflare-v1";
import { withCloudflareQueueBindings } from "@fibre/infra/cloudflare-queue";
import {
  ASSET_GENERATION_COMPLETION_QUEUE,
  assetGenerationRetryDecision,
  createAssetGenerationCompletion,
  createAssetGenerationRuntime,
} from "../../../services/asset-generator/src/index.mjs";
import { createCloudflareContentCredentialSigner } from "../content-credentials/signer-selection.mjs";
import { createCloudflareAssetImageProvider } from "./image-provider-selection.mjs";

const FAILURE_OBSERVATION_VERSION = "asset-generation-failure-observation-v0.2";
const WORKFLOW_RETRY_LIMIT = 5;

function safeFailureDetail(error) {
  const value = error?.safeDetail ?? (error instanceof Error ? error.message : String(error));
  return value.length <= 2000 ? value : `${value.slice(0, 1999)}…`;
}

function generationFailureObservation(error, { attempt, decision }) {
  return {
    failureVersion: FAILURE_OBSERVATION_VERSION,
    phase: error?.phase ?? "unknown",
    category: error?.category ?? "unknown",
    provider: error?.provider ?? "unknown",
    model: error?.model ?? "unknown",
    httpStatus: Number.isSafeInteger(error?.httpStatus) ? error.httpStatus : null,
    providerRequestId: typeof error?.providerRequestId === "string" ? error.providerRequestId : null,
    retryAfterMs: Number.isSafeInteger(error?.retryAfterMs) ? error.retryAfterMs : null,
    providerOperationDurable: error?.providerOperationDurable === true,
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

function createRuntime(env, job) {
  if (!env || typeof env !== "object") throw new TypeError("Cloudflare asset generation env is required");
  if (!env.ASSET_OBJECTS) throw new TypeError("ASSET_OBJECTS binding is required");
  if (!env.ASSET_COMPLETIONS) throw new TypeError("ASSET_COMPLETIONS binding is required");

  const baseInfra = createCloudflareInfraDriver({ objectBucket: env.ASSET_OBJECTS });
  const infra = withCloudflareQueueBindings(baseInfra, {
    [ASSET_GENERATION_COMPLETION_QUEUE]: env.ASSET_COMPLETIONS,
  });
  const provider = createCloudflareAssetImageProvider({ env, job });
  const credentialSigner = createCloudflareContentCredentialSigner(env);

  return createAssetGenerationRuntime({ infra, provider, credentialSigner });
}

export class AssetGenerationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const runtime = createRuntime(this.env, event.payload);
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
