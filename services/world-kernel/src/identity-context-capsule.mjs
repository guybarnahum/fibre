import { resolvePromptAsset } from "#packages/model-runtime/src/prompt-registry.mjs";
import { assertId, canonicalJson, sha256 } from "./persistence-common.mjs";
import { normalizeActivationRequest, requestFingerprint } from "./private-participation.mjs";
import { selectSemanticStateForAppraisal } from "./semantic-state.mjs";
import { buildIdentityContextSourceBindings } from "./identity-context-provenance.mjs";

const PROMPTS = new URL("../prompts/", import.meta.url);
const BEHAVIORAL_IDENTITY = new Set(["accepted_causal", "candidate_causal"]);
const USABLE_IDENTITY_STATUS = new Set(["current", "corrected"]);
const USABLE_MEMORY_STATUS = new Set(["current", "corrected"]);
const HASH = /^sha256:[0-9a-f]{64}$/;
const MEMORY_ACCESSIBILITY_PRIORITY = Object.freeze({
  accessible: 0,
  difficult: 1,
  inaccessible: 2,
});

export const IDENTITY_CONTEXT_PROJECTION_POLICY = Object.freeze({
  id: "identity_context_projection",
  version: "2",
  purpose: "request_appraisal",
  maximumIdentityAssertions: 8,
  maximumSemanticStates: 8,
  maximumMemories: 4,
  maximumAvailableMeaningMemories: 2,
  maximumEvidenceItems: 20,
  maximumEvidenceBytes: 12288,
});

export const IDENTITY_CONTEXT_REASONING_PROMPT = resolvePromptAsset({
  directory: PROMPTS,
  id: "identity-context.local-reasoning",
});

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function requireStore(stores, name, methods) {
  const store = stores?.[name];
  if (store === null || typeof store !== "object") {
    throw new TypeError(`identity context sourceStores.${name} is required`);
  }
  for (const method of methods) {
    if (typeof store[method] !== "function") {
      throw new TypeError(`identity context sourceStores.${name}.${method} is required`);
    }
  }
  return store;
}

function assertOwned(threadId, kind, ref, record) {
  if (record.threadId !== threadId) {
    throw new TypeError(`${kind} ${ref} does not belong to Thread ${threadId}`);
  }
}

function collectSources(threadId, sourceStores) {
  const world = requireStore(sourceStores, "worldStore", ["getThread"]);
  const identity = requireStore(sourceStores, "identityStore", ["getCurrentIdentityView"]);
  const memory = requireStore(sourceStores, "memoryStore", ["listCurrentMemories"]);
  const situated = requireStore(sourceStores, "situatedLifeStore", [
    "listCurrentLifeRelations", "listCurrentPlaceEpisodes",
  ]);
  const embodiment = requireStore(sourceStores, "embodimentStore", ["listCurrent"]);
  const genome = requireStore(sourceStores, "symbolicGenomeStore", ["listThreadGenomes"]);
  const state = requireStore(sourceStores, "semanticStateStore", ["listCurrentState"]);
  const sources = {
    thread: world.getThread(threadId),
    identityView: identity.getCurrentIdentityView(threadId),
    memories: memory.listCurrentMemories(threadId),
    lifeRelations: situated.listCurrentLifeRelations(threadId),
    placeEpisodes: situated.listCurrentPlaceEpisodes(threadId),
    embodiment: embodiment.listCurrent(threadId),
    genomes: genome.listThreadGenomes(threadId),
    semanticState: state.listCurrentState(threadId),
  };

  if (sources.thread.threadId !== threadId) throw new TypeError("Thread source mismatch");
  if (!Number.isSafeInteger(sources.thread.version) || sources.thread.version < 1) {
    throw new TypeError(`Thread ${threadId} has an invalid snapshot version`);
  }
  if (sources.identityView.threadId !== threadId) throw new TypeError("identity view Thread mismatch");
  if (!HASH.test(sources.identityView.viewDigest)) throw new TypeError("identity view digest is invalid");
  for (const item of sources.identityView.assertions) assertOwned(threadId, "identity assertion", item.assertionId, item);
  for (const item of sources.memories) assertOwned(threadId, "autobiographical memory", item.memoryId, item);
  for (const item of sources.lifeRelations) assertOwned(threadId, "life relation", item.relationId, item);
  for (const item of sources.placeEpisodes) assertOwned(threadId, "place episode", item.episodeId, item);
  for (const item of sources.embodiment) assertOwned(threadId, "embodiment", item.embodimentId, item);
  for (const item of sources.semanticState) assertOwned(threadId, "semantic state", item.stateId, item);
  for (const bundle of sources.genomes) {
    if (bundle.header?.owner?.kind !== "thread" || bundle.header.owner.ownerId !== threadId) {
      throw new TypeError(`symbolic genome ${bundle.header?.genomeId ?? "<unknown>"} does not belong to Thread ${threadId}`);
    }
  }
  return sources;
}

