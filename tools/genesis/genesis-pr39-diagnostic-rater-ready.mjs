// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: harden prepared PR39 diagnostic material before any blind-rater call
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
import { assertPr39SavedClosureCandidate } from "./genesis-pr39-closure-resume-integrity.mjs";

const SOURCE_VERSION = "diagnostics-v1";
const OUTPUT_VERSION = "diagnostics-rater-ready-v1";
const MATERIAL_VERSION = "pr39-diagnostic-rater-ready-v1";

function fail(message) { throw new Error(message); }
function absolute(path) { return fileURLToPath(repoFile(path)); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function pad(value) { return String(value).padStart(2, "0"); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
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
function containsInsensitive(text, term) {
  if (typeof term !== "string" || term.trim() === "") return false;
  return new RegExp(escapeRegex(term), "iu").test(String(text ?? ""));
}
function removeInsensitive(text, term) {
  if (typeof term !== "string" || term.trim() === "") return text;
  return String(text ?? "").replace(new RegExp(escapeRegex(term), "giu"), "");
}
function cleanupRemovedText(input) {
  return String(input ?? "")
    .replace(/[ \t]+([,.;:!?])/gu, "$1")
    .replace(/([([])[ \t]+/gu, "$1")
    .replace(/[ \t]+([)\]])/gu, "$1")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/\n[ \t]+/gu, "\n")
    .trim();
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

function namedEntityTerms(slotPlan) {
  const world = slotPlan.worldSpec;
  const terms = new Set([slotPlan.label, ...(world.languages ?? [])]);
  const heading = typeof world.culturalContext === "string" ? world.culturalContext.split(" — ")[0] : "";
  const headingParts = heading.split(",").map((item) => item.trim()).filter(Boolean);
  if (headingParts.length > 0) terms.add(headingParts[0]);
  if (headingParts.length > 1) terms.add(headingParts.at(-1));
  for (const institution of world.availableInstitutions ?? []) {
    if (typeof institution !== "string" || institution.trim() === "") continue;
    terms.add(institution);
    terms.add(institution.replaceAll("_", " "));
  }
  return [...terms].filter(Boolean).sort((left, right) => right.length - left.length);
}

function normalizedRedactor(slotPlan) {
  const terms = namedEntityTerms(slotPlan);
  return (input) => {
    let text = String(input ?? "");
    for (const term of terms) text = removeInsensitive(text, term);
    text = text.replace(/\b(?:thr|person|world|place|genesis|genome|gepv\d*|evt|mem|mpart|isrc)_[A-Za-z0-9_.:-]+\b/giu, "");
    return cleanupRemovedText(text);
  };
}

function participantRoles(candidate) {
  const byRef = new Map([[candidate.threadId, ["subject"]]]);
  for (const person of candidate.lifeContinuity?.people ?? []) {
    if (!Array.isArray(person.roleRefs) || person.roleRefs.length === 0) fail(`candidate ${candidate.slot} continuity person lacks roleRefs`);
    byRef.set(person.participantId, [...person.roleRefs]);
  }
  return byRef;
}

function placeKinds(worldSlot) {
  return new Map((worldSlot.placeAffordances ?? []).map((item) => [item.placeRef, item.placeKind]));
}

function renderHistory(candidate, slotPlan, worldSlot, { redact = (value) => value } = {}) {
  const roles = participantRoles(candidate);
  const kinds = placeKinds(worldSlot);
  return candidate.episodes.map((episode, index) => {
    const kind = kinds.get(episode.placeRef);
    if (typeof kind !== "string" || kind === "") fail(`D1 slot ${slotPlan.slot} episode ${index + 1} lacks generic place kind`);
    const participants = (episode.participantRefs ?? []).map((ref) => {
      const roleRefs = roles.get(ref);
      if (!Array.isArray(roleRefs) || roleRefs.length === 0) fail(`D1 slot ${slotPlan.slot} episode ${index + 1} has participant without role authority`);
      return { roles: [...roleRefs] };
    });
    return {
      episode: index + 1,
      age: formatAge(episode.ageAtEvent),
      placeKind: kind,
      participants,
      text: redact(episode.observableAction),
    };
  });
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

function loadCompletedCohort(frozen) {
  const stateRoot = absolute(".fibre/genesis/pr39-closure");
  const claim = readPr39ClosureAttempt({ stateRoot });
  const completion = readPr39ClosureCompletion({ stateRoot });
  if (claim === null || completion === null || completion.status !== "COMPLETED_ONE_PASS_CLOSURE_COHORT") {
    fail("PR39 rater-ready material requires the completed one-pass closure cohort");
  }
  const outputRoot = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}`;
  const candidates = new Map();
  for (const slot of frozen.plans.slots) {
    const path = `${outputRoot}/slot-${pad(slot.slot)}-candidate-v1.json`;
    if (!existsSync(absolute(path))) fail(`missing completed PR39 candidate ${path}`);
    const candidate = assertPr39SavedClosureCandidate({ candidate: readJson(path), slotPlan: slot, claim });
    if (candidate.candidateDigest !== completion.candidateDigests[slot.slot - 1]) fail(`completed candidate digest drift at slot ${slot.slot}`);
    candidates.set(slot.slot, candidate);
  }
  return { stateRoot, claim, completion, outputRoot, candidates };
}

function verifyPreparedSource(outputRoot) {
  const root = `${outputRoot}/${SOURCE_VERSION}`;
  const manifest = readJson(`${root}/manifest.json`);
  const rater = readJson(`${root}/rater-packets.json`);
  const privateKey = readJson(`${root}/private-answer-key.json`);
  const d4 = readJson(`${root}/d4-summary.json`);
  if (manifest.status !== "PREPARED_NO_RATER_CALLS" || manifest.providerCallsMade !== 0) fail("source diagnostic packets are not zero-call prepared evidence");
  if (manifest.raterPacketDigest !== digest(rater)) fail("source diagnostic rater packet digest drift");
  if (manifest.privateAnswerKeyDigest !== digest(privateKey)) fail("source diagnostic private key digest drift");
  if (manifest.d4Digest !== digest(d4)) fail("source D4 digest drift");
  return { root, manifest, rater, privateKey, d4 };
}

function buildD1(frozen, candidates) {
  const rawTargets = [];
  const normalizedTargets = [];
  const rawChoices = [];
  const normalizedChoices = [];
  const targetSlots = [];
  const choiceSlots = [];
  for (const slotPlan of frozen.plans.slots) {
    const candidate = candidates.get(slotPlan.slot);
    const worldSlot = frozen.plans.worldSet.slots[slotPlan.slot - 1];
    const redact = normalizedRedactor(slotPlan);
    rawTargets.push({ selfAccount: renderSelfAccount(candidate) });
    normalizedTargets.push({ selfAccount: renderSelfAccount(candidate, { redact }) });
    rawChoices.push({ history: renderHistory(candidate, slotPlan, worldSlot) });
    normalizedChoices.push({ history: renderHistory(candidate, slotPlan, worldSlot, { redact }) });
    targetSlots.push(slotPlan.slot);
    choiceSlots.push(slotPlan.slot);
  }
  return {
    material: {
      raw: { targets: rawTargets, choices: rawChoices },
      normalized: { targets: normalizedTargets, choices: normalizedChoices },
    },
    private: {
      targetSlots,
      choiceSlots,
      correctChoiceIndexByTargetIndex: targetSlots.map((slot) => choiceSlots.indexOf(slot)),
    },
  };
}

function stripD2(source, sourcePrivate) {
  return {
    material: {
      threads: source.packets.map((packet) => ({
        citedEpisodes: packet.citedEpisodes.map((item) => ({ age: item.age, text: item.text })),
        currentMeanings: packet.currentMeanings.map((item) => ({ text: item.text })),
      })),
    },
    private: {
      threads: sourcePrivate.threads.map((thread) => ({
        slot: thread.slot,
        eventItems: thread.eventItems,
        meaningItems: thread.meaningItems,
        pairs: thread.pairs,
      })),
    },
  };
}

function stripD3(source, sourcePrivate, frozen) {
  return {
    material: {
      genomeChoices: source.genomeChoices.map((choice) => ({ semanticProjection: choice.semanticProjection })),
      calibrationTargets: source.calibrationTargets.map((target) => ({ visibleLoci: target.visibleLoci })),
      memoryTargets: source.memoryTargets.map((target) => ({ rememberedContent: target.rememberedContent })),
    },
    private: {
      genomeChoiceSlots: frozen.plans.slots.map((slot) => slot.slot),
      answerKey: sourcePrivate.answerKey,
    },
  };
}

function stripD5(source, sourcePrivate) {
  return {
    material: {
      threads: source.packets.map((packet) => ({
        history: packet.history.map((item) => ({ episodeLabel: item.episodeLabel, age: item.age, text: item.text })),
        currentMeanings: packet.currentMeanings.map((item) => ({ meaningLabel: item.meaningLabel, text: item.text })),
      })),
    },
    private: { threads: sourcePrivate.threads.map((thread) => ({ slot: thread.slot })) },
  };
}

function walk(value, visitor, path = "$") {
  visitor(value, path);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visitor, `${path}[${index}]`));
  else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walk(item, visitor, `${path}.${key}`);
  }
}

function assertNoBlindLeak(material) {
  const forbiddenKeys = new Set([
    "closureId", "finalizationDigest", "candidateDigests", "targetId", "lifeId", "genomeId", "threadPacketId", "itemId", "slot",
  ]);
  const fibreId = /\b(?:thr|person|world|place|genesis|genome|gepv\d*|evt|mem|mpart|isrc)_[A-Za-z0-9_.:-]+\b/iu;
  const shaDigest = /sha256:[0-9a-f]{64}/iu;
  walk(material, (value, path) => {
    if (typeof value === "string" && (fibreId.test(value) || shaDigest.test(value))) fail(`blind material leaks Fibre/build identifier at ${path}`);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const key of Object.keys(value)) if (forbiddenKeys.has(key)) fail(`blind material leaks private field ${key} at ${path}`);
    }
  });
}

function assertNormalizedD1NamesRemoved(d1, frozen) {
  for (let index = 0; index < frozen.plans.slots.length; index += 1) {
    const slotPlan = frozen.plans.slots[index];
    const terms = namedEntityTerms(slotPlan);
    const targetText = canonicalJson(d1.normalized.targets[index]);
    const choiceText = canonicalJson(d1.normalized.choices[index]);
    for (const term of terms) {
      if (containsInsensitive(targetText, term) || containsInsensitive(choiceText, term)) {
        fail(`normalized D1 slot ${slotPlan.slot} still contains forbidden named entity ${term}`);
      }
    }
  }
}

function parseArgs(argv) {
  if (argv.length !== 1 || argv[0] !== "--prepare") fail("PR39 rater-ready preparation requires explicit --prepare");
}

parseArgs(process.argv.slice(2));
const frozen = loadPr39ClosureFinalization();
const completed = loadCompletedCohort(frozen);
const source = verifyPreparedSource(completed.outputRoot);
const d1 = buildD1(frozen, completed.candidates);
const d2 = stripD2(source.rater.D2, source.privateKey.D2);
const d3 = stripD3(source.rater.D3, source.privateKey.D3, frozen);
const d5 = stripD5(source.rater.D5, source.privateKey.D5);

const material = {
  version: MATERIAL_VERSION,
  D1: d1.material,
  D2: d2.material,
  D3: d3.material,
  D5: d5.material,
};
const privateKey = {
  version: MATERIAL_VERSION,
  closureId: frozen.finalization.closureId,
  finalizationDigest: frozen.finalizationDigest,
  candidateDigests: [...completed.completion.candidateDigests],
  sourcePreparedManifestDigest: digest(source.manifest),
  D1: d1.private,
  D2: d2.private,
  D3: d3.private,
  D5: d5.private,
};

assertNoBlindLeak(material);
assertNormalizedD1NamesRemoved(material.D1, frozen);

const root = `${completed.outputRoot}/${OUTPUT_VERSION}`;
const manifestPath = `${root}/manifest.json`;
if (existsSync(absolute(manifestPath))) fail(`PR39 rater-ready material already exists at ${root}; do not overwrite frozen material`);
const manifest = {
  version: MATERIAL_VERSION,
  status: "RATER_READY_NO_CALLS",
  closureId: frozen.finalization.closureId,
  finalizationDigest: frozen.finalizationDigest,
  candidateDigests: [...completed.completion.candidateDigests],
  sourcePreparedVersion: SOURCE_VERSION,
  sourcePreparedManifestDigest: digest(source.manifest),
  raterMaterialDigest: digest(material),
  privateKeyDigest: digest(privateKey),
  d4Digest: digest(source.d4),
  blindMaterialAssertions: {
    noFibreIds: true,
    noBuildDigests: true,
    noStableAnswerIds: true,
    normalizedD1DeclaredNamedEntitiesRemoved: true,
    normalizedD1VisibleRedactionMarksInserted: false,
    genericPlaceKindsIncluded: true,
    genericParticipantRolesIncluded: true,
  },
  providerCallsMade: 0,
};
writeJson(`${root}/rater-material.json`, material);
writeJson(`${root}/private-key.json`, privateKey);
writeJson(`${root}/d4-summary.json`, source.d4);
writeJson(manifestPath, manifest);

console.log("PR39 DIAGNOSTIC RATER MATERIAL: READY");
console.log(`Closure: ${manifest.closureId}`);
console.log(`Source prepared packets: ${SOURCE_VERSION} · zero calls`);
console.log(`Rater material digest: ${manifest.raterMaterialDigest}`);
console.log("D1 normalized: declared names removed · generic place/participant roles retained · no visible redaction markers inserted");
console.log("Blind material: no Fibre IDs · no build digests · no stable answer IDs");
console.log(`D4 preserved: overplot ${source.d4.cohort.overplotConcernTriggered ? "TRIGGERED" : "not triggered"} · reinterpretation revised ${source.d4.cohort.totalReinterpretationRevised}/${source.d4.cohort.totalReinterpretationRuns}`);
console.log("Provider calls made: 0");
console.log(`Output: ${root}`);
