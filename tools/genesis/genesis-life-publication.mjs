import { createCivilRegistryService } from "#services/birth-center/src/civil-registry.mjs";
import {
  buildGenesisBirthBundle,
} from "#services/birth-center/src/genesis-publication.mjs";
export {
  buildGenesisPublicationCognition,
  buildNeutralGenesisThreadSeed,
  materializeGenesisMemoryRecords,
  buildGenesisBirthBundle,
} from "#services/birth-center/src/genesis-publication.mjs";
import { openAutobiographicalMemoryInspectionStore } from "#services/world-kernel/src/autobiographical-memory-store.mjs";
import { CivilRegistryStore } from "#services/world-kernel/src/civil-registry-store.mjs";
import { normalizeGenesisManifest } from "#services/world-kernel/src/genesis-domain.mjs";
import { deriveGenesisSituatedContinuityRecords } from "#services/world-kernel/src/genesis-birth-situated-continuity.mjs";
import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import { genesisLifeEpisodeEventId } from "#services/world-kernel/src/genesis-life-episode.mjs";
import { openIdentityInspectionStore } from "#services/world-kernel/src/identity-store.mjs";
import { normalizeSeedSnapshot } from "#services/world-kernel/src/persistence-domain.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { canonicalJson } from "#services/world-kernel/src/persistence-common.mjs";
import { openSituatedLifeInspectionStore } from "#services/world-kernel/src/situated-life-store.mjs";
import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";
import { localWorldStateStorage } from "#tools/shared/local-world-state.mjs";

const fail = (message) => { throw new Error(message); };

function persistCurrentGenomeBundle(worldStorage, slotPlan) {
  const store = new SymbolicGenomeStore(worldStorage);
  try {
    for (const parent of slotPlan.parentGenomes ?? []) store.recordGenome(parent.bundle);
    store.recordGenome(slotPlan.genome);
  } finally {
    store.close();
  }
}

function attachCivilRegistration(worldStorage, birth) {
  const authority = new CivilRegistryStore(worldStorage);
  try {
    const registry = createCivilRegistryService({ authority });
    const registration = registry.prepareBirthRegistration({
      threadId: birth.manifest.threadId,
      birthEventRef: normalizeSeedSnapshot(birth.thread).provenance.lastEventId,
      worldRef: birth.manifest.worldSpecRef,
      registeredAt: birth.manifest.publication.publishedAt,
    });
    const manifest = normalizeGenesisManifest({
      ...birth.manifest,
      publication: {
        ...birth.manifest.publication,
        civilRegistration: registration,
      },
    });
    return Object.freeze({ ...birth, manifest });
  } finally {
    authority.close();
  }
}

export function publishGenesisLifeCandidate({ databasePath, candidate, slotPlan, cognition, publicationAt } = {}) {
  const candidateBirth = buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt });
  const worldStorage = localWorldStateStorage(databasePath, { driverId: "sqlite-genesis-life-publication" });
  persistCurrentGenomeBundle(worldStorage, slotPlan);
  const genesis = new GenesisStore(worldStorage);
  try {
    genesis.recordWorldSpec(slotPlan.worldSpec);
    const birth = attachCivilRegistration(worldStorage, candidateBirth);
    const publication = genesis.publishBirth(birth);
    return { birth, publication };
  } finally {
    genesis.close();
  }
}

export function hydrateGenesisLife({ databasePath, candidate, slotPlan, birth } = {}) {
  const worldStorage = localWorldStateStorage(databasePath, { driverId: "sqlite-genesis-life-hydration" });
  const genesis = new GenesisStore(worldStorage, { readOnly: true });
  const world = openWorldStore(worldStorage);
  const situated = openSituatedLifeInspectionStore(worldStorage);
  const memory = openAutobiographicalMemoryInspectionStore(worldStorage);
  const identity = openIdentityInspectionStore(worldStorage);
  const genomes = new SymbolicGenomeStore(worldStorage, { readOnly: true });
  const registry = new CivilRegistryStore(worldStorage);
  try {
    const events = world.listEvents(candidate.threadId);
    const episodeEvents = events.filter((event) => event.eventType === "THREAD_LIFE_EPISODE_RECORDED");
    return Object.freeze({
      thread: world.getThread(candidate.threadId),
      manifest: genesis.getManifest(candidate.genesisId).manifest,
      historicalEnvelopePlan: genesis.getHistoricalEnvelopePlan(candidate.genesisId).plan,
      civilRegistration: registry.getCivilRegistrationByThreadId(candidate.threadId, { required: false }),
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
    registry.close();
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
  if (canonicalJson(hydrated.historicalEnvelopePlan) !== canonicalJson(birth.historicalEnvelopePlan)) {
    fail("hydrated historical-envelope authority differs from admitted birth plan");
  }
  if (canonicalJson(hydrated.historicalEnvelopePlan) !== canonicalJson(slotPlan.envelopePlan)) {
    fail("hydrated historical-envelope authority differs from current Genesis plan");
  }
  if (canonicalJson(hydrated.episodes) !== canonicalJson(candidate.episodes)) fail("hydrated Thread history differs from admitted candidate episodes");
  if (canonicalJson(hydrated.genome) !== canonicalJson(slotPlan.genome)) fail("hydrated symbolic genome differs from admitted child genome");

  const expectedRegistration = birth.manifest.publication.civilRegistration ?? null;
  if (canonicalJson(hydrated.civilRegistration) !== canonicalJson(expectedRegistration)) {
    fail("hydrated Fibre civil registration differs from admitted birth registration");
  }

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
