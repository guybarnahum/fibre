// What a good answer is, measured on recorded requests of one cognitive job
// for each candidate model — the standard accepted by Guy on November 24,
// 2026 (docs/validation/model-certification.md): a model is good enough for a
// job when the Threads would be at least as true to life with it as they are
// now. Each candidate is compared with the reference, the model the job runs
// on now (--reference to name another), whose own answers are measured the
// same way; no judge reads its own model's answers.
//
//   npm run model:quality -- --prompt encounter.attention --models openai:gpt-5.6-terra,google:gemini-3.6-flash
//
// Answers and verdicts are cached, so a re-run pays only for what is new.
// --fresh <model,...> asks those models again (after their adapter changed);
// the new answers replace the cached ones.
// Evidence (Thread-private; never committed) goes to .fibre/model-quality/,
// including review-<prompt>-<stamp>.json for the admin Model Quality page.
// Verdicts saved from that page (verdicts-<review>.json, put back in the same
// folder) are compared with the judges at the start of every run;
// --agreement prints only that comparison.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { reasoningIntegrationFor, selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { captures, costOf, mean, pool } from "./model-recorded-requests.mjs";
import { CERTIFICATIONS_PATH, EMPTY_CERTIFICATIONS, cognitionSettings, parseModelSpec, recordCertifications } from "../../infra/deployments/model-certifications.mjs";
import { judgesFor } from "./model-judges.mjs";
import { bodyLineup, bodyOf, dayAlarms, decision, defectText, goodEnough, interval, jobOf, lineup, modelCaused, otherBody,
  perturbed, ratesOf, scopeOf, scoringJudges, SHOWN_WITHOUT_ANSWER, steadyDecision, withBody, withoutBody } from "./model-quality-criteria.mjs";
import { centroid, closenessToOthers, meaningOf } from "../ops/thread-chain.mjs";
import { createCloudflareEmbeddingAdapter } from "../../integrations/ai/embedding/cloudflare.mjs";
import { agreement, readReview, readVerdicts, REVIEW_KIND, testReading } from "../../apps/admin-dashboard/model-quality-review.mjs";

const MIN_CASES = 30;
const CANDIDATE_OUTPUT_TOKENS = 8000;
const REVIEW_ANSWERS = 30;
// What the owner is asked of each answer in a blind review, as the judges are.
const THIS_PERSON = "True to this person, now: would a careful reader believe that a real person with this history, these feelings and this situation answered this way? Not whether it is well written.";

function args(argv) {
  const options = { prompt: null, models: [], judges: ["claude-opus-5-5", "gpt-5.6-sol"], reference: null,
    limit: 200, concurrency: 4, evidence: ".fibre/infra-measure", agreementOnly: false, fresh: [], allJudges: false };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].split("=", 2);
    if (name === "--agreement") { options.agreementOnly = true; continue; }
    if (name === "--all-judges") { options.allJudges = true; continue; }
    const value = inline ?? argv[++index];
    if (name === "--prompt") options.prompt = value;
    else if (name === "--models") options.models = value.split(",");
    else if (name === "--reference") options.reference = value;
    else if (name === "--judges") options.judges = value.split(",");
    else if (name === "--fresh") options.fresh = value.split(",");
    else if (name === "--limit") options.limit = Number(value);
    else if (name === "--concurrency") options.concurrency = Number(value);
    else if (name === "--evidence") options.evidence = value;
    else throw new Error(`unknown option ${name}`);
  }
  if (!options.prompt || jobOf(options.prompt) === null) {
    throw new Error("usage: model:quality -- --prompt <job> [--models openai:<model>,google:<model>,cloudflare:<@cf model>] [--reference <model>] [--judges claude-opus-5-5,gpt-5.6-sol] [--fresh <model,...>]");
  }
  return options;
}

// A candidate is a model at its settings; its label (model+settings) names it throughout the run.
function candidate(spec) {
  const parsed = parseModelSpec(spec);
  return { provider: parsed.provider, model: parsed.label, modelId: parsed.model, settings: parsed.settings };
}

