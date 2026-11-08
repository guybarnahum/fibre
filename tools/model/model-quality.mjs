// What a good answer is, measured on recorded requests of one cognitive job
// for each candidate model — the standard accepted by Guy on November 8,
// 2026 (docs: claude/model-quality-criteria-proposal.md in the project):
// valid, attributable, invariant, credible over the day, readable. No model
// is the reference; no judge reads its own model's answers.
//
//   npm run model:quality -- --prompt encounter.attention --models openai:gpt-5.6-sol,openai:gpt-5.6-terra
//
// Answers and verdicts are cached, so a re-run pays only for what is new.
// Evidence (Thread-private; never committed) goes to .fibre/model-quality/.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { captures, costOf, mean, pool } from "./model-recorded-requests.mjs";
import { judgesFor } from "./model-judges.mjs";
import { dayAlarms, decision, interval, jobOf, lineup, perturbed, scopeOf } from "./model-quality-criteria.mjs";

const MIN_CASES = 30;
const BLIND_PAIRS = 20;

function args(argv) {
  const options = { prompt: null, models: ["openai:gpt-5.6-sol"], judges: ["claude-opus-5-5", "gpt-5.6-sol"],
    limit: 200, concurrency: 4, evidence: ".fibre/infra-measure" };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].split("=", 2);
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

  // 2. Judges read: fidelity, attribution among four sources, pairwise reading.
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
  const reference = options.models[0].model;

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
        const lineupMaterial = (answer) => ({ whatEachSourceIs: job.lineupOf, faced: round.faced, answer,
          sources: Object.fromEntries(round.sources.map((source, index) => [index + 1, source])) });
        const attribution = round === null ? null : await verdict(judge, "attribute", lineupMaterial(round.answer));
        // The same lineup without the answer: how far what was faced alone
        // points to the source. Shared by every model, so judged once.
        const control = round === null ? null : await verdict(judge, "attribute",
          lineupMaterial("(not shown: choose the most likely source from what was faced alone)"));
        judgeCost += (fidelity.cost ?? 0) + (attribution?.cost ?? 0) + (control?.cost ?? 0);
        const right = (result) => result?.verdict ? result.verdict.choice - 1 === round.truth : null;
        results[judge.model] = { invented: fidelity.verdict?.invented ?? null, example: fidelity.verdict?.example ?? null,
          correct: right(attribution), withoutAnswer: right(control), choices: round?.sources.length ?? null };
      }
      progress(`judges reading ${model} ${++read}/${items.length}`);
      return { key: entry.key, request: entry.request, text: entry.text, results };
    });

    // Readable: this model against the first-named model, request by request.
    const pairs = model === reference ? [] : answered.flatMap((item) => {
      const other = answers.get(reference).find((candidate) => candidate.event === item.event && !candidate.error);
      if (!other) return [];
      const mine = job.items(item.input, item.output), theirs = job.items(other.input, other.output);
      return mine.map((entry) => ({ entry, against: theirs.find((candidate) => candidate.key === entry.key) }))
        .filter(({ entry, against }) => entry.text && against?.text && entry.text !== against.text)
        .map(({ entry, against }) => ({ input: item.input, key: entry.key, mine: entry.text, theirs: against.text }));
    });
    const compared = await pool(pairs, options.concurrency, async (pair) => {
      const candidateFirst = digest([pair.input, pair.key, model]).charCodeAt(0) % 2 === 0;
      const [a, b] = candidateFirst ? [pair.mine, pair.theirs] : [pair.theirs, pair.mine];
      const votes = [];
      for (const judge of judges.filter((judge) => judge.model !== model && judge.model !== reference)) {
        const result = await verdict(judge, "compare", { criteria: job.readable, request: pair.input, A: a, B: b });
        judgeCost += result.cost ?? 0;
        const better = result.verdict?.better;
        if (!better) continue;
        votes.push(better === "same" ? "same" : (better === "A") === candidateFirst ? "candidate" : "reference");
      }
      return { ...pair, candidateFirst, votes };
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
    const agreeing = compared.filter((pair) => pair.votes.length > 0 && pair.votes.every((vote) => vote === pair.votes[0]));
    const readable = { candidate: agreeing.filter((p) => p.votes[0] === "candidate").length,
      reference: agreeing.filter((p) => p.votes[0] === "reference").length,
      same: agreeing.filter((p) => p.votes[0] === "same").length, judgesDisagreed: compared.length - agreeing.length };
    const nothing = [answered.filter((item) => job.nothing(item.output)).length, answered.length];
    const result = {
      model, answered: answered.length, failed, costPerCall: mean(answered.map((item) => item.cost)),
      defects: [defects.filter((list) => list.length > 0).length, answered.length],
      defectExamples: [...new Set(defects.flat())].slice(0, 5),
      invented, attributed, unaided, chance, invariant, nothingRate: nothing, alarms: dayAlarms(options.prompt, answered),
      readableAgainst: model === reference ? null : { reference, ...readable },
      tooFew: answered.length < MIN_CASES,
    };
    report.models.push(result);

    console.log(`\n${model}${result.tooFew ? " — too few cases to decide" : ""}`);
    console.log(`  cost ${result.costPerCall === null ? "unknown" : `$${(result.costPerCall * 1000).toFixed(2)} per 1,000 calls`}${failed ? ` · ${failed} requests failed` : ""}`);
    console.log(`  valid: defects in ${share(result.defects)}${result.defectExamples.length ? ` (${result.defectExamples.join("; ")})` : ""}`);
    for (const judge of readers) console.log(`  invented a fact (${judge.model}): ${share(invented[judge.model])}`);
    for (const judge of readers) console.log(`  attributable (${judge.model}): ${share(attributed[judge.model])} · without the answer ${share(unaided[judge.model])} · chance ${percent(chance)}`);
    console.log(`  invariant: ${share(invariant)} · "nothing" chosen ${share(nothing)}`);
    console.log(`  day alarms: ${result.alarms.length ? result.alarms.join("; ") : "none"}`);
    if (result.readableAgainst) console.log(`  readable vs ${reference}: better ${readable.candidate} · worse ${readable.reference} · same ${readable.same} · judges disagreed ${readable.judgesDisagreed}`);
    result.judged = judged.map((row) => ({ key: row.key, scope: scopeOf(options.prompt, row.request.input), text: row.text, results: row.results }));
    result.compared = compared.map(({ input, ...pair }) => pair);
  }

  // Guy's blind reads: the morning, in time order, for each model; and pairs.
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
  const pairsForGuy = report.models.flatMap((m) => (m.compared ?? []).map((pair) => ({ model: m.model, ...pair }))).slice(0, BLIND_PAIRS);
  await writeFile(join(out, `pairs-${options.prompt}-${stamp}.md`), `# Blind pairs — ${options.prompt}\n\nCriteria: ${job.readable}\n\nFor each pair note A, B or same.\n\n` +
    pairsForGuy.map((pair, index) => `## Pair ${index + 1}\n\n**A:** ${pair.candidateFirst ? pair.mine : pair.theirs}\n\n**B:** ${pair.candidateFirst ? pair.theirs : pair.mine}\n`).join("\n"));
  await writeFile(join(out, `pairs-key-${options.prompt}-${stamp}.json`), JSON.stringify(pairsForGuy.map((pair, index) =>
    ({ pair: index + 1, candidate: pair.model, candidateIs: pair.candidateFirst ? "A" : "B" })), null, 2));
  report.judgeCost = judgeCost;
  for (const [model, errors] of judgeErrors) {
    console.log(`judge ${model}: ${errors.length} verdicts failed, e.g. ${errors[0]}`);
  }
  await writeFile(join(out, `quality-${options.prompt}-${stamp}.json`), JSON.stringify(report, null, 2));
  console.log(`\njudges spent ≈ $${judgeCost.toFixed(2)} this run (cached verdicts are free)`);
  console.log("evidence: .fibre/model-quality/ (scorecard, the morning and pairs for a blind read; keys kept separately)");
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
