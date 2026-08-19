import {
  assertExactKeys,
  assertId,
  assertPlainObject,
  assertStringArray,
} from "./persistence-common.mjs";
import { projectPassAInputForCognition } from "./genesis-pass-a-cognition.mjs";
import { buildPassAInputWithEventStructurePoolV2 } from "./genesis-event-structure-pool-v2.mjs";

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
  if (new Set(candidate.parentOrAncestorRefs).size !== candidate.parentOrAncestorRefs.length) throw new TypeError("synthetic lineage parent/ancestor refs must be unique");
  assertId("syntheticLineageWitness.recombinationWitnessRef", candidate.recombinationWitnessRef);
  return structuredClone(candidate);
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

export function buildRichLifePassAInput({
  originMode,
  syntheticLineageWitness = null,
  ...passAInputArgs
}) {
  // The mode/genome witness is validated policy-side and intentionally discarded before
  // constructing Pass A. The same Pass-A builder is therefore used for de_novo and
  // synthetic_lineage; inherited material cannot become a childhood-event authoring path.
  assertRichLifeCompilerMode({ originMode, syntheticLineageWitness });
  return buildPassAInputWithEventStructurePoolV2({
    ...passAInputArgs,
    offeredEntries: stableOfferOrder(passAInputArgs.offeredEntries),
  });
}

export function projectRichLifePassAInputForCognition(candidate) {
  return projectPassAInputForCognition(candidate);
}