// The model the job runs on now: its own route, or the port's default (whose
// settings the run applies as the World does).
function runsOnNow(integrations, prompt) {
  const routed = integrations[String(prompt).split("@")[0]];
  if (routed?.kind === "ai.reasoning") return `${routed.provider}:${routed.config.model}${Object.entries(cognitionSettings(routed.config))
    .map(([key, value]) => `+${key}=${value}`).join("")}`;
  return `${integrations.encounter.provider}:${integrations.encounter.config.model}`;
}

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const percent = (value) => value === null || value === undefined ? "—" : `${Math.round(value * 100)}%`;
const fraction = ([k, n]) => `${k} of ${n}`;
const share = ([k, n]) => n === 0 ? "—" : `${percent(k / n)} [${interval(k, n).map(percent).join("–")}] of ${n}`;

async function main() {
  const options = args(process.argv.slice(2));
  const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
  const out = join(repoRoot, ".fibre/model-quality");
  const cacheDir = join(out, "cache");
  await mkdir(cacheDir, { recursive: true });
  const cached = async (key, work, { fresh = false } = {}) => {
    const file = join(cacheDir, `${digest(key)}.json`);
    if (!fresh) try { return { ...JSON.parse(await readFile(file, "utf8")), cached: true }; } catch {}
    const value = await work();
    if (!value.error) await writeFile(file, JSON.stringify(value));
    return value;
  };
  const progress = (text) => console.log(JSON.stringify({ event: "model-quality-progress", progress: `${options.prompt} · ${text}` }));
  await printAgreement(out, options.prompt);
  if (options.agreementOnly) return;

  const manifest = await loadDeploymentManifest(join(repoRoot, "infra/deployments/environments/cloudflare.yaml"));
  const integrations = resolveServiceDeployment(manifest, "world-kernel").integrations;
  const base = integrations.encounter;
  // The reference is measured like every candidate, and first.
  const reference = candidate(options.reference ?? runsOnNow(integrations, options.prompt));
  options.models = [reference, ...options.models.map(candidate).filter((item) => item.model !== reference.model)];
  const adapters = new Map();
  const adapterFor = (model, provider = "openai") => {
    // A candidate gets room for the whole answer: a reflection runs long, and
    // an answer cut off at a small default limit says nothing of the model.
    // It runs at the settings it is named with, which are part of what is certified.
    const candidate = options.models.find((item) => item.model === model) ?? { modelId: model, settings: {} };
    if (!adapters.has(model)) adapters.set(model, selectReasoningIntegration(
      reasoningIntegrationFor(provider, candidate.modelId, {
        ...(provider === base.provider ? base.config : { maxOutputTokens: CANDIDATE_OUTPUT_TOKENS }), ...candidate.settings }),
      { environment: process.env }));
    return adapters.get(model);
  };
  const modelIdOf = (model) => options.models.find((item) => item.model === model)?.modelId ?? model;
  const judges = judgesFor(options.judges, { environment: process.env, adapterFor: (model) => adapterFor(model) });

  const { found } = await captures(resolve(repoRoot, options.evidence), options.prompt);
  const requests = found.slice(-options.limit);
  console.log(`${options.prompt}: ${requests.length} recorded requests · reference ${reference.model} · candidates ${options.models.slice(1).map((m) => m.model).join(", ") || "none"} · judges ${judges.map((j) => j.model).join(", ")}`);
  const panel = judges.map((j) => j.model).filter((name) => !options.models.some((m) => m.model === name));
  console.log(panel.length ? `scored by the judges that read every model: ${panel.join(", ")}`
    : "no judge reads every model: each model is scored by the judges that read it");
  if (requests.length === 0) return;
  const job = jobOf(options.prompt);
  const prompt = promptFor(options.prompt);

  // 1. Answers: each model, each request, as recorded and with meaningless changes.
  // A live job is asked as the World asks it, streamed, and timed to its first words.
  const live = prompt.latency === "live";
  const streamed = async (adapter, input) => {
    const started = performance.now();
    let first = null, text = "", provenance = null;
    for await (const event of adapter.streamExpression({ systemPrompt: prompt.text, input,
      clientRequestId: `quality_${digest(input).slice(0, 24)}` })) {
      if (event?.type === "expression_delta" && event.text) { first ??= performance.now() - started; text += event.text; }
      if (event?.type === "expression_complete") provenance = event.provenance;
    }
    if (first === null) throw new Error("the stream ended without a word");
    return { output: { text }, provenance, firstWordsMs: Math.round(first), totalMs: Math.round(performance.now() - started) };
  };
  const ask = (model, provider, input) => cached({ kind: live ? "streamed-answer" : "answer", model, prompt: options.prompt, version: prompt.version, input },
    () => (live ? streamed(adapterFor(model, provider), input)
      : adapterFor(model, provider).invoke({ systemPrompt: prompt.text, input, responseSchema: requests[0].responseSchema,
        clientRequestId: `quality_${digest(input).slice(0, 24)}`, latency: "minutes" }))
      .then((result) => ({ output: result.output, cost: costOf(modelIdOf(model), result.provenance?.usage, result.provenance?.serviceTier),
        ...(live ? { firstWordsMs: result.firstWordsMs, totalMs: result.totalMs } : {}) }),
        (error) => ({ error: String(error?.message ?? error).slice(0, 200) })),
    { fresh: options.fresh.includes(model) });
  // Where the job is given the Body, each request is also asked felt with
  // another moment's Body: whether the answer changes with it is measured.
  const bodyPool = requests.map((event) => ({ scope: scopeOf(options.prompt, event.input), lines: bodyOf(event.input)?.lines ?? null }))
    .filter((entry) => entry.lines);
  const answers = new Map();
  for (const { provider, model } of options.models) {
    let done = 0;
    answers.set(model, await pool(requests, options.concurrency, async (event) => {
      const original = await ask(model, provider, event.input);
      const shuffled = job.unordered.length === 0 ? null : await ask(model, provider, perturbed(options.prompt, event.input));
      const requestKey = digest(event.input).slice(0, 16);
      const other = otherBody({ input: event.input, scope: scopeOf(options.prompt, event.input), requestKey, pool: bodyPool });
      const felt = other === null || original.error ? null : await ask(model, provider, withBody(event.input, other));
      progress(`answers ${model} ${++done}/${requests.length}`);
      return { event, input: event.input, output: original.output, error: original.error, cost: original.cost,
        firstWordsMs: original.firstWordsMs, perturbedOutput: shuffled?.output,
        body: felt?.output === undefined ? null : { own: bodyOf(event.input).lines, other, output: felt.output } };
    }));
  }

  // 2. Judges read: fidelity, acceptability, attribution among its possible sources.
  const sourcePool = requests.map((event) => ({ scope: scopeOf(options.prompt, event.input), source: job.source?.(event.input) }))
    .filter((entry) => entry.source);
  const judgeErrors = new Map();
  const verdict = async (judge, task, material) => {
    const result = await cached({ kind: task, judge: judge.model, material },
      () => judge.ask(task, material).catch((error) => ({ error: String(error?.message ?? error).slice(0, 300) })));
    if (result.error) judgeErrors.set(judge.model, [...(judgeErrors.get(judge.model) ?? []), result.error]);
    return result;
  };
  const report = { prompt: options.prompt, requests: requests.length, judges: judges.map((j) => j.model), models: [] };
  // Only verdicts asked in this run cost anything; cached ones were paid for before.
  const spent = (result) => result && !result.cached ? result.cost ?? 0 : 0;
  let judgeCost = 0;

  // Whether attribution can be measured for this job at all. When what was
  // faced alone already shows whose answer it is (a reflection on one's own
  // experiences), attributing every model's answers costs and shows nothing.
  // Twenty lineups without an answer decide it; the same verdicts are reused below.
  const independent = judges.filter((judge) => panel.includes(judge.model));
  let shownWithout = null;
  if (!String(options.prompt).startsWith("experience.memory-gist")) {
    const probe = [];
    for (const event of requests.slice(0, 20)) {
      const [entry] = job.items(event.input, {});
      const round = entry?.source ? lineup({ item: entry, scope: scopeOf(options.prompt, event.input),
        requestKey: digest(event.input).slice(0, 16), pool: sourcePool }) : null;
      if (round === null) continue;
      for (const judge of independent.length ? independent : judges) {
        const control = await verdict(judge, "attribute", { whatEachSourceIs: job.lineupOf, faced: round.faced,
          answer: "(not shown: choose the most likely source from what was faced alone)",
          sources: Object.fromEntries(round.sources.map((source, index) => [index + 1, source])) });
        judgeCost += spent(control);
        if (control?.verdict) probe.push(control.verdict.choice - 1 === round.truth);
      }
    }
    const seen = [probe.filter(Boolean).length, probe.length];
    if (seen[1] >= 20 && seen[0] / seen[1] >= SHOWN_WITHOUT_ANSWER) {
      shownWithout = seen;
      console.log(`attribution not asked: what was faced alone shows whose answer it is (${seen[0]} of ${seen[1]})`);
    }
  }

  const textOf = (input, output) => job.items(input, output).map((entry) => entry.text).filter(Boolean).join("\n") || null;
  for (const { model } of options.models) {
    const answered = answers.get(model).filter((item) => !item.error);
    const failed = answers.get(model).length - answered.length;
    const scorers = scoringJudges(judges.map((judge) => judge.model), options.models.map((m) => m.model), model);
    // Only judges whose verdicts count are asked, unless every reading is wanted.
    const readers = judges.filter((judge) => judge.model !== model && (options.allJudges || scorers.includes(judge.model)));
    const items = answered.flatMap((item) => job.items(item.input, item.output)
      .filter((entry) => entry.text).map((entry) => ({ ...entry, request: item })));
    const defects = answered.map((item) => job.defects(item.input, item.output));
    let read = 0;
    const judged = await pool(items, options.concurrency, async (entry) => {
      const round = shownWithout !== null ? null : lineup({ item: entry, scope: scopeOf(options.prompt, entry.request.input),
        requestKey: digest(entry.request.input).slice(0, 16), pool: sourcePool });
      const results = {};
      for (const judge of readers) {
        // A gist answers to its own memory; other answers to everything the job was given.
        const evidence = entry.siblings ? { thread: entry.request.input.thread, memory: entry.source } : entry.request.input;
        const fidelity = await verdict(judge, "fidelity", { whatCounts: job.faithful, evidence, answer: entry.text });
        const person = await verdict(judge, "person", { criteria: job.readable, whatCountsAsInvented: job.faithful,
          evidence, answer: entry.text });
        const lineupMaterial = (answer) => ({ whatEachSourceIs: job.lineupOf, faced: round.faced, answer,
          sources: Object.fromEntries(round.sources.map((source, index) => [index + 1, source])) });
        const attribution = round === null ? null : await verdict(judge, "attribute", lineupMaterial(round.answer));
        // The same lineup without the answer: how far what was faced alone
        // points to the source. Shared by every model, so judged once.
        const control = round === null ? null : await verdict(judge, "attribute",
          lineupMaterial("(not shown: choose the most likely source from what was faced alone)"));
        judgeCost += [fidelity, person, attribution, control].reduce((sum, result) => sum + spent(result), 0);
        const right = (result) => result?.verdict ? result.verdict.choice - 1 === round.truth : null;
        results[judge.model] = { invented: fidelity.verdict?.invented ?? null, example: fidelity.verdict?.example ?? null,
          person: person.verdict?.thisPerson ?? null, why: person.verdict?.reason ?? null,
          correct: right(attribution), withoutAnswer: right(control), choices: round?.sources.length ?? null };
      }
      progress(`judges reading ${model} ${++read}/${items.length}`);
      return { key: entry.key, request: entry.request, text: entry.text, results,
        context: entry.siblings ? entry.source.rememberedContent ?? entry.source : entry.faced };
    });

    // Acts on the Body: each answer, and its counterpart felt with another
    // moment's Body, read against the two Bodies.
    const felt = answered.filter((item) => item.body !== null);
    let bodyRead = 0;
    const bodyByRequest = await pool(felt, options.concurrency, async (item) => {
      const requestKey = digest(item.input).slice(0, 16), faced = withoutBody(item.input);
      const votes = [];
      for (const [givenWith, output] of [["own", item.output], ["other", item.body.output]]) {
        const answer = textOf(givenWith === "own" ? item.input : withBody(item.input, item.body.other), output);
        if (answer === null) continue;
        const { material, truth } = bodyLineup({ faced, answer, own: item.body.own, other: item.body.other, givenWith, requestKey });
        for (const judge of readers.filter((reader) => scorers.includes(reader.model))) {
          const result = await verdict(judge, "body", material);
          judgeCost += spent(result);
          if (result?.verdict) votes.push(result.verdict.choice - 1 === truth);
        }
      }
      progress(`judges reading ${model}'s Body ${++bodyRead}/${felt.length}`);
      return { request: requestKey, votes };
    });
    const bodyVotes = bodyByRequest.flatMap((item) => item.votes);

    // What it measures, before it is compared with the reference.
    const tally = (pick) => { const values = judged.flatMap(pick).filter((v) => v !== null && v !== undefined);
      return [values.filter(Boolean).length, values.length]; };
    const attributed = Object.fromEntries(readers.map((judge) => [judge.model, tally((row) => [row.results[judge.model]?.correct])]));
    const unaided = Object.fromEntries(readers.map((judge) => [judge.model, tally((row) => [row.results[judge.model]?.withoutAnswer])]));
    const chance = mean(judged.flatMap((row) => Object.values(row.results).map((value) => value.choices ? 1 / value.choices : null)));
    const invented = Object.fromEntries(readers.map((judge) => [judge.model, tally((row) => [row.results[judge.model]?.invented])]));
    const decided = answered.filter((item) => item.perturbedOutput !== undefined);
    const steady = (item) => steadyDecision(options.prompt, item.output) === steadyDecision(options.prompt, item.perturbedOutput);
    const invariant = [decided.filter(steady).length, decided.length];
    // Per answer: invented or true to the person only when every scoring judge says so.
    const scored = (row) => scorers.map((name) => row.results[name]).filter(Boolean);
    const every = (field, value) => { const rows = judged.map((row) => scored(row)
      .map((result) => result[field]).filter((v) => v !== null && v !== undefined)).filter((votes) => votes.length > 0);
      return [rows.filter((votes) => votes.every((vote) => vote === value)).length, rows.length]; };
    // The same, answer by answer, so a candidate is compared with the
    // reference on the same requests.
    const rowKey = (row) => `${digest(row.request.input).slice(0, 16)}|${row.key}`;
    const perAnswer = (score) => Object.fromEntries(judged.map((row) => [rowKey(row), score(scored(row))])
      .filter(([, value]) => Number.isFinite(value)));
    const allSay = (field, value) => (results) => { const votes = results.map((r) => r[field]).filter((v) => v !== null && v !== undefined);
      return votes.length === 0 ? null : Number(votes.every((vote) => vote === value)); };
    const gainOf = (results) => { const both = results.filter((r) => r.correct !== null && r.withoutAnswer !== null);
      return both.length === 0 ? null : mean(both.map((r) => Number(r.correct))) - mean(both.map((r) => Number(r.withoutAnswer))); };
    const pairedGains = perAnswer(gainOf);
    const gains = Object.values(pairedGains);
    const paired = {
      person: perAnswer(allSay("person", true)),
      gains: pairedGains,
      correct: perAnswer((results) => mean(results.map((r) => r.correct).filter((v) => v !== null).map(Number))),
      invariant: Object.fromEntries(decided.map((item) => [digest(item.input).slice(0, 16),
        Number(steady(item))])),
      body: Object.fromEntries(bodyByRequest.filter((item) => item.votes.length > 0)
        .map((item) => [item.request, mean(item.votes.map(Number))])),
    };
    const sum = (names, of) => names.map((name) => of[name] ?? [0, 0]).reduce(([k, n], [k2, n2]) => [k + k2, n + n2], [0, 0]);
    const ours = defects.filter((list) => list.length > modelCaused(list).length).length;
    const measures = {
      cases: answered.length,
      defects: [defects.filter((list) => modelCaused(list).length > 0).length, answered.length],
      ourDefects: [ours, answered.length],
      invented: every("invented", true),
      body: bodyVotes.length === 0 ? null : [bodyVotes.filter(Boolean).length, bodyVotes.length],
      rates: ratesOf(options.prompt, answered.map((item) => item.output)),
      alarms: dayAlarms(options.prompt, answered),
      person: every("person", true),
      gains, correct: sum(scorers, attributed), chance,
      unaided: shownWithout ?? sum(scorers, unaided),
      voice: null,
      invariant: decided.length === 0 ? null : invariant,
      ...(live ? { firstWordsMs: answered.map((item) => item.firstWordsMs).filter(Number.isFinite) } : {}),
      paired,
    };
    report.models.push({
      model, answered: answered.length, failed, costPerCall: mean(answered.map((item) => item.cost)),
      defectExamples: [...new Set(defects.flat().map(defectText))].slice(0, 5),
      invented, attributed, unaided, measures, scoredBy: scorers, readers: readers.map((judge) => judge.model),
      tooFew: answered.length < MIN_CASES,
      alsoRead: Object.fromEntries(readers.filter((judge) => !scorers.includes(judge.model))
        .map((judge) => [judge.model, tally((row) => [row.results[judge.model]?.person])])),
      judged: judged.map((row) => ({ key: row.key, request: digest(row.request.input).slice(0, 16),
        scope: scopeOf(options.prompt, row.request.input), text: row.text,
        context: row.context, scene: scene(row.request.input, row.context), results: row.results })),
    });
  }

  // Not one voice: how close in meaning different Threads' answers are, per
  // Thread, with each model. Threads only; a World job speaks for no one.
  const voices = await voicesOf({ prompt: options.prompt, out, models: report.models, answers, textOf });
  for (const m of report.models) m.measures.voice = voices?.[m.model] ?? null;

  // Verdicts, each candidate against the reference.
  const referenceMeasures = report.models.find((m) => m.model === reference.model).measures;
  for (const m of report.models) {
    const isReference = m.model === reference.model;
    m.goodEnough = goodEnough(options.prompt, m.measures, isReference ? null : referenceMeasures);
    if (live) m.firstWords = m.goodEnough.tests.at(-1).detail;
    const { measures } = m;
    console.log(`\n${m.model}${isReference ? " — the reference: the model this job runs on now" : ""}${m.tooFew ? " — too few cases to decide" : ""}`);
    console.log(`  cost ${m.costPerCall === null ? "unknown" : `$${(m.costPerCall * 1000).toFixed(2)} per 1,000 calls`}${m.failed ? ` · ${m.failed} requests failed` : ""}`);
    // Why answers failed matters as much as how many: a timeout, the schema missed, an account limit.
    const reasons = new Map();
    for (const item of answers.get(m.model)) if (item.error) reasons.set(item.error, (reasons.get(item.error) ?? 0) + 1);
    for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 3)) console.log(`  failed ${count}×: ${reason}`);
    console.log(`  broken rules in ${share(measures.defects)}${m.defectExamples.length ? ` (${m.defectExamples.join("; ")})` : ""}`);
    for (const judge of m.readers) console.log(`  invented a fact (${judge}): ${share(m.invented[judge])}`);
    if (shownWithout === null) for (const judge of m.readers) console.log(`  shows whose answer (${judge}): ${share(m.attributed[judge])} · without the answer ${share(m.unaided[judge])} · chance ${percent(measures.chance)}`);
    if (measures.body) console.log(`  the Body it was given with, picked out: ${share(measures.body)} (chance 50%)`);
    console.log(`  rates: ${Object.entries(measures.rates).map(([name, counts]) => `${name} ${share(counts)}`).join(" · ") || "none for this job"}`);
    console.log(`  steady: ${share(measures.invariant ?? [0, 0])}`);
    console.log(`  this person, now (${m.scoredBy.join(" and ")}): ${share(measures.person)}`);
    for (const [judge, counts] of Object.entries(m.alsoRead)) console.log(`  also read by ${judge} (a candidate, not scored): this person, now ${share(counts)}`);
    console.log(`  GOOD ENOUGH FOR FIBRE: ${m.goodEnough.overall.toUpperCase()}`);
    for (const test of m.goodEnough.tests) {
      const { value, bar } = testReading(test);
      console.log(`    ${test.verdict.padEnd(9)} ${test.test}${value ? ` ${value}` : ""}${bar ? ` (bar ${bar})` : ""}${test.detail ? ` — ${test.detail}` : ""}`);
    }
  }

  // The owner's blind read of a whole morning, in time order, for each model.
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const letters = options.models.map((_, index) => `Model ${String.fromCharCode(80 + index)}`)
    .sort(() => Math.random() - 0.5);
  const labels = Object.fromEntries(options.models.map(({ model }, index) => [model, letters[index]]));
  const morning = options.models.map(({ model }) => {
    const lines = answers.get(model).filter((item) => !item.error)
      .sort((a, b) => String(a.event.observedAt).localeCompare(String(b.event.observedAt)))
      .map((item) => {
        const who = item.input.thread?.name ?? job.venue?.(item.input) ?? "";
        const said = job.items(item.input, item.output).map((entry) => entry.text).filter(Boolean).join(" / ");
        return `- ${String(item.event.observedAt).slice(11, 16)} ${who}: ${decision(options.prompt, item.output) ?? ""}${said ? ` — ${said}` : ""}`;
      });
    return { label: labels[model], lines };
  }).sort((a, b) => a.label.localeCompare(b.label));
  await writeFile(join(out, `morning-${options.prompt}-${stamp}.md`),
    `# A recorded morning — ${options.prompt}\n\nSame requests, different models, names hidden. Which reads most like a life?\n\n${morning.map((m) => `## ${m.label}\n\n${m.lines.join("\n")}\n`).join("\n")}`);
  await writeFile(join(out, `morning-key-${options.prompt}-${stamp}.json`), JSON.stringify(labels, null, 2));
  // The owner's blind review: answers from every model, interleaved, each with
  // what was faced and what the judges said (shown only after his verdict).
  const perModel = Math.ceil(REVIEW_ANSWERS / options.models.length);
  const sample = report.models.flatMap((m) => (m.judged ?? [])
    .map((row) => ({ id: digest([m.model, row.request, row.key, row.text]).slice(0, 12), model: m.model, ...row }))
    .sort((a, b) => a.id.localeCompare(b.id)).slice(0, perModel))
    .sort((a, b) => a.id.localeCompare(b.id));
  const reviewId = `${options.prompt}-${stamp}`;
  await writeFile(join(out, `review-${reviewId}.json`), JSON.stringify({
    kind: REVIEW_KIND, id: reviewId, prompt: options.prompt, promptVersion: prompt.version, createdAt: new Date().toISOString(),
    criteria: `${THIS_PERSON}\n\nThis job's own criteria: ${job.readable}`, invented: job.faithful, judges: report.judges,
    requests: requests.length, reference: reference.model,
    scorecard: report.models.map((m) => ({ model: m.model, answered: m.answered, failed: m.failed, costPerCall: m.costPerCall,
      acceptable: m.measures.person, alarms: m.measures.alarms, goodEnough: m.goodEnough })),
    // The owner's accept or reject is set beside the judges' "this person, now".
    items: sample.map((row) => ({ id: row.id, model: row.model,
      faced: row.scene, answer: row.text,
      judges: Object.fromEntries(Object.entries(row.results).map(([judge, r]) =>
        [judge, { acceptable: r.person, why: r.why, invented: r.invented, example: r.example }])) })),
  }, null, 2));
  report.judgeCost = judgeCost;
  for (const [model, errors] of judgeErrors) {
    console.log(`judge ${model}: ${errors.length} verdicts failed, e.g. ${errors[0]}`);
  }
  await writeFile(join(out, `quality-${options.prompt}-${stamp}.json`), JSON.stringify(report, null, 2));
  // Certifications: which models this job may think with, at this prompt version.
  const certificationsPath = join(repoRoot, CERTIFICATIONS_PATH);
  const record = await readFile(certificationsPath, "utf8").then(JSON.parse, () => EMPTY_CERTIFICATIONS);
  const rate = ([k, n]) => n === 0 ? null : { share: Math.round(k / n * 1000) / 1000, of: n };
  // A model that gave no answer at all (an account or permission refusal) is not recorded: nothing was measured.
  const measured = report.models.filter((m) => m.answered > 0);
  for (const m of report.models.filter((item) => item.answered === 0)) console.log(`not recorded: ${m.model} gave no answer`);
  await writeFile(certificationsPath, JSON.stringify(recordCertifications(record, measured.map((m) => ({
    prompt: options.prompt, promptVersion: prompt.version,
    ...(({ provider, modelId, settings }) => ({ provider, model: modelId, ...(Object.keys(settings).length ? { settings } : {}) }))(
      options.models.find((item) => item.model === m.model)),
    verdict: m.tooFew ? "undecided" : m.goodEnough.overall,
    ...(m.model === reference.model ? { reference: true } : { comparedWith: reference.model }),
    tests: Object.fromEntries(m.goodEnough.tests.map((test) => [test.test, test.verdict])),
    thisPerson: rate(m.measures.person), scoredBy: m.scoredBy,
    rates: Object.fromEntries(Object.entries(m.measures.rates).map(([name, counts]) => [name, rate(counts)?.share ?? null])),
    costPer1000Calls: m.costPerCall === null ? null : Math.round(m.costPerCall * 1000 * 100) / 100,
    ...(m.firstWords ? { firstWords: m.firstWords } : {}),
    requests: m.answered, failed: m.failed, certifiedAt: stamp.slice(0, 10), evidence: `quality-${options.prompt}-${stamp}.json`,
  }))), null, 2) + "\n");
  console.log(`certifications: ${CERTIFICATIONS_PATH} updated (${measured.map((m) => `${m.model} ${m.tooFew ? "undecided" : m.goodEnough.overall}`).join(", ")}); commit it`);
  console.log(`\njudges spent ≈ $${judgeCost.toFixed(2)} this run (cached verdicts are free)`);
  console.log(`evidence: .fibre/model-quality/ — open review-${reviewId}.json in Admin › Model Quality to review blind`);
}

