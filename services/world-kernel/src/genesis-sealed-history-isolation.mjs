import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_SEALED_HISTORY_ISOLATION_VERSION = "genesis-sealed-history-isolation-v1";

export class GenesisSealedHistoryLeakError extends Error {
  constructor(message, { leakedSourceRefs = [] } = {}) {
    super(message);
    this.name = "GenesisSealedHistoryLeakError";
    this.leakedSourceRefs = Object.freeze([...leakedSourceRefs]);
  }
}

function fail(message) { throw new TypeError(message); }
function assertText(name, value) {
  if (typeof value !== "string" || value.trim() === "") fail(`${name} is required`);
}
function uniqueSorted(values) { return [...new Set(values)].sort(); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }

function normalizeSourceGraph(sourceGraph) {
  if (!Array.isArray(sourceGraph) || sourceGraph.length === 0) fail("sealed-history sourceGraph is required");
  const byRef = new Map();
  for (const [index, source] of sourceGraph.entries()) {
    if (source === null || typeof source !== "object" || Array.isArray(source)) {
      fail(`sealed-history sourceGraph[${index}] must be an object`);
    }
    assertText(`sealed-history sourceGraph[${index}].sourceRef`, source.sourceRef);
    assertText(`sealed-history sourceGraph[${index}].kind`, source.kind);
    if (!Array.isArray(source.dependsOn)) fail(`sealed-history sourceGraph[${index}].dependsOn must be an array`);
    if (byRef.has(source.sourceRef)) fail(`duplicate sealed-history sourceRef ${source.sourceRef}`);
    const dependsOn = uniqueSorted(source.dependsOn);
    dependsOn.forEach((ref, dependencyIndex) =>
      assertText(`sealed-history sourceGraph[${index}].dependsOn[${dependencyIndex}]`, ref));
    byRef.set(source.sourceRef, Object.freeze({
      sourceRef: source.sourceRef,
      kind: source.kind,
      dependsOn: Object.freeze(dependsOn),
    }));
  }
  for (const source of byRef.values()) {
    for (const ref of source.dependsOn) {
      if (!byRef.has(ref)) fail(`sealed-history dependency ${ref} referenced by ${source.sourceRef} is unknown`);
    }
  }
  return Object.freeze([...byRef.values()].sort((a, b) => a.sourceRef.localeCompare(b.sourceRef)));
}

export function computeSealedHistoryTaintClosure({ sourceGraph, sealedSourceRefs } = {}) {
  const graph = normalizeSourceGraph(sourceGraph);
  if (!Array.isArray(sealedSourceRefs) || sealedSourceRefs.length === 0) fail("sealedSourceRefs must be a non-empty array");
  const known = new Set(graph.map((source) => source.sourceRef));
  const tainted = new Set(uniqueSorted(sealedSourceRefs));
  for (const ref of tainted) {
    if (!known.has(ref)) fail(`sealed source ${ref} is not present in sourceGraph`);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const source of graph) {
      if (tainted.has(source.sourceRef)) continue;
      if (source.dependsOn.some((ref) => tainted.has(ref))) {
        tainted.add(source.sourceRef);
        changed = true;
      }
    }
  }

  return Object.freeze({
    version: GENESIS_SEALED_HISTORY_ISOLATION_VERSION,
    sourceGraph: graph,
    sourceGraphDigest: digest(graph),
    sealedSourceRefs: Object.freeze(uniqueSorted(sealedSourceRefs)),
    taintedSourceRefs: Object.freeze(uniqueSorted(tainted)),
  });
}

function assertSourceCoverage(closure, refs, label) {
  const known = new Set(closure.sourceGraph.map((source) => source.sourceRef));
  const missing = uniqueSorted(refs.filter((ref) => !known.has(ref)));
  if (missing.length > 0) fail(`${label} references sources missing from sealed-history sourceGraph: ${missing.join(", ")}`);
}

function passBSourceRefs(cognitionInput) {
  if (cognitionInput === null || typeof cognitionInput !== "object" || Array.isArray(cognitionInput)) {
    fail("Pass-B cognition input must be an object");
  }
  if (!Array.isArray(cognitionInput.history) || !Array.isArray(cognitionInput.priorMemories)) {
    fail("Pass-B cognition input must expose history and priorMemories arrays");
  }
  const refs = [];
  for (const episode of cognitionInput.history) {
    assertText("Pass-B cognition history episodeId", episode?.episodeId);
    refs.push(episode.episodeId);
  }
  for (const memory of cognitionInput.priorMemories) {
    assertText("Pass-B cognition prior memoryRef", memory?.memoryRef);
    refs.push(memory.memoryRef);
    if (!Array.isArray(memory.episodeRefs)) fail(`Pass-B prior memory ${memory.memoryRef} episodeRefs must be an array`);
    for (const ref of memory.episodeRefs) {
      assertText(`Pass-B prior memory ${memory.memoryRef} episodeRef`, ref);
      refs.push(ref);
    }
  }
  return uniqueSorted(refs);
}

