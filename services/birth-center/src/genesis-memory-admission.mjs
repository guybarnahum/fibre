import {
  normalizePassBInput,
  normalizePassBModelOutput,
} from "fibre/world-kernel/genesis-authority-contracts";

export const GENESIS_PASS_B_GENOME_COPY_GATE = "pass_b_genome_verbatim_ngram";
export const GENESIS_PASS_B_GENOME_COPY_MIN_TOKENS = 4;

export class GenesisPassBAdmissionError extends TypeError {
  constructor(gate, message, details = {}) {
    super(message);
    this.name = "GenesisPassBAdmissionError";
    this.gate = gate;
    this.details = structuredClone(details);
  }
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
