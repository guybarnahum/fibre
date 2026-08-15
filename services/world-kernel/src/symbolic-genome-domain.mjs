import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const SYMBOLIC_GENOME_POLICY = Object.freeze({
  id: "fibre_symbolic_genome",
  version: "1",
});

export const SYMBOLIC_RECOMBINATION_POLICY = Object.freeze({
  id: "deterministic_textual_crossover",
  version: "1",
});

export const SYMBOLIC_MUTATION_POLICY = Object.freeze({
  id: "bounded_textual_locus_replacement",
  version: "1",
  maxReplacements: 2,
});

export const SYMBOLIC_GENOME_OWNER_KINDS = Object.freeze([
  "thread",
  "synthetic_ancestor",
]);

const DIGEST = /^sha256:[0-9a-f]{64}$/;
const MAX_LOCUS_BYTES = 320;

function assertDigest(name, value) {
  assertNonEmpty(name, value);
  if (!DIGEST.test(value)) throw new TypeError(`${name} must be a SHA-256 digest`);
}

function policyIdentity(policy) {
  return { id: policy.id, version: policy.version };
}

function normalizePolicy(name, candidate, expected = null) {
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, ["id", "version"]);
  assertNonEmpty(`${name}.id`, candidate.id);
  assertNonEmpty(`${name}.version`, candidate.version);
  const normalized = { id: candidate.id, version: candidate.version };
  if (expected !== null && canonicalJson(normalized) !== canonicalJson(policyIdentity(expected))) {
    throw new TypeError(`${name} is not a supported v1 policy`);
  }
  return normalized;
}

export function normalizeSymbolicGenomeOwner(candidate) {
  assertPlainObject("symbolicGenome.owner", candidate);
  assertExactKeys("symbolicGenome.owner", candidate, ["kind", "ownerId"]);
  if (!SYMBOLIC_GENOME_OWNER_KINDS.includes(candidate.kind)) {
    throw new TypeError("symbolicGenome.owner.kind is invalid");
  }
  assertId("symbolicGenome.owner.ownerId", candidate.ownerId);
  if (candidate.kind === "thread" && !candidate.ownerId.startsWith("thr_")) {
    throw new TypeError("Thread-owned symbolic genome must use a thr_ owner identifier");
  }
  if (candidate.kind === "synthetic_ancestor" && candidate.ownerId.startsWith("thr_")) {
    throw new TypeError("synthetic ancestor genome owner cannot use a live Thread identifier");
  }
  return { kind: candidate.kind, ownerId: candidate.ownerId };
}

export function assertAtomicGenomeLocus(value) {
  assertNonEmpty("genome locus value", value);
  if (Buffer.byteLength(value, "utf8") > MAX_LOCUS_BYTES) {
    throw new TypeError(`genome locus value exceeds ${MAX_LOCUS_BYTES} UTF-8 bytes`);
  }
  if (/\r|\n|;|^[\s]*[-*•]/m.test(value)) {
    throw new TypeError("genome locus must be one textual proposition rather than a list or semicolon bundle");
  }
  const sentenceTerminators = value.match(/[.!?](?:\s|$)/g) ?? [];
  if (sentenceTerminators.length > 1) {
    throw new TypeError("genome locus must not bundle multiple sentences");
  }
}

export function symbolicGenomeId({ owner, genesisId }) {
  const normalizedOwner = normalizeSymbolicGenomeOwner(owner);
  assertId("genesisId", genesisId);
  return `genome_${sha256(canonicalJson({ owner: normalizedOwner, genesisId })).slice(0, 40)}`;
}

export function symbolicGenomeLocusId({ genomeId, ordinal }) {
  assertId("genomeId", genomeId);
  assertFiniteNumber("ordinal", ordinal, { integer: true, minimum: 1 });
  return `gloc_${sha256(canonicalJson({ genomeId, ordinal })).slice(0, 40)}`;
}

