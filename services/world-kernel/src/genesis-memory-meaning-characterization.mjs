import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertPlainObject,
  assertStringArray,
} from "./persistence-common.mjs";

export const GENESIS_MEMORY_MEANING_CHARACTERIZATION_VERSION = "genesis-memory-meaning-characterization-v1";

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extent(values) {
  if (values.length === 0) return Object.freeze({ mean: null, min: null, max: null });
  return Object.freeze({ mean: mean(values), min: Math.min(...values), max: Math.max(...values) });
}

function normalizeRecord(candidate, index) {
  const path = `memoryMeaning.records[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, [
    "formationRef",
    "visibleEpisodeCount",
    "memoryOutcome",
    "citedEpisodeRefs",
    "meaningOutcome",
  ]);
  assertId(`${path}.formationRef`, candidate.formationRef);
  assertFiniteNumber(`${path}.visibleEpisodeCount`, candidate.visibleEpisodeCount, { integer: true, minimum: 1 });
  if (!["remembered", "not_remembered"].includes(candidate.memoryOutcome)) throw new TypeError(`${path}.memoryOutcome is invalid`);
  assertStringArray(`${path}.citedEpisodeRefs`, candidate.citedEpisodeRefs);
  if (new Set(candidate.citedEpisodeRefs).size !== candidate.citedEpisodeRefs.length) throw new TypeError(`${path}.citedEpisodeRefs must be unique`);
  candidate.citedEpisodeRefs.forEach((ref, refIndex) => assertId(`${path}.citedEpisodeRefs[${refIndex}]`, ref));

  if (candidate.memoryOutcome === "not_remembered") {
    if (candidate.citedEpisodeRefs.length !== 0) throw new TypeError(`${path} not_remembered cannot cite episodes`);
    if (candidate.meaningOutcome !== null) throw new TypeError(`${path} not_remembered cannot have an initial meaning outcome`);
  } else {
    if (candidate.citedEpisodeRefs.length === 0) throw new TypeError(`${path} remembered must cite at least one episode`);
    if (candidate.citedEpisodeRefs.length > candidate.visibleEpisodeCount) throw new TypeError(`${path} cites more episodes than were visible`);
    if (!["durable_meaning", "no_durable_meaning"].includes(candidate.meaningOutcome)) throw new TypeError(`${path}.meaningOutcome is invalid for remembered memory`);
  }

  return Object.freeze({
    formationRef: candidate.formationRef,
    visibleEpisodeCount: candidate.visibleEpisodeCount,
    memoryOutcome: candidate.memoryOutcome,
    citedEpisodeRefs: Object.freeze([...candidate.citedEpisodeRefs]),
    meaningOutcome: candidate.meaningOutcome,
  });
}

function groupByVisibleEpisodeCount(records) {
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.visibleEpisodeCount) ?? [];
    group.push(record);
    groups.set(record.visibleEpisodeCount, group);
  }
  return Object.freeze([...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([visibleEpisodeCount, group]) => {
      const remembered = group.filter((record) => record.memoryOutcome === "remembered");
      const citedCounts = remembered.map((record) => record.citedEpisodeRefs.length);
      const citationShares = remembered.map((record) => record.citedEpisodeRefs.length / record.visibleEpisodeCount);
      const durable = remembered.filter((record) => record.meaningOutcome === "durable_meaning").length;
      return Object.freeze({
        visibleEpisodeCount,
        observations: group.length,
        remembered: remembered.length,
        notRemembered: group.length - remembered.length,
        rememberedRate: ratio(remembered.length, group.length),
        citedEpisodesPerMemory: extent(citedCounts),
        citationShare: extent(citationShares),
        durableMeaning: durable,
        noDurableMeaning: remembered.length - durable,
        rememberedToDurableMeaningRate: ratio(durable, remembered.length),
      });
    }));
}

export function characterizeGenesisMemoryMeaning(candidate) {
  assertPlainObject("memoryMeaning characterization input", candidate);
  assertExactKeys("memoryMeaning characterization input", candidate, ["records"]);
  if (!Array.isArray(candidate.records)) throw new TypeError("memoryMeaning.records must be an array");

  const records = candidate.records.map(normalizeRecord);
  const refs = new Set();
  for (const record of records) {
    if (refs.has(record.formationRef)) throw new TypeError(`duplicate memoryMeaning formationRef ${record.formationRef}`);
    refs.add(record.formationRef);
  }

  const remembered = records.filter((record) => record.memoryOutcome === "remembered");
  const citedCounts = remembered.map((record) => record.citedEpisodeRefs.length);
  const citationShares = remembered.map((record) => record.citedEpisodeRefs.length / record.visibleEpisodeCount);
  const durableMeaning = remembered.filter((record) => record.meaningOutcome === "durable_meaning").length;
  const noDurableMeaning = remembered.length - durableMeaning;

  return Object.freeze({
    version: GENESIS_MEMORY_MEANING_CHARACTERIZATION_VERSION,
    admissionVerdict: null,
    note: "Characterization only: citation selectivity and meaning outcome rates must not be used as admission gates or regeneration triggers.",
    funnel: Object.freeze({
      observations: records.length,
      remembered: remembered.length,
      notRemembered: records.length - remembered.length,
      rememberedRate: ratio(remembered.length, records.length),
      durableMeaning,
      noDurableMeaning,
      rememberedToDurableMeaningRate: ratio(durableMeaning, remembered.length),
    }),
    selectivity: Object.freeze({
      rememberedObservations: remembered.length,
      citedEpisodesTotal: citedCounts.reduce((sum, value) => sum + value, 0),
      citedEpisodesPerMemory: extent(citedCounts),
      citationShareOfVisibleHistory: extent(citationShares),
      byVisibleEpisodeCount: groupByVisibleEpisodeCount(records),
    }),
  });
}
