// Replay recorded requests of one cognitive job against the current model
// (twice) and one or more candidate models (once each), and judge each
// candidate by the standard in model-replay-judge.mjs, with what each would
// cost per call at list prices. Requests come from `model-capture` events
// saved by `infra:measure` while capture is on for that job's depth.
//
//   npm run model:replay -- --prompt encounter.attention --candidates openai:gpt-5.6-luna,google:gemini-3.6-flash
//
// Evidence (Thread-private; never committed) goes to .fibre/model-replay/.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { decisionOf, judgeReplay, sharedEventKey } from "./model-replay-judge.mjs";

const BLIND_READ_PAIRS = 20;

// List prices per million tokens (input, cached input, output), standard tier,
// checked November 7, 2026 (OpenAI announcement of July 30, 2026; Google list
// price). OpenAI flex is half. Verify before budgeting.
const PRICES = Object.freeze({
  "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30, flex: 0.5 },
  "gpt-5.6-terra": { input: 2, cached: 0.2, output: 12, flex: 0.5 },
  "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2, flex: 0.5 },
  "gemini-3.6-flash": { input: 0.75, cached: 0.075, output: 3.75, flex: 1 },
});

function args(argv) {
  const options = { prompt: null, candidates: [], limit: 200, concurrency: 4, evidence: ".fibre/infra-measure" };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].split("=", 2);
    const value = inline ?? argv[++index];
    if (name === "--prompt") options.prompt = value;
    else if (name === "--candidates") {
      options.candidates = value.split(",").map((item) => {
        const [provider, model] = item.includes(":") ? item.split(":", 2) : ["openai", item];
        return { provider, model };
      });
    } else if (name === "--limit") options.limit = Number(value);
    else if (name === "--concurrency") options.concurrency = Number(value);
    else if (name === "--evidence") options.evidence = value;
    else throw new Error(`unknown option ${name}`);
  }
  if (!options.prompt || options.candidates.length === 0) {
    throw new Error("usage: model:replay -- --prompt <id> --candidates openai:<model>[,google:<model>] [--limit 200]");
  }
  return options;
}

async function captures(directory, promptId) {
  const current = promptFor(promptId);
  const seen = new Set();
  const found = [];
  let stale = 0;
  for (const name of (await readdir(directory)).filter((file) => file.endsWith(".json")).sort()) {
    const evidence = JSON.parse(await readFile(join(directory, name), "utf8"));
    for (const event of evidence.events ?? []) {
      if (event.event !== "model-capture" || String(event.prompt).split("@")[0] !== promptId) continue;
      // A request recorded under an earlier prompt version is not this job any more.
      if (event.prompt !== `${current.id}@${current.version}`) { stale += 1; continue; }
      const key = createHash("sha256").update(JSON.stringify(event.input)).digest("hex");
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(event);
    }
  }
  return { found, stale };
}

async function pool(items, size, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index], index);
    }
  }));
  return results;
}

// Dollars for one answer at the tier it was served.
function costOf(model, usage, serviceTier) {
  const price = PRICES[model];
  if (!price || !usage) return null;
  const tier = serviceTier === "flex" ? price.flex : 1;
  const cached = Number(usage.cachedInputTokens ?? 0);
  const fresh = Math.max(0, Number(usage.inputTokens ?? 0) - cached);
  return tier * (fresh * price.input + cached * price.cached + Number(usage.outputTokens ?? 0) * price.output) / 1e6;
}

function mean(values) {
  const known = values.filter((value) => Number.isFinite(value));
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0) / known.length;
}