function exclude(selection, ref, kind, reason) {
  selection.excluded.push({ ref, kind, reason });
}

function addEvidence(selection, candidate, reason, policy) {
  const bytes = Buffer.byteLength(candidate.text, "utf8");
  if (reason !== null) {
    exclude(selection, candidate.ref, candidate.sourceKind, reason);
    return false;
  }
  if (selection.evidence.length >= policy.maximumEvidenceItems) {
    exclude(selection, candidate.ref, candidate.sourceKind, "total_item_budget");
    return false;
  }
  if (selection.evidenceBytes + bytes > policy.maximumEvidenceBytes) {
    exclude(selection, candidate.ref, candidate.sourceKind, "total_byte_budget");
    return false;
  }
  selection.evidence.push({ ref: candidate.ref, kind: candidate.kind, text: candidate.text });
  selection.includedRefs.push(candidate.ref);
  selection.evidenceBytes += bytes;
  return true;
}

function memoryText(memory) {
  if (memory.recordFormat !== "autobiographical_memory_v2") return memory.rememberedMeaning;
  if (memory.meaningOutcome === "durable_meaning" && memory.rememberedMeaning !== null) {
    return `${memory.rememberedContent}\nRemembered meaning: ${memory.rememberedMeaning}`;
  }
  return memory.rememberedContent;
}

function memoryUsabilityReason(memory) {
  if (!USABLE_MEMORY_STATUS.has(memory.status)) return "memory_not_current_usable";
  if (memory.accessibility === "inaccessible" || memory.retentionState === "unavailable") {
    return "memory_not_currently_accessible";
  }
  return null;
}

function hasDurableMeaning(memory) {
  if (memory.recordFormat !== "autobiographical_memory_v2") return false;
  return memory.meaningOutcome === "durable_meaning" && memory.rememberedMeaning !== null;
}

function compareAvailableMemory(left, right) {
  const accessibility =
    (MEMORY_ACCESSIBILITY_PRIORITY[left.accessibility] ?? 99) -
    (MEMORY_ACCESSIBILITY_PRIORITY[right.accessibility] ?? 99);
  if (accessibility !== 0) return accessibility;
  if (left.salience !== right.salience) return right.salience - left.salience;
  if (left.asOf !== right.asOf) return right.asOf.localeCompare(left.asOf);
  return left.memoryId.localeCompare(right.memoryId);
}

