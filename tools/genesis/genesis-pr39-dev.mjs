// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: iterative rich-childhood development runner
// fibre-tool-disposition: retire after PR39; keep the underlying Genesis compiler/runtime

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createBirthCenterRuntime } from "../../services/birth-center/src/runtime.mjs";
import { createOpenAIModelAdapter } from "../../services/world-kernel/src/model-runtime/openai.mjs";
import {
  buildReplacementV2ExecutionPlans,
} from "./genesis-replacement-v2-plan.mjs";
import {
  generateReplacementThreadCandidate,
} from "./genesis-replacement-candidate.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const DEFAULT_MODEL = "gpt-5.1-2025-11-13";

function fail(message) { throw new Error(message); }
function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function writeJson(path, value) {
  const target = absolute(path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}
function pad(value) { return String(value).padStart(2, "0"); }
function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}
function safeLabel(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._-]+$/u.test(value)) fail("--run must contain only letters, numbers, dot, underscore or dash");
  return value;
}

function parseArgs(argv) {
  let all = false;
  let slot = 1;
  let run = null;
  let model = DEFAULT_MODEL;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") all = true;
    else if (arg === "--slot") slot = Number(argv[++index]);
    else if (arg === "--run") run = safeLabel(argv[++index]);
    else if (arg === "--model") model = argv[++index];
    else fail(`unknown argument ${arg}`);
  }
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) fail("--slot must be an integer from 1 to 5");
  if (typeof model !== "string" || model.trim() === "") fail("--model is required");
  return { all, slot, run, model: model.trim() };
}

function progressLabel(clientRequestId) {
  const slot = clientRequestId.match(/:slot-(\d+):/u)?.[1] ?? "?";
  const passA = clientRequestId.match(/:pass-a:episode-(\d+):(initial|form-repair-(\d+)|record-retry-(\d+))$/u);
  if (passA) {
    const episode = Number(passA[1]);
    if (passA[2] === "initial") return `Thread ${Number(slot)} · history ${pad(episode)}/14 · realize episode`;
    if (passA[3]) return `Thread ${Number(slot)} · history ${pad(episode)}/14 · form repair ${passA[3]}/2`;
    return `Thread ${Number(slot)} · history ${pad(episode)}/14 · fresh record retry ${passA[4]}/2`;
  }
  const passB = clientRequestId.match(/:pass-b:call-(\d+)$/u);
  if (passB) return `Thread ${Number(slot)} · memory formation ${Number(passB[1])}/6`;
  const passCInitial = clientRequestId.match(/:pass-c:initial-(\d+)$/u);
  if (passCInitial) return `Thread ${Number(slot)} · meaning formation for memory call ${Number(passCInitial[1])}/6`;
  if (/:pass-c:reinterpret:/u.test(clientRequestId)) return `Thread ${Number(slot)} · later memory reinterpretation`;
  return clientRequestId;
}