export function symbolicGenomeMutationId({ genomeId, ordinal, replacementValue, policy = SYMBOLIC_MUTATION_POLICY }) {
  assertAtomicGenomeLocus(replacementValue);
  const normalizedPolicy = normalizePolicy("mutation identity policy", policyIdentity(policy));
  return `gmut_${sha256(canonicalJson({
    genomeId,
    ordinal,
    replacementValue,
    policy: normalizedPolicy,
  })).slice(0, 40)}`;
}

function normalizeSourceEligibility(candidate) {
  if (candidate === null) return null;
  assertPlainObject("genome.sourceEligibility", candidate);
  assertExactKeys("genome.sourceEligibility", candidate, ["basis", "sourceGenomeRefs", "sourceOwners"]);
  if (candidate.basis !== "symbolic_genome_sources_v1") {
    throw new TypeError("genome.sourceEligibility.basis is invalid");
  }
  if (!Array.isArray(candidate.sourceGenomeRefs) || candidate.sourceGenomeRefs.length !== 2) {
    throw new TypeError("genome.sourceEligibility.sourceGenomeRefs must contain exactly two genomes");
  }
  if (!Array.isArray(candidate.sourceOwners) || candidate.sourceOwners.length !== 2) {
    throw new TypeError("genome.sourceEligibility.sourceOwners must contain exactly two owners");
  }
  candidate.sourceGenomeRefs.forEach((value, index) => assertId(`sourceGenomeRefs[${index}]`, value));
  const sourceOwners = candidate.sourceOwners.map(normalizeSymbolicGenomeOwner);
  if (new Set(candidate.sourceGenomeRefs).size !== 2) throw new TypeError("source genomes must be distinct");
  if (new Set(sourceOwners.map((owner) => `${owner.kind}:${owner.ownerId}`)).size !== 2) {
    throw new TypeError("source genome owners must be distinct");
  }
  return { basis: candidate.basis, sourceGenomeRefs: [...candidate.sourceGenomeRefs], sourceOwners };
}

function normalizeRecombinationWitness(candidate) {
  if (candidate === null) return null;
  assertPlainObject("genome.recombinationWitness", candidate);
  assertExactKeys("genome.recombinationWitness", candidate, [
    "policy",
    "sourceGenomeRefs",
    "sourceGenomeDigests",
    "selectionSeed",
    "selectionDigest",
  ]);
  const policy = normalizePolicy(
    "genome.recombinationWitness.policy",
    candidate.policy,
    SYMBOLIC_RECOMBINATION_POLICY,
  );
  if (!Array.isArray(candidate.sourceGenomeRefs) || candidate.sourceGenomeRefs.length !== 2) {
    throw new TypeError("recombination sourceGenomeRefs must contain exactly two genomes");
  }
  if (!Array.isArray(candidate.sourceGenomeDigests) || candidate.sourceGenomeDigests.length !== 2) {
    throw new TypeError("recombination sourceGenomeDigests must contain exactly two digests");
  }
  candidate.sourceGenomeRefs.forEach((value, index) => assertId(`recombination sourceGenomeRefs[${index}]`, value));
  candidate.sourceGenomeDigests.forEach((value, index) => assertDigest(`recombination sourceGenomeDigests[${index}]`, value));
  assertNonEmpty("genome.recombinationWitness.selectionSeed", candidate.selectionSeed);
  assertDigest("genome.recombinationWitness.selectionDigest", candidate.selectionDigest);
  return structuredClone({ ...candidate, policy });
}

