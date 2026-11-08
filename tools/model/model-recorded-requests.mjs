// Recorded requests of one cognitive job (`model-capture` events kept by
// infra:measure), and what answering them costs. Shared by model:replay and
// model:quality. Evidence is Thread-private and never committed.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";

// List prices per million tokens (input, cached input, output), standard tier,
// checked November 7, 2026 (OpenAI announcement of July 30, 2026; Google list
// price). OpenAI flex is half. Verify before budgeting.
export const PRICES = Object.freeze({
  "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30, flex: 0.5 },
  "gpt-5.6-terra": { input: 2, cached: 0.2, output: 12, flex: 0.5 },
  "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2, flex: 0.5 },
  "gemini-3.6-flash": { input: 0.75, cached: 0.075, output: 3.75, flex: 1 },
  // Claude Opus 5.5 list price, checked November 8, 2026; judge only.
  "claude-opus-5-5": { input: 4, cached: 0.4, output: 20, flex: 1 },
});

export async function captures(directory, promptId) {
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

export async function pool(items, size, work) {
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
export function costOf(model, usage, serviceTier) {
  const price = PRICES[model];
  if (!price || !usage) return null;
  const tier = serviceTier === "flex" ? price.flex : 1;
  const cached = Number(usage.cachedInputTokens ?? 0);
  const fresh = Math.max(0, Number(usage.inputTokens ?? 0) - cached);
  return tier * (fresh * price.input + cached * price.cached + Number(usage.outputTokens ?? 0) * price.output) / 1e6;
}

export function mean(values) {
  const known = values.filter((value) => Number.isFinite(value));
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0) / known.length;
}