function summarizeCandidate(candidate) {
  const places = new Set(candidate.episodes.map((episode) => episode.placeRef));
  const participants = new Set(candidate.episodes.flatMap((episode) => episode.participantRefs ?? []));
  const meanings = candidate.memories.filter((memory) => memory.currentMeaning !== null);
  console.log(`\nTHREAD ${candidate.slot} · ${candidate.threadId}`);
  console.log(`${candidate.episodes.length} episodes · ${places.size} places · ${participants.size} people in episode history · ${candidate.memories.length} memories · ${meanings.length} current meanings`);
  console.log("\nLife episodes");
  for (const record of candidate.passA) {
    const episode = record.episode;
    const age = Number.isFinite(episode.ageAtEvent) ? episode.ageAtEvent.toFixed(2) : "?";
    console.log(`${String(record.ordinal).padStart(2, "0")}. age ${age} · ${episode.placeRef} · ${episode.observableAction}`);
  }
  console.log("\nRemembered life");
  if (candidate.memories.length === 0) console.log("(no durable memories formed in this run)");
  for (const memory of candidate.memories) {
    console.log(`- ${memory.rememberedContent}`);
    if (memory.currentMeaning?.summary) console.log(`  meaning: ${memory.currentMeaning.summary}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const head = gitHead();
const runLabel = options.run ?? head.slice(0, 12);
const outputRoot = `.fibre/genesis/pr39-dev/${runLabel}`;
const manifestPath = `${outputRoot}/run-v1.json`;
const plans = buildReplacementV2ExecutionPlans();
const selected = options.all ? plans.slots : [plans.slots[options.slot - 1]];

let manifest;
if (existsSync(absolute(manifestPath))) {
  manifest = readJson(manifestPath);
  if (manifest.codeHead !== head) fail(`development run ${runLabel} belongs to code head ${manifest.codeHead}; choose a new --run label`);
  if (manifest.modelId !== options.model) fail(`development run ${runLabel} belongs to model ${manifest.modelId}; choose a new --run label`);
} else {
  manifest = {
    version: "pr39-rich-childhood-development-run-v1",
    status: "DEVELOPMENT_ONLY_NOT_PUBLICATION_AUTHORITY",
    runLabel,
    codeHead: head,
    modelId: options.model,
    startedAt: new Date().toISOString(),
    slots: selected.map((item) => item.slot),
    publicationAuthorized: false,
  };
  writeJson(manifestPath, manifest);
}

let committed = 0;
let replayed = 0;
const observer = (event) => {
  if (event.type === "durable_model_commit") {
    committed += 1;
    console.log(`   ✓ new durable result · ${progressLabel(event.clientRequestId)}`);
  } else if (event.type === "durable_model_replay") {
    replayed += 1;
    console.log(`   ↻ replayed durable result · ${progressLabel(event.clientRequestId)}`);
  }
};

const baseAdapter = createOpenAIModelAdapter({
  environment: process.env,
  modelId: options.model,
  observer,
});
const birthCenter = createBirthCenterRuntime({ stateRoot: absolute(`${outputRoot}/runtime`) });
const durableAdapter = birthCenter.durableAdapter(baseAdapter, { observer });
const adapter = Object.freeze({
  provider: durableAdapter.provider,
  modelId: durableAdapter.modelId,
  configuration: structuredClone(durableAdapter.configuration),
  async invoke(args) {
    console.log(`→ ${progressLabel(args.clientRequestId)}`);
    return durableAdapter.invoke(args);
  },
});

console.log("PR39 RICH CHILDHOOD DEVELOPMENT RUN");
console.log(`run: ${runLabel}`);
console.log(`code: ${head}`);
console.log(`model: ${options.model}`);
console.log(`slots: ${selected.map((item) => item.slot).join(", ")}`);
console.log("publication: disabled");
console.log("progress: → starting call · ✓ new durable result · ↻ replayed durable result\n");

for (const slotPlan of selected) {
  const candidatePath = `${outputRoot}/slot-${pad(slotPlan.slot)}-candidate-v1.json`;
  let candidate;
  if (existsSync(absolute(candidatePath))) {
    candidate = readJson(candidatePath);
    console.log(`Thread ${slotPlan.slot}: using completed development candidate`);
  } else {
    console.log(`Thread ${slotPlan.slot}: generating 14 life episodes, then memories and meanings`);
    candidate = await generateReplacementThreadCandidate({
      slotPlan,
      adapter,
      repairAdapter: adapter,
      attemptStartedAt: manifest.startedAt,
    });
    writeJson(candidatePath, candidate);
    console.log(`Thread ${slotPlan.slot}: candidate completed → ${candidatePath}`);
  }
  summarizeCandidate(candidate);
}

console.log(`\nmodel calls this process: ${committed} new · ${replayed} replayed`);
console.log(`development output: ${outputRoot}`);
console.log("No Thread was published. Review the life first; use --all only when one Thread looks convincing.");
