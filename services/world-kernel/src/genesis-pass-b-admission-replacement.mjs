import { normalizePassBInput } from "./genesis-pass-b-domain.mjs";
import {
  GENESIS_PASS_B_PROMPT,
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "./genesis-pass-b-prompts.mjs";
import {
  GENESIS_PASS_B_GENOME_COPY_GATE,
  GENESIS_PASS_B_GENOME_COPY_MIN_TOKENS,
  GENESIS_PASS_B_MAX_GENERATED_VERSIONS_PER_CALL,
  GenesisPassBAdmissionError,
  assertPassBGenomeCopyBoundary,
  findVerbatimGenomeNgram,
  generateAdmittedPassBMemory,
} from "./genesis-pass-b-admission.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_REPLACEMENT_PASS_B_ADMISSION_VERSION = "pr39-replacement-pass-b-genome-copy-closure-v1";

export const GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT = `${GENESIS_PASS_B_PROMPT}

The previous generated record was rejected only by Fibre's mechanical genome-copy boundary. You do not receive the rejected record. Generate a fresh memory-formation record from the same supplied cognition input. If outcome=remembered, rememberedContent and every uncertainty item must describe only remembered lived experience and must not repeat a four-or-more-token sequence from any genomeExposure locus. genomeExposure may affect attention or retention, but its wording is never autobiographical evidence. not_remembered remains fully legal. Do not make the replacement richer, more meaningful, more distinctive, or more coherent because a retry occurred.`;

function digest(value) {
  return `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
}

export function replacementPassBGenomeCopyRetryPromptHash() {
  return digest(GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT);
}

function uncertaintyGenomeCopy(output, loci) {
  for (let index = 0; index < output.uncertainty.length; index += 1) {
    const match = findVerbatimGenomeNgram({
      rememberedContent: output.uncertainty[index],
      loci,
      minimumTokens: GENESIS_PASS_B_GENOME_COPY_MIN_TOKENS,
    });
    if (match !== null) return Object.freeze({ field: `uncertainty[${index}]`, ...match });
  }
  return null;
}

export function assertReplacementPassBGenomeCopyBoundary(outputCandidate, inputCandidate) {
  const input = normalizePassBInput(inputCandidate);
  const output = assertPassBGenomeCopyBoundary(outputCandidate, input);
  if (input.assignment.formationMode !== "life_plus_genome" || output.outcome !== "remembered") return output;

  const match = uncertaintyGenomeCopy(output, input.genomeExposure.loci);
  if (match !== null) {
    throw new GenesisPassBAdmissionError(
      GENESIS_PASS_B_GENOME_COPY_GATE,
      `Pass-B ${match.field} repeats a forbidden ${match.minimumTokens}-token sequence from exposed genome locus ${match.locusId}`,
      match,
    );
  }
  return output;
}

export async function generateReplacementAdmittedPassBMemory({
  adapter,
  input,
  clientRequestId,
  systemPrompt = GENESIS_PASS_B_PROMPT,
  responseSchema = GENESIS_PASS_B_RESPONSE_SCHEMA,
} = {}) {
  const normalizedInput = normalizePassBInput(input);
  const first = await generateAdmittedPassBMemory({
    adapter,
    input: normalizedInput,
    clientRequestId,
    systemPrompt,
    responseSchema,
  });

  try {
    return Object.freeze({
      output: assertReplacementPassBGenomeCopyBoundary(first.output, normalizedInput),
      calls: Object.freeze([...first.calls]),
    });
  } catch (error) {
    if (!(error instanceof GenesisPassBAdmissionError) || error.gate !== GENESIS_PASS_B_GENOME_COPY_GATE) throw error;
    if (first.calls.length >= GENESIS_PASS_B_MAX_GENERATED_VERSIONS_PER_CALL) {
      error.calls = structuredClone(first.calls);
      throw error;
    }
  }

  const result = await adapter.invoke({
    systemPrompt: GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT,
    input: normalizedInput,
    responseSchema,
    clientRequestId: `${clientRequestId}:mechanical-genome-copy-retry-1`,
  });
  const calls = [
    ...first.calls,
    Object.freeze({
      kind: "mechanical-genome-copy-retry-1",
      generatedVersion: 2,
      inputDigest: digest(normalizedInput),
      promptHash: digest(GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT),
      outputDigest: digest(result.output),
      provenance: structuredClone(result.provenance ?? null),
    }),
  ];

  try {
    return Object.freeze({
      output: assertReplacementPassBGenomeCopyBoundary(result.output, normalizedInput),
      calls: Object.freeze(calls),
    });
  } catch (error) {
    if (error instanceof GenesisPassBAdmissionError) error.calls = structuredClone(calls);
    throw error;
  }
}
