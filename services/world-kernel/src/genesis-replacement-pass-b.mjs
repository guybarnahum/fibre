import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { normalizePassBInput } from "./genesis-pass-b-domain.mjs";
import {
  GENESIS_PASS_B_GENOME_COPY_GATE,
  GenesisPassBAdmissionError,
  normalizeAdmittedPassBModelOutput,
} from "./genesis-pass-b-admission.mjs";
import {
  GENESIS_PASS_B_PROMPT,
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "./genesis-pass-b-prompts.mjs";

export const GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE = "The visible life history is a sparse coverage-oriented sample of concrete episodes, not a frequency sample of the whole life. Repetition in the sample is not evidence that an event type dominated the life, and absence from the sample is not evidence that something never happened.";

export const GENESIS_REPLACEMENT_PASS_B_HORIZONS = Object.freeze([4, 6, 8, 10, 12, 14]);
export const GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES = Object.freeze([
  "life_only",
  "life_only",
  "life_plus_genome",
  "life_only",
  "life_only",
  "life_plus_genome",
]);

export const GENESIS_REPLACEMENT_PASS_B_PROMPT = `${GENESIS_PASS_B_PROMPT}\n\nSparse-history authority: ${GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE}\nDo not infer frequency, dominance, rarity, or non-occurrence from the sampling pattern.`;

export const GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT = `${GENESIS_REPLACEMENT_PASS_B_PROMPT}\n\nThe previous generated record was rejected only by Fibre's mechanical genome-copy boundary. You do not receive the rejected record. Generate a fresh memory-formation record from the same supplied cognition input. If outcome=remembered, rememberedContent must describe only remembered lived experience and must not repeat a four-or-more-token sequence from any genomeExposure locus. genomeExposure may affect attention or retention, but its wording is never autobiographical evidence. not_remembered remains fully legal. Do not make the replacement richer, more meaningful, more distinctive, or more coherent because a retry occurred.`;

const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;

export function assertReplacementPassBSchedule({ horizons, formationModes, historyLength = 14 } = {}) {
  if (canonicalJson(horizons) !== canonicalJson(GENESIS_REPLACEMENT_PASS_B_HORIZONS)) {
    throw new TypeError("replacement Pass-B history horizons drift");
  }
  if (canonicalJson(formationModes) !== canonicalJson(GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES)) {
    throw new TypeError("replacement Pass-B formation modes drift");
  }
  if (historyLength !== GENESIS_REPLACEMENT_PASS_B_HORIZONS.at(-1)) {
    throw new TypeError("replacement Pass-B final horizon must consume the complete sparse history");
  }
  return true;
}

export async function generateReplacementPassBMemory({ adapter, input, clientRequestId } = {}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("replacement Pass-B adapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("replacement Pass-B clientRequestId is required");
  const normalizedInput = normalizePassBInput(input);
  const calls = [];

  const invoke = async ({ prompt, kind, generatedVersion }) => {
    if (!prompt.includes(GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE)) {
      throw new TypeError("replacement Pass-B prompt omitted sparse-history authority");
    }
    const result = await adapter.invoke({
      systemPrompt: prompt,
      input: normalizedInput,
      responseSchema: GENESIS_PASS_B_RESPONSE_SCHEMA,
      clientRequestId: `${clientRequestId}:${kind}`,
    });
    calls.push(Object.freeze({
      kind,
      generatedVersion,
      inputDigest: digest(normalizedInput),
      promptHash: digest(prompt),
      outputDigest: digest(result.output),
      provenance: structuredClone(result.provenance ?? null),
    }));
    return result.output;
  };

  const initial = await invoke({
    prompt: GENESIS_REPLACEMENT_PASS_B_PROMPT,
    kind: "initial",
    generatedVersion: 1,
  });
  try {
    return Object.freeze({
      output: normalizeAdmittedPassBModelOutput(initial, normalizedInput),
      calls: Object.freeze([...calls]),
    });
  } catch (error) {
    if (!(error instanceof GenesisPassBAdmissionError) || error.gate !== GENESIS_PASS_B_GENOME_COPY_GATE) throw error;
  }

  const retry = await invoke({
    prompt: GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT,
    kind: "mechanical-genome-copy-retry-1",
    generatedVersion: 2,
  });
  try {
    return Object.freeze({
      output: normalizeAdmittedPassBModelOutput(retry, normalizedInput),
      calls: Object.freeze([...calls]),
    });
  } catch (error) {
    if (error instanceof GenesisPassBAdmissionError) error.calls = structuredClone(calls);
    throw error;
  }
}
