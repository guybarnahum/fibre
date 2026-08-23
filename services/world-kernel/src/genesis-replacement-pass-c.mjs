import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
  normalizeReinterpretationPassCModelOutput,
} from "./genesis-pass-c-domain.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "./genesis-pass-c-prompts.mjs";
import { projectPassCInputForCognition } from "./genesis-pass-c-cognition.mjs";

const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;

function assertGenomeBlind(value) {
  if (/genome/iu.test(canonicalJson(value))) {
    throw new TypeError("replacement Pass-C cognition contains genome material");
  }
}

async function invokePassC({ adapter, input, clientRequestId, prompt, responseSchema, normalizeOutput, kind }) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("replacement Pass-C adapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("replacement Pass-C clientRequestId is required");
  const normalizedInput = normalizePassCInput(input);
  const cognitionInput = projectPassCInputForCognition(normalizedInput);
  assertGenomeBlind(cognitionInput);
  const result = await adapter.invoke({
    systemPrompt: prompt,
    input: cognitionInput,
    responseSchema,
    clientRequestId,
  });
  return Object.freeze({
    kind,
    input: normalizedInput,
    cognitionInput,
    output: normalizeOutput(result.output, normalizedInput),
    call: Object.freeze({
      inputDigest: digest(cognitionInput),
      promptHash: digest(prompt),
      schemaHash: digest(responseSchema),
      outputDigest: digest(result.output),
      provenance: structuredClone(result.provenance ?? null),
    }),
  });
}

export function generateReplacementInitialMeaning({ adapter, input, clientRequestId } = {}) {
  return invokePassC({
    adapter,
    input,
    clientRequestId,
    prompt: GENESIS_PASS_C_INITIAL_PROMPT,
    responseSchema: GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
    normalizeOutput: normalizeInitialPassCModelOutput,
    kind: "initial",
  });
}

export function generateReplacementReinterpretation({ adapter, input, clientRequestId } = {}) {
  return invokePassC({
    adapter,
    input,
    clientRequestId,
    prompt: GENESIS_PASS_C_REINTERPRETATION_PROMPT,
    responseSchema: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
    normalizeOutput: normalizeReinterpretationPassCModelOutput,
    kind: "reinterpretation",
  });
}