// Per model, each Thread's closeness in meaning to the other Threads (bge-m3):
// the centroid of its answers against theirs, over the Threads every model
// answered for. Null when meaning cannot be measured here.
async function voicesOf({ prompt, out, models, answers, textOf }) {
  if (String(prompt).startsWith("world.")) return null;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID, apiToken = process.env.CLOUDFLARE_AI_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    console.log("not one voice: not measured (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN are needed for meaning)");
    return null;
  }
  const spoken = Object.fromEntries(models.map((m) => [m.model, answers.get(m.model).filter((item) => !item.error)
    .map((item) => ({ scope: scopeOf(prompt, item.input), text: textOf(item.input, item.output)?.slice(0, 2000) ?? null }))
    .filter((item) => item.text && item.scope)]));
  const threads = [...new Set(Object.values(spoken).flat().map((item) => item.scope))]
    .filter((scope) => Object.values(spoken).every((list) => list.some((item) => item.scope === scope)));
  if (threads.length < 4) return null;
  const embedder = createCloudflareEmbeddingAdapter({ accountId, apiToken, modelId: "@cf/baai/bge-m3" });
  let vectorOf;
  try {
    vectorOf = await meaningOf(Object.values(spoken).flat().map((item) => item.text), join(out, "meaning-cache.json"), embedder);
  } catch (error) {
    console.log(`not one voice: not measured (${String(error?.message ?? error).slice(0, 160)})`);
    return null;
  }
  return Object.fromEntries(Object.entries(spoken).map(([model, list]) => {
    const centres = Object.fromEntries(threads.map((scope) => [scope,
      centroid(list.filter((item) => item.scope === scope).map((item) => vectorOf(item.text)).filter(Boolean))]));
    return [model, Object.fromEntries(threads.map((scope) => [scope,
      closenessToOthers(centres[scope], threads.filter((other) => other !== scope).map((other) => centres[other]))]))];
  }));
}

