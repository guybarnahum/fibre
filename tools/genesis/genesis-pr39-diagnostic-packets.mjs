// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: prepare deterministic blind-rater packets for the completed fixed PR39 cohort
// fibre-tool-disposition: retire after PR39; retain summarized diagnostic results in milestone history

import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import {
  readPr39ClosureAttempt,
  readPr39ClosureCompletion,
} from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";
import {
  assertPr39SavedClosureCandidate,
} from "./genesis-pr39-closure-resume-integrity.mjs";

const EXECUTION_PATH = "fixtures/genesis/pr39/diagnostic-execution-v1.json";
const PACKET_VERSION = "pr39-diagnostic-packets-v1";
const OUTPUT_VERSION = "diagnostics-v1";

function fail(message) { throw new Error(message); }
function absolute(path) { return fileURLToPath(repoFile(path)); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function pad(value) { return String(value).padStart(2, "0"); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function opaque(prefix, seed) { return `${prefix}_${sha256(seed).slice(0, 16)}`; }
function removeIfPresent(path) {
  try { unlinkSync(path); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
function writeJson(path, value) {
  const target = absolute(path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${target}.${randomUUID()}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temp, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temp, target);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    removeIfPresent(temp);
  }
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
function replaceAllInsensitive(text, term, replacement) {
  if (typeof term !== "string" || term.trim() === "") return text;
  return text.replace(new RegExp(escapeRegex(term), "giu"), replacement);
}
function formatAge(value) {
  if (!Number.isFinite(value)) return "unknown";
  return Number(value.toFixed(2)).toString();
}
function textOfMeaning(meaning) {
  if (meaning === null || typeof meaning !== "object") return null;
  const parts = Array.isArray(meaning.parts) ? meaning.parts.map((item) => item.meaning).filter(Boolean) : [];
  return [meaning.summary, ...parts].filter(Boolean).join("\n");
}

function geographyNames(slotPlan) {
  const world = slotPlan.worldSpec;
  const names = {
    city: new Set([slotPlan.label]),
    country: new Set(),
    language: new Set(world.languages ?? []),
    institution: new Set(),
  };
  const contextHeading = typeof world.culturalContext === "string"
    ? world.culturalContext.split(" — ")[0]
    : "";
  const headingParts = contextHeading.split(",").map((item) => item.trim()).filter(Boolean);
  if (headingParts.length > 0) names.city.add(headingParts[0]);
  if (headingParts.length > 1) names.country.add(headingParts.at(-1));
  for (const institution of world.availableInstitutions ?? []) {
    if (typeof institution !== "string" || institution.trim() === "") continue;
    names.institution.add(institution);
    names.institution.add(institution.replaceAll("_", " "));
  }
  return names;
}

function normalizedRedactor(slotPlan) {
  const names = geographyNames(slotPlan);
  const replacements = [
    ...[...names.institution].map((term) => [term, "the institution"]),
    ...[...names.language].map((term) => [term, "the language"]),
    ...[...names.country].map((term) => [term, "the country"]),
    ...[...names.city].map((term) => [term, "the city"]),
  ].sort((left, right) => right[0].length - left[0].length);

  return (input) => {
    let text = String(input ?? "");
    for (const [term, replacement] of replacements) {
      text = replaceAllInsensitive(text, term, replacement);
    }
    // Rater packets never intentionally render Fibre IDs, but fail safe if an
    // identifier reaches prose through a generated response.
    text = text.replace(/\b(?:thr|person|world|place|genesis|genome|gepv\d*|evt|mem|mpart|isrc)_[A-Za-z0-9_.:-]+\b/giu, "the reference");
    return text;
  };
}

function renderHistory(candidate, { redact = (value) => value } = {}) {
  return candidate.episodes.map((episode, index) => ({
    episode: index + 1,
    age: formatAge(episode.ageAtEvent),
    text: redact(episode.observableAction),
  }));
}

function renderSelfAccount(candidate, { redact = (value) => value } = {}) {
  return candidate.memories.map((memory, index) => ({
    memory: index + 1,
    ageAtFormation: formatAge(memory.ageAtInitialMeaning),
    remembered: redact(memory.rememberedContent),
    uncertainty: (memory.uncertainty ?? []).map(redact),
    currentMeaning: redact(textOfMeaning(memory.currentMeaning)),
  }));
}

function buildOpaqueMaps(closureId, slots) {
  const targetBySlot = new Map();
  const lifeBySlot = new Map();
  const genomeBySlot = new Map();
  for (const slot of slots) {
    targetBySlot.set(slot.slot, opaque("target", `${closureId}:d1-target:${slot.slot}`));
    lifeBySlot.set(slot.slot, opaque("life", `${closureId}:d1-life:${slot.slot}`));
    genomeBySlot.set(slot.slot, opaque("genome", `${closureId}:d3-genome:${slot.slot}`));
  }
  return { targetBySlot, lifeBySlot, genomeBySlot };
}

function buildD1({ closureId, slots, candidates, maps }) {
  const rawChoices = [];
  const normalizedChoices = [];
  const rawTargets = [];
  const normalizedTargets = [];
  const answerKey = [];

  for (const slot of slots) {
    const candidate = candidates.get(slot.slot);
    const redact = normalizedRedactor(slot);
    const targetId = maps.targetBySlot.get(slot.slot);
    const lifeId = maps.lifeBySlot.get(slot.slot);
    rawChoices.push({ lifeId, history: renderHistory(candidate) });
    normalizedChoices.push({ lifeId, history: renderHistory(candidate, { redact }) });
    rawTargets.push({ targetId, selfAccount: renderSelfAccount(candidate) });
    normalizedTargets.push({ targetId, selfAccount: renderSelfAccount(candidate, { redact }) });
    answerKey.push({ targetId, lifeId, slot: slot.slot });
  }

  return {
    rater: {
      raw: { diagnostic: "D1", condition: "raw", targets: rawTargets, choices: rawChoices },
      normalized: { diagnostic: "D1", condition: "setting_style_normalized", targets: normalizedTargets, choices: normalizedChoices },
    },
    private: { diagnostic: "D1", closureId, answerKey },
  };
}

function uniqueCitedEpisodes(candidate) {
  const byId = new Map(candidate.episodes.map((episode) => [episode.episodeId, episode]));
  const refs = new Set(candidate.memories.flatMap((memory) => memory.passBEpisodeRefs ?? []));
  return [...refs].map((ref) => {
    const episode = byId.get(ref);
    if (!episode) fail(`D2/D4 cited unknown history episode ${ref}`);
    return episode;
  }).sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
}

function buildD2({ closureId, slots, candidates }) {
  const packets = [];
  const privateMap = [];
  for (const slot of slots) {
    const candidate = candidates.get(slot.slot);
    const threadPacketId = opaque("d2", `${closureId}:d2:${slot.slot}`);
    const citedEpisodes = uniqueCitedEpisodes(candidate).map((episode, index) => ({
      itemId: opaque("event", `${closureId}:d2:${slot.slot}:event:${episode.episodeId}`),
      age: formatAge(episode.ageAtEvent),
      text: episode.observableAction,
      displayOrder: index + 1,
    }));
    const meanings = candidate.memories.map((memory, index) => ({
      itemId: opaque("meaning", `${closureId}:d2:${slot.slot}:meaning:${memory.memoryRef}`),
      text: textOfMeaning(memory.currentMeaning),
      displayOrder: index + 1,
    }));
    packets.push({ threadPacketId, citedEpisodes, currentMeanings: meanings });
    privateMap.push({
      threadPacketId,
      slot: slot.slot,
      eventItems: citedEpisodes.map((item) => ({
        itemId: item.itemId,
        episodeId: candidate.episodes.find((episode) =>
          opaque("event", `${closureId}:d2:${slot.slot}:event:${episode.episodeId}`) === item.itemId)?.episodeId,
      })),
      meaningItems: meanings.map((item, index) => ({ itemId: item.itemId, memoryRef: candidate.memories[index].memoryRef })),
      pairs: candidate.memories.map((memory) => ({
        meaningItemId: opaque("meaning", `${closureId}:d2:${slot.slot}:meaning:${memory.memoryRef}`),
        citedEventItemIds: (memory.passBEpisodeRefs ?? []).map((ref) => opaque("event", `${closureId}:d2:${slot.slot}:event:${ref}`)),
      })),
    });
  }
  return {
    rater: { diagnostic: "D2", packets },
    private: { diagnostic: "D2", closureId, threads: privateMap },
  };
}

function genomeProjection(slotPlan) {
  return slotPlan.genome.loci.map((locus, index) => ({ locus: index + 1, value: locus.value }));
}

function calibrationSelection(closureId, slotPlan) {
  return slotPlan.genome.loci
    .map((locus, index) => ({
      locus,
      rank: sha256(`${closureId}:d3-calibration:${slotPlan.slot}:${index + 1}`),
    }))
    .sort((left, right) => left.rank.localeCompare(right.rank))
    .slice(0, 3)
    .sort((left, right) => left.locus.ordinal - right.locus.ordinal)
    .map((item) => item.locus.value);
}

function buildD3({ closureId, slots, candidates, maps }) {
  const genomeChoices = slots.map((slot) => ({
    genomeId: maps.genomeBySlot.get(slot.slot),
    semanticProjection: genomeProjection(slot),
  }));
  const calibrationTargets = [];
  const memoryTargets = [];
  const answerKey = [];

  for (const slot of slots) {
    const genomeId = maps.genomeBySlot.get(slot.slot);
    const calibrationId = opaque("calibration", `${closureId}:d3-calibration-target:${slot.slot}`);
    calibrationTargets.push({
      targetId: calibrationId,
      visibleLoci: calibrationSelection(closureId, slot),
    });
    answerKey.push({ targetId: calibrationId, genomeId, slot: slot.slot, kind: "calibration" });

    const candidate = candidates.get(slot.slot);
    for (const passB of candidate.passB) {
      if (passB.output?.outcome !== "remembered") continue;
      const targetId = opaque("memory", `${closureId}:d3-memory:${slot.slot}:${passB.callOrdinal}`);
      memoryTargets.push({ targetId, rememberedContent: passB.output.rememberedContent });
      answerKey.push({
        targetId,
        genomeId,
        slot: slot.slot,
        callOrdinal: passB.callOrdinal,
        horizon: passB.horizon,
        cell: passB.input?.assignment?.analysisStratum ?? null,
        kind: "memory",
      });
    }
  }

  return {
    rater: {
      diagnostic: "D3",
      genomeChoices,
      calibrationTargets,
      memoryTargets,
    },
    private: { diagnostic: "D3", closureId, answerKey },
  };
}

function buildD4({ slots, candidates }) {
  const perThread = slots.map((slot) => {
    const candidate = candidates.get(slot.slot);
    const cited = new Set(candidate.memories.flatMap((memory) => memory.passBEpisodeRefs ?? []));
    const remembered = candidate.passB.filter((item) => item.output?.outcome === "remembered").length;
    const currentMeanings = candidate.memories.filter((memory) => memory.currentMeaning !== null).length;
    const eligible = candidate.reinterpretationSchedule.filter((item) => item.eligible === true).length;
    const runs = candidate.reinterpretationSchedule.filter((item) => item.run === true).length;
    const skipped = candidate.reinterpretationSchedule.filter((item) => item.skippedByCap === true).length;
    const revised = candidate.reinterpretationRuns.filter((item) => item.output?.outcome === "revised").length;
    const unchanged = candidate.reinterpretationRuns.filter((item) => item.output?.outcome === "unchanged").length;
    return {
      slot: slot.slot,
      label: slot.label,
      historicalEpisodeCount: candidate.episodes.length,
      rememberedMemoryCount: remembered,
      uniqueHistoryEpisodesCitedByMemory: cited.size,
      historyEpisodesNeverCitedByMemory: candidate.episodes.length - cited.size,
      notRememberedCallCount: candidate.passB.length - remembered,
      currentDurableMeaningCount: currentMeanings,
      rememberedMemoriesWithoutCurrentDurableMeaning: candidate.memories.filter((memory) => memory.currentMeaning === null).length,
      currentMeaningPartCount: candidate.memories.reduce((sum, memory) => sum + (memory.currentMeaning?.parts?.length ?? 0), 0),
      reinterpretationEligibleCount: eligible,
      reinterpretationRunCount: runs,
      reinterpretationSkippedByCapCount: skipped,
      reinterpretationRevisedCount: revised,
      reinterpretationUnchangedCount: unchanged,
    };
  });
  const saturatedThreads = perThread.filter((item) =>
    item.rememberedMemoryCount === 6 &&
    item.currentDurableMeaningCount === item.rememberedMemoryCount).length;
  return {
    diagnostic: "D4",
    perThread,
    cohort: {
      saturatedThreads,
      overplotConcernTriggered: saturatedThreads >= 4,
      totalRememberedMemories: perThread.reduce((sum, item) => sum + item.rememberedMemoryCount, 0),
      totalCurrentDurableMeanings: perThread.reduce((sum, item) => sum + item.currentDurableMeaningCount, 0),
      totalReinterpretationEligible: perThread.reduce((sum, item) => sum + item.reinterpretationEligibleCount, 0),
      totalReinterpretationRuns: perThread.reduce((sum, item) => sum + item.reinterpretationRunCount, 0),
      totalReinterpretationRevised: perThread.reduce((sum, item) => sum + item.reinterpretationRevisedCount, 0),
    },
  };
}

function buildD5({ closureId, slots, candidates }) {
  const packets = [];
  const privateMap = [];
  for (const slot of slots) {
    const candidate = candidates.get(slot.slot);
    const threadPacketId = opaque("d5", `${closureId}:d5:${slot.slot}`);
    const history = candidate.episodes.map((episode, index) => ({
      episodeLabel: `E${pad(index + 1)}`,
      age: formatAge(episode.ageAtEvent),
      text: episode.observableAction,
    }));
    const currentMeanings = candidate.memories.map((memory, index) => ({
      meaningLabel: `M${pad(index + 1)}`,
      text: textOfMeaning(memory.currentMeaning),
    }));
    packets.push({ threadPacketId, history, currentMeanings });
    privateMap.push({ threadPacketId, slot: slot.slot });
  }
  return {
    rater: { diagnostic: "D5", packets },
    private: { diagnostic: "D5", closureId, threads: privateMap },
  };
}

function assertExecution({ execution, frozen, completion }) {
  if (execution.executionVersion !== "pr39-diagnostic-execution-v1" || execution.status !== "FROZEN_BEFORE_RATER_CALLS") {
    fail("PR39 diagnostic execution clarification is not frozen for rater preparation");
  }
  if (execution.closureId !== frozen.finalization.closureId || execution.finalizationDigest !== frozen.finalizationDigest) {
    fail("PR39 diagnostic execution clarification does not match finalization");
  }
  if (canonicalJson(execution.candidateDigests) !== canonicalJson(completion.candidateDigests)) {
    fail("PR39 diagnostic execution candidate digest binding drift");
  }
}

function loadCompletedCohort({ frozen, execution }) {
  const stateRoot = absolute(".fibre/genesis/pr39-closure");
  const claim = readPr39ClosureAttempt({ stateRoot });
  const completion = readPr39ClosureCompletion({ stateRoot });
  if (claim === null || completion === null || completion.status !== "COMPLETED_ONE_PASS_CLOSURE_COHORT") {
    fail("PR39 diagnostic packets require the completed one-pass closure cohort");
  }
  assertExecution({ execution, frozen, completion });

  const outputRoot = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}`;
  const candidates = new Map();
  for (const slot of frozen.plans.slots) {
    const candidatePath = `${outputRoot}/slot-${pad(slot.slot)}-candidate-v1.json`;
    if (!existsSync(absolute(candidatePath))) fail(`PR39 diagnostic packets require ${candidatePath}`);
    const candidate = assertPr39SavedClosureCandidate({
      candidate: readJson(candidatePath),
      slotPlan: slot,
      claim,
    });
    if (candidate.candidateDigest !== completion.candidateDigests[slot.slot - 1]) {
      fail(`PR39 completed candidate digest drift at slot ${slot.slot}`);
    }
    candidates.set(slot.slot, candidate);
  }
  return { stateRoot, claim, completion, outputRoot, candidates };
}

function parseArgs(argv) {
  if (argv.length !== 1 || argv[0] !== "--prepare") fail("PR39 diagnostic packet preparation requires explicit --prepare");
}

parseArgs(process.argv.slice(2));
const frozen = loadPr39ClosureFinalization();
const execution = readJson(EXECUTION_PATH);
const completed = loadCompletedCohort({ frozen, execution });
const slots = frozen.plans.slots;
const maps = buildOpaqueMaps(frozen.finalization.closureId, slots);
const d1 = buildD1({ closureId: frozen.finalization.closureId, slots, candidates: completed.candidates, maps });
const d2 = buildD2({ closureId: frozen.finalization.closureId, slots, candidates: completed.candidates });
const d3 = buildD3({ closureId: frozen.finalization.closureId, slots, candidates: completed.candidates, maps });
const d4 = buildD4({ slots, candidates: completed.candidates });
const d5 = buildD5({ closureId: frozen.finalization.closureId, slots, candidates: completed.candidates });

const root = `${completed.outputRoot}/${OUTPUT_VERSION}`;
const manifestPath = `${root}/manifest.json`;
if (existsSync(absolute(manifestPath))) fail(`PR39 diagnostic packets already prepared at ${root}; do not overwrite frozen packets`);

const rater = {
  version: PACKET_VERSION,
  closureId: frozen.finalization.closureId,
  finalizationDigest: frozen.finalizationDigest,
  candidateDigests: [...completed.completion.candidateDigests],
  D1: d1.rater,
  D2: d2.rater,
  D3: d3.rater,
  D5: d5.rater,
};
const privateKey = {
  version: PACKET_VERSION,
  closureId: frozen.finalization.closureId,
  D1: d1.private,
  D2: d2.private,
  D3: d3.private,
  D5: d5.private,
};
const manifest = {
  version: PACKET_VERSION,
  status: "PREPARED_NO_RATER_CALLS",
  closureId: frozen.finalization.closureId,
  finalizationDigest: frozen.finalizationDigest,
  candidateDigests: [...completed.completion.candidateDigests],
  executionClarificationPath: EXECUTION_PATH,
  executionClarificationDigest: digest(execution),
  raterPacketDigest: digest(rater),
  privateAnswerKeyDigest: digest(privateKey),
  d4Digest: digest(d4),
  providerCallsMade: 0,
};

writeJson(`${root}/rater-packets.json`, rater);
writeJson(`${root}/private-answer-key.json`, privateKey);
writeJson(`${root}/d4-summary.json`, d4);
writeJson(manifestPath, manifest);

console.log("PR39 DIAGNOSTIC PACKETS: PREPARED");
console.log(`Closure: ${manifest.closureId}`);
console.log(`Candidates: ${manifest.candidateDigests.length} immutable`);
console.log(`D1: ${d1.rater.raw.targets.length} raw + ${d1.rater.normalized.targets.length} normalized targets · 5 choices each`);
console.log(`D2: ${d2.rater.packets.length} Thread packets`);
console.log(`D3: ${d3.rater.calibrationTargets.length} calibration + ${d3.rater.memoryTargets.length} remembered-memory targets`);
console.log(`D4: overplot concern ${d4.cohort.overplotConcernTriggered ? "TRIGGERED" : "not triggered"} · ${d4.cohort.saturatedThreads}/5 saturated Threads`);
console.log(`D4 reinterpretation: ${d4.cohort.totalReinterpretationRevised}/${d4.cohort.totalReinterpretationRuns} runs revised`);
console.log(`D5: ${d5.rater.packets.length} Thread packets`);
console.log("Provider calls made: 0");
console.log(`Output: ${root}`);
