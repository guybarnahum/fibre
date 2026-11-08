// What a good answer is, measured on recorded requests of one cognitive job
// for each candidate model — the standard accepted by Guy on November 8,
// 2026 (docs: claude/model-quality-criteria-proposal.md in the project):
// valid, attributable, invariant, credible over the day, readable. No model
// is the reference; no judge reads its own model's answers.
//
//   npm run model:quality -- --prompt encounter.attention --models openai:gpt-5.6-sol,openai:gpt-5.6-terra
//
// Answers and verdicts are cached, so a re-run pays only for what is new.
// Evidence (Thread-private; never committed) goes to .fibre/model-quality/,
// including review-<prompt>-<stamp>.json for the admin Model Quality page.
// Verdicts saved from that page (verdicts-<review>.json, put back in the same
// folder) are compared with the judges at the start of every run;
// --agreement prints only that comparison.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { captures, costOf, mean, pool } from "./model-recorded-requests.mjs";
import { judgesFor } from "./model-judges.mjs";
import { dayAlarms, decision, goodEnough, interval, jobOf, lineup, perturbed, scopeOf } from "./model-quality-criteria.mjs";
import { agreement, readReview, readVerdicts, REVIEW_KIND, testReading } from "../../apps/admin-dashboard/model-quality-review.mjs";

const MIN_CASES = 30;
const REVIEW_ANSWERS = 30;