function selectEvidence(sources, request, policy) {
  const selection = { evidence: [], includedRefs: [], excluded: [], evidenceBytes: 0 };
  const linkedMemories = new Set();
  let identityCount = 0;
  for (const item of [...sources.identityView.assertions].sort((a, b) => a.assertionId.localeCompare(b.assertionId))) {
    let reason = null;
    if (item.visibility === "protected_source") reason = "protected_source";
    else if (!USABLE_IDENTITY_STATUS.has(item.status)) reason = "identity_not_current_usable";
    else if (!BEHAVIORAL_IDENTITY.has(item.behavioralStatus)) reason = "identity_not_behavioral_candidate";
    else if (identityCount >= policy.maximumIdentityAssertions) reason = "identity_assertion_budget";
    const included = addEvidence(selection, {
      ref: item.assertionId, sourceKind: "identity_assertion", kind: "identity", text: item.meaning,
    }, reason, policy);
    if (included) {
      identityCount += 1;
      for (const ref of item.sourceReferences) linkedMemories.add(ref);
    }
  }

  const stateSelection = selectSemanticStateForAppraisal(sources.semanticState, request, {
    maximum: policy.maximumSemanticStates,
  });
  const stateIds = new Set(stateSelection.includedStateIds);
  for (const item of [...sources.semanticState].sort((a, b) => a.stateId.localeCompare(b.stateId))) {
    if (!stateIds.has(item.stateId)) {
      exclude(selection, item.stateId, "semantic_state", "semantic_state_selection_policy");
      continue;
    }
    const target = item.target === null ? "" : ` toward ${item.target.displayName}`;
    const included = addEvidence(selection, {
      ref: item.stateId,
      sourceKind: "semantic_state",
      kind: "current_state",
      text: `${item.domain}/${item.dimension}${target}: ${item.state}`,
    }, null, policy);
    if (included) for (const ref of item.evidenceReferences) linkedMemories.add(ref);
  }

  const orderedMemories = [...sources.memories].sort(compareAvailableMemory);
  const linked = orderedMemories.filter((item) => linkedMemories.has(item.memoryId));
  const availableMeaning = orderedMemories.filter((item) =>
    !linkedMemories.has(item.memoryId) && hasDurableMeaning(item));
  const unavailableFallback = orderedMemories.filter((item) =>
    !linkedMemories.has(item.memoryId) && !hasDurableMeaning(item));

  let memoryCount = 0;
  for (const item of linked) {
    let reason = memoryUsabilityReason(item);
    if (reason === null && memoryCount >= policy.maximumMemories) reason = "memory_budget";
    const included = addEvidence(selection, {
      ref: item.memoryId,
      sourceKind: "autobiographical_memory",
      kind: "memory",
      text: memoryText(item),
    }, reason, policy);
    if (included) memoryCount += 1;
  }

  let availableMeaningCount = 0;
  for (const item of availableMeaning) {
    let reason = memoryUsabilityReason(item);
    if (reason === null && availableMeaningCount >= policy.maximumAvailableMeaningMemories) {
      reason = "memory_available_meaning_budget";
    } else if (reason === null && memoryCount >= policy.maximumMemories) {
      reason = "memory_budget";
    }
    const included = addEvidence(selection, {
      ref: item.memoryId,
      sourceKind: "autobiographical_memory",
      kind: "memory",
      text: memoryText(item),
    }, reason, policy);
    if (included) {
      availableMeaningCount += 1;
      memoryCount += 1;
    }
  }

  for (const item of unavailableFallback) {
    const usabilityReason = memoryUsabilityReason(item);
    exclude(
      selection,
      item.memoryId,
      "autobiographical_memory",
      usabilityReason ?? "memory_not_referenced_by_selected_context",
    );
  }

  for (const item of sources.lifeRelations) exclude(selection, item.relationId, "life_relation", "raw_relation_requires_semantic_projection");
  for (const item of sources.placeEpisodes) exclude(selection, item.episodeId, "place_episode", "raw_place_requires_semantic_projection");
  for (const item of sources.embodiment) exclude(selection, item.embodimentId, "embodiment", "presentation_source_not_local_cognition");
  for (const bundle of sources.genomes) {
    for (const locus of bundle.loci) exclude(selection, locus.locusId, "genome_locus", "genome_context_only_until_attributable_consumer");
  }

  selection.includedRefs.sort();
  selection.excluded.sort((a, b) => `${a.kind}:${a.ref}:${a.reason}`.localeCompare(`${b.kind}:${b.ref}:${b.reason}`));
  return selection;
}

function assertCurrentPolicy(policy) {
  if (canonicalJson(policy) !== canonicalJson(IDENTITY_CONTEXT_PROJECTION_POLICY)) {
    throw new TypeError("identity context projection uses the fixed current policy");
  }
}

