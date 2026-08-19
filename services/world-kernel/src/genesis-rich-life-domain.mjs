import {
  assertExactKeys,
  assertId,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  GENESIS_PASS_A_RESPONSE_SCHEMA,
  GenesisPassAValidationError,
  assertPassAInputBoundary,
  normalizePassAEpisode,
  validatePassAEpisode,
} from "./genesis-pass-a-domain.mjs";
import { projectPassAInputForCognition } from "./genesis-pass-a-cognition.mjs";
import {
  GENESIS_INTELLECTUAL_ENCOUNTER_RESPONSE_SCHEMA,
  normalizeGenesisIntellectualEncounter,
} from "./genesis-intellectual-encounter.mjs";
import {
  buildPassAInputWithEventStructurePoolV2,
} from "./genesis-event-structure-pool-v2.mjs";

export const GENESIS_RICH_LIFE_MODES = Object.freeze(["de_novo", "synthetic_lineage"]);
export const GENESIS_RICH_PASS_A_OUTPUT_VERSION = "genesis-rich-pass-a-output-v1";

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

function splitRichEpisode(candidate) {
  assertPlainObject("rich Pass-A episode", candidate);
  const hasEncounter = Object.hasOwn(candidate, "intellectualEncounter");
  const base = structuredClone(candidate);
  delete base.intellectualEncounter;
  return { base, encounterCandidate: hasEncounter ? candidate.intellectualEncounter : null };
}

export function normalizeRichPassAEpisode(candidate, { enforceObservableForm = true } = {}) {
  const { base, encounterCandidate } = splitRichEpisode(candidate);
  const episode = normalizePassAEpisode(base, { enforceObservableForm });
  if (encounterCandidate === null || encounterCandidate === undefined) return episode;
  const intellectualEncounter = normalizeGenesisIntellectualEncounter(encounterCandidate, {
    participantRefs: episode.participantRefs,
  });
  return Object.freeze({ ...episode, intellectualEncounter });
}

export function validateRichPassAEpisode(candidate, inputCandidate) {
  const input = assertPassAInputBoundary(inputCandidate);
  const { base, encounterCandidate } = splitRichEpisode(candidate);
  const episode = validatePassAEpisode(base, input);
  if (encounterCandidate === null || encounterCandidate === undefined) return episode;
  try {
    const intellectualEncounter = normalizeGenesisIntellectualEncounter(encounterCandidate, {
      participantRefs: episode.participantRefs,
    });
    return Object.freeze({ ...episode, intellectualEncounter });
  } catch (error) {
    throw new GenesisPassAValidationError("pass_a_intellectual_encounter", error.message, { record: candidate });
  }
}

export function normalizeRichPassAModelOutput(candidate, inputCandidate) {
  assertPlainObject("rich Pass-A model output", candidate);
  assertExactKeys("rich Pass-A model output", candidate, ["episode"]);
  return Object.freeze({
    outputVersion: GENESIS_RICH_PASS_A_OUTPUT_VERSION,
    episode: validateRichPassAEpisode(candidate.episode, inputCandidate),
  });
}

export function assertRichRepairPreservesEpisodeFacts(previousCandidate, repairedCandidate) {
  const previous = normalizeRichPassAEpisode(previousCandidate, { enforceObservableForm: false });
  const repaired = normalizeRichPassAEpisode(repairedCandidate, { enforceObservableForm: false });
  const facts = (episode) => {
    const copy = structuredClone(episode);
    delete copy.observableAction;
    return copy;
  };
  if (canonicalJson(facts(previous)) !== canonicalJson(facts(repaired))) {
    throw new GenesisPassAValidationError(
      "pass_a_record_repair_changed_facts",
      "Pass-A rich-life form repair changed event or intellectual-encounter facts instead of repairing only observableAction",
      { record: repaired },
    );
  }
  return repaired;
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
  return buildPassAInputWithEventStructurePoolV2(passAInputArgs);
}

export function projectRichLifePassAInputForCognition(candidate) {
  return projectPassAInputForCognition(candidate);
}

export const GENESIS_RICH_PASS_A_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["episode"],
  properties: {
    episode: {
      ...structuredClone(GENESIS_PASS_A_RESPONSE_SCHEMA.properties.episode),
      properties: {
        ...structuredClone(GENESIS_PASS_A_RESPONSE_SCHEMA.properties.episode.properties),
        intellectualEncounter: {
          anyOf: [
            { type: "null" },
            structuredClone(GENESIS_INTELLECTUAL_ENCOUNTER_RESPONSE_SCHEMA),
          ],
        },
      },
    },
  },
});
