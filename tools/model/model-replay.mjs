// Replay recorded requests of one cognitive job against the current model
// (twice) and a candidate model (once), and judge the candidate by the
// standard in model-replay-judge.mjs. Requests come from `model-capture`
// events saved by `infra:measure` while capture is on for that job's depth.
//
//   npm run model:replay -- --prompt encounter.attention --candidate-model gpt-5.6-luna
//   npm run model:replay -- --prompt contact.decision --candidate-provider google --candidate-model gemini-3.6-flash
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

function args(argv) {
  const options = { prompt: null, candidateProvider: "openai", candidateModel: null, limit: 200,
    concurrency: 4, evidence: ".fibre/infra-measure", env: "cloudflare" };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].split("=", 2);
    const value = inline ?? argv[++index];
    if (name === "--prompt") options.prompt = value;
    else if (name === "--candidate-provider") options.candidateProvider = value;
    else if (name === "--candidate-model") options.candidateModel = value;
    else if (name === "--limit") options.limit = Number(value);
    else if (name === "--concurrency") options.concurrency = Number(value);
    else if (name === "--evidence") options.evidence = value;
    else throw new Error(`unknown option ${name}`);
  }
  if (!options.prompt || !options.candidateModel) {
    throw new Error("usage: model:replay -- --prompt <id> --candidate-model <model> [--candidate-provider openai|google] [--limit 200]");
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

function textOf(output) {
  return JSON.stringify(output, null, 2);
}

async function main() {
  const options = args(process.argv.slice(2));
  const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
  const manifest = await loadDeploymentManifest(join(repoRoot, "infra/deployments/environments/cloudflare.yaml"));
  const baselineValue = resolveServiceDeployment(manifest, "world-kernel").integrations.encounter;
  const baseline = selectReasoningIntegration(baselineValue, { environment: process.env });
  const candidate = selectReasoningIntegration({
    kind: "ai.reasoning", provider: options.candidateProvider,
    config: { ...baselineValue.config, model: options.candidateModel },
    secrets: { apiKey: options.candidateProvider === "google" ? "GEMINI_API_KEY" : "OPENAI_API_KEY" },
  }, { environment: process.env });

  const { found, stale } = await captures(resolve(repoRoot, options.evidence), options.prompt);
  const chosen = found.slice(-options.limit);
  console.log(`${options.prompt}: ${chosen.length} recorded requests (${stale} under an older prompt version skipped)`);
  if (chosen.length === 0) return;
  const prompt = promptFor(options.prompt);
  const ask = (adapter, event, run) => adapter.invoke({
    systemPrompt: prompt.text, input: event.input, responseSchema: event.responseSchema,
    clientRequestId: `replay_${run}_${createHash("sha256").update(JSON.stringify(event.input)).digest("hex").slice(0, 24)}`,
    latency: "minutes",
  }).then((result) => result.output, (error) => ({ replayError: String(error?.message ?? error).slice(0, 200) }));

  const answered = await pool(chosen, options.concurrency, async (event) => ({
    prompt: event.prompt, scope: event.scope, eventKey: sharedEventKey(event.prompt, event.input),
    baseline: [await ask(baseline, event, "a"), await ask(baseline, event, "b")],
    candidate: await ask(candidate, event, "c"),
  }));
  const failed = answered.filter((item) => [...item.baseline, item.candidate].some((output) => output?.replayError));
  if (failed.length > 0) console.log(`${failed.length} requests failed to replay, e.g. ${JSON.stringify([...failed[0].baseline, failed[0].candidate].find((output) => output?.replayError))}`);
  const cases = answered.filter((item) => !failed.includes(item));

  const verdict = judgeReplay(cases);
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const out = join(repoRoot, ".fibre/model-replay");
  await mkdir(out, { recursive: true });
  await writeFile(join(out, `replay-${options.prompt}-${stamp}.json`), JSON.stringify({
    prompt: options.prompt, baselineModel: baselineValue.config.model,
    candidate: { provider: options.candidateProvider, model: options.candidateModel }, verdict, cases,
  }, null, 2));

  // A blind read: the same request answered by the current model and the
  // candidate, in random order; the key is kept in a separate file.
  const sample = cases.slice(0, BLIND_READ_PAIRS);
  const key = [];
  const read = sample.map((item, index) => {
    const candidateFirst = Math.random() < 0.5;
    key.push({ pair: index + 1, candidate: candidateFirst ? "A" : "B" });
    const [a, b] = candidateFirst ? [item.candidate, item.baseline[0]] : [item.baseline[0], item.candidate];
    return `## Pair ${index + 1}\n\n### A\n\n\`\`\`json\n${textOf(a)}\n\`\`\`\n\n### B\n\n\`\`\`json\n${textOf(b)}\n\`\`\`\n`;
  });
  await writeFile(join(out, `blind-read-${options.prompt}-${stamp}.md`),
    `# Blind read — ${options.prompt}\n\nFor each pair, which answer reads more like this person? Note A, B or same.\n\n${read.join("\n")}`);
  await writeFile(join(out, `blind-read-key-${options.prompt}-${stamp}.json`), JSON.stringify(key, null, 2));

  const percent = (value) => value === null || value === undefined ? "—" : `${(value * 100).toFixed(0)}%`;
  console.log(`cases ${verdict.cases ?? 0} · decisions ${decisionOf(options.prompt, cases[0]?.baseline[0]) === null ? "text only" : "compared"}`);
  if (verdict.selfAgreement !== undefined) {
    console.log(`current model agrees with itself ${percent(verdict.selfAgreement)} · candidate agrees with it ${percent(verdict.candidateAgreement)}`);
    console.log(`largest outcome-rate gap ${percent(verdict.rateGap)} · shared events ${verdict.sharedEvents} · Threads decide differently: current ${percent(verdict.baselineDifference)}, candidate ${percent(verdict.candidateDifference)}`);
  }
  console.log(`verdict: ${verdict.verdict}${verdict.failures?.length ? " — " + verdict.failures.join("; ") : ""}`);
  console.log(`evidence: .fibre/model-replay/ (blind read of ${sample.length} pairs; key kept separately)`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
