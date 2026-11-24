// Recorded requests from the World's own logs (Cloudflare Workers Logs), so a
// job that comes a few times an hour, such as a reflection, can be gathered
// over a day instead of only while a live tail runs. Writes the same evidence
// model:replay and model:quality read. Thread-private: kept under .fibre/,
// never committed. Read-only: nothing in the World changes.
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { environmentResourceName, normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const USAGE = "usage: model:captures -- --env staging [--hours 24] [--prompt experience.consolidation]";
const HOUR_MS = 3_600_000;
const PAGE = 100;

function options(argv) {
  const config = { env: null, hours: 24, prompt: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env") config.env = normalizeCloudflareEnvironment(argv[++i]);
    else if (argv[i] === "--hours") config.hours = Number(argv[++i]);
    else if (argv[i] === "--prompt") config.prompt = argv[++i];
    else throw new TypeError(USAGE);
  }
  if (config.env === null || !(config.hours > 0 && config.hours <= 168)) throw new TypeError(USAGE);
  return config;
}

// Log events as Workers Logs returns them, back into recorded requests. A
// capture whose record did not survive whole is counted, never guessed at.
export function recordedRequests(logEvents) {
  const events = [], skipped = [], meanings = [];
  let broken = 0;
  for (const item of logEvents) {
    let source = item?.source;
    if (typeof source === "string") try { source = JSON.parse(source); } catch { continue; }
    // When the log was written, so each request can be placed in a Thread's day.
    const stamp = Number(item?.timestamp ?? item?.$metadata?.timestamp);
    const at = Number.isFinite(stamp) && stamp > 0 ? new Date(stamp).toISOString() : null;
    // World's measure of same ground (S5b): how close each exchange came, never its words.
    if (source?.event === "meaning-call") { meanings.push({ kind: source.kind ?? null, outcome: source.outcome,
      cosine: typeof source.cosine === "number" ? source.cosine : null, threadId: source.threadId ?? null, at }); continue; }
    if (source?.event === "model-capture-skipped") { skipped.push({ prompt: source.prompt, chars: source.chars }); continue; }
    if (source?.event !== "model-capture" || typeof source.capture !== "string") continue;
    try { JSON.parse(source.capture); } catch { broken += 1; continue; }
    events.push({ event: "model-capture", kind: source.kind, prompt: source.prompt, depth: source.depth,
      scope: source.scope, modelId: source.modelId, at, capture: source.capture });
  }
  return { events, skipped, broken, meanings };
}

async function query({ accountId, token, service, prompt, from, to }) {
  const filters = [
    { key: "$metadata.service", operation: "eq", type: "string", value: service },
    { key: "event", operation: "in", type: "string", value: "model-capture,model-capture-skipped,meaning-call" },
    ...(prompt ? [{ key: "prompt", operation: "starts_with", type: "string", value: `${prompt}@` }] : []),
  ];
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ queryId: "fibre-model-captures", view: "events", limit: PAGE, timeframe: { from, to },
      parameters: { filters, filterCombination: "and" } }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const why = body?.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`Workers Logs query failed (${response.status}): ${why}`);
  }
  return body?.result?.events?.events ?? [];
}

// Each hour on its own; a window that comes back full is split, so no
// request is lost to a page limit.
async function gather(ask, from, to) {
  const events = await ask(from, to);
  if (events.length < PAGE || to - from < 60_000) return events;
  const middle = Math.floor((from + to) / 2);
  return [...await gather(ask, from, middle), ...await gather(ask, middle, to)];
}

async function main(argv) {
  const args = options(argv);
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.FIBRE_CLOUDFLARE_OBSERVABILITY_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers Observability read) are required");
  const service = environmentResourceName("fibre-world-kernel", args.env);
  const to = Date.now(), from = to - args.hours * HOUR_MS;
  const ask = (start, end) => query({ accountId, token, service, prompt: args.prompt, from: start, to: end });
  const logEvents = [];
  for (let start = from; start < to; start += HOUR_MS) logEvents.push(...await gather(ask, start, Math.min(to, start + HOUR_MS)));
  const { events, skipped, broken, meanings } = recordedRequests(logEvents);
  const directory = resolve(REPO_ROOT, ".fibre", "infra-measure");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `model-captures-${args.env}-${new Date(to).toISOString().replace(/[:.]/gu, "-")}.json`);
  await writeFile(path, JSON.stringify({ source: "workers-logs", service, from: new Date(from).toISOString(),
    to: new Date(to).toISOString(), events, meanings }) + "\n");
  const byPrompt = new Map();
  for (const event of events) byPrompt.set(event.prompt, (byPrompt.get(event.prompt) ?? 0) + 1);
  console.log(`${service}, last ${args.hours} h: ${events.length} recorded requests`);
  for (const [prompt, count] of [...byPrompt].sort()) console.log(`  ${prompt}  ${count}`);
  if (skipped.length) console.log(`  too long to record: ${skipped.length} (${[...new Set(skipped.map((item) => item.prompt))].join(", ")})`);
  if (broken) console.log(`  cut short in the logs, left out: ${broken}`);
  // How close exchanges came to earlier ground, for setting S5b's thresholds.
  const measured = meanings.filter((item) => item.cosine !== null).map((item) => item.cosine).sort((a, b) => a - b);
  if (meanings.length) {
    const at = (q) => measured.length ? measured[Math.min(measured.length - 1, Math.floor(q * measured.length))].toFixed(2) : "—";
    console.log(`same ground by meaning: ${meanings.length} measures (${meanings.filter((item) => item.outcome === "failed").length} failed)`
      + ` · closeness p10 ${at(0.1)} · p50 ${at(0.5)} · p90 ${at(0.9)} · max ${measured.length ? measured.at(-1).toFixed(2) : "—"}`);
  }
  console.log(`Evidence: ${path}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`Model captures: ${error.message}\n`);
    process.exitCode = 1;
  });
}