export function normalizeSymbolicGenomeHeader(candidate) {
  assertPlainObject("symbolicGenome", candidate);
  assertExactKeys("symbolicGenome", candidate, [
    "genomeId",
    "owner",
    "genesisId",
    "originKind",
    "inheritancePolicy",
    "sourceEligibility",
    "recombinationWitness",
    "createdAt",
  ]);
  assertId("symbolicGenome.genomeId", candidate.genomeId);
  const owner = normalizeSymbolicGenomeOwner(candidate.owner);
  assertId("symbolicGenome.genesisId", candidate.genesisId);
  if (!["de_novo", "recombined"].includes(candidate.originKind)) {
    throw new TypeError("symbolicGenome.originKind is invalid");
  }
  const inheritancePolicy = normalizePolicy(
    "symbolicGenome.inheritancePolicy",
    candidate.inheritancePolicy,
    SYMBOLIC_GENOME_POLICY,
  );
  const sourceEligibility = normalizeSourceEligibility(candidate.sourceEligibility);
  const recombinationWitness = normalizeRecombinationWitness(candidate.recombinationWitness);
  assertIsoTimestamp("symbolicGenome.createdAt", candidate.createdAt);
  const expectedId = symbolicGenomeId({ owner, genesisId: candidate.genesisId });
  if (candidate.genomeId !== expectedId) throw new TypeError("symbolicGenome.genomeId is not stable for owner+genesisId");
  if (candidate.originKind === "de_novo" && (sourceEligibility !== null || recombinationWitness !== null)) {
    throw new TypeError("de_novo genome cannot carry source/recombination witnesses");
  }
  if (candidate.originKind === "recombined" && (sourceEligibility === null || recombinationWitness === null)) {
    throw new TypeError("recombined genome requires source eligibility and recombination witnesses");
  }
  return structuredClone({ ...candidate, owner, inheritancePolicy, sourceEligibility, recombinationWitness });
}

function normalizeLocusProvenance(candidate) {
  assertPlainObject("genome locus provenance", candidate);
  assertExactKeys("genome locus provenance", candidate, [
    "kind",
    "sourceGenomeRef",
    "sourceLocusRef",
    "mutationRef",
  ]);
  if (!["de_novo", "inherited", "mutated"].includes(candidate.kind)) {
    throw new TypeError("genome locus provenance kind is invalid");
  }
  for (const [name, value] of [
    ["sourceGenomeRef", candidate.sourceGenomeRef],
    ["sourceLocusRef", candidate.sourceLocusRef],
    ["mutationRef", candidate.mutationRef],
  ]) {
    if (value !== null) assertId(`genome locus provenance.${name}`, value);
  }
  if (candidate.kind === "de_novo") {
    if (candidate.sourceGenomeRef !== null || candidate.sourceLocusRef !== null || candidate.mutationRef !== null) {
      throw new TypeError("de_novo locus cannot claim inherited or mutation provenance");
    }
  }
  if (candidate.kind === "inherited") {
    if (candidate.sourceGenomeRef === null || candidate.sourceLocusRef === null || candidate.mutationRef !== null) {
      throw new TypeError("inherited locus requires exact source genome/locus and no mutation ref");
    }
  }
  if (candidate.kind === "mutated") {
    if (candidate.sourceGenomeRef === null || candidate.sourceLocusRef === null || candidate.mutationRef === null) {
      throw new TypeError("mutated locus requires exact source genome/locus and mutation ref");
    }
  }
  return structuredClone(candidate);
}

export function normalizeSymbolicGenomeLocus(candidate) {
  assertPlainObject("symbolicGenomeLocus", candidate);
  assertExactKeys("symbolicGenomeLocus", candidate, ["locusId", "genomeId", "ordinal", "value", "provenance"]);
  assertId("symbolicGenomeLocus.locusId", candidate.locusId);
  assertId("symbolicGenomeLocus.genomeId", candidate.genomeId);
  assertFiniteNumber("symbolicGenomeLocus.ordinal", candidate.ordinal, { integer: true, minimum: 1 });
  assertAtomicGenomeLocus(candidate.value);
  const expectedId = symbolicGenomeLocusId({ genomeId: candidate.genomeId, ordinal: candidate.ordinal });
  if (candidate.locusId !== expectedId) throw new TypeError("symbolicGenomeLocus.locusId is not stable for genome+ordinal");
  return structuredClone({ ...candidate, provenance: normalizeLocusProvenance(candidate.provenance) });
}