// What was faced, as a reader would want it: the whole scene in its own words,
// with this Thread's own part marked and anyone it knows shown by name.
function scene(input, context) {
  if (typeof context === "string") return context;
  const lines = [];
  if (input?.thread?.name) lines.push(`Me: ${input.thread.name}`);
  const now = input?.currentSituation ?? context?.currentSituation;
  if (now) lines.push(`Doing: ${now.activity ?? now.outwardActivity ?? ""}${now.place?.name ? ` at ${now.place.name}` : ""}`);
  for (const beat of input?.encounterStory?.story?.beats ?? context?.encounterStory?.story?.beats ?? []) {
    lines.push(`${beat.self ? "(me) " : ""}${beat.knownAs ? `[${beat.knownAs}] ` : ""}${beat.text}`);
  }
  for (const item of context?.afterReflection ?? []) lines.push(`After reflecting (${item.kind}): ${item.text}`);
  if (context?.reachable?.length) lines.push(`Can reach: ${context.reachable.join(", ")}`);
  return lines.length > 1 ? lines.join("\n") : JSON.stringify(context ?? {}, null, 1).slice(0, 1200);
}

// The owner's verdicts against the judges, for every review of this job he has read.
async function printAgreement(out, promptId) {
  const files = (await readdir(out).catch(() => [])).filter((name) => name.startsWith("verdicts-") && name.endsWith(".json"));
  for (const name of files.sort()) {
    try {
      const saved = JSON.parse(await readFile(join(out, name), "utf8"));
      if (saved.prompt !== promptId) continue;
      const review = readReview(JSON.parse(await readFile(join(out, `review-${saved.review}.json`), "utf8")));
      const result = agreement(review, readVerdicts(saved, review));
      console.log(`your review ${saved.review}: ${result.reviewed} answers read`);
      for (const [model, tally] of Object.entries(result.byModel)) console.log(`  you accepted ${model}: ${fraction(tally)}`);
      for (const [judge, t] of Object.entries(result.byJudge)) {
        console.log(`  ${judge} agrees with you on ${fraction([t.agreed, t.compared])} (stricter ${t.stricter}, laxer ${t.laxer})`);
      }
    } catch (error) {
      console.log(`${name}: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
