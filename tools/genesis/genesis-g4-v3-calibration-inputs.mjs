#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeGenesisWorldSpec } from "../../services/world-kernel/src/genesis-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
  sampleEventStructuresV2,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  buildRichLifePassAInput,
  projectRichLifePassAInputForCognition,
} from "../../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { assertPassAHistoryConsistency } from "../../services/world-kernel/src/genesis-pass-a-consistency.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const CALIBRATION_FREEZE_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-freeze-v1.json";
const IMPLEMENTATION_WITNESS_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-reliability-implementation-witness-v1.json";
const G2_PATH = "artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json";
const G4_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json";
export const CALIBRATION_INPUT_FREEZE_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-inputs-v1.json";
export const CALIBRATION_INPUT_VERSION = "pr39-g4-v3-off-cohort-calibration-inputs-v1";

const MILLIS_PER_MEAN_GREGORIAN_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WORLD_COUNT = 15;
const TRIALS_PER_WORLD = 15;
const CREATED_AT = "2026-08-22T00:00:00.000Z";
const WORLD_START = "2004-08-20T00:00:00.000Z";
const WORLD_END = "2026-08-20T00:00:00.000Z";
const SUBJECT_BORN_AT = "2004-08-20T00:00:00.000Z";
const ROLE_ORDER = Object.freeze([
  "caregiver",
  "sibling",
  "peer",
  "teacher",
  "mentor",
  "librarian",
  "neighbor",
  "shopkeeper",
]);

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function pad(value, width = 2) { return String(value).padStart(width, "0"); }
function fail(message) { throw new Error(message); }

function measuredAgeYears(bornAt, occurredAt) {
  return (Date.parse(occurredAt) - Date.parse(bornAt)) / MILLIS_PER_MEAN_GREGORIAN_YEAR;
}

function affordedRoles() {
  const roles = new Set(["young_person"]);
  for (const entry of GENESIS_EVENT_STRUCTURE_POOL_V2) {
    for (const role of entry.structure.participatingRoles) roles.add(role);
  }
  return [...roles].sort();
}

function makeWorld(worldOrdinal) {
  const suffix = pad(worldOrdinal);
  const placePrefix = `place_cal_g4v3_${suffix}`;
  const resourcePatterns = [
    "modest stable household resources with routine access to shared public facilities",
    "mixed household resources with ordinary constraints on time, transport, and purchases",
    "stable household resources with occasional reliance on community-shared equipment",
  ];
  const mobilityPatterns = [
    "routine walking and local transit among home, school, market, library, and community spaces",
    "routine local trips among home, school, a small market, public reading space, and neighborhood facilities",
    "ordinary neighborhood movement with school-day transit and occasional caregiver-accompanied errands",
  ];
  const schoolPatterns = [
    "a general school with classroom, library, practical projects, and ordinary peer contact",
    "a mixed classroom and community-learning setting with public reading and practical activity access",
    "a neighborhood school with teachers, peers, a small library, and occasional community workshops",
  ];
  const index = (worldOrdinal - 1) % 3;
  return normalizeGenesisWorldSpec({
    worldSpecId: `world_cal_g4v3_${suffix}`,
    timeFrame: { startAt: WORLD_START, endAt: WORLD_END },
    places: [
      { placeId: `${placePrefix}_home`, description: `Calibration habitat ${suffix}: an ordinary shared home with a kitchen, table, storage, and household notice area.` },
      { placeId: `${placePrefix}_school`, description: `Calibration habitat ${suffix}: a general school with classrooms, a yard, and shared work areas.` },
      { placeId: `${placePrefix}_library`, description: `Calibration habitat ${suffix}: a small public reading room with shelves, tables, and a staffed desk.` },
      { placeId: `${placePrefix}_market`, description: `Calibration habitat ${suffix}: a neighborhood market for routine household purchases and errands.` },
      { placeId: `${placePrefix}_transit`, description: `Calibration habitat ${suffix}: a local transit stop used for ordinary school and neighborhood trips.` },
      { placeId: `${placePrefix}_community`, description: `Calibration habitat ${suffix}: a shared community room used for practical activities, meetings, and workshops.` },
    ],
    householdShape: "one young person living with at least one caregiver, with ordinary access to peers and extended community adults",
    familyRelations: ["caregiver relationship", "possible sibling relationship"],
    languages: ["calibration local language", "calibration school language"],
    materialCircumstances: resourcePatterns[index],
    mobilityPattern: mobilityPatterns[index],
    schoolingOrCommunityContext: schoolPatterns[index],
    culturalContext: "synthetic off-cohort calibration community with ordinary household, school, market, reading, peer, and neighborhood routines; it represents no real biography or cohort location",
    availableInstitutions: ["general school", "public reading room", "neighborhood market", "community workshop", "local transit"],
    intellectualEnvironment: "ordinary exposure to books, classroom explanations, peer discussion, practical demonstrations, public information, and optional community activities",
    affordedRoles: affordedRoles(),
    worldAuthorship: {
      authorId: "fibre_calibration_author_v1",
      sourcesConsulted: [],
      abstractionMethod: "deterministic synthetic off-cohort mechanical-calibration template; no generated life, source biography, or cohort material used",
      relocationWitness: "all descriptions are intentionally generic and can be relocated without preserving a real place, person, biography, or outcome",
      familiarityProbe: null,
      createdAt: CREATED_AT,
    },
    createdAt: CREATED_AT,
  });
}

