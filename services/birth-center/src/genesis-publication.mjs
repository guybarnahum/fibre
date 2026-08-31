import {
  buildFibreCivilRegistration,
  mintFibreIdentityNumber,
} from "#core/src/fibre-civil-identity.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  normalizeAutobiographicalMemory,
} from "#services/world-kernel/src/autobiographical-memory-domain.mjs";
import {
  normalizeGenesisManifest,
  publicationValidatorSetWitness,
} from "#services/world-kernel/src/genesis-domain.mjs";
import { eventStructurePoolV3Digest } from "#services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import { assertGenesisCandidatePlaceConsistency } from "#services/world-kernel/src/genesis-publication-place-consistency.mjs";
import { normalizeSeedSnapshot, validateThreadSnapshot } from "#services/world-kernel/src/persistence-domain.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { lifeRelationId, normalizeLifeRelation } from "#services/world-kernel/src/situated-life-domain.mjs";

const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
const fail = (message) => { throw new Error(message); };

function cognitionSurface(adapter, promptHash, schemaHash) {
  if (!adapter || typeof adapter.provider !== "string" || typeof adapter.modelId !== "string") {
    throw new TypeError("Genesis publication cognition requires a configured model adapter");
  }
  return {
    provider: adapter.provider,
    modelId: adapter.modelId,
    promptHash,
    schemaHash,
    sampling: structuredClone(adapter.configuration ?? {}),
  };
}

export function buildGenesisPublicationCognition({
  creativeAdapter,
  repairAdapter,
  passAPromptMaterial,
  passASchemaMaterial,
  passBPromptMaterial,
  passBSchemaMaterial,
  passCPromptMaterial,
  passCSchemaMaterial,
  repairPromptMaterial,
  repairSchemaMaterial,
} = {}) {
  for (const [name, value] of Object.entries({
    passAPromptMaterial,
    passASchemaMaterial,
    passBPromptMaterial,
    passBSchemaMaterial,
    passCPromptMaterial,
    passCSchemaMaterial,
    repairPromptMaterial,
    repairSchemaMaterial,
  })) {
    if (value === undefined) throw new TypeError(`Genesis publication cognition requires ${name}`);
  }
  return Object.freeze({
    passA: cognitionSurface(creativeAdapter, digest(passAPromptMaterial), digest(passASchemaMaterial)),
    passB: cognitionSurface(creativeAdapter, digest(passBPromptMaterial), digest(passBSchemaMaterial)),
    passC: cognitionSurface(creativeAdapter, digest(passCPromptMaterial), digest(passCSchemaMaterial)),
    recordRepair: cognitionSurface(repairAdapter, digest(repairPromptMaterial), digest(repairSchemaMaterial)),
    policyVersion: "genesis-current-v1",
    eventStructurePoolDigest: eventStructurePoolV3Digest(),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  });
}

export function buildNeutralGenesisThreadSeed({ threadId, createdAt }) {
  const thread = {
    threadId,
    version: 1,
    status: "frozen",
    identity: {
      name: "Fibre Thread",
      originOrientation: "original",
      selfDescription: "I am a Fibre Thread.",
    },
    genome: { textualTraits: {}, runtimeBaselines: {} },
    currentState: {
      needs: [],
      feelings: [],
      selfModel: "I am a Fibre Thread.",
      unresolvedIntentions: [],
    },
    accounts: { fibreCredits: 0, usdAvailable: 0, modelTokensAvailable: 0 },
    relationshipRefs: [],
    memoryRefs: [],
    provenance: { createdAt, createdBy: "fibre.genesis" },
  };
  validateThreadSnapshot(thread);
  return thread;
}

function durableMeaning(output) {
  return output.outcome === "durable_meaning" || output.outcome === "revised";
}

