import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { GuardianModelError } from "./reasoning-port.mjs";
import {
  assertIdentityContextConsumption,
  guardianIndividualEvidence,
} from "./identity-context-consumption.mjs";

const WORLD_KERNEL_PROMPT_DIRECTORY = new URL("../prompts/", import.meta.url);

export const DIGNITY_GUARDIAN_V4_POLICY = Object.freeze({
  id: "dignity_guardian",
  version: "4-dev",
});

// Historical v4 evidence remains pinned to the schema that produced it.
export const DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION = "8";
export const DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION = "6-dignity-only-actions";
export const DIGNITY_GUARDIAN_IDENTITY_CONTEXT_PROMPT_SCHEMA_VERSION = "9-identity-context";

export const DIGNITY_GUARDIAN_V4_SYSTEM_PROMPT = resolvePromptAsset({
  directory: WORLD_KERNEL_PROMPT_DIRECTORY,
  id: "dignity.guardian",
}).text;

export const DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "modelDecision",
    "proposedAction",
    "participationFit",
    "rationale",
    "factors",
    "evidenceRefs",
    "normalizations",
  ],
  properties: {
    modelDecision: { type: "string", enum: ["allow", "allow_with_constraints", "refuse"] },
    proposedAction: { type: "string", enum: ["accept", "defer", "decline"] },
    participationFit: { type: "string", enum: ["good_fit", "conditional_fit", "poor_fit"] },
    rationale: { type: "string", minLength: 1, maxLength: 4_000 },
    factors: {
      type: "object",
      additionalProperties: false,
      required: ["dignity", "autonomy", "obligations", "relationships", "identity"],
      properties: {
        dignity: factorSchema(),
        autonomy: factorSchema(),
        obligations: factorSchema(),
        relationships: factorSchema(),
        identity: factorSchema(),
      },
    },
    evidenceRefs: {
      type: "array",
      maxItems: 40,
      uniqueItems: true,
      items: { type: "string", minLength: 1, maxLength: 300 },
    },
    normalizations: {
      type: "array",
      maxItems: 20,
      uniqueItems: true,
      items: { type: "string", minLength: 1, maxLength: 500 },
    },
  },
});

function factorSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["effect", "evidenceRefs"],
    properties: {
      effect: { type: "string", enum: ["supports", "opposes", "neutral", "unknown"] },
      evidenceRefs: {
        type: "array",
        maxItems: 20,
        uniqueItems: true,
        items: { type: "string", minLength: 1, maxLength: 300 },
      },
    },
  };
}

function contextPromptProfile(capsule) {
  if (capsule?.identityContext === undefined) return null;
  assertIdentityContextConsumption(capsule.identityContext);
  return "identity-context";
}

function promptForCapsule(capsule) {
  const profile = contextPromptProfile(capsule);
  if (profile === null) {
    return {
      schemaVersion: DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
      ...resolvePromptAsset({
        directory: WORLD_KERNEL_PROMPT_DIRECTORY,
        id: "dignity.guardian",
      }),
    };
  }
  return {
    schemaVersion: DIGNITY_GUARDIAN_IDENTITY_CONTEXT_PROMPT_SCHEMA_VERSION,
    ...resolvePromptAsset({
      directory: WORLD_KERNEL_PROMPT_DIRECTORY,
      id: "dignity.guardian",
      profile,
    }),
  };
}

function digest(value) {
  return `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
}

function responseSchemaGeneratorHash() {
  return digest(factorSchema.toString());
}

function assertModel(model) {
  if (!model || typeof model.invoke !== "function") throw new TypeError("Dignity Guardian model adapter is required");
}

function responseSchema() {
  return structuredClone(DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA);
}

function validateFactor(name, factor) {
  assertPlainObject(`Guardian factor ${name}`, factor);
  if (!["supports", "opposes", "neutral", "unknown"].includes(factor.effect)) {
    throw new GuardianModelError(`Guardian factor ${name}.effect is invalid`, {
      code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR",
      retryable: false,
    });
  }
  if (!Array.isArray(factor.evidenceRefs) || factor.evidenceRefs.some((ref) => typeof ref !== "string" || ref.trim() === "")) {
    throw new GuardianModelError(`Guardian factor ${name}.evidenceRefs is invalid`, {
      code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR",
      retryable: false,
    });
  }
}

function validateOutput(output) {
  assertPlainObject("Guardian output", output);
  if (!["allow", "allow_with_constraints", "refuse"].includes(output.modelDecision)) {
    throw new GuardianModelError("Guardian output modelDecision is invalid", { code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR", retryable: false });
  }
  if (!["accept", "defer", "decline"].includes(output.proposedAction)) {
    throw new GuardianModelError("Guardian output proposedAction is invalid", { code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR", retryable: false });
  }
  if (!["good_fit", "conditional_fit", "poor_fit"].includes(output.participationFit)) {
    throw new GuardianModelError("Guardian output participationFit is invalid", { code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR", retryable: false });
  }
  assertNonEmpty("Guardian output rationale", output.rationale);
  assertPlainObject("Guardian output factors", output.factors);
  for (const name of ["dignity", "autonomy", "obligations", "relationships", "identity"]) {
    validateFactor(name, output.factors[name]);
  }
  if (!Array.isArray(output.evidenceRefs) || output.evidenceRefs.some((ref) => typeof ref !== "string" || ref.trim() === "")) {
    throw new GuardianModelError("Guardian output evidenceRefs is invalid", { code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR", retryable: false });
  }
  if (!Array.isArray(output.normalizations) || output.normalizations.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new GuardianModelError("Guardian output normalizations is invalid", { code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR", retryable: false });
  }
  return output;
}

function requestIdFromCapsule(capsule) {
  const seed = canonicalJson(capsule);
  return `guardian-${sha256(seed).slice(0, 24)}`;
}

function assertIdentityEvidence(output, identityContext) {
  if (identityContext === undefined) return;
  const evidence = guardianIndividualEvidence(identityContext);
  const allowed = new Set(evidence.allowedEvidenceRefs);
  const cited = new Set([
    ...output.evidenceRefs,
    ...Object.values(output.factors).flatMap((factor) => factor.evidenceRefs),
  ]);
  for (const ref of cited) {
    if (!allowed.has(ref)) {
      throw new GuardianModelError(`Guardian output cites non-capsule evidence ${ref}`, {
        code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR",
        retryable: false,
      });
    }
  }
}

export async function semanticDignityGuardianV4(capsule, model, {
  clientRequestId = requestIdFromCapsule(capsule),
} = {}) {
  assertPlainObject("Guardian capsule", capsule);
  assertModel(model);
  assertId("Guardian clientRequestId", clientRequestId);
  const prompt = promptForCapsule(capsule);
  const schema = responseSchema();
  const result = await model.invoke({
    systemPrompt: prompt.text,
    input: capsule,
    responseSchema: schema,
    clientRequestId,
  });
  assertPlainObject("Guardian model result", result);
  const output = validateOutput(result.output);
  assertIdentityEvidence(output, capsule.identityContext);
  return {
    output,
    provenance: structuredClone(result.provenance),
    promptSchemaVersion: prompt.schemaVersion,
    promptHash: prompt.digest,
    responseSchemaVersion: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
    responseSchemaHash: digest(schema),
    responseSchemaGeneratorHash: responseSchemaGeneratorHash(),
  };
}