function participant(worldOrdinal, variantOrdinal, role) {
  return {
    participantId: `person_cal_g4v3_w${pad(worldOrdinal)}_v${pad(variantOrdinal)}_${role}`,
    factualRoles: [role],
    relationshipFacts: [`synthetic calibration ${role} relation`],
  };
}

function makeRoster(worldOrdinal, variantOrdinal, subjectId) {
  const roster = [{
    participantId: subjectId,
    factualRoles: ["young_person"],
    relationshipFacts: ["provisional calibration subject"],
  }];
  const counterpartCount = 1 + ((variantOrdinal - 1) % ROLE_ORDER.length);
  for (const role of ROLE_ORDER.slice(0, counterpartCount)) roster.push(participant(worldOrdinal, variantOrdinal, role));
  return roster;
}

function caregiverId(worldOrdinal, variantOrdinal) {
  return `person_cal_g4v3_w${pad(worldOrdinal)}_v${pad(variantOrdinal)}_caregiver`;
}

function makePriorEpisodes({ worldOrdinal, variantOrdinal, subjectId, window, world }) {
  const priorCount = Math.floor((variantOrdinal - 1) / 5);
  if (priorCount === 0) return [];
  const offsets = priorCount === 1 ? [45] : [90, 45];
  return offsets.map((daysBefore, index) => {
    const occurredAt = new Date(Date.parse(window.startAt) - daysBefore * DAY_MS).toISOString();
    return {
      episodeId: `epi_cal_g4v3_w${pad(worldOrdinal)}_v${pad(variantOrdinal)}_prior_${pad(index + 1)}`,
      occurredAt,
      ageAtEvent: Number(measuredAgeYears(SUBJECT_BORN_AT, occurredAt).toFixed(6)),
      placeRef: world.places[0].placeId,
      participantRefs: [subjectId, caregiverId(worldOrdinal, variantOrdinal)],
      observableAction: index === 0
        ? "The young person and caregiver placed two labeled envelopes beside the household notice area."
        : "The young person and caregiver carried a small box from the table to a storage shelf and checked its label.",
      structureRef: null,
      introducedParticipants: [],
    };
  });
}

function forbiddenFrozenIds(g2) {
  return new Set(g2.worldBindings.flatMap((binding) => [
    binding.threadId,
    binding.genesisId,
    binding.worldSpecId,
    binding.genomeId,
  ]));
}

