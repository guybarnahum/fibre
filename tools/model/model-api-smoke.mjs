import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { createGoogleModelAdapter } from "#integrations/ai/reasoning/google.mjs";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";
import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";

export const MODEL_SMOKE_TOKEN = "fibre-model-smoke-v1";
export const MODEL_SMOKE_PROMPT = resolvePromptAsset({
  directory: new URL("./prompts/", import.meta.url),
  id: "model.smoke",
}).text;

export const MODEL_SMOKE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["status", "token"],
  properties: {
    status: { type: "string", enum: ["ok"] },
    token: { type: "string", enum: [MODEL_SMOKE_TOKEN] },
  },
});

function usage() {
  return `Fibre model API smoke\n\nUsage:\n  npm run model:smoke -- --provider openai --model gpt-5.6-luna\n  npm run model:smoke -- --provider google --model gemini-3.6-flash\n  npm run model:smoke -- --provider google --model gemma-4-26b-a4b-it\n\nOptions:\n  --provider <openai|google>  Provider adapter to exercise.\n  --model <id>                Exact provider model id.\n  --help                      Show this help.\n\nThis performs one live, low-level structured-output call. It validates provider authentication, endpoint/model availability, request shape, response parsing, and the minimal structured-output contract.\n`;
}

function readValue(argv, index, name) {
  const arg = argv[index];
  if (arg.startsWith(`${name}=`)) {
    const value = arg.slice(name.length + 1).trim();
    if (value === "") throw new Error(`${name} requires a non-empty value`);
    return { value, consumed: 0 };
  }
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--") || value.trim() === "") {
    throw new Error(`${name} requires a non-empty value`);
  }
  return { value: value.trim(), consumed: 1 };
}

export function parseModelSmokeArgs(argv) {
  const options = { provider: null, model: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--provider" || arg.startsWith("--provider=")) {
      const parsed = readValue(argv, index, "--provider");
      options.provider = parsed.value;
      index += parsed.consumed;
    } else if (arg === "--model" || arg.startsWith("--model=")) {
      const parsed = readValue(argv, index, "--model");
      options.model = parsed.value;
      index += parsed.consumed;
    } else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (options.help) return options;
  if (!["openai", "google"].includes(options.provider)) {
    throw new Error("--provider must be openai or google");
  }
  if (typeof options.model !== "string" || options.model === "") {
    throw new Error("--model is required");
  }
  return options;
}

export function validateModelSmokeOutput(output) {
  assert.deepEqual(output, { status: "ok", token: MODEL_SMOKE_TOKEN });
  return true;
}

export function createSmokeAdapter({ provider, model, environment = process.env, fetchImpl = globalThis.fetch, observer = null }) {
  if (provider === "openai") {
    return createOpenAIModelAdapter({ environment, modelId: model, fetchImpl, observer });
  }
  if (provider === "google") {
    return createGoogleModelAdapter({ environment, modelId: model, fetchImpl, observer });
  }
  throw new Error(`unsupported provider: ${provider}`);
}

export async function runModelApiSmoke({ provider, model, environment = process.env, fetchImpl = globalThis.fetch } = {}) {
  const events = [];
  const adapter = createSmokeAdapter({
    provider,
    model,
    environment,
    fetchImpl,
    observer: (event) => events.push(event),
  });
  const startedAt = Date.now();
  const result = await adapter.invoke({
    systemPrompt: MODEL_SMOKE_PROMPT,
    input: {
      task: "Return the exact constants required by the response schema.",
      expectedStatus: "ok",
      expectedToken: MODEL_SMOKE_TOKEN,
    },
    responseSchema: MODEL_SMOKE_SCHEMA,
    clientRequestId: `model-api-smoke:${provider}:${model}`,
  });
  validateModelSmokeOutput(result.output);
  return {
    status: "passed",
    provider,
    model,
    transport: result.provenance.transport,
    elapsedMs: Date.now() - startedAt,
    usage: result.provenance.usage,
    attempts: result.provenance.invocationAttempts,
    output: result.output,
    eventTypes: events.map((event) => event.type),
  };
}

async function main() {
  const options = parseModelSmokeArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const result = await runModelApiSmoke(options);
  process.stdout.write(
    `MODEL API SMOKE: PASSED\n` +
    `Provider: ${result.provider}\n` +
    `Model: ${result.model}\n` +
    `Transport: ${result.transport}\n` +
    `Attempts: ${result.attempts}\n` +
    `Elapsed: ${result.elapsedMs} ms\n` +
    `Tokens: ${result.usage.totalTokens}\n`,
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`MODEL API SMOKE: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
