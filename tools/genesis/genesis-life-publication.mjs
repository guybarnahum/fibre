import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  normalizeAutobiographicalMemory,
} from "../../services/world-kernel/src/autobiographical-memory-domain.mjs";
import { openAutobiographicalMemoryInspectionStore } from "../../services/world-kernel/src/autobiographical-memory-store.mjs";
import {
  normalizeGenesisManifest,
  publicationValidatorSetWitness,
} from "../../services/world-kernel/src/genesis-domain.mjs";
import { deriveGenesisSituatedContinuityRecords } from "../../services/world-kernel/src/genesis-birth-situated-continuity.mjs";
import { GenesisStore } from "../../services/world-kernel/src/genesis-store.mjs";
import { eventStructurePoolV3Digest } from "../../services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import { genesisLifeEpisodeEventId } from "../../services/world-kernel/src/genesis-life-episode.mjs";
import { assertGenesisCandidatePlaceConsistency } from "../../services/world-kernel/src/genesis-publication-place-consistency.mjs";
import { openIdentityInspectionStore } from "../../services/world-kernel/src/identity-store.mjs";
import { normalizeSeedSnapshot, validateThreadSnapshot } from "../../services/world-kernel/src/persistence-domain.mjs";
import { openWorldStore } from "../../services/world-kernel/src/persistence.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import { lifeRelationId, normalizeLifeRelation } from "../../services/world-kernel/src/situated-life-domain.mjs";
import { openSituatedLifeInspectionStore } from "../../services/world-kernel/src/situated-life-store.mjs";
import { SymbolicGenomeStore } from "../../services/world-kernel/src/symbolic-genome-store.mjs";

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
      records.push(memoryRevision({
        candidate,
        memory,
        output: interpretation.output,
        revision,
        asOf: interpretation.asOf,
        publicationAt,
        supportingEvidenceRefs: [interpretation.supportingEventRef],
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
  if (canonicalJson(candidate.lifeContinuity) !== canonicalJson(slotPlan === null ? null : candidate.lifeContinuity)) fail("unreachable continuity guard");
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
    originFixture: null,
  });
}

function persistCurrentGenomeBundle(databasePath, slotPlan) {
  const store = new SymbolicGenomeStore(databasePath);
  try {
    for (const parent of slotPlan.parentGenomes ?? []) store.recordGenome(parent.bundle);
    store.recordGenome(slotPlan.genome);
  } finally {
    store.close();
  }
}

export function publishGenesisLifeCandidate({ databasePath, candidate, slotPlan, cognition, publicationAt } = {}) {
  const birth = buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt });
  persistCurrentGenomeBundle(databasePath, slotPlan);
  const genesis = new GenesisStore(databasePath);
  try {
    genesis.recordWorldSpec(slotPlan.worldSpec);
    const publication = genesis.publishBirth(birth);
    return { birth, publication };
  } finally {
    genesis.close();
  }
}

export function hydrateGenesisLife({ databasePath, candidate, slotPlan, birth } = {}) {
  const genesis = new GenesisStore(databasePath, { readOnly: true });
  const world = openWorldStore(databasePath);
  const situated = openSituatedLifeInspectionStore(databasePath);
  const memory = openAutobiographicalMemoryInspectionStore(databasePath);
  const identity = openIdentityInspectionStore(databasePath);
  const genomes = new SymbolicGenomeStore(databasePath, { readOnly: true });
  try {
    const events = world.listEvents(candidate.threadId);
    const episodeEvents = events.filter((event) => event.eventType === "THREAD_LIFE_EPISODE_RECORDED");
    return Object.freeze({
      thread: world.getThread(candidate.threadId),
      manifest: genesis.getManifest(candidate.genesisId).manifest,
      episodes: episodeEvents.map((event) => ({ ...structuredClone(event.payload), occurredAt: event.occurredAt })),
      lifeRelations: situated.listCurrentLifeRelations(candidate.threadId),
      placeEpisodes: situated.listCurrentPlaceEpisodes(candidate.threadId),
      memories: memory.listCurrentMemories(candidate.threadId),
      memoryVisuals: identity.listMemoryVisualCompanions(candidate.threadId).map((item) => item.companion),
      genome: genomes.getGenome(slotPlan.genome.header.genomeId),
      expectedSituated: deriveGenesisSituatedContinuityRecords({
        manifest: birth.manifest,
        worldSpec: slotPlan.worldSpec,
        initialRoster: birth.initialRoster,
        episodes: birth.episodes,
        lifeContinuity: birth.lifeContinuity,
        seedEventId: normalizeSeedSnapshot(birth.thread).provenance.lastEventId,
      }),
    });
  } finally {
    genomes.close();
    identity.close();
    memory.close();
    situated.close();
    world.close();
    genesis.close();
  }
}

function sortedJson(values, key) {
  return canonicalJson([...values].sort((left, right) => key(left).localeCompare(key(right))));
}

export function assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth, hydrated } = {}) {
  if (canonicalJson(hydrated.manifest) !== canonicalJson(birth.manifest)) fail("hydrated Genesis manifest differs from admitted birth manifest");
  if (canonicalJson(hydrated.episodes) !== canonicalJson(candidate.episodes)) fail("hydrated Thread history differs from admitted candidate episodes");
  if (canonicalJson(hydrated.genome) !== canonicalJson(slotPlan.genome)) fail("hydrated symbolic genome differs from admitted child genome");

  if (sortedJson(hydrated.lifeRelations, (item) => item.relationId) !== sortedJson([
    ...hydrated.expectedSituated.lifeRelations,
    ...birth.lifeRelations,
  ], (item) => item.relationId)) fail("hydrated life relations differ from admitted continuity/lineage");
  if (sortedJson(hydrated.placeEpisodes, (item) => item.episodeId) !== sortedJson(hydrated.expectedSituated.placeEpisodes, (item) => item.episodeId)) {
    fail("hydrated place episodes differ from admitted continuity");
  }

  const expectedMemoryHeads = new Map();
  for (const record of birth.memories) expectedMemoryHeads.set(record.memoryId, record);
  if (sortedJson(hydrated.memories, (item) => item.memoryId) !== sortedJson([...expectedMemoryHeads.values()], (item) => item.memoryId)) {
    fail("hydrated autobiographical memories differ from admitted birth memory heads");
  }
  const memoryIds = [...expectedMemoryHeads.keys()].sort();
  const visualMemoryIds = hydrated.memoryVisuals.map((item) => item.memoryRef).sort();
  if (canonicalJson(memoryIds) !== canonicalJson(visualMemoryIds)) fail("birth did not preserve one memory-visual obligation per autobiographical memory");

  const expectedVersion = birth.manifest.publication.resultingThreadVersion;
  if (hydrated.thread.version !== expectedVersion) fail("hydrated Thread version differs from manifest first-live version");
  return true;
}

export function publishHydrateAndCompareGenesisLife(args) {
  const { birth, publication } = publishGenesisLifeCandidate(args);
  const hydrated = hydrateGenesisLife({ ...args, birth });
  assertHydratedGenesisMatchesCandidate({ ...args, birth, hydrated });
  return Object.freeze({ birth, publication, hydrated });
}

export function genesisLifeEventIds(candidate) {
  return candidate.episodes.map((episode) => genesisLifeEpisodeEventId({
    threadId: candidate.threadId,
    genesisId: candidate.genesisId,
    episode,
  }));
}
