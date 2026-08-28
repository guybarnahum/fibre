import { resolvePromptAsset } from "#packages/model-runtime/src/prompt-registry.mjs";
import { normalizePassBInput, normalizePassBModelOutput } from "./genesis-pass-b-domain.mjs";
import {
  GENESIS_PASS_B_PROMPT,
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "./genesis-pass-b-prompts.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";

const GENESIS_PROMPT_DIRECTORY = new URL("../prompts/", import.meta.url);

export const GENESIS_PASS_B_GENOME_COPY_GATE = "pass_b_genome_verbatim_ngram";
export const GENESIS_PASS_B_GENOME_COPY_MIN_TOKENS = 4;
export const GENESIS_PASS_B_MAX_GENERATED_VERSIONS_PER_CALL = 2;

export const GENESIS_PASS_B_GENOME_COPY_RETRY_PROMPT = resolvePromptAsset({
  directory: GENESIS_PROMPT_DIRECTORY,
  id: "genesis.memory-genome-copy-retry",
}).text;

export class GenesisPassBAdmissionError extends TypeError {
  constructor(gate, message, details = {}) {
    super(message);
    this.name = "GenesisPassBAdmissionError";
    this.gate = gate;
    this.details = structuredClone(details);
  }
}

function digest(value) {
  return `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
}

export function passBGenomeCopyRetryPromptHash() {
  return digest(GENESIS_PASS_B_GENOME_COPY_RETRY_PROMPT);
}

export function normalizedLexicalTokens(value) {
  if (typeof value !== "string") return [];
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

function ngramKey(tokens, start, width) {
  return tokens.slice(start, start + width).join("\u0001");
}

export function findVerbatimGenomeNgram({
  rememberedContent,
  loci,
  minimumTokens = GENESIS_PASS_B_GENOME_COPY_MIN_TOKENS,
} = {}) {
  if (!Number.isSafeInteger(minimumTokens) || minimumTokens < 2) {
    throw new TypeError("minimumTokens must be an integer >= 2");
  }
  if (!Array.isArray(loci)) throw new TypeError("loci must be an array");
  const memoryTokens = normalizedLexicalTokens(rememberedContent);
  if (memoryTokens.length < minimumTokens) return null;

  const memoryNgrams = new Set();
  for (let start = 0; start <= memoryTokens.length - minimumTokens; start += 1) {
    memoryNgrams.add(ngramKey(memoryTokens, start, minimumTokens));
  }

  for (const locus of loci) {
    const locusTokens = normalizedLexicalTokens(locus?.value);
    for (let start = 0; start <= locusTokens.length - minimumTokens; start += 1) {
      const key = ngramKey(locusTokens, start, minimumTokens);
      if (memoryNgrams.has(key)) {
        return Object.freeze({
          locusId: locus.locusId,
          locusOrdinal: locus.ordinal,
          minimumTokens,
          normalizedNgram: locusTokens.slice(start, start + minimumTokens).join(" "),
        });
      }
    }
  }
  return null;
}

export function assertPassBGenomeCopyBoundary(outputCandidate, inputCandidate) {
  const input = normalizePassBInput(inputCandidate);
  const output = normalizePassBModelOutput(outputCandidate, input);
  if (input.assignment.formationMode !== "life_plus_genome" || output.outcome !== "remembered") {
    return output;
  }

  const match = findVerbatimGenomeNgram({
    rememberedContent: output.rememberedContent,
    loci: input.genomeExposure.loci,
  });
  if (match !== null) {
    throw new GenesisPassBAdmissionError(
      GENESIS_PASS_B_GENOME_COPY_GATE,
      `Pass-B rememberedContent repeats a forbidden ${match.minimumTokens}-token sequence from exposed genome locus ${match.locusId}`,
      match,
    );
  }
  return output;
}

export function normalizeAdmittedPassBModelOutput(outputCandidate, inputCandidate) {
  return assertPassBGenomeCopyBoundary(outputCandidate, inputCandidate);
}

export async function generateAdmittedPassBMemory({
  adapter,
  input,
  clientRequestId,
  systemPrompt = GENESIS_PASS_B_PROMPT,
  responseSchema = GENESIS_PASS_B_RESPONSE_SCHEMA,
} = {}) {
  if (adapter === null || typeof adapter?.invoke !== "function") {
    throw new TypeError("Pass-B adapter must expose invoke()");
  }
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") {
    throw new TypeError("Pass-B clientRequestId is required");
  }
  const normalizedInput = normalizePassBInput(input);
  const calls = [];

  const invoke = async ({ prompt, kind, ordinal }) => {
    const result = await adapter.invoke({
      systemPrompt: prompt,
      input: normalizedInput,
      responseSchema,
      clientRequestId: `${clientRequestId}:${kind}`,
    });
    calls.push(Object.freeze({
      kind,
      generatedVersion: ordinal,
      inputDigest: digest(normalizedInput),
      promptHash: digest(prompt),
      outputDigest: digest(result.output),
      provenance: structuredClone(result.provenance ?? null),
    }));
    return result.output;
  };

  const initial = await invoke({ prompt: systemPrompt, kind: "initial", ordinal: 1 });
  try {
    return Object.freeze({
      output: normalizeAdmittedPassBModelOutput(initial, normalizedInput),
      calls: Object.freeze([...calls]),
    });
  } catch (error) {
    if (!(error instanceof GenesisPassBAdmissionError) || error.gate !== GENESIS_PASS_B_GENOME_COPY_GATE) {
      throw error;
    }
  }

  const retry = await invoke({
    prompt: GENESIS_PASS_B_GENOME_COPY_RETRY_PROMPT,
    kind: "mechanical-genome-copy-retry-1",
    ordinal: 2,
  });
  try {
    return Object.freeze({
      output: normalizeAdmittedPassBModelOutput(retry, normalizedInput),
      calls: Object.freeze([...calls]),
    });
  } catch (error) {
    if (error instanceof GenesisPassBAdmissionError) {
      error.calls = structuredClone(calls);
    }
    throw error;
  }
}