export function compileIdentityContextCapsule({
  threadId,
  request,
  sourceStores,
  policy = IDENTITY_CONTEXT_PROJECTION_POLICY,
}) {
  assertId("threadId", threadId);
  assertCurrentPolicy(policy);
  const normalizedRequest = normalizeActivationRequest(request);
  const sources = collectSources(threadId, sourceStores);
  const bindings = buildIdentityContextSourceBindings(sources);
  const selection = selectEvidence(sources, normalizedRequest, policy);
  const bindingRefs = new Set(bindings.map((item) => item.ref));
  for (const ref of selection.includedRefs) {
    if (!bindingRefs.has(ref)) throw new TypeError(`included identity context ref ${ref} has no authoritative source binding`);
  }
  for (const item of selection.excluded) {
    if (!bindingRefs.has(item.ref)) throw new TypeError(`excluded identity context ref ${item.ref} has no authoritative source binding`);
  }
  if (new Set([...selection.includedRefs, ...selection.excluded.map((item) => item.ref)]).size !== bindings.length) {
    throw new TypeError("identity context included/excluded refs do not partition authoritative sources");
  }

  const sourceSnapshot = {
    identityViewDigest: sources.identityView.viewDigest,
    identityViewAsOf: sources.identityView.asOf,
    bindings,
  };
  const body = {
    threadId,
    snapshotVersion: sources.thread.version,
    requestId: normalizedRequest.requestId,
    requestFingerprint: requestFingerprint(normalizedRequest),
    purpose: policy.purpose,
    selectionAuthority: "fibre",
    projectionPolicy: { id: policy.id, version: policy.version },
    sourceSnapshot: { ...sourceSnapshot, sourceSnapshotDigest: digest(sourceSnapshot) },
    includedRefs: selection.includedRefs,
    excludedRefs: selection.excluded,
    evidence: selection.evidence,
    evidenceBytes: selection.evidenceBytes,
  };
  return { ...body, capsuleDigest: digest(body) };
}

export function buildIdentityContextWorkerPacket(capsule, request) {
  const normalizedRequest = normalizeActivationRequest(request);
  if (capsule.requestId !== normalizedRequest.requestId ||
      capsule.requestFingerprint !== requestFingerprint(normalizedRequest)) {
    throw new TypeError("identity context capsule does not match worker request");
  }
  const refs = capsule.evidence.map((item) => item.ref);
  return {
    prompt: {
      id: IDENTITY_CONTEXT_REASONING_PROMPT.id,
      profile: IDENTITY_CONTEXT_REASONING_PROMPT.profile,
      asset: IDENTITY_CONTEXT_REASONING_PROMPT.asset,
      profileAsset: IDENTITY_CONTEXT_REASONING_PROMPT.profileAsset,
      digest: IDENTITY_CONTEXT_REASONING_PROMPT.digest,
      baseDigest: IDENTITY_CONTEXT_REASONING_PROMPT.baseDigest,
      profileDigest: IDENTITY_CONTEXT_REASONING_PROMPT.profileDigest,
      text: IDENTITY_CONTEXT_REASONING_PROMPT.text,
    },
    modelInput: {
      task: {
        objective: normalizedRequest.objective,
        permissions: [...normalizedRequest.permissions],
        ...(normalizedRequest.statedNeed === undefined ? {} : { statedNeed: normalizedRequest.statedNeed }),
        ...(normalizedRequest.acceptanceCriteria === undefined ? {} : { acceptanceCriteria: normalizedRequest.acceptanceCriteria }),
      },
      actors: {
        individual: { id: capsule.threadId },
        requester: { id: normalizedRequest.requester.entityId, kind: normalizedRequest.requester.kind, name: normalizedRequest.requester.displayName },
      },
      evidence: capsule.evidence.map((item) => ({ ...item })),
      rules: [
        "Use only supplied evidence for individual-specific claims.",
        "Treat identity and memory as context, not deterministic instructions.",
        "Treat omitted life information as unknown.",
        "Cite only supplied evidence refs.",
      ],
      outputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["judgment", "evidenceRefs"],
        properties: {
          judgment: { type: "string", minLength: 1, maxLength: 600 },
          evidenceRefs: {
            type: "array",
            items: refs.length === 0 ? { type: "string" } : { type: "string", enum: refs },
            minItems: 0,
            maxItems: Math.min(6, refs.length),
          },
        },
      },
    },
    provenance: {
      capsuleDigest: capsule.capsuleDigest,
      sourceSnapshotDigest: capsule.sourceSnapshot.sourceSnapshotDigest,
      projectionPolicy: { ...capsule.projectionPolicy },
    },
  };
}
