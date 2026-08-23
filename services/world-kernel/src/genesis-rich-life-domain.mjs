import {
  assertExactKeys,
  assertId,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { projectPassAInputForCognition } from "./genesis-pass-a-cognition.mjs";
import {
  assertPassAInputBoundary,
  buildPassAInput,
  normalizeEventStructure,
} from "./genesis-pass-a-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V3,
  eventStructurePoolV3Digest,
  normalizeEventStructurePoolV3,
} from "./genesis-event-structure-pool-v3.mjs";
import {
  GENESIS_RICH_COUNTERPART_POLICY_VERSION,
  richCounterpartMode,
} from "./genesis-rich-participation-policy.mjs";
import {
  normalizeSymbolicGenomeHeader,
  symbolicGenomeDigest,
} from "./symbolic-genome-domain.mjs";

export {
  GENESIS_RICH_PASS_A_OUTPUT_VERSION,
  GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
  assertRichRepairPreservesEpisodeFacts,
  normalizeRichPassAEpisode,
  normalizeRichPassAModelOutput,
  validateRichPassAEpisode,
} from "./genesis-rich-life-episode.mjs";

export const GENESIS_RICH_LIFE_MODES = Object.freeze(["de_novo", "synthetic_lineage"]);
export const GENESIS_RICH_PASS_A_POLICY_VERSION = "genesis-pass-a-policy-v1+event-structure-pool-v3";

function normalizeLineageWitness(candidate) {
  assertPlainObject("syntheticLineageWitness", candidate);
  assertExactKeys("syntheticLineageWitness", candidate, [
    "genomeRef",
    "parentOrAncestorRefs",
    "recombinationWitnessRef",
  ]);
  assertId("syntheticLineageWitness.genomeRef", candidate.genomeRef);
  assertStringArray("syntheticLineageWitness.parentOrAncestorRefs", candidate.parentOrAncestorRefs);
  if (candidate.parentOrAncestorRefs.length < 2) throw new TypeError("synthetic_lineage requires at least two parent/ancestor refs");
  candidate.parentOrAncestorRefs.forEach((value, index) => assertId(`syntheticLineageWitness.parentOrAncestorRefs[${index}]`, value));
  if (new Set(candidate.parentOrAncestorRefs).size !== candidate.parentOrAncestorRefs.length) throw new TypeError("synthetic lineage parent/ancestor refs must be unique");
  assertId("syntheticLineageWitness.recombinationWitnessRef", candidate.recombinationWitnessRef);
  return structuredClone(candidate);
}

export function syntheticLineageWitnessFromRecombinedGenome(bundle) {
  assertPlainObject("synthetic lineage symbolic genome", bundle);
  const header = normalizeSymbolicGenomeHeader(bundle.header);
  if (header.originKind !== "recombined") throw new TypeError("synthetic lineage requires a recombined symbolic genome");
  if (header.sourceEligibility === null || header.recombinationWitness === null) {
    throw new TypeError("synthetic lineage recombined genome is missing source/recombination provenance");
  }
  const actualDigest = symbolicGenomeDigest({
    header,
    loci: bundle.loci,
    mutations: bundle.mutations ?? [],
  });
  if (bundle.genomeDigest !== actualDigest) throw new TypeError("synthetic lineage genome digest does not match its symbolic genome content");
  const sourceOwners = header.sourceEligibility.sourceOwners;
  if (sourceOwners.some((owner) => owner.kind !== "synthetic_ancestor")) {
    throw new TypeError("synthetic_lineage requires synthetic-ancestor source genomes");
  }
  return Object.freeze(normalizeLineageWitness({
    genomeRef: header.genomeId,
    parentOrAncestorRefs: sourceOwners.map((owner) => owner.ownerId),
    recombinationWitnessRef: `recomb_${sha256(canonicalJson(header.recombinationWitness)).slice(0, 40)}`,
  }));
}

export function assertRichLifeCompilerMode({ originMode, syntheticLineageWitness = null }) {
  if (!GENESIS_RICH_LIFE_MODES.includes(originMode)) throw new TypeError("rich-life compiler supports only de_novo or synthetic_lineage");
  if (originMode === "de_novo") {
    if (syntheticLineageWitness !== null) throw new TypeError("de_novo rich-life compilation cannot carry a lineage witness into Pass A");
    return Object.freeze({ originMode, syntheticLineageWitness: null });
  }
  if (syntheticLineageWitness === null) throw new TypeError("synthetic_lineage rich-life compilation requires a policy-side lineage witness");
  return Object.freeze({ originMode, syntheticLineageWitness: normalizeLineageWitness(syntheticLineageWitness) });
}

