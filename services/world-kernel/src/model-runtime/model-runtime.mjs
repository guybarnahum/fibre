import { readFileSync } from "node:fs";

import { createGoogleModelAdapter } from "#integrations/ai/reasoning/google.mjs";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";
import { GuardianModelError } from "../guardian-model-adapter.mjs";

export const DEFAULT_MODEL_CONFIG_URL = new URL("../../../../config/models.yaml", import.meta.url);

function scalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) return trimmed.slice(1, -1);
  return trimmed;
}

export function parseModelRoutingYaml(text) {
  if (typeof text !== "string") throw new TypeError("model routing config must be text");
  const result = { version: null, reasoning: {} };
  let inReasoning = false;
  let block = null;

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const withoutComment = raw.replace(/\s+#.*$/, "");
    if (withoutComment.trim() === "") continue;
    if (withoutComment.includes("\t")) throw new TypeError(`models.yaml line ${index + 1} must not contain tabs`);
    const indent = withoutComment.length - withoutComment.trimStart().length;
    const line = withoutComment.trim();

    if (indent === 0 && line.startsWith("version:")) {
      result.version = Number(scalar(line.slice("version:".length)));
      continue;
    }
    if (indent === 0 && line === "reasoning:") {
      inReasoning = true;
      block = null;
      continue;
    }
    if (!inReasoning) throw new TypeError(`models.yaml line ${index + 1} is outside reasoning`);
    if (indent === 2 && line.endsWith(":")) {
      block = line.slice(0, -1).trim();
      if (!/^[a-z][a-z0-9_]*$/.test(block)) {
        throw new TypeError(`models.yaml line ${index + 1} has an invalid reasoning block name`);
      }
      if (Object.hasOwn(result.reasoning, block)) throw new TypeError(`models.yaml duplicates reasoning block ${block}`);
      result.reasoning[block] = {};
      continue;
    }
    if (indent === 4 && block !== null) {
      const separator = line.indexOf(":");
      if (separator <= 0) throw new TypeError(`models.yaml line ${index + 1} must be key: value`);
      const key = line.slice(0, separator).trim();
      const value = scalar(line.slice(separator + 1));
      if (!["provider", "model"].includes(key)) {
        throw new TypeError(`models.yaml line ${index + 1} has unsupported key ${key}`);
      }
      if (value === "") throw new TypeError(`models.yaml line ${index + 1} has an empty ${key}`);
      result.reasoning[block][key] = value;
      continue;
    }
    throw new TypeError(`models.yaml line ${index + 1} has unsupported structure`);
  }

  if (result.version !== 1) throw new TypeError("models.yaml version must be 1");
  for (const [name, entry] of Object.entries(result.reasoning)) {
    if (!Object.hasOwn(entry, "provider") || !Object.hasOwn(entry, "model")) {
      throw new TypeError(`models.yaml reasoning.${name} requires provider and model`);
    }
    if (!["openai", "google"].includes(entry.provider)) {
      throw new TypeError(`models.yaml reasoning.${name}.provider is unsupported: ${entry.provider}`);
    }
  }
  return result;
}

export function loadModelRoutingConfig(configUrl = DEFAULT_MODEL_CONFIG_URL) {
  return parseModelRoutingYaml(readFileSync(configUrl, "utf8"));
}

function modelOverrideFor(blockName, modelOverrides) {
  const value = modelOverrides?.[blockName];
  if (value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`model override for ${blockName} must be a non-empty string`);
  }
  return value.trim();
}

export function createModelRuntime({
  environment = process.env,
  configUrl = DEFAULT_MODEL_CONFIG_URL,
  fetchImpl = globalThis.fetch,
  observer = null,
  modelOverrides = null,
} = {}) {
  const config = loadModelRoutingConfig(configUrl);

  function selectionForBlock(blockName) {
    const selection = config.reasoning[blockName];
    if (selection === undefined) {
      throw new GuardianModelError(`No model is configured for Fibre reasoning block ${blockName}`, {
        code: "MODEL_UNAVAILABLE",
        retryable: false,
      });
    }
    return {
      provider: selection.provider,
      modelId: modelOverrideFor(blockName, modelOverrides) ?? selection.model,
    };
  }

  return Object.freeze({
    selectionForBlock,
    forBlock(blockName) {
      const selection = selectionForBlock(blockName);
      if (selection.provider === "openai") {
        return createOpenAIModelAdapter({
          environment,
          modelId: selection.modelId,
          fetchImpl,
          observer,
        });
      }
      if (selection.provider === "google") {
        return createGoogleModelAdapter({
          environment,
          modelId: selection.modelId,
          fetchImpl,
          observer,
        });
      }
      throw new GuardianModelError(`Unsupported model provider ${selection.provider}`, {
        code: "MODEL_UNAVAILABLE",
        retryable: false,
      });
    },
  });
}
