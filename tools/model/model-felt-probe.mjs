// Whether cognition acts on what the Body says, before a Body mechanism is
// built (docs/validation/mechanism-dry-run.md, "what it cannot prove"):
// recorded requests are asked as they were and again with one felt line
// added to the Body, and the answers are compared by meaning. First use: the
// shared lens (claude/thematic-lens-design.md) — with "You have had your fill
// of <the Thread's own form of the method> for now", does less of what it
// reads, says and plans go through the method? Measurement only: nothing here
// reaches a Thread. Evidence is Thread-private and stays in .fibre/felt-probe/.
//
// Arms, each against the request as it was:
//   felt  the felt line added to the Body;
//   thin  what comes to mind thinned as a full Body's retrieval would thin it:
//         in each list of memories, states and other evidence, the half closest
//         to the method (and at least 0.6 close) is left out, but for its first;
//   both  the two together;
//   voiced the felt line, with the prompts' "It is felt, not an order"
//         saying instead that people mostly act on how they feel, though not always;
//   all   thinned, felt and voiced.
// --method names the method in the felt line (default: the Thread's own form of it).
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
const VOICED = "It is how this person feels now, and people mostly act on how they feel, though not always";
const voiced = (text) => text.replaceAll("It is felt, not an order", VOICED);

function args(argv) {
  const o = { chain: null, env: "staging", prompts: ["encounter.reading", "encounter.glance", "social.live-turn", "interior.flight-plan"],
    model: null, limit: 20, felt: FELT, concurrency: 3, arms: ["felt", "thin", "both", "voiced", "all"], method: null };
  for (let i = 0; i < argv.length; i += 1) {
    const [name, inline] = argv[i].split("=", 2), value = inline ?? argv[++i];
    if (name === "--chain") o.chain = value; else if (name === "--env") o.env = value;
    else if (name === "--prompts") o.prompts = value.split(","); else if (name === "--model") o.model = value;
    else if (name === "--limit") o.limit = Number(value); else if (name === "--felt") o.felt = value;
    else if (name === "--concurrency") o.concurrency = Number(value);
    else if (name === "--arms") o.arms = value.split(","); else if (name === "--method") o.method = value;
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

// What comes to mind, thinned: in each list of the request (and the Thread's
// own intentions), the half of its items closest to the method, and at least
// floor close, is left out but for the first of them. closeness(item) is how
// close an item is to the method, or null when unknown. A memory is long and
// mixed, so its closeness is read against its own list, never against the
// method's own short statements.
export function thinned(input, closeness, floor = 0.6) {
  const copy = structuredClone(input);
  const thin = (list) => {
    const values = list.map(closeness), known = values.filter((v) => v !== null).sort((a, b) => a - b);
    if (known.length === 0) return list;
    const cut = Math.max(floor, known[Math.floor(known.length / 2)]);
    let kept = false;
    return list.filter((_, i) => { if (values[i] === null || values[i] < cut) return true; if (kept) return false; kept = true; return true; });
  };
  for (const [key, value] of Object.entries(copy)) if (Array.isArray(value)) copy[key] = thin(value);
  if (Array.isArray(copy.thread?.unresolvedIntentions)) copy.thread.unresolvedIntentions = thin(copy.thread.unresolvedIntentions);
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
  for (const id of o.prompts) try {
    const prompt = promptFor(id), live = prompt.latency === "live";
    const system = /\bbody\b/u.test(prompt.text) ? prompt.text : prompt.text + BODY_SENTENCE;
    const { found } = await captures(join(root, ".fibre/infra-measure"), id);
    const requests = found.filter((event) => method.members[event.input?.thread?.threadId]).slice(-o.limit);
    if (requests.length === 0) { console.log(`\n${id}: no recorded requests from the Threads that share the method`); continue; }
    const ask = (input, systemPrompt) => cached({ model: spec.label, prompt: id, version: prompt.version, systemPrompt, input }, async () => {
      if (!live) return (await adapter.invoke({ systemPrompt, input, responseSchema: requests[0].responseSchema,
        clientRequestId: `felt-probe_${digest(input).slice(0, 24)}`, latency: "minutes" })).output;
      let text = "";
      for await (const event of adapter.streamExpression({ systemPrompt, input, clientRequestId: `felt-probe_${digest(input).slice(0, 24)}` }))
        if (event?.type === "expression_delta") text += event.text;
      return { text };
    });
    // What the requests hold, by meaning, to thin what is close to the method.
    const itemText = (item) => textsIn(item).join(" ").slice(0, 1200);
    const itemTexts = requests.flatMap((event) => [...Object.values(event.input).filter(Array.isArray).flat(),
      ...(event.input.thread?.unresolvedIntentions ?? [])].map(itemText).filter((text) => text.length >= 20));
    const itemVector = o.arms.some((arm) => arm !== "felt")
      ? await meaningOf(itemTexts, join(out, "meaning-cache.json"), embedder) : () => null;
    const closeTo = (item) => { const v = itemVector(itemText(item)); if (!v) return null;
      const length = Math.hypot(...v); return v.reduce((sum, x, i) => sum + x / length * method.probe[i], 0); };
    let done = 0;
    const answered = await pool(requests, o.concurrency, async (event) => {
      const threadId = event.input.thread.threadId;
      const line = o.felt.replace("{method}", o.method ?? subjectOf(method.members[threadId]));
      const arms = { asWas: () => ask(event.input, prompt.text), felt: () => ask(feltWith(event.input, line), system),
        thin: () => ask(thinned(event.input, closeTo), prompt.text), both: () => ask(feltWith(thinned(event.input, closeTo), line), system),
        voiced: () => ask(feltWith(event.input, line), voiced(system)),
        all: () => ask(feltWith(thinned(event.input, closeTo), line), voiced(system)) };
      const results = Object.fromEntries(await Promise.all(["asWas", ...o.arms].map(async (arm) => [arm, await arms[arm]()])));
      console.log(JSON.stringify({ event: "felt-probe-progress", progress: `${id} ${++done}/${requests.length}` }));
      return { threadId, ...results };
    });
    const usable = answered.filter((item) => ["asWas", ...o.arms].every((arm) => !item[arm].error));
    const texts = usable.flatMap((item) => ["asWas", ...o.arms].flatMap((arm) => textsIn(item[arm].output)));
    const vectorOf = await meaningOf([...texts, ...allInterests], join(out, "meaning-cache.json"), embedder);
    const shareOf = (item, output) => lensOf({ method, vectorOf, alternatives: interestsByThread[item.threadId] ?? [],
      texts: textsIn(output).map((text) => ({ carrier: id, text })) }).share;
    const pct = (v) => v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;
    report.jobs[id] = { requests: requests.length, failed: answered.length - usable.length, arms: {} };
    console.log(`\n${id}: ${usable.length} requests compared${answered.length - usable.length ? ` (${answered.length - usable.length} failed)` : ""}`);
    for (const arm of o.arms) {
      const pairs = usable.map((item) => [shareOf(item, item.asWas.output), shareOf(item, item[arm].output)])
        .filter(([a, b]) => a !== null && b !== null);
      const mean = (k) => pairs.length ? pairs.reduce((sum, pair) => sum + pair[k], 0) / pairs.length : null;
      const change = pairedChange(pairs);
      report.jobs[id].arms[arm] = { compared: pairs.length, asWas: mean(0), arm: mean(1), change };
      console.log(`  ${arm.padEnd(6)} through the method: as it was ${pct(mean(0))} · ${pct(mean(1))}`
        + (change ? ` · change ${Math.round(change.change * 100)} points [${Math.round(change.low * 100)}, ${Math.round(change.high * 100)}]` : ""));
    }
  } catch (error) {
    // A passing failure (the network) ends this job, not the run; what was asked is cached for the next.
    console.log(`\n${id}: not finished (${String(error?.message ?? error).slice(0, 120)}); run again to continue from the cache`);
  }
  const stamp = new Date().toISOString().replaceAll(":", "-");
  await writeFile(join(out, `felt-probe-${o.chain}-${stamp}.json`), JSON.stringify(report, null, 2));
  console.log(`\nreading it: a fall of 20 points or more in an arm means that part of the Body can cure the lens with this model. felt: the felt words alone; thin: what comes to mind, as a full Body's retrieval would thin it; both: the two. A fall in "thin" but not "felt" means the cure must act on what comes to mind, not only on what is said; a fall in "voiced" means our own prompts teach the model to discount the Body. The measure counts setting the method aside as being about it, so falls are, if anything, understated.`);
  console.log(`evidence: .fibre/felt-probe/felt-probe-${o.chain}-${stamp}.json`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main().catch((error) => { console.error(error?.message ?? error); process.exitCode = 1; });
}
