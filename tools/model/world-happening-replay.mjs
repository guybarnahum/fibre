// Recorded World occasions asked again under the current world.happening
// prompt, before it is deployed (World events v3, Nov 27). The current prompt
// takes `lately`, what the World has already shown this person in the past
// day, which requests recorded under an earlier version lack; so the occasions
// are replayed in time order and each person's `lately` is built from the
// replayed answers, through the World's own `latelyShown`, and whether each
// happening comes is the World's own draw. Reports how often something happens
// in public and at home, and how likely the model judged it, against the
// true-to-life bands, what repeats what the person was already shown, and how
// the ambience reads.
// Measurement only: nothing here reaches a Thread or staging. Evidence is
// Thread-private and stays in .fibre/world-happening-replay/.
//
//   npm run world:happening-replay -- [--limit 80] [--model provider:model] [--evidence .fibre/infra-measure]
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { reasoningIntegrationFor, selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { parseModelSpec } from "../../infra/deployments/model-certifications.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { AMBIENCE, HAPPENING_SCHEMA, happeningOutcome, latelyShown } from "../../services/world-kernel/src/world-environment-opportunity.mjs";
import { costOf } from "./model-recorded-requests.mjs";
import { LIFE_BANDS } from "./model-quality-criteria.mjs";

const PROMPT = "world.happening";

// The recorded World occasions of the newest prompt version recorded (whose
// input carries the place facts the current prompt reads), once each, oldest first.
export async function recordedOccasions(directory) {
  const seen = new Set(), found = [];
  for (const name of (await readdir(directory)).filter((file) => file.endsWith(".json")).sort()) {
    const evidence = JSON.parse(await readFile(join(directory, name), "utf8"));
    for (const recorded of evidence.events ?? []) {
      if (recorded.event !== "model-capture" || String(recorded.prompt).split("@")[0] !== PROMPT) continue;
      const event = typeof recorded.capture === "string" ? { ...recorded, ...JSON.parse(recorded.capture) } : recorded;
      const { lately, ...input } = event.input ?? {};
      if (!input.occurrenceAt) continue;
      const key = createHash("sha256").update(JSON.stringify(input)).digest("hex");
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ prompt: event.prompt, input });
    }
  }
  const version = (item) => Number(String(item.prompt).split("@")[1]);
  const newest = Math.max(...found.map(version));
  return found.filter((item) => version(item) === newest)
    .sort((a, b) => Date.parse(a.input.occurrenceAt) - Date.parse(b.input.occurrenceAt));
}

// The person whose settling made the occasion.
const personOf = (input) => (input.potentialObservers ?? [])
  .find((item) => item.situationId === input.initiatingSituation?.situationId)?.threadId
  ?? input.potentialObservers?.[0]?.threadId ?? null;

// Replays occasions in time order. An occasion waits only for the earlier
// occasions of the people present, so each person's `lately` holds the
// happenings the replay has already shown them, as the World would.
export async function replayOccasions(occasions, ask, { onAnswered = () => {} } = {}) {
  const shown = new Map(), last = new Map();
  const experienceStore = { listEncounterStories: (threadId, { limit }) => (shown.get(threadId) ?? []).slice(0, limit) };
  return Promise.all(occasions.map((occasion) => {
    const people = [...new Set((occasion.input.potentialObservers ?? []).map((item) => item.threadId))];
    const before = people.map((id) => last.get(id)).filter(Boolean);
    const done = Promise.all(before).then(async () => {
      const person = personOf(occasion.input);
      const lately = person === null ? [] : latelyShown({ experienceStore, threadId: person, at: occasion.input.occurrenceAt });
      const input = { ...occasion.input, lately };
      const answer = await ask(input);
      const outcome = answer.output ? happeningOutcome(input, answer.output) : null;
      if (outcome === "changed" && answer.output.occurrenceText) {
        for (const id of answer.output.potentialObserverThreadIds ?? []) {
          shown.set(id, [{ occurredAt: input.occurrenceAt, story: { beats: [
            { kind: "occurrence", actorThreadId: null, text: answer.output.occurrenceText }] } }, ...(shown.get(id) ?? [])]);
        }
      }
      onAnswered();
      return { person, input, outcome, ...answer };
    });
    for (const id of people) last.set(id, done);
    return done;
  }));
}