function args(argv) {
  const options = { prompt: null, models: ["openai:gpt-5.6-sol"], judges: ["claude-opus-5-5", "gpt-5.6-sol"],
    limit: 200, concurrency: 4, evidence: ".fibre/infra-measure", agreementOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].split("=", 2);
    if (name === "--agreement") { options.agreementOnly = true; continue; }
    const value = inline ?? argv[++index];
    if (name === "--prompt") options.prompt = value;
    else if (name === "--models") options.models = value.split(",");
    else if (name === "--judges") options.judges = value.split(",");
    else if (name === "--limit") options.limit = Number(value);
    else if (name === "--concurrency") options.concurrency = Number(value);
    else if (name === "--evidence") options.evidence = value;
    else throw new Error(`unknown option ${name}`);
  }
  if (!options.prompt || jobOf(options.prompt) === null) {
    throw new Error("usage: model:quality -- --prompt <gate job> [--models openai:<model>,google:<model>] [--judges claude-opus-5-5,gpt-5.6-sol]");
  }
  options.models = options.models.map((item) => {
    const [provider, model] = item.includes(":") ? item.split(":", 2) : ["openai", item];
    return { provider, model };
  });
  return options;
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
  const cached = async (key, work) => {
    const file = join(cacheDir, `${digest(key)}.json`);
    try { return JSON.parse(await readFile(file, "utf8")); } catch {}
    const value = await work();
    if (!value.error) await writeFile(file, JSON.stringify(value));
    return value;
  };
  const progress = (text) => console.log(JSON.stringify({ event: "model-quality-progress", progress: `${options.prompt} · ${text}` }));
  await printAgreement(out, options.prompt);
  if (options.agreementOnly) return;

  const manifest = await loadDeploymentManifest(join(repoRoot, "infra/deployments/environments/cloudflare.yaml"));
  const base = resolveServiceDeployment(manifest, "world-kernel").integrations.encounter;
  const adapters = new Map();
  const adapterFor = (model, provider = "openai") => {
    if (!adapters.has(model)) adapters.set(model, selectReasoningIntegration({
      kind: "ai.reasoning", provider, config: { ...base.config, model },
      secrets: { apiKey: provider === "google" ? "GEMINI_API_KEY" : "OPENAI_API_KEY" },
    }, { environment: process.env }));
    return adapters.get(model);
  };
  const judges = judgesFor(options.judges, { environment: process.env, adapterFor: (model) => adapterFor(model) });

  const { found } = await captures(resolve(repoRoot, options.evidence), options.prompt);
  const requests = found.slice(-options.limit);
  console.log(`${options.prompt}: ${requests.length} recorded requests · models ${options.models.map((m) => m.model).join(", ")} · judges ${judges.map((j) => j.model).join(", ")}`);
  if (requests.length === 0) return;
  const job = jobOf(options.prompt);
  const prompt = promptFor(options.prompt);

  // 1. Answers: each model, each request, as recorded and with meaningless changes.
  const ask = (model, provider, input) => cached({ kind: "answer", model, prompt: options.prompt, version: prompt.version, input },
    () => adapterFor(model, provider).invoke({ systemPrompt: prompt.text, input, responseSchema: requests[0].responseSchema,
      clientRequestId: `quality_${digest(input).slice(0, 24)}`, latency: "minutes" })
      .then((result) => ({ output: result.output, cost: costOf(model, result.provenance?.usage, result.provenance?.serviceTier) }),
        (error) => ({ error: String(error?.message ?? error).slice(0, 200) })));
  const answers = new Map();
  for (const { provider, model } of options.models) {
    let done = 0;
    answers.set(model, await pool(requests, options.concurrency, async (event) => {
      const original = await ask(model, provider, event.input);
      const shuffled = job.unordered.length === 0 ? null : await ask(model, provider, perturbed(options.prompt, event.input));
      progress(`answers ${model} ${++done}/${requests.length}`);
      return { event, input: event.input, output: original.output, error: original.error, cost: original.cost,
        perturbedOutput: shuffled?.output };
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
  let judgeCost = 0;

  for (const { model } of options.models) {
    const answered = answers.get(model).filter((item) => !item.error);
    const failed = answers.get(model).length - answered.length;
    const readers = judges.filter((judge) => judge.model !== model);
    const items = answered.flatMap((item) => job.items(item.input, item.output)
      .filter((entry) => entry.text).map((entry) => ({ ...entry, request: item })));
    const defects = answered.map((item) => job.defects(item.input, item.output));
    let read = 0;
    const judged = await pool(items, options.concurrency, async (entry) => {
      const round = lineup({ item: entry, scope: scopeOf(options.prompt, entry.request.input),
        requestKey: digest(entry.request.input).slice(0, 16), pool: sourcePool });
      const results = {};
      for (const judge of readers) {
        // A gist answers to its own memory; other answers to everything the job was given.
        const evidence = entry.siblings ? { thread: entry.request.input.thread, memory: entry.source } : entry.request.input;
        const fidelity = await verdict(judge, "fidelity", { whatCounts: job.faithful, evidence, answer: entry.text });
        const acceptable = await verdict(judge, "acceptable", { criteria: job.readable, whatCountsAsInvented: job.faithful,
          evidence, answer: entry.text });
        const lineupMaterial = (answer) => ({ whatEachSourceIs: job.lineupOf, faced: round.faced, answer,
          sources: Object.fromEntries(round.sources.map((source, index) => [index + 1, source])) });
        const attribution = round === null ? null : await verdict(judge, "attribute", lineupMaterial(round.answer));
        // The same lineup without the answer: how far what was faced alone
        // points to the source. Shared by every model, so judged once.
        const control = round === null ? null : await verdict(judge, "attribute",
          lineupMaterial("(not shown: choose the most likely source from what was faced alone)"));
        judgeCost += (fidelity.cost ?? 0) + (acceptable.cost ?? 0) + (attribution?.cost ?? 0) + (control?.cost ?? 0);
        const right = (result) => result?.verdict ? result.verdict.choice - 1 === round.truth : null;
        results[judge.model] = { invented: fidelity.verdict?.invented ?? null, example: fidelity.verdict?.example ?? null,
          acceptable: acceptable.verdict?.acceptable ?? null, why: acceptable.verdict?.reason ?? null,
          correct: right(attribution), withoutAnswer: right(control), choices: round?.sources.length ?? null };
      }
      progress(`judges reading ${model} ${++read}/${items.length}`);
      return { key: entry.key, request: entry.request, text: entry.text, results,
        context: entry.siblings ? entry.source.rememberedContent ?? entry.source : entry.faced };
    });

    // Scores, with intervals; "too few" below MIN_CASES.
    const tally = (pick) => { const values = judged.flatMap(pick).filter((v) => v !== null && v !== undefined);
      return [values.filter(Boolean).length, values.length]; };
    const attributed = Object.fromEntries(readers.map((judge) => [judge.model, tally((row) => [row.results[judge.model]?.correct])]));
    const unaided = Object.fromEntries(readers.map((judge) => [judge.model, tally((row) => [row.results[judge.model]?.withoutAnswer])]));
    const chance = mean(judged.flatMap((row) => Object.values(row.results).map((value) => value.choices ? 1 / value.choices : null)));
    const invented = Object.fromEntries(readers.map((judge) => [judge.model, tally((row) => [row.results[judge.model]?.invented])]));
    const decided = answered.filter((item) => item.perturbedOutput !== undefined);
    const invariant = [decided.filter((item) => decision(options.prompt, item.output) === decision(options.prompt, item.perturbedOutput)).length, decided.length];
    // Per answer: invented or acceptable only when every judge that read it says so.
    const every = (field, value) => { const rows = judged.map((row) => Object.values(row.results)
      .map((result) => result[field]).filter((v) => v !== null && v !== undefined)).filter((votes) => votes.length > 0);
      return [rows.filter((votes) => votes.every((vote) => vote === value)).length, rows.length]; };
    const gains = judged.flatMap((row) => {
      const both = Object.values(row.results).filter((r) => r.correct !== null && r.withoutAnswer !== null);
      return both.length === 0 ? [] : [mean(both.map((r) => Number(r.correct))) - mean(both.map((r) => Number(r.withoutAnswer)))];
    });
    const nothing = [answered.filter((item) => job.nothing(item.output)).length, answered.length];
    const result = {
      model, answered: answered.length, failed, costPerCall: mean(answered.map((item) => item.cost)),
      defects: [defects.filter((list) => list.length > 0).length, answered.length],
      defectExamples: [...new Set(defects.flat())].slice(0, 5),
      invented, attributed, unaided, chance, invariant, nothingRate: nothing, alarms: dayAlarms(options.prompt, answered),
      acceptable: every("acceptable", true),
      tooFew: answered.length < MIN_CASES,
    };
    result.goodEnough = goodEnough(options.prompt, { defects: result.defects, invented: every("invented", true), gains,
      correct: Object.values(attributed).reduce(([k, n], [k2, n2]) => [k + k2, n + n2], [0, 0]), chance,
      invariant: decided.length === 0 ? null : invariant, alarms: result.alarms, acceptable: result.acceptable });
    report.models.push(result);

    console.log(`\n${model}${result.tooFew ? " — too few cases to decide" : ""}`);
    console.log(`  cost ${result.costPerCall === null ? "unknown" : `$${(result.costPerCall * 1000).toFixed(2)} per 1,000 calls`}${failed ? ` · ${failed} requests failed` : ""}`);
    console.log(`  valid: defects in ${share(result.defects)}${result.defectExamples.length ? ` (${result.defectExamples.join("; ")})` : ""}`);
    for (const judge of readers) console.log(`  invented a fact (${judge.model}): ${share(invented[judge.model])}`);
    for (const judge of readers) console.log(`  attributable (${judge.model}): ${share(attributed[judge.model])} · without the answer ${share(unaided[judge.model])} · chance ${percent(chance)}`);
    console.log(`  invariant: ${share(invariant)} · "nothing" chosen ${share(nothing)}`);
    console.log(`  day alarms: ${result.alarms.length ? result.alarms.join("; ") : "none"}`);
    console.log(`  acceptable (every judge that read it): ${share(result.acceptable)}`);
    console.log(`  GOOD ENOUGH FOR FIBRE: ${result.goodEnough.overall.toUpperCase()}`);
    for (const test of result.goodEnough.tests) {
      const { value, bar } = testReading(test);
      console.log(`    ${test.verdict.padEnd(9)} ${test.test}${value ? ` ${value}` : ""}${bar ? ` (bar ${bar})` : ""}${test.detail ? ` — ${test.detail}` : ""}`);
    }
    result.judged = judged.map((row) => ({ key: row.key, request: digest(row.request.input).slice(0, 16),
      scope: scopeOf(options.prompt, row.request.input), text: row.text,
      context: row.context, scene: scene(row.request.input, row.context), results: row.results }));
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
    criteria: job.readable, invented: job.faithful, judges: report.judges, requests: requests.length,
    scorecard: report.models.map((m) => ({ model: m.model, answered: m.answered, failed: m.failed, costPerCall: m.costPerCall,
      acceptable: m.acceptable, alarms: m.alarms, goodEnough: m.goodEnough })),
    items: sample.map((row) => ({ id: row.id, model: row.model,
      faced: row.scene, answer: row.text,
      judges: Object.fromEntries(Object.entries(row.results).map(([judge, r]) =>
        [judge, { acceptable: r.acceptable, why: r.why, invented: r.invented, example: r.example }])) })),
  }, null, 2));
  report.judgeCost = judgeCost;
  for (const [model, errors] of judgeErrors) {
    console.log(`judge ${model}: ${errors.length} verdicts failed, e.g. ${errors[0]}`);
  }
  await writeFile(join(out, `quality-${options.prompt}-${stamp}.json`), JSON.stringify(report, null, 2));
  console.log(`\njudges spent ≈ $${judgeCost.toFixed(2)} this run (cached verdicts are free)`);
  console.log(`evidence: .fibre/model-quality/ — open review-${reviewId}.json in Admin › Model Quality to review blind`);
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