export function normalizeSymbolicGenomeMutation(candidate) {
  assertPlainObject("symbolicGenomeMutation", candidate);
  assertExactKeys("symbolicGenomeMutation", candidate, [
    "mutationId",
    "genomeId",
    "ordinal",
    "operation",
    "policy",
    "sourceGenomeRef",
    "sourceLocusRef",
    "priorValueDigest",
    "replacementValue",
    "createdAt",
  ]);
  assertId("symbolicGenomeMutation.mutationId", candidate.mutationId);
  assertId("symbolicGenomeMutation.genomeId", candidate.genomeId);
  assertFiniteNumber("symbolicGenomeMutation.ordinal", candidate.ordinal, { integer: true, minimum: 1 });
  if (candidate.operation !== "replace_locus") throw new TypeError("symbolic genome mutation operation is invalid");
  const policy = normalizePolicy(
    "symbolicGenomeMutation.policy",
    candidate.policy,
    SYMBOLIC_MUTATION_POLICY,
  );
  assertId("symbolicGenomeMutation.sourceGenomeRef", candidate.sourceGenomeRef);
  assertId("symbolicGenomeMutation.sourceLocusRef", candidate.sourceLocusRef);
  assertDigest("symbolicGenomeMutation.priorValueDigest", candidate.priorValueDigest);
  assertAtomicGenomeLocus(candidate.replacementValue);
  assertIsoTimestamp("symbolicGenomeMutation.createdAt", candidate.createdAt);
  const expectedId = symbolicGenomeMutationId({
    genomeId: candidate.genomeId,
    ordinal: candidate.ordinal,
    replacementValue: candidate.replacementValue,
    policy,
  });
  if (candidate.mutationId !== expectedId) throw new TypeError("symbolicGenomeMutation.mutationId is not deterministic");
  return structuredClone({ ...candidate, policy });
}

export function symbolicGenomeDigest({ header, loci, mutations = [] }) {
  const normalizedHeader = normalizeSymbolicGenomeHeader(header);
  const normalizedLoci = loci.map(normalizeSymbolicGenomeLocus).sort((a, b) => a.ordinal - b.ordinal);
  const normalizedMutations = mutations.map(normalizeSymbolicGenomeMutation).sort((a, b) => a.ordinal - b.ordinal);
  return `sha256:${sha256(canonicalJson({ header: normalizedHeader, loci: normalizedLoci, mutations: normalizedMutations }))}`;
}

function assertContiguousLoci(loci) {
  if (!Array.isArray(loci) || loci.length < 2) throw new TypeError("symbolic genome requires at least two loci");
  const ordinals = loci.map((locus) => locus.ordinal);
  for (let index = 0; index < ordinals.length; index += 1) {
    if (ordinals[index] !== index + 1) throw new TypeError("symbolic genome loci must be contiguous from ordinal 1");
  }
}

function buildDeNovoForOwner({ owner, genesisId, values, createdAt }) {
  if (!Array.isArray(values) || values.length < 2) throw new TypeError("de_novo genome values must contain at least two loci");
  const normalizedOwner = normalizeSymbolicGenomeOwner(owner);
  const genomeId = symbolicGenomeId({ owner: normalizedOwner, genesisId });
  const header = normalizeSymbolicGenomeHeader({
    genomeId,
    owner: normalizedOwner,
    genesisId,
    originKind: "de_novo",
    inheritancePolicy: policyIdentity(SYMBOLIC_GENOME_POLICY),
    sourceEligibility: null,
    recombinationWitness: null,
    createdAt,
  });
  const loci = values.map((value, index) => normalizeSymbolicGenomeLocus({
    locusId: symbolicGenomeLocusId({ genomeId, ordinal: index + 1 }),
    genomeId,
    ordinal: index + 1,
    value,
    provenance: { kind: "de_novo", sourceGenomeRef: null, sourceLocusRef: null, mutationRef: null },
  }));
  assertContiguousLoci(loci);
  return { header, loci, mutations: [], genomeDigest: symbolicGenomeDigest({ header, loci }) };
}

export function buildDeNovoSymbolicGenome({ threadId, genesisId, values, createdAt }) {
  return buildDeNovoForOwner({
    owner: { kind: "thread", ownerId: threadId },
    genesisId,
    values,
    createdAt,
  });
}

export function buildSyntheticAncestorSymbolicGenome({ ancestorId, genesisId, values, createdAt }) {
  return buildDeNovoForOwner({
    owner: { kind: "synthetic_ancestor", ownerId: ancestorId },
    genesisId,
    values,
    createdAt,
  });
}

