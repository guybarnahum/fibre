import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
  normalizePassBInput,
} from "./genesis-pass-b-domain.mjs";
import {
  GENESIS_LIFE_PASS_B_FORMATION_MODES,
  GENESIS_LIFE_PASS_B_HORIZONS,
  assertGenesisLifePassBSchedule,
} from "./genesis-life-pass-b.mjs";
import { normalizeGenesisWorldSpec } from "./genesis-domain.mjs";

export const GENESIS_LIFE_GENOME_EXPOSURE_POLICY = Object.freeze({
  policyVersion: "pr39-g3-whole-genome-exposure-v1",
  kind: "whole_genome",
  k: null,
  locusCount: 6,
  selection: "all six frozen loci in ordinal order",
});

function projectWorld(worldSpec) {
  const world = normalizeGenesisWorldSpec(worldSpec);
  return {
    worldSpecId: world.worldSpecId,
    timeFrame: structuredClone(world.timeFrame),
    places: structuredClone(world.places),
    householdShape: world.householdShape,
    familyRelations: [...world.familyRelations],
    languages: [...world.languages],
    materialCircumstances: world.materialCircumstances,
    mobilityPattern: world.mobilityPattern,
    schoolingOrCommunityContext: world.schoolingOrCommunityContext,
    culturalContext: world.culturalContext,
    availableInstitutions: [...world.availableInstitutions],
    intellectualEnvironment: world.intellectualEnvironment,
    affordedRoles: [...world.affordedRoles],
  };
}

function projectEpisode(episode) {
  return {
    episodeId: episode.episodeId,
    occurredAt: episode.occurredAt,
    ageAtEvent: episode.ageAtEvent,
    placeRef: episode.placeRef,
    participantRefs: [...episode.participantRefs],
    observableAction: episode.observableAction,
    introducedParticipants: episode.introducedParticipants.map((item) => ({
      participantId: item.provisionalPersonId,
      roleRef: item.roleRef,
      introducedAt: item.introducedAt,
    })),
  };
}

function genomeExposure(genome) {
  if (genome === null || typeof genome !== "object" || !Array.isArray(genome.loci)) {
    throw new TypeError("replacement Pass-B treatment requires a symbolic genome");
  }
  if (genome.loci.length !== GENESIS_LIFE_GENOME_EXPOSURE_POLICY.locusCount) {
    throw new TypeError("replacement Pass-B genome locus count drift");
  }
  const loci = [...genome.loci]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map(({ locusId, ordinal, value }) => ({ locusId, ordinal, value }));
  if (loci.some((locus, index) => locus.ordinal !== index + 1)) {
    throw new TypeError("replacement Pass-B genome loci are not in canonical ordinal order");
  }
  return {
    policy: {
      kind: GENESIS_LIFE_GENOME_EXPOSURE_POLICY.kind,
      k: GENESIS_LIFE_GENOME_EXPOSURE_POLICY.k,
    },
    genomeRef: genome.header.genomeId,
    genomeDigest: genome.genomeDigest,
    totalLoci: loci.length,
    loci,
  };
}

export function buildGenesisPassBInput({
  threadId,
  bornAt,
  worldSpec,
  episodes,
  windows,
  callOrdinal,
  priorRememberedMemories,
  genome,
} = {}) {
  assertGenesisLifePassBSchedule({
    horizons: GENESIS_LIFE_PASS_B_HORIZONS,
    formationModes: GENESIS_LIFE_PASS_B_FORMATION_MODES,
    historyLength: episodes.length,
  });
  if (!Number.isInteger(callOrdinal) || callOrdinal < 1 || callOrdinal > GENESIS_LIFE_PASS_B_HORIZONS.length) {
    throw new TypeError("replacement Pass-B callOrdinal is invalid");
  }
  if (!Array.isArray(windows) || windows.length !== episodes.length) {
    throw new TypeError("replacement Pass-B windows must align with admitted history");
  }
  const index = callOrdinal - 1;
  const horizon = GENESIS_LIFE_PASS_B_HORIZONS[index];
  const formationMode = GENESIS_LIFE_PASS_B_FORMATION_MODES[index];
  const window = windows[horizon - 1];
  const priorTreatmentMemoryExposure = priorRememberedMemories.some((item) => item.formationMode === "life_plus_genome");
  const analysisStratum = formationMode === "life_plus_genome"
    ? "life_plus_genome"
    : priorTreatmentMemoryExposure ? "life_only_exposed" : "life_only_unexposed";

  return normalizePassBInput({
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: { provisionalThreadId: threadId, bornAt },
    world: projectWorld(worldSpec),
    rememberingAt: window.endAt,
    ageAtRemembering: window.maxAge,
    chronologyEndsAt: window.endAt,
    history: episodes.slice(0, horizon).map(projectEpisode),
    priorMemories: priorRememberedMemories.map((item) => ({
      memoryRef: item.memoryRef,
      episodeRefs: [...item.passBEpisodeRefs],
      rememberedContent: item.rememberedContent,
      uncertainty: [...item.uncertainty],
      formationMode: item.formationMode,
    })),
    assignment: {
      formationMode,
      priorTreatmentMemoryExposure,
      analysisStratum,
    },
    genomeExposure: formationMode === "life_plus_genome" ? genomeExposure(genome) : null,
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: `pr39-replacement-v2-pass-b:call:${String(callOrdinal).padStart(2, "0")}`,
      genomeExposurePolicyRef: formationMode === "life_plus_genome"
        ? GENESIS_LIFE_GENOME_EXPOSURE_POLICY.policyVersion
        : null,
    },
  });
}