function assertNoFrozenIdentityReuse(corpus, g2) {
  const forbidden = forbiddenFrozenIds(g2);
  for (const world of corpus.worldSpecs) {
    if (forbidden.has(world.worldSpecId)) fail(`calibration reuses frozen cohort World ${world.worldSpecId}`);
  }
  for (const trial of corpus.trials) {
    if (forbidden.has(trial.subjectId)) fail(`calibration reuses frozen cohort subject ${trial.subjectId}`);
    if (forbidden.has(trial.passAInput.world.worldSpecId)) fail(`calibration trial reuses frozen cohort World ${trial.passAInput.world.worldSpecId}`);
  }
}

function corpusCore({ calibrationFreeze, implementationWitness, g2, g4 }) {
  if (calibrationFreeze.sample.trialCount !== WORLD_COUNT * TRIALS_PER_WORLD) {
    fail("calibration freeze trial count no longer matches 15 x 15 input construction");
  }
  if (calibrationFreeze.sample.construction.syntheticCalibrationWorldCount !== WORLD_COUNT) {
    fail("calibration freeze World count mismatch");
  }
  if (calibrationFreeze.sample.construction.trialsPerCalibrationWorld !== TRIALS_PER_WORLD) {
    fail("calibration freeze trials-per-World mismatch");
  }
  if (implementationWitness.status !== "CLEAR") fail("G4-v3 implementation witness is not CLEAR");
  const windows = g4.historicalPlan.windows;
  if (!Array.isArray(windows) || windows.length !== 10) fail("expected ten inherited G4 developmental windows");

  const worldSpecs = Array.from({ length: WORLD_COUNT }, (_, index) => makeWorld(index + 1));
  const trials = [];
  for (let worldOrdinal = 1; worldOrdinal <= WORLD_COUNT; worldOrdinal += 1) {
    const world = worldSpecs[worldOrdinal - 1];
    for (let variantOrdinal = 1; variantOrdinal <= TRIALS_PER_WORLD; variantOrdinal += 1) {
      const trialOrdinal = (worldOrdinal - 1) * TRIALS_PER_WORLD + variantOrdinal;
      const subjectId = `thr_cal_g4v3_w${pad(worldOrdinal)}_v${pad(variantOrdinal)}`;
      const window = structuredClone(windows[(variantOrdinal - 1) % windows.length]);
      const initialRoster = makeRoster(worldOrdinal, variantOrdinal, subjectId);
      const priorEpisodes = makePriorEpisodes({ worldOrdinal, variantOrdinal, subjectId, window, world });
      const offerSeed = `${calibrationFreeze.sample.seedDomain}:world:${pad(worldOrdinal)}:trial:${pad(variantOrdinal)}`;
      const offeredEntries = sampleEventStructuresV2(
        GENESIS_EVENT_STRUCTURE_POOL_V2,
        window,
        { seed: offerSeed, count: 9 },
      );
      const passAInput = buildRichLifePassAInput({
        originMode: "de_novo",
        syntheticLineageWitness: null,
        worldSpec: world,
        subject: { provisionalThreadId: subjectId, bornAt: SUBJECT_BORN_AT },
        developmentalWindow: window,
        chronologyEndsAt: window.endAt,
        initialRoster,
        priorEpisodes,
        previouslyIntroducedParticipants: [],
        eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
        offeredEntries,
      });
      assertPassAHistoryConsistency(passAInput);
      const cognitionInput = projectRichLifePassAInputForCognition(passAInput);
      trials.push({
        trialOrdinal,
        trialId: `cal_g4v3_${String(trialOrdinal).padStart(3, "0")}`,
        worldOrdinal,
        variantOrdinal,
        worldSpecId: world.worldSpecId,
        subjectId,
        priorEpisodeCount: priorEpisodes.length,
        initialRosterCount: initialRoster.length,
        developmentalWindowOrdinal: window.ordinal,
        offerSeed,
        offeredStructureIds: offeredEntries.map((entry) => entry.structure.structureId),
        passAInputDigest: digest(passAInput),
        cognitionInputDigest: digest(cognitionInput),
        passAInput,
      });
    }
  }

  const core = {
    evidenceVersion: CALIBRATION_INPUT_VERSION,
    status: "FROZEN_PRE_EXECUTION",
    authority: {
      calibrationFreezePath: CALIBRATION_FREEZE_PATH,
      calibrationFreezeDigest: digest(calibrationFreeze),
      implementationWitnessPath: IMPLEMENTATION_WITNESS_PATH,
      implementationWitnessDigest: digest(implementationWitness),
      inheritedG4Path: G4_PATH,
      inheritedG4Digest: digest(g4),
      forbiddenG2IdentityPath: G2_PATH,
      forbiddenG2ProtocolDigest: digest(g2),
      eventStructurePoolDigest: eventStructurePoolV2Digest(),
      providerCallsMadeDuringConstruction: 0,
    },
    construction: {
      worldCount: WORLD_COUNT,
      trialsPerWorld: TRIALS_PER_WORLD,
      trialCount: trials.length,
      priorHistoryDistribution: {
        zeroPriorEpisodes: trials.filter((trial) => trial.priorEpisodeCount === 0).length,
        onePriorEpisode: trials.filter((trial) => trial.priorEpisodeCount === 1).length,
        twoPriorEpisodes: trials.filter((trial) => trial.priorEpisodeCount === 2).length,
      },
      syntheticWorldsOnly: true,
      genomeMaterialPresent: false,
      h2SemanticMaterialConsulted: false,
      replacementCohortMaterialPresent: false,
    },
    worldSpecs,
    trials,
  };
  assertNoFrozenIdentityReuse(core, g2);
  if (new Set(trials.map((trial) => trial.trialId)).size !== trials.length) fail("duplicate calibration trial ID");
  if (new Set(trials.map((trial) => trial.passAInputDigest)).size !== trials.length) fail("duplicate calibration Pass-A input digest");
  return core;
}