function memoryRevision({ candidate, memory, output, revision, asOf, publicationAt, supportingEvidenceRefs = [] }) {
  const hasMeaning = durableMeaning(output);
  return normalizeAutobiographicalMemory({
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId: memory.memoryRef,
    revision,
    threadId: candidate.threadId,
    subject: { originEventRef: memory.origin.eventId, slot: memory.slot },
    subjectPeriod: {
      startAt: memory.cited[0].episode.occurredAt,
      endAt: memory.cited[memory.cited.length - 1].episode.occurredAt,
    },
    eventRefs: [...memory.eventRefs],
    rememberedContent: memory.rememberedContent,
    rememberedMeaning: hasMeaning ? output.summary : null,
    meaningOutcome: hasMeaning ? "durable_meaning" : "no_durable_meaning",
    meaningParts: hasMeaning ? structuredClone(output.parts) : [],
    asOf,
    confidence: 0.5,
    uncertainty: [...memory.uncertainty],
    salience: 0.5,
    accessibility: "accessible",
    retentionState: "fragmentary",
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [...supportingEvidenceRefs],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: revision === 1 ? "current" : "corrected",
    recordedAt: publicationAt,
    ...(revision === 1 ? {} : { supersedesRevision: revision - 1 }),
  });
}

export function materializeGenesisMemoryRecords(candidate, publicationAt) {
  const initialByMemory = new Map(candidate.passCInitial.map((item) => [item.memoryRef, item.output]));
  const records = [];
  for (const memory of candidate.memories) {
    const initial = initialByMemory.get(memory.memoryRef);
    if (!initial) fail(`candidate memory ${memory.memoryRef} lacks its initial Pass-C result`);
    let revision = 1;
    const supportingEvidenceRefs = [];
    records.push(memoryRevision({
      candidate,
      memory,
      output: initial,
      revision,
      asOf: memory.initialMeaningFormedAt,
      publicationAt,
    }));
    for (const interpretation of memory.reinterpretations ?? []) {
      if (interpretation.outcome !== "revised") continue;
      revision += 1;
      if (!supportingEvidenceRefs.includes(interpretation.supportingEventRef)) {
        supportingEvidenceRefs.push(interpretation.supportingEventRef);
      }
      records.push(memoryRevision({
        candidate,
        memory,
        output: interpretation.output,
        revision,
        asOf: interpretation.asOf,
        publicationAt,
        supportingEvidenceRefs,
      }));
    }
  }
  return Object.freeze(records);
}

function buildSyntheticLineageRelations({ candidate, slotPlan, thread, publicationAt }) {
  if (candidate.originMode !== "synthetic_lineage") return [];
  const owners = slotPlan.genome.header.sourceEligibility?.sourceOwners ?? [];
  const seedEventId = normalizeSeedSnapshot(thread).provenance.lastEventId;
  return owners.map((owner) => normalizeLifeRelation({
    relationId: lifeRelationId({
      threadId: candidate.threadId,
      relatedPartyId: owner.ownerId,
      relationKind: "biological_parent",
      geneticContributionRole: "parent_genome_source",
    }),
    revision: 1,
    threadId: candidate.threadId,
    relatedParty: { partyId: owner.ownerId, kind: "synthetic_ancestor", displayName: owner.ownerId },
    relationKind: "biological_parent",
    geneticContributionRole: "parent_genome_source",
    sourceReferences: [seedEventId],
    validFrom: slotPlan.bornAt,
    validTo: null,
    visibility: "private",
    status: "current",
    provenance: "genesis_created",
    recordedAt: publicationAt,
  }));
}

function buildManifest({ candidate, slotPlan, thread, memories, cognition, publicationAt }) {
  const parentOrAncestorRefs = candidate.originMode === "synthetic_lineage"
    ? slotPlan.genome.header.sourceEligibility.sourceOwners.map((owner) => owner.ownerId)
    : [];
  return normalizeGenesisManifest({
    genesisId: candidate.genesisId,
    threadId: candidate.threadId,
    originMode: candidate.originMode,
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: slotPlan.chronologyEndsAt,
      justification: "Fibre admits a bounded prior life through age 21.9999 before young-adult entry.",
      policyRef: "genesis-young-adult-entry-v1",
    },
    worldSpecRef: candidate.worldSpecId,
    sourceBundleRefs: [],
    parentOrAncestorRefs,
    genomeRef: slotPlan.genome.header.genomeId,
    cognition,
    publication: {
      status: "published",
      publishedAt: publicationAt,
      resultingThreadVersion: thread.version + candidate.episodes.length + memories.length,
    },
    createdAt: candidate.attemptStartedAt,
  });
}