function sourceIndexForOrdinal({ ordinal, locusCount, selectionSeed, sourceGenomeDigests }) {
  if (ordinal === 1) return 0;
  if (ordinal === locusCount) return 1;
  const digest = sha256(canonicalJson({
    policy: policyIdentity(SYMBOLIC_RECOMBINATION_POLICY),
    ordinal,
    selectionSeed,
    sourceGenomeDigests,
  }));
  return Number.parseInt(digest.slice(0, 2), 16) % 2;
}

function selectionDigest(selections) {
  return `sha256:${sha256(canonicalJson(selections.map(({ ordinal, sourceGenomeRef, sourceLocusRef }) => ({
    ordinal,
    sourceGenomeRef,
    sourceLocusRef,
  }))))}`;
}

export function buildRecombinedSymbolicGenome({
  threadId,
  genesisId,
  sourceGenomes,
  selectionSeed,
  createdAt,
  mutations = [],
}) {
  if (!Array.isArray(sourceGenomes) || sourceGenomes.length !== 2) {
    throw new TypeError("recombination requires exactly two source genomes");
  }
  const normalizedSources = sourceGenomes.map((source, index) => {
    const header = normalizeSymbolicGenomeHeader(source.header);
    const loci = source.loci.map(normalizeSymbolicGenomeLocus).sort((a, b) => a.ordinal - b.ordinal);
    const sourceMutations = (source.mutations ?? []).map(normalizeSymbolicGenomeMutation).sort((a, b) => a.ordinal - b.ordinal);
    assertContiguousLoci(loci);
    assertDigest(`sourceGenomes[${index}].genomeDigest`, source.genomeDigest);
    const normalized = { header, loci, mutations: sourceMutations, genomeDigest: source.genomeDigest };
    if (symbolicGenomeDigest(normalized) !== source.genomeDigest) {
      throw new TypeError(`source genome ${header.genomeId} digest does not match content`);
    }
    return normalized;
  });
  const [sourceA, sourceB] = normalizedSources;
  if (sourceA.loci.length !== sourceB.loci.length) {
    throw new TypeError("v1 textual crossover requires source genomes with equal locus counts");
  }
  assertNonEmpty("selectionSeed", selectionSeed);
  if (!Array.isArray(mutations)) throw new TypeError("mutations must be an array");
  if (mutations.length > SYMBOLIC_MUTATION_POLICY.maxReplacements) {
    throw new TypeError(`v1 allows at most ${SYMBOLIC_MUTATION_POLICY.maxReplacements} locus replacements`);
  }
  const mutationOrdinals = new Set();
  for (const mutation of mutations) {
    assertPlainObject("mutation request", mutation);
    assertExactKeys("mutation request", mutation, ["ordinal", "replacementValue"]);
    assertFiniteNumber("mutation request.ordinal", mutation.ordinal, { integer: true, minimum: 1 });
    assertAtomicGenomeLocus(mutation.replacementValue);
    if (mutation.ordinal > sourceA.loci.length) throw new TypeError("mutation ordinal is outside the genome");
    if (mutationOrdinals.has(mutation.ordinal)) throw new TypeError("only one mutation is allowed per locus");
    mutationOrdinals.add(mutation.ordinal);
  }

  const owner = { kind: "thread", ownerId: threadId };
  const genomeId = symbolicGenomeId({ owner, genesisId });
  const sourceGenomeRefs = normalizedSources.map((source) => source.header.genomeId);
  const sourceGenomeDigests = normalizedSources.map((source) => source.genomeDigest);
  const sourceOwners = normalizedSources.map((source) => source.header.owner);
  const selections = [];
  const builtMutations = [];
  const loci = [];

  for (let index = 0; index < sourceA.loci.length; index += 1) {
    const ordinal = index + 1;
    const sourceIndex = sourceIndexForOrdinal({
      ordinal,
      locusCount: sourceA.loci.length,
      selectionSeed,
      sourceGenomeDigests,
    });
    const source = normalizedSources[sourceIndex];
    const sourceLocus = source.loci[index];
    selections.push({ ordinal, sourceGenomeRef: source.header.genomeId, sourceLocusRef: sourceLocus.locusId });
    const mutationRequest = mutations.find((item) => item.ordinal === ordinal) ?? null;
    if (mutationRequest === null) {
      loci.push(normalizeSymbolicGenomeLocus({
        locusId: symbolicGenomeLocusId({ genomeId, ordinal }),
        genomeId,
        ordinal,
        value: sourceLocus.value,
        provenance: {
          kind: "inherited",
          sourceGenomeRef: source.header.genomeId,
          sourceLocusRef: sourceLocus.locusId,
          mutationRef: null,
        },
      }));
      continue;
    }
    const mutationPolicy = policyIdentity(SYMBOLIC_MUTATION_POLICY);
    const mutationId = symbolicGenomeMutationId({
      genomeId,
      ordinal,
      replacementValue: mutationRequest.replacementValue,
      policy: mutationPolicy,
    });
    builtMutations.push(normalizeSymbolicGenomeMutation({
      mutationId,
      genomeId,
      ordinal,
      operation: "replace_locus",
      policy: mutationPolicy,
      sourceGenomeRef: source.header.genomeId,
      sourceLocusRef: sourceLocus.locusId,
      priorValueDigest: `sha256:${sha256(sourceLocus.value)}`,
      replacementValue: mutationRequest.replacementValue,
      createdAt,
    }));
    loci.push(normalizeSymbolicGenomeLocus({
      locusId: symbolicGenomeLocusId({ genomeId, ordinal }),
      genomeId,
      ordinal,
      value: mutationRequest.replacementValue,
      provenance: {
        kind: "mutated",
        sourceGenomeRef: source.header.genomeId,
        sourceLocusRef: sourceLocus.locusId,
        mutationRef: mutationId,
      },
    }));
  }

  const header = normalizeSymbolicGenomeHeader({
    genomeId,
    owner,
    genesisId,
    originKind: "recombined",
    inheritancePolicy: policyIdentity(SYMBOLIC_GENOME_POLICY),
    sourceEligibility: {
      basis: "symbolic_genome_sources_v1",
      sourceGenomeRefs,
      sourceOwners,
    },
    recombinationWitness: {
      policy: policyIdentity(SYMBOLIC_RECOMBINATION_POLICY),
      sourceGenomeRefs,
      sourceGenomeDigests,
      selectionSeed,
      selectionDigest: selectionDigest(selections),
    },
    createdAt,
  });
  assertContiguousLoci(loci);
  return {
    header,
    loci,
    mutations: builtMutations,
    genomeDigest: symbolicGenomeDigest({ header, loci, mutations: builtMutations }),
  };
}