async function main() {
  const options = args(process.argv.slice(2));
  const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
  const manifest = await loadDeploymentManifest(join(repoRoot, "infra/deployments/environments/cloudflare.yaml"));
  const baselineValue = resolveServiceDeployment(manifest, "world-kernel").integrations.encounter;
  const baselineModel = baselineValue.config.model;
  const adapters = new Map([[baselineModel, selectReasoningIntegration(baselineValue, { environment: process.env })]]);
  for (const { provider, model } of options.candidates) {
    adapters.set(model, selectReasoningIntegration({
      kind: "ai.reasoning", provider, config: { ...baselineValue.config, model },
      secrets: { apiKey: provider === "google" ? "GEMINI_API_KEY" : "OPENAI_API_KEY" },
    }, { environment: process.env }));
  }

  const { found, stale } = await captures(resolve(repoRoot, options.evidence), options.prompt);
  const chosen = found.slice(-options.limit);
  console.log(`${options.prompt}: ${chosen.length} recorded requests (${stale} under an older prompt version skipped)`);
  if (chosen.length === 0) return;
  const prompt = promptFor(options.prompt);
  const ask = (model, event, run) => adapters.get(model).invoke({
    systemPrompt: prompt.text, input: event.input, responseSchema: event.responseSchema,
    clientRequestId: `replay_${run}_${createHash("sha256").update(JSON.stringify(event.input)).digest("hex").slice(0, 24)}`,
    latency: "minutes",
  }).then(
    (result) => ({ output: result.output, cost: costOf(model, result.provenance?.usage, result.provenance?.serviceTier) }),
    (error) => ({ error: String(error?.message ?? error).slice(0, 200) }),
  );

  // Progress lines for run-with-progress: one per request fully answered.
  let done = 0;
  const models = [`${baselineModel} ×2`, ...options.candidates.map(({ model }) => model)].join(", ");
  const progress = () => console.log(JSON.stringify({ event: "model-replay-progress",
    progress: `${options.prompt} [${done}/${chosen.length}] answered by ${models}` }));
  progress();
  const answered = await pool(chosen, options.concurrency, async (event) => {
    const answers = { baseline: [await ask(baselineModel, event, "a"), await ask(baselineModel, event, "b")] };
    for (const { model } of options.candidates) answers[model] = await ask(model, event, model);
    done += 1;
    progress();
    return { prompt: event.prompt, scope: event.scope, eventKey: sharedEventKey(event.prompt, event.input), answers };
  });

  const stamp = new Date().toISOString().replaceAll(":", "-");
  const out = join(repoRoot, ".fibre/model-replay");
  await mkdir(out, { recursive: true });
  const percent = (value) => value === null || value === undefined ? "—" : `${(value * 100).toFixed(0)}%`;
  const dollars = (value) => value === null ? "cost unknown" : `$${(value * 1000).toFixed(2)} per 1,000 calls`;
  const baselineCost = mean(answered.flatMap((item) => item.answers.baseline.map((answer) => answer.cost)));
  console.log(`current ${baselineModel}: ${dollars(baselineCost)}`);
  const report = { prompt: options.prompt, baselineModel, baselineCostPerCall: baselineCost, candidates: [] };

  for (const { provider, model } of options.candidates) {
    const usable = answered.filter((item) => ![...item.answers.baseline, item.answers[model]].some((answer) => answer.error));
    const failures = answered.length - usable.length;
    const cases = usable.map((item) => ({ prompt: item.prompt, scope: item.scope, eventKey: item.eventKey,
      baseline: item.answers.baseline.map((answer) => answer.output), candidate: item.answers[model].output }));
    const verdict = judgeReplay(cases);
    const cost = mean(answered.map((item) => item.answers[model].cost));
    report.candidates.push({ provider, model, failures, costPerCall: cost, verdict });

    console.log(`\n${provider}:${model} — ${dollars(cost)}${baselineCost && cost ? ` (${(cost / baselineCost * 100).toFixed(0)}% of current)` : ""}`);
    if (failures > 0) {
      const example = answered.flatMap((item) => [...item.answers.baseline, item.answers[model]]).find((answer) => answer.error);
      console.log(`  ${failures} of ${answered.length} requests could not be compared, e.g. ${example?.error}`);
    }
    if (verdict.selfAgreement !== undefined) {
      console.log(`  current agrees with itself ${percent(verdict.selfAgreement)} · candidate agrees with it ${percent(verdict.candidateAgreement)}`);
      console.log(`  largest outcome-rate gap ${percent(verdict.rateGap)} · shared events ${verdict.sharedEvents} · Threads decide differently: current ${percent(verdict.baselineDifference)}, candidate ${percent(verdict.candidateDifference)}`);
    }
    console.log(`  verdict: ${verdict.verdict}${verdict.failures?.length ? " — " + verdict.failures.join("; ") : ""}`);

    // A blind read: the same request answered by the current model and the
    // candidate, in random order; the key is kept in a separate file.
    const sample = cases.slice(0, BLIND_READ_PAIRS);
    const key = [];
    const read = sample.map((item, index) => {
      const candidateFirst = Math.random() < 0.5;
      key.push({ pair: index + 1, candidate: candidateFirst ? "A" : "B" });
      const [a, b] = candidateFirst ? [item.candidate, item.baseline[0]] : [item.baseline[0], item.candidate];
      return `## Pair ${index + 1}\n\n### A\n\n\`\`\`json\n${JSON.stringify(a, null, 2)}\n\`\`\`\n\n### B\n\n\`\`\`json\n${JSON.stringify(b, null, 2)}\n\`\`\`\n`;
    });
    await writeFile(join(out, `blind-read-${options.prompt}-${model}-${stamp}.md`),
      `# Blind read — ${options.prompt}\n\nFor each pair, which answer reads more like this person? Note A, B or same.\n\n${read.join("\n")}`);
    await writeFile(join(out, `blind-read-key-${options.prompt}-${model}-${stamp}.json`), JSON.stringify(key, null, 2));
  }
  await writeFile(join(out, `replay-${options.prompt}-${stamp}.json`), JSON.stringify({ ...report, answered }, null, 2));
  console.log(`\nevidence: .fibre/model-replay/ (verdicts, answers, blind reads; keys kept separately)`);
  const answeredOnce = answered.find((item) => item.answers.baseline[0].output !== undefined);
  if (answeredOnce && decisionOf(options.prompt, answeredOnce.answers.baseline[0].output) === null) {
    console.log("this job answers only in text: the blind read decides it");
  } else if (options.prompt.startsWith("world.")) {
    console.log("what happens is text: read the blind read too");
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
