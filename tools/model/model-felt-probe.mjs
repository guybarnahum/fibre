// Whether cognition acts on what the Body says, before a Body mechanism is
// built (docs/validation/mechanism-dry-run.md, "what it cannot prove"):
// recorded requests are asked as they were and again with one felt line
// added to the Body, and the answers are compared by meaning. First use: the
// shared lens (claude/thematic-lens-design.md) — with "You have had your fill
// of <the Thread's own form of the method> for now", does less of what it
// reads, says and plans go through the method? Measurement only: nothing here
// reaches a Thread. Evidence is Thread-private and stays in .fibre/felt-probe/.
//
//   npm run model:felt-probe -- --chain nov25 --prompts encounter.reading,encounter.glance,social.live-turn,interior.flight-plan
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { reasoningIntegrationFor, selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { captures, pool } from "./model-recorded-requests.mjs";
import { parseModelSpec } from "../../infra/deployments/model-certifications.mjs";
import { lensOf, meaningOf, sharedMethod, textsIn } from "../ops/thread-chain.mjs";
import { createCloudflareEmbeddingAdapter } from "../../integrations/ai/embedding/cloudflare.mjs";

const FELT = "You have had your fill of {method} for now.";
// For a job whose prompt does not yet speak of the Body (reading, the day's
// plan), the sentence it would gain when it does: probe-only, never shipped from here.
const BODY_SENTENCE = "\n\nbody, when present, is how this Thread's own body feels now, in words. It is felt, not an order.";
const Z = 1.645;

function args(argv) {
  const o = { chain: null, env: "staging", prompts: ["encounter.reading", "encounter.glance", "social.live-turn", "interior.flight-plan"],
    model: null, limit: 20, felt: FELT, concurrency: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const [name, inline] = argv[i].split("=", 2), value = inline ?? argv[++i];
    if (name === "--chain") o.chain = value; else if (name === "--env") o.env = value;
    else if (name === "--prompts") o.prompts = value.split(","); else if (name === "--model") o.model = value;
    else if (name === "--limit") o.limit = Number(value); else if (name === "--felt") o.felt = value;
    else if (name === "--concurrency") o.concurrency = Number(value);
    else throw new Error(`unknown option ${name}`);
  }
  if (!o.chain) throw new Error("usage: model:felt-probe -- --chain <label of a thread:chain run> [--prompts a,b] [--model provider:model] [--limit 20]");
  return o;
}

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const subjectOf = (interest) => String(interest).split(":")[0].trim();

// The same request with one more felt line in its Body.
export function feltWith(input, line) {
  const copy = structuredClone(input);
  if (Array.isArray(copy.liveInteraction?.body) || (copy.liveInteraction && !Array.isArray(copy.body))) {
    copy.liveInteraction.body = [...(copy.liveInteraction.body ?? []), line];
  } else copy.body = [...(Array.isArray(copy.body) ? copy.body : []), line];
  return copy;
}

// Paired by request: the mean change in the share through the method, with its interval.
export function pairedChange(pairs) {
  const d = pairs.map(([a, b]) => b - a), n = d.length;
  if (n < 2) return null;
  const m = d.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(d.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
  return { change: m, low: m - Z * sd / Math.sqrt(n), high: m + Z * sd / Math.sqrt(n), n };
}

async function main() {
  const o = args(process.argv.slice(2));
  const root = resolve(new URL("../..", import.meta.url).pathname);
  const out = join(root, ".fibre/felt-probe"), cacheDir = join(out, "cache");
  await mkdir(cacheDir, { recursive: true });
  const chain = JSON.parse(await readFile(join(root, ".fibre/chain", `${o.env}-${o.chain}.json`), "utf8"));
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID, apiToken = process.env.CLOUDFLARE_AI_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) throw new Error("meaning needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN");
  const embedder = createCloudflareEmbeddingAdapter({ accountId, apiToken, modelId: "@cf/baai/bge-m3" });
  const interestsByThread = Object.fromEntries(Object.entries(chain.cards).map(([id, card]) => [id, card.texts?.interests ?? []]));
  const allInterests = Object.values(interestsByThread).flat();
  const interestVector = await meaningOf(allInterests, join(root, ".fibre/chain", "meaning-cache.json"), embedder);
  const method = sharedMethod({ interestsByThread, vectorOf: interestVector });
  if (method === null) { console.log("no method is shared by most Threads in that chain run: nothing to probe"); return; }

  const manifest = await loadDeploymentManifest(join(root, "infra/deployments/environments/cloudflare.yaml"));
  const base = resolveServiceDeployment(manifest, "world-kernel").integrations.encounter;
  const spec = parseModelSpec(o.model ?? `${base.provider}:${base.config.model}`);
  const adapter = selectReasoningIntegration(reasoningIntegrationFor(spec.provider, spec.model,
    { ...(spec.provider === base.provider ? base.config : { maxOutputTokens: 8000 }), ...spec.settings }), { environment: process.env });
  const cached = async (key, work) => {
    const file = join(cacheDir, `${digest(key)}.json`);
    try { return JSON.parse(await readFile(file, "utf8")); } catch {}
    const value = await work().then((output) => ({ output }), (error) => ({ error: String(error?.message ?? error).slice(0, 200) }));
    if (!value.error) await writeFile(file, JSON.stringify(value));
    return value;
  };
  console.log(`the shared method: ${Object.keys(method.members).length} Threads, their forms of it ${method.closeness} close · model ${spec.label} · felt "${o.felt}"`);

  const report = { chain: o.chain, model: spec.label, felt: o.felt, jobs: {} };
  for (const id of o.prompts) {
    const prompt = promptFor(id), live = prompt.latency === "live";
    const system = /\bbody\b/u.test(prompt.text) ? prompt.text : prompt.text + BODY_SENTENCE;
    const { found } = await captures(join(root, ".fibre/infra-measure"), id);
    const requests = found.filter((event) => method.members[event.scope] ?? method.members[event.input?.thread?.threadId]).slice(-o.limit);
    if (requests.length === 0) { console.log(`\n${id}: no recorded requests from the Threads that share the method`); continue; }
    const ask = (input, systemPrompt) => cached({ model: spec.label, prompt: id, version: prompt.version, systemPrompt, input }, async () => {
      if (!live) return (await adapter.invoke({ systemPrompt, input, responseSchema: requests[0].responseSchema,
        clientRequestId: `felt-probe_${digest(input).slice(0, 24)}`, latency: "minutes" })).output;
      let text = "";
      for await (const event of adapter.streamExpression({ systemPrompt, input, clientRequestId: `felt-probe_${digest(input).slice(0, 24)}` }))
        if (event?.type === "expression_delta") text += event.text;
      return { text };
    });
    let done = 0;
    const answered = await pool(requests, o.concurrency, async (event) => {
      const threadId = method.members[event.scope] ? event.scope : event.input.thread.threadId;
      const line = o.felt.replace("{method}", subjectOf(method.members[threadId]));
      const [asWas, felt] = await Promise.all([ask(event.input, prompt.text), ask(feltWith(event.input, line), system)]);
      console.log(JSON.stringify({ event: "felt-probe-progress", progress: `${id} ${++done}/${requests.length}` }));
      return { threadId, asWas, felt };
    });
    const usable = answered.filter((item) => !item.asWas.error && !item.felt.error);
    const texts = usable.flatMap((item) => [...textsIn(item.asWas.output), ...textsIn(item.felt.output)]);
    const vectorOf = await meaningOf([...texts, ...allInterests], join(out, "meaning-cache.json"), embedder);
    const shareOf = (item, output) => lensOf({ method, vectorOf, alternatives: interestsByThread[item.threadId] ?? [],
      texts: textsIn(output).map((text) => ({ carrier: id, text })) }).share;
    const pairs = usable.map((item) => [shareOf(item, item.asWas.output), shareOf(item, item.felt.output)])
      .filter(([a, b]) => a !== null && b !== null);
    const mean = (k) => pairs.length ? pairs.reduce((sum, pair) => sum + pair[k], 0) / pairs.length : null;
    const change = pairedChange(pairs);
    report.jobs[id] = { requests: requests.length, failed: answered.length - usable.length, compared: pairs.length,
      asWas: mean(0), felt: mean(1), change };
    const pct = (v) => v === null ? "—" : `${Math.round(v * 100)}%`;
    console.log(`\n${id}: ${pairs.length} requests compared${answered.length - usable.length ? ` (${answered.length - usable.length} failed)` : ""}`);
    console.log(`  through the method: as it was ${pct(mean(0))} · with the felt line ${pct(mean(1))}`
      + (change ? ` · change ${Math.round(change.change * 100)} points [${Math.round(change.low * 100)}, ${Math.round(change.high * 100)}]` : ""));
  }
  const stamp = new Date().toISOString().replaceAll(":", "-");
  await writeFile(join(out, `felt-probe-${o.chain}-${stamp}.json`), JSON.stringify(report, null, 2));
  console.log(`\nreading it: a fall of 20 points or more means the cognition acts on fullness, and the dry run's cure can work through felt words; little or none means the model leans to the method on its own (the dry run's μ 0.4), and the cure needs more than felt words.`);
  console.log(`evidence: .fibre/felt-probe/felt-probe-${o.chain}-${stamp}.json`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main().catch((error) => { console.error(error?.message ?? error); process.exitCode = 1; });
}