function passCSourceRefs(cognitionInput) {
  if (cognitionInput === null || typeof cognitionInput !== "object" || Array.isArray(cognitionInput)) {
    fail("Pass-C cognition input must be an object");
  }
  const target = cognitionInput.targetMemory;
  if (target === null || typeof target !== "object" || Array.isArray(target)) fail("Pass-C cognition targetMemory is required");
  assertText("Pass-C cognition target memoryRef", target.memoryRef);
  if (!Array.isArray(target.episodeRefs)) fail("Pass-C cognition targetMemory.episodeRefs must be an array");
  const refs = [target.memoryRef];
  for (const ref of target.episodeRefs) {
    assertText("Pass-C cognition target episodeRef", ref);
    refs.push(ref);
  }
  if (cognitionInput.trigger !== null && cognitionInput.trigger !== undefined) {
    assertText("Pass-C cognition trigger episodeRef", cognitionInput.trigger.episodeRef);
    refs.push(cognitionInput.trigger.episodeRef);
  }
  return uniqueSorted(refs);
}

function makeManifest({ callId, pass, closure, originalSourceRefs, includedSourceRefs }) {
  assertText("sealed-history callId", callId);
  if (!["B", "C"].includes(pass)) fail("sealed-history pass must be B or C");
  const original = uniqueSorted(originalSourceRefs);
  const included = uniqueSorted(includedSourceRefs);
  const includedSet = new Set(included);
  const manifestCore = {
    version: GENESIS_SEALED_HISTORY_ISOLATION_VERSION,
    callId,
    pass,
    sourceGraphDigest: closure.sourceGraphDigest,
    sealedSourceRefs: [...closure.sealedSourceRefs],
    taintedSourceRefs: [...closure.taintedSourceRefs],
    originalSourceRefs: original,
    includedSourceRefs: included,
    excludedSourceRefs: original.filter((ref) => !includedSet.has(ref)),
  };
  return Object.freeze({
    ...manifestCore,
    sealedSourceRefs: Object.freeze(manifestCore.sealedSourceRefs),
    taintedSourceRefs: Object.freeze(manifestCore.taintedSourceRefs),
    originalSourceRefs: Object.freeze(manifestCore.originalSourceRefs),
    includedSourceRefs: Object.freeze(manifestCore.includedSourceRefs),
    excludedSourceRefs: Object.freeze(manifestCore.excludedSourceRefs),
    digest: digest(manifestCore),
  });
}

export function assertSealedHistoryExposureManifest(manifest) {
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) fail("sealed-history manifest is required");
  const tainted = new Set(manifest.taintedSourceRefs ?? []);
  const leaked = uniqueSorted((manifest.includedSourceRefs ?? []).filter((ref) => tainted.has(ref)));
  if (leaked.length > 0) {
    throw new GenesisSealedHistoryLeakError(
      `sealed-history cognition exposure leaked tainted sources: ${leaked.join(", ")}`,
      { leakedSourceRefs: leaked },
    );
  }
  return true;
}

export function compilePassBCognitionWithSealedHistory({ cognitionInput, sourceGraph, sealedSourceRefs, callId } = {}) {
  const closure = computeSealedHistoryTaintClosure({ sourceGraph, sealedSourceRefs });
  const tainted = new Set(closure.taintedSourceRefs);
  const originalSourceRefs = passBSourceRefs(cognitionInput);
  assertSourceCoverage(closure, originalSourceRefs, "Pass-B cognition");
  const compiled = structuredClone(cognitionInput);

  compiled.history = compiled.history.filter((episode) => !tainted.has(episode.episodeId));
  compiled.priorMemories = compiled.priorMemories.filter((memory) =>
    !tainted.has(memory.memoryRef) && memory.episodeRefs.every((ref) => !tainted.has(ref)));

  const includedSourceRefs = passBSourceRefs(compiled);
  const manifest = makeManifest({ callId, pass: "B", closure, originalSourceRefs, includedSourceRefs });
  assertSealedHistoryExposureManifest(manifest);
  return Object.freeze({ cognitionInput: Object.freeze(compiled), manifest, closure });
}

export function compilePassCCognitionWithSealedHistory({ cognitionInput, sourceGraph, sealedSourceRefs, callId } = {}) {
  const closure = computeSealedHistoryTaintClosure({ sourceGraph, sealedSourceRefs });
  const originalSourceRefs = passCSourceRefs(cognitionInput);
  assertSourceCoverage(closure, originalSourceRefs, "Pass-C cognition");
  const tainted = new Set(closure.taintedSourceRefs);
  const contaminated = originalSourceRefs.filter((ref) => tainted.has(ref));

  if (contaminated.length > 0) {
    const manifest = makeManifest({ callId, pass: "C", closure, originalSourceRefs, includedSourceRefs: [] });
    assertSealedHistoryExposureManifest(manifest);
    return Object.freeze({
      cognitionInput: null,
      excluded: true,
      contaminatedSourceRefs: Object.freeze(uniqueSorted(contaminated)),
      manifest,
      closure,
    });
  }

  const manifest = makeManifest({
    callId,
    pass: "C",
    closure,
    originalSourceRefs,
    includedSourceRefs: originalSourceRefs,
  });
  assertSealedHistoryExposureManifest(manifest);
  return Object.freeze({
    cognitionInput: Object.freeze(structuredClone(cognitionInput)),
    excluded: false,
    contaminatedSourceRefs: Object.freeze([]),
    manifest,
    closure,
  });
}
