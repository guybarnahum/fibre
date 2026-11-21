// What each World job may think with, and what it costs (Guy, November 21):
// for every cognitive job, the model it runs on now, the models certified for
// its current prompt version with their cost per 1,000 calls, and, from the
// latest recorded day (model:captures), its calls and cost per Thread per day.
// Read-only.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { CERTIFICATIONS_PATH } from "../../infra/deployments/model-certifications.mjs";
import { PROMPTS } from "../../services/world-kernel/src/generated/prompts.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const money = (value) => value === null || value === undefined ? "—" : `$${value < 0.1 ? value.toFixed(3) : value.toFixed(2)}`;

// Calls per prompt per day and the Threads they came from, from the newest recorded day.
async function recordedDay() {
  const directory = join(REPO_ROOT, ".fibre", "infra-measure");
  const files = (await readdir(directory).catch(() => [])).filter((name) => name.startsWith("model-captures-")).sort();
  if (files.length === 0) return null;
  const day = JSON.parse(await readFile(join(directory, files.at(-1)), "utf8"));
  const days = (Date.parse(day.to) - Date.parse(day.from)) / 86_400_000;
  // A job cached per Thread has one scope per Thread, so the busiest such job
  // shows how many Threads lived in the window; World jobs are shared by all.
  const calls = new Map(), scopes = new Map();
  for (const event of day.events) {
    const id = String(event.prompt).split("@")[0];
    calls.set(id, (calls.get(id) ?? 0) + 1 / days);
    if (PROMPTS[id]?.cache === "thread") scopes.set(id, (scopes.get(id) ?? new Set()).add(event.scope));
  }
  const threads = Math.max(1, ...[...scopes.values()].map((seen) => seen.size));
  return { file: files.at(-1), calls, threads };
}

const manifest = await loadDeploymentManifest(join(REPO_ROOT, "infra/deployments/environments/cloudflare.yaml"));
const integrations = resolveServiceDeployment(manifest, "world-kernel").integrations;
const portModel = `${integrations.encounter.provider}:${integrations.encounter.config.model}`;
const record = JSON.parse(await readFile(join(REPO_ROOT, CERTIFICATIONS_PATH), "utf8"));
const day = await recordedDay();
console.log(day ? `calls per day from ${day.file}, ${day.threads} Threads lived in it (World jobs are shared among them)` : "no recorded day yet (npm run model:captures): calls per day unknown");
let total = 0;
for (const [id, prompt] of Object.entries(PROMPTS).sort()) {
  const routed = integrations[id]?.kind === "ai.reasoning" ? `${integrations[id].provider}:${integrations[id].config.model}` : null;
  const now = routed ?? portModel;
  const certified = record.certifications.filter((item) => item.prompt === id && item.promptVersion === prompt.version);
  const stale = record.certifications.filter((item) => item.prompt === id && item.promptVersion !== prompt.version).length;
  const perThread = day ? (day.calls.get(id) ?? 0) / day.threads : null;
  const current = certified.find((item) => `${item.provider}:${item.model}` === now);
  if (perThread && current?.costPer1000Calls != null) total += perThread * current.costPer1000Calls / 1000;
  console.log(`\n${id}@${prompt.version} (${prompt.depth})  runs on ${now}${routed ? "" : " (port default)"}`
    + (perThread === null ? "" : ` · ${perThread.toFixed(1)} calls per Thread per day`));
  if (certified.length === 0) console.log(`  no certification yet${stale ? ` (${stale} for an earlier version)` : ""}`);
  for (const item of [...certified].sort((a, b) => (a.costPer1000Calls ?? Infinity) - (b.costPer1000Calls ?? Infinity))) {
    const daily = perThread === null || item.costPer1000Calls == null ? null : perThread * item.costPer1000Calls / 1000;
    console.log(`  ${item.verdict.toUpperCase().padEnd(9)} ${item.provider}:${item.model}  ${money(item.costPer1000Calls)} per 1,000 calls`
      + (daily === null ? "" : ` · ${money(daily)} per Thread per day`) + `  (${item.certifiedAt}, ${item.requests} requests)`);
  }
}
if (day) console.log(`\ncertified jobs as they run now: ${money(total)} per Thread per day (jobs without a certification of their current model not counted)`);