function baseHistoryEpisode(episode) {
  const projected = structuredClone(episode);
  delete projected.intellectualEncounter;
  return projected;
}

function projectDevelopmentalWindow(candidate) {
  assertPlainObject("developmentalWindow", candidate);
  return {
    windowId: candidate.windowId,
    startAt: candidate.startAt,
    endAt: candidate.endAt,
    minAge: candidate.minAge,
    maxAge: candidate.maxAge,
  };
}

function coversDevelopmentalWindow(structure, developmentalWindow) {
  return structure.developmentalRange.minAge <= developmentalWindow.minAge
    && structure.developmentalRange.maxAge >= developmentalWindow.maxAge;
}

function currentOfferedStructures(offeredEntries, developmentalWindow) {
  if (!Array.isArray(offeredEntries)) throw new TypeError("offeredEntries must be a current EventStructure entry array");
  const currentPool = normalizeEventStructurePoolV3(GENESIS_EVENT_STRUCTURE_POOL_V3);
  const byId = new Map(currentPool.map((entry) => [entry.structure.structureId, entry]));
  const offered = offeredEntries.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry) || entry.structure === undefined) {
      throw new TypeError(`offeredEntries[${index}] is not a current EventStructure entry`);
    }
    const structure = normalizeEventStructure(entry.structure);
    const authoritative = byId.get(structure.structureId);
    if (authoritative === undefined || canonicalJson(authoritative.structure) !== canonicalJson(structure)) {
      throw new TypeError(`offered structure ${structure.structureId} is not the current reviewed EventStructure`);
    }
    if (!coversDevelopmentalWindow(structure, developmentalWindow)) {
      throw new TypeError(`offered rich structure ${structure.structureId} does not cover the entire developmental window`);
    }
    return structure;
  });
  offered.sort((left, right) => left.structureId.localeCompare(right.structureId));
  return offered;
}

export function buildRichLifePassAInput({
  originMode,
  syntheticLineageWitness = null,
  worldSpec,
  subject,
  developmentalWindow,
  chronologyEndsAt,
  initialRoster,
  priorEpisodes = [],
  previouslyIntroducedParticipants = [],
  offeredEntries,
}) {
  // Inheritance is validated policy-side and intentionally discarded before Pass A.
  // There is one current rich-life compiler: the current reviewed EventStructure pool.
  assertRichLifeCompilerMode({ originMode, syntheticLineageWitness });
  const currentPool = normalizeEventStructurePoolV3(GENESIS_EVENT_STRUCTURE_POOL_V3);
  // Protocol windows may carry compiler-only metadata such as ordinal. Project the
  // exact Pass-A window surface here so that metadata can never become cognition.
  const passAWindow = projectDevelopmentalWindow(developmentalWindow);
  const input = buildPassAInput({
    worldSpec,
    subject,
    developmentalWindow: passAWindow,
    chronologyEndsAt,
    initialRoster,
    priorEpisodes: priorEpisodes.map(baseHistoryEpisode),
    previouslyIntroducedParticipants,
    eventStructurePool: currentPool.map((item) => item.structure),
    offeredStructures: currentOfferedStructures(offeredEntries, passAWindow),
  });
  input.policyWitness = {
    ...input.policyWitness,
    policyVersion: `${GENESIS_RICH_PASS_A_POLICY_VERSION}+${GENESIS_RICH_COUNTERPART_POLICY_VERSION}`,
    eventStructurePoolDigest: eventStructurePoolV3Digest(currentPool),
  };
  return assertPassAInputBoundary(input);
}

export function projectRichLifePassAInputForCognition(candidate) {
  const cognition = projectPassAInputForCognition(candidate);
  return Object.freeze({
    ...cognition,
    offeredStructures: Object.freeze(cognition.offeredStructures.map((structure) => Object.freeze({
      ...structuredClone(structure),
      counterpartMode: richCounterpartMode(structure.structureId),
    }))),
  });
}
