import { assertPlainObject } from "./persistence-common.mjs";
import { normalizeRichPassAEpisode } from "./genesis-rich-life-episode.mjs";
import { normalizeEventStructurePoolV2 } from "./genesis-event-structure-pool-v2.mjs";
import { GENESIS_RICH_LIFE_MODES } from "./genesis-rich-life-domain.mjs";

function increment(object, key) {
  object[key] = (object[key] ?? 0) + 1;
}

export function characterizeSliceERichLife({ originMode, episodes, eventStructurePoolV2 }) {
  if (!GENESIS_RICH_LIFE_MODES.includes(originMode)) throw new TypeError("Slice E characterization originMode is invalid");
  if (!Array.isArray(episodes)) throw new TypeError("Slice E characterization episodes must be an array");
  const normalizedEpisodes = episodes.map((episode) => normalizeRichPassAEpisode(episode, { enforceObservableForm: false }));
  const pool = normalizeEventStructurePoolV2(eventStructurePoolV2);
  const poolById = new Map(pool.map((entry) => [entry.structure.structureId, entry]));

  const encounterKindCounts = {};
  const encounterSubjectKindCounts = {};
  const encounterAccessModeCounts = {};
  const sourceRefCounts = {};
  const structureContextCounts = {};
  const structureAccessModeCounts = {};

  for (const episode of normalizedEpisodes) {
    if (episode.intellectualEncounter !== undefined) {
      increment(encounterKindCounts, episode.intellectualEncounter.kind);
      increment(encounterSubjectKindCounts, episode.intellectualEncounter.subjectKind);
      increment(encounterAccessModeCounts, episode.intellectualEncounter.accessMode);
      increment(sourceRefCounts, episode.intellectualEncounter.subjectRef);
    }
    if (episode.structureRef !== null) {
      const entry = poolById.get(episode.structureRef);
      if (entry === undefined) throw new TypeError(`Slice E episode structure ${episode.structureRef} is not in EventStructurePool v2`);
      for (const kind of entry.contextKinds) increment(structureContextCounts, kind);
      for (const mode of entry.accessModes) increment(structureAccessModeCounts, mode);
    }
  }

  const rangeSignatures = [...new Set(pool.map(({ structure }) =>
    `${structure.developmentalRange.minAge}-${structure.developmentalRange.maxAge}`))].sort();
  const repeatedSourceRefs = Object.entries(sourceRefCounts)
    .filter(([, count]) => count > 1)
    .map(([ref]) => ref)
    .sort();

  return Object.freeze({
    characterizationVersion: "genesis-slice-e-characterization-v1",
    originMode,
    historicalEvents: normalizedEpisodes.length,
    structureGroundedEvents: normalizedEpisodes.filter((episode) => episode.structureRef !== null).length,
    worldEmergentEvents: normalizedEpisodes.filter((episode) => episode.structureRef === null).length,
    intellectualEncounterEvents: normalizedEpisodes.filter((episode) => episode.intellectualEncounter !== undefined).length,
    encounterKindCounts: Object.freeze(encounterKindCounts),
    encounterSubjectKindCounts: Object.freeze(encounterSubjectKindCounts),
    encounterAccessModeCounts: Object.freeze(encounterAccessModeCounts),
    uniqueEncounterSourceCount: Object.keys(sourceRefCounts).length,
    repeatedEncounterSourceRefs: Object.freeze(repeatedSourceRefs),
    eventStructureRangeSignatures: Object.freeze(rangeSignatures),
    structureContextCounts: Object.freeze(structureContextCounts),
    structureAccessModeCounts: Object.freeze(structureAccessModeCounts),
    admissionVerdict: null,
    note: "Characterization only: developmental richness and intellectual formation are measured, never required as an admission gate.",
  });
}

export function assertSliceECharacterizationShape(candidate) {
  assertPlainObject("Slice E characterization", candidate);
  if (candidate.admissionVerdict !== null) throw new TypeError("Slice E characterization must not carry an admission verdict");
  return structuredClone(candidate);
}
