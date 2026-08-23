import {
  assertExactKeys,
  assertId,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { projectPassAInputForCognition } from "./genesis-pass-a-cognition.mjs";
import { buildPassAInputWithEventStructurePoolV2 } from "./genesis-event-structure-pool-v2.mjs";
import {
  GENESIS_RICH_COUNTERPART_POLICY_HISTORICAL_VERSION,
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
    throw new TypeError("Slice E synthetic_lineage requires synthetic-ancestor source genomes");
  }
  const witness = {
    genomeRef: header.genomeId,
    parentOrAncestorRefs: sourceOwners.map((owner) => owner.ownerId),
    recombinationWitnessRef: `recomb_${sha256(canonicalJson(header.recombinationWitness)).slice(0, 40)}`,
  };
  return Object.freeze(normalizeLineageWitness(witness));
}

export function assertRichLifeCompilerMode({ originMode, syntheticLineageWitness = null }) {
  if (!GENESIS_RICH_LIFE_MODES.includes(originMode)) throw new TypeError("Slice E rich-life compiler supports only de_novo or synthetic_lineage");
  if (originMode === "de_novo") {
    if (syntheticLineageWitness !== null) throw new TypeError("de_novo rich-life compilation cannot carry a lineage witness into Pass A");
    return Object.freeze({ originMode, syntheticLineageWitness: null });
  }
  if (syntheticLineageWitness === null) throw new TypeError("synthetic_lineage rich-life compilation requires a policy-side lineage witness");
  return Object.freeze({ originMode, syntheticLineageWitness: normalizeLineageWitness(syntheticLineageWitness) });
}

function stableOfferOrder(entries) {
  if (!Array.isArray(entries)) throw new TypeError("offeredEntries must be an array");
  return [...entries].sort((left, right) =>
    left.structure.structureId.localeCompare(right.structure.structureId));
}

function baseHistoryEpisode(episode) {
  const projected = structuredClone(episode);
  delete projected.intellectualEncounter;
  return projected;
}

export function buildRichLifePassAInput({
  originMode,
  syntheticLineageWitness = null,
  ...passAInputArgs
}) {
  // The mode/genome witness is validated policy-side and intentionally discarded before
  // constructing Pass A. The same Pass-A builder is therefore used for de_novo and
  // synthetic_lineage; inherited material cannot become a childhood-event authoring path.
  // Historical H/calibration inputs remain bound to the reviewed v1 counterpart-policy
  // witness even though replacement-v2 adds namespace-disjoint v3 structure semantics.
  assertRichLifeCompilerMode({ originMode, syntheticLineageWitness });
  const input = buildPassAInputWithEventStructurePoolV2({
    ...passAInputArgs,
    priorEpisodes: (passAInputArgs.priorEpisodes ?? []).map(baseHistoryEpisode),
    // Stable ID order prevents pool authoring order from becoming an accidental prompt signal.
    offeredEntries: stableOfferOrder(passAInputArgs.offeredEntries),
  });
  return {
    ...input,
    policyWitness: {
      ...input.policyWitness,
      policyVersion: `${input.policyWitness.policyVersion}+${GENESIS_RICH_COUNTERPART_POLICY_HISTORICAL_VERSION}`,
    },
  };
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