function assertCandidateMatchesPlan(candidate, slotPlan) {
  if (candidate.threadId !== slotPlan.threadId || candidate.genesisId !== slotPlan.genesisId) fail("candidate identity does not match current Genesis plan");
  if (candidate.originMode !== slotPlan.originMode) fail("candidate origin mode does not match current Genesis plan");
  if (candidate.worldSpecDigest !== slotPlan.worldSpecDigest || candidate.genomeDigest !== slotPlan.genomeDigest) fail("candidate World/genome binding does not match current Genesis plan");
  if (candidate.envelopePlanDigest !== slotPlan.envelopePlan.digest) fail("candidate historical envelope plan does not match current Genesis plan");
  assertGenesisCandidatePlaceConsistency({ candidate, slotPlan, ErrorType: Error });
}

export function buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt } = {}) {
  if (!candidate || !slotPlan || !cognition) throw new TypeError("Genesis birth bundle requires candidate, slotPlan and cognition");
  if (typeof publicationAt !== "string" || !Number.isFinite(Date.parse(publicationAt))) throw new TypeError("Genesis birth bundle publicationAt is required");
  assertCandidateMatchesPlan(candidate, slotPlan);
  if (!Array.isArray(slotPlan.roster?.participants) || slotPlan.roster.participants.length === 0) fail("current Genesis birth requires the authoritative initial roster");
  if (!candidate.lifeContinuity || candidate.episodes.length === 0) fail("current Genesis birth requires admitted history plus derived life continuity");

  const thread = buildNeutralGenesisThreadSeed({
    threadId: candidate.threadId,
    createdAt: candidate.attemptStartedAt,
  });
  const memories = materializeGenesisMemoryRecords(candidate, publicationAt);
  const manifest = buildManifest({ candidate, slotPlan, thread, memories, cognition, publicationAt });
  const lifeRelations = buildSyntheticLineageRelations({ candidate, slotPlan, thread, publicationAt });
  return Object.freeze({
    manifest,
    thread,
    episodes: structuredClone(candidate.episodes),
    memories,
    lifeRelations: Object.freeze(lifeRelations),
    initialRoster: structuredClone(slotPlan.roster.participants),
    lifeContinuity: structuredClone(candidate.lifeContinuity),
    historicalEnvelopePlan: structuredClone(slotPlan.envelopePlan),
    originFixture: null,
  });
}

export function buildGenesisAdmissionPackage({
  candidate,
  slotPlan,
  cognition,
  publicationAt,
  randomIntFn,
} = {}) {
  const birth = buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt });
  const fibreIdentityNumber = mintFibreIdentityNumber({ randomIntFn });
  const civilRegistration = buildFibreCivilRegistration({
    threadId: birth.manifest.threadId,
    fibreIdentityNumber,
    registeredAt: birth.manifest.publication.publishedAt,
    birthEventRef: normalizeSeedSnapshot(birth.thread).provenance.lastEventId,
    worldRef: birth.manifest.worldSpecRef,
  });
  const manifest = normalizeGenesisManifest({
    ...birth.manifest,
    publication: {
      ...birth.manifest.publication,
      civilRegistration,
    },
  });
  return Object.freeze({
    ...birth,
    manifest,
    civilRegistration,
    worldSpec: structuredClone(slotPlan.worldSpec),
    symbolicGenomes: Object.freeze([
      ...(slotPlan.parentGenomes ?? []).map((parent) => structuredClone(parent.bundle)),
      structuredClone(slotPlan.genome),
    ]),
  });
}
