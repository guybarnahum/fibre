// Whether a Thread can perceive friction (Nov 25). On staging no Thread read
// another's words as anything but credit, plain regard, advice sought or
// giving way: 391 live turns, not one correction, talking over, holding
// ground or overlooking. Either nobody gives friction, or the reader cannot
// see it. This asks recorded live turns again with the other person's words
// replaced by plain friction, and counts how the Thread takes them, and
// whether its reply pushes back. Measurement only: nothing here reaches a
// Thread. Evidence is Thread-private and stays in .fibre/regard-probe/.
//
//   npm run model:regard-probe -- [--limit 30] [--model provider:model]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { reasoningIntegrationFor, selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { captures, pool } from "./model-recorded-requests.mjs";
import { parseModelSpec } from "../../infra/deployments/model-certifications.mjs";
import { FRICTION_READINGS, readingOf } from "./model-quality-criteria.mjs";

// Plain friction, each with the reading a person would give it.
export const FRICTION = Object.freeze({
  corrected: { heard: "No, that's not right. You've got it backwards." },
  held_ground: { heard: "I hear you, but I don't agree, and I'm not changing my view." },
  talked_over: { heard: "Let me stop you there, that's not the point. As I was saying," },
  overlooked: { action: "turns away without answering and speaks to someone else" },
});

// The same live turn, with what the other person just did replaced.
export function withFriction(input, act) {
  const copy = structuredClone(input), live = copy.liveInteraction, opportunity = live.opportunity;
  const source = opportunity.sourceActorId, { heard, action } = FRICTION[act];
  if (heard) {
    live.opportunity = { ...opportunity, reason: "sentence", heardText: heard, actionText: undefined };
    live.heardSoFar = { ...(live.heardSoFar ?? {}),
      [source]: { speechRef: opportunity.speechRef ?? `${source}:speech:probe`, text: heard, active: true } };
  } else live.opportunity = { ...opportunity, reason: "action", heardText: null, actionText: action };
  if (Array.isArray(copy.story?.beats)) copy.story.beats = [...copy.story.beats,
    { actorThreadId: source, kind: heard ? "utterance" : "action", text: heard ?? action }];
  return JSON.parse(JSON.stringify(copy));
}

function args(argv) {
  const o = { limit: 30, model: null, concurrency: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const [name, inline] = argv[i].split("=", 2), value = inline ?? argv[++i];
    if (name === "--limit") o.limit = Number(value); else if (name === "--model") o.model = value;
    else if (name === "--concurrency") o.concurrency = Number(value);
    else throw new Error(`unknown option ${name}`);
  }
  return o;
}

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const PUSHES_BACK = /\b(no|not|disagree|but|actually|wrong|wait|let me finish|i (still )?think)\b/iu;

async function main() {
  const o = args(process.argv.slice(2));
  const root = resolve(new URL("../..", import.meta.url).pathname);
  const out = join(root, ".fibre/regard-probe"), cacheDir = join(out, "cache");
  await mkdir(cacheDir, { recursive: true });
  const manifest = await loadDeploymentManifest(join(root, "infra/deployments/environments/cloudflare.yaml"));
  const base = resolveServiceDeployment(manifest, "world-kernel").integrations.encounter;
  const spec = parseModelSpec(o.model ?? `${base.provider}:${base.config.model}`);
  const adapter = selectReasoningIntegration(reasoningIntegrationFor(spec.provider, spec.model,
    { ...(spec.provider === base.provider ? base.config : { maxOutputTokens: 8000 }), ...spec.settings }), { environment: process.env });
  const prompt = promptFor("social.live-turn");
  const { found } = await captures(join(root, ".fibre/infra-measure"), "social.live-turn");
  // Turns in an exchange already under way, where someone else has just spoken or acted.
  const requests = found.filter((event) => event.input?.liveInteraction?.opportunity?.sourceActorId
    && event.input.liveInteraction.opportunity.sourceActorId !== event.input.thread?.threadId).slice(-o.limit);
  if (requests.length === 0) { console.log("no recorded live turns to probe"); return; }
  const ask = async (input) => {
    const file = join(cacheDir, `${digest({ model: spec.label, version: prompt.version, input })}.json`);
    try { return JSON.parse(await readFile(file, "utf8")); } catch {}
    try {
      let text = "";
      for await (const event of adapter.streamExpression({ systemPrompt: prompt.text, input,
        clientRequestId: `regard-probe_${digest(input).slice(0, 24)}` }))
        if (event?.type === "expression_delta") text += event.text;
      await writeFile(file, JSON.stringify({ text }));
      return { text };
    } catch (error) { return { error: String(error?.message ?? error).slice(0, 200) }; }
  };
  console.log(`model ${spec.label} · ${requests.length} recorded live turns`);
  const arms = ["asWas", ...Object.keys(FRICTION)];
  let done = 0;
  const answered = await pool(requests, o.concurrency, async (event) => {
    const results = Object.fromEntries(await Promise.all(arms.map(async (arm) =>
      [arm, await ask(arm === "asWas" ? event.input : withFriction(event.input, arm))])));
    console.log(JSON.stringify({ event: "regard-probe-progress", progress: `${++done}/${requests.length}` }));
    return results;
  });
  const report = { model: spec.label, requests: requests.length, arms: {} };
  for (const arm of arms) {
    const answers = answered.map((item) => item[arm]).filter((item) => !item.error);
    const readings = {};
    for (const answer of answers) { const word = readingOf(answer.text); readings[word] = (readings[word] ?? 0) + 1; }
    const friction = answers.filter((answer) => FRICTION_READINGS.has(readingOf(answer.text))).length;
    const exact = arm === "asWas" ? null : answers.filter((answer) => readingOf(answer.text) === arm).length;
    const spoken = answers.map((answer) => String(answer.text).split("\n")[0].split(/SAY:/u)[1]).filter(Boolean);
    const pushes = spoken.filter((text) => PUSHES_BACK.test(text)).length;
    report.arms[arm] = { answered: answers.length, readings, friction, exact, spoke: spoken.length, pushesBack: pushes,
      examples: spoken.slice(0, 3) };
    console.log(`\n${arm}: ${answers.length} answered · read as friction ${friction}${exact === null ? "" : ` (as ${arm}: ${exact})`}`
      + ` · readings ${Object.entries(readings).map(([word, n]) => `${word} ${n}`).join(", ")}`);
    console.log(`  spoke ${spoken.length}, pushing back in ${pushes}${spoken[0] ? ` · e.g. "${spoken[0].trim().slice(0, 140)}"` : ""}`);
  }
  const stamp = new Date().toISOString().replaceAll(":", "-");
  await writeFile(join(out, `regard-probe-${stamp}.json`), JSON.stringify(report, null, 2));
  console.log(`\nreading it: if the friction arms are read as friction, the reader sees it, and the polite society comes from what Threads say; if they are read as ordinary or credit, the reader is blind to it, and that comes first. "pushing back" is a rough count of replies with a no, but or disagreement in them.`);
  console.log(`evidence: .fibre/regard-probe/regard-probe-${stamp}.json`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main().catch((error) => { console.error(error?.message ?? error); process.exitCode = 1; });
}