export function replayRecombinationSelection(bundle, sourceGenomes) {
  const header = normalizeSymbolicGenomeHeader(bundle.header);
  if (header.originKind !== "recombined") throw new TypeError("replay requires a recombined genome");
  const orderedSources = header.recombinationWitness.sourceGenomeRefs.map((sourceRef) => {
    const source = sourceGenomes.find((candidate) => candidate.header.genomeId === sourceRef);
    if (source === undefined) throw new TypeError(`source genome ${sourceRef} is missing for replay`);
    return source;
  });
  const sourceGenomeDigests = orderedSources.map((source) => source.genomeDigest);
  const selections = bundle.loci.map((locus) => {
    const sourceIndex = sourceIndexForOrdinal({
      ordinal: locus.ordinal,
      locusCount: bundle.loci.length,
      selectionSeed: header.recombinationWitness.selectionSeed,
      sourceGenomeDigests,
    });
    const source = orderedSources[sourceIndex];
    return {
      ordinal: locus.ordinal,
      sourceGenomeRef: source.header.genomeId,
      sourceLocusRef: source.loci[locus.ordinal - 1].locusId,
    };
  });
  const digest = selectionDigest(selections);
  if (digest !== header.recombinationWitness.selectionDigest) {
    throw new TypeError("recombination selection witness does not replay");
  }
  return selections;
}