export function buildCalibrationInputCorpus() {
  const calibrationFreeze = readJson(CALIBRATION_FREEZE_PATH);
  const implementationWitness = readJson(IMPLEMENTATION_WITNESS_PATH);
  const g2 = readJson(G2_PATH);
  const g4 = readJson(G4_PATH);
  const core = corpusCore({ calibrationFreeze, implementationWitness, g2, g4 });
  return Object.freeze({ ...core, corpusDigest: digest(core) });
}

export function verifyCalibrationInputCorpus(candidate) {
  if (candidate?.evidenceVersion !== CALIBRATION_INPUT_VERSION) fail("calibration input evidence version mismatch");
  const { corpusDigest, ...core } = candidate;
  if (corpusDigest !== digest(core)) fail("calibration input corpus digest mismatch");
  const expected = buildCalibrationInputCorpus();
  if (canonicalJson(candidate) !== canonicalJson(expected)) fail("calibration input corpus differs from deterministic preregistration");
  return expected;
}

function writeOrVerify() {
  const expected = buildCalibrationInputCorpus();
  const target = absolute(CALIBRATION_INPUT_FREEZE_PATH);
  let state = "WRITTEN";
  if (existsSync(target)) {
    verifyCalibrationInputCorpus(JSON.parse(readFileSync(target, "utf8")));
    state = "VERIFIED_EXISTING";
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(expected, null, 2)}\n`, { flag: "wx" });
  }
  process.stdout.write(`G4-V3 CALIBRATION INPUT FREEZE: ${state}\n\n`);
  process.stdout.write(`Worlds: ${expected.construction.worldCount}\n`);
  process.stdout.write(`Trials: ${expected.construction.trialCount}\n`);
  process.stdout.write(`Prior history: 0=${expected.construction.priorHistoryDistribution.zeroPriorEpisodes} 1=${expected.construction.priorHistoryDistribution.onePriorEpisode} 2=${expected.construction.priorHistoryDistribution.twoPriorEpisodes}\n`);
  process.stdout.write(`EventStructurePool: ${expected.authority.eventStructurePoolDigest}\n`);
  process.stdout.write(`Corpus: ${expected.corpusDigest}\n`);
  process.stdout.write(`Path: ${CALIBRATION_INPUT_FREEZE_PATH}\n\n`);
  process.stdout.write("No provider call was made.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { writeOrVerify(); }
  catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