// How far a happening says again what lately already showed: shared content
// words over the smaller of the two. A reading aid; the pairs are printed.
const WORDS = (text) => new Set(String(text).toLowerCase().match(/[a-zÀ-ɏ]{4,}/gu) ?? []);
export function overlap(a, b) {
  const x = WORDS(a), y = WORDS(b);
  if (x.size === 0 || y.size === 0) return 0;
  let shared = 0;
  for (const word of x) if (y.has(word)) shared += 1;
  return shared / Math.min(x.size, y.size);
}

function args(argv) {
  const options = { limit: 80, model: null, concurrency: 4, evidence: ".fibre/infra-measure" };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].split("=", 2), value = inline ?? argv[++index];
    if (name === "--limit") options.limit = Number(value);
    else if (name === "--model") options.model = value;
    else if (name === "--concurrency") options.concurrency = Number(value);
    else if (name === "--evidence") options.evidence = value;
    else throw new Error(`unknown option ${name}`);
  }
  return options;
}

async function main() {
  const options = args(process.argv.slice(2));
  const root = resolve(new URL("../..", import.meta.url).pathname);
  const manifest = await loadDeploymentManifest(join(root, "infra/deployments/environments/cloudflare.yaml"));
  const base = resolveServiceDeployment(manifest, "world-kernel").integrations.encounter;
  const spec = parseModelSpec(options.model ?? `${base.provider}:${base.config.model}`);
  const adapter = selectReasoningIntegration(reasoningIntegrationFor(spec.provider, spec.model,
    { ...(spec.provider === base.provider ? base.config : {}), ...spec.settings }), { environment: process.env });
  const prompt = promptFor(PROMPT);
  const occasions = (await recordedOccasions(resolve(root, options.evidence))).slice(-options.limit);
  if (occasions.length === 0) { console.log(`no recorded ${PROMPT} occasions in ${options.evidence}`); return; }
  const versions = [...new Set(occasions.map((item) => item.prompt))].join(", ");
  const span = (Date.parse(occasions.at(-1).input.occurrenceAt) - Date.parse(occasions[0].input.occurrenceAt)) / 3_600_000;
  console.log(`${PROMPT}@${prompt.version} · ${spec.label} · ${occasions.length} recorded occasions over ${span.toFixed(0)} h (recorded under ${versions})`);

  // The queue is ordered by time; each occasion waits for its people's earlier
  // ones, and at most `concurrency` model calls run at once.
  let running = 0, done = 0;
  const waiting = [];
  const slot = () => running < options.concurrency ? (running += 1, Promise.resolve())
    : new Promise((ready) => waiting.push(ready));
  const free = () => { const next = waiting.shift(); if (next) next(); else running -= 1; };
  const ask = async (input) => {
    await slot();
    try {
      const result = await adapter.invoke({ systemPrompt: prompt.text, input, responseSchema: HAPPENING_SCHEMA,
        clientRequestId: `happening-replay_${createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 24)}`,
        latency: "minutes" });
      return { output: result.output, cost: costOf(spec.model, result.provenance?.usage, result.provenance?.serviceTier) };
    } catch (error) { return { error: String(error?.message ?? error).slice(0, 200) }; } finally { free(); }
  };
  const answered = await replayOccasions(occasions, ask, { onAnswered: () =>
    console.log(JSON.stringify({ event: "world-happening-replay-progress", progress: `${++done}/${occasions.length}` })) });

  const ok = answered.filter((item) => item.output);
  const isPublic = (item) => Boolean(item.input.initiatingSituation?.physicalVenue);
  // What came, by the World's draw, and what the likelihoods expect: the
  // expectation is steadier over a few dozen occasions, so it decides.
  const rate = (items) => items.length === 0 ? null : items.filter((item) => item.outcome === "changed").length / items.length;
  const expected = (items) => items.length === 0 || !items.every((item) => Number.isFinite(item.output.likelihood)) ? null
    : items.reduce((sum, item) => sum + item.output.likelihood, 0) / items.length;
  const bands = LIFE_BANDS[PROMPT];
  const publicOnes = ok.filter(isPublic), homeOnes = ok.filter((item) => !isPublic(item));
  const rates = { "something happens, in a public place": { rate: rate(publicOnes), expected: expected(publicOnes), n: publicOnes.length },
    "something happens, elsewhere": { rate: rate(homeOnes), expected: expected(homeOnes), n: homeOnes.length } };
  const inBand = Object.entries(rates).map(([name, { rate: value, expected: likely }]) =>
    (likely ?? value) >= bands[name][0] && (likely ?? value) <= bands[name][1]);
  const repeats = ok.filter((item) => item.output.occurrenceText).flatMap((item) => item.input.lately
    .map((was) => ({ person: item.person, now: item.output.occurrenceText, was, overlap: overlap(item.output.occurrenceText, was) })))
    .sort((a, b) => b.overlap - a.overlap);
  const ambience = { public: {}, home: {} };
  for (const item of ok) {
    const side = ambience[isPublic(item) ? "public" : "home"];
    for (const key of Object.keys(AMBIENCE)) {
      side[key] ??= Object.fromEntries(AMBIENCE[key].map((value) => [value, 0]));
      const value = item.output.ambience?.[key];
      if (value in side[key]) side[key][value] += 1;
    }
  }
  const cost = ok.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const withLately = ok.filter((item) => item.input.lately.length > 0).length;

  const percent = (value) => value === null ? "—" : `${(value * 100).toFixed(0)}%`;
  console.log("");
  for (const [name, { rate: value, expected: likely, n }] of Object.entries(rates))
    console.log(`${name}: ${percent(value)} of ${n}${likely === null ? "" : `, likelihood ${percent(likely)} on average`} (true to life ${percent(bands[name][0])}–${percent(bands[name][1])})`);
  console.log(`${answered.length - ok.length} not answered${answered.length > ok.length ? `, e.g. ${answered.find((item) => item.error).error}` : ""}`);
  console.log(`occasions with something shown lately: ${withLately} of ${ok.length}; a happening written sharing most of its words with one shown lately: ${repeats.filter((item) => item.overlap >= 0.5).length}`);
  for (const item of repeats.slice(0, 3)) console.log(`  ${item.overlap.toFixed(2)} now "${item.now.slice(0, 110)}" · lately "${item.was.slice(0, 110)}"`);
  for (const [side, keys] of Object.entries(ambience)) {
    console.log(`ambience, ${side === "public" ? "public places" : "elsewhere"}:`);
    for (const [key, counts] of Object.entries(keys)) console.log(`  ${key}: ${Object.entries(counts).map(([value, n]) => `${value} ${n}`).join(", ")}`);
  }
  console.log(`cost about $${cost.toFixed(2)} at list price`);
  const judged = ok.length >= 0.9 * answered.length && publicOnes.length > 0 && homeOnes.length > 0;
  console.log(!judged ? `\ntoo few occasions answered in public and at home to judge: hold v${prompt.version} and send this output to Claude`
    : inBand.every(Boolean) ? `\nboth rates are true to life: v${prompt.version} may be deployed`
    : `\na rate is outside its true-to-life band: hold v${prompt.version} and send this output to Claude`);

  const out = join(root, ".fibre/world-happening-replay");
  await mkdir(out, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  await writeFile(join(out, `world-happening-replay-${stamp}.json`), JSON.stringify({ prompt: `${PROMPT}@${prompt.version}`,
    model: spec.label, occasions: occasions.length, rates, repeats, ambience, cost,
    answered: answered.map(({ person, input, outcome, output, error }) => ({ person, at: input.occurrenceAt,
      public: Boolean(input.initiatingSituation?.physicalVenue), lately: input.lately, outcome, output, error })) }, null, 2));
  console.log(`evidence: .fibre/world-happening-replay/world-happening-replay-${stamp}.json`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main().catch((error) => { console.error(error?.message ?? error); process.exitCode = 1; });
}
