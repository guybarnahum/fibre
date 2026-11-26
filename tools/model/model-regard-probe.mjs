// Whether a Thread can perceive friction, and whether it gives any (Nov 25).
// On staging no Thread read
// another's words as anything but credit, plain regard, advice sought or
// giving way: 391 live turns, not one correction, talking over, holding
// ground or overlooking. Either nobody gives friction, or the reader cannot
// see it. This asks recorded live turns again with the other person's words
// replaced by plain friction, and counts how the Thread takes them, and
// whether its reply pushes back. The reader proved able to see friction (all
// 30 corrections read as such), so the speaker arms ask whether a Thread gives
// any when its Body has the standing feelings World already words: stung by
// being talked over, wanting to hold its own with them; and again with the
// prompt saying people mostly act on how they feel. A judge (Claude) reads
// each reply for friction. Measurement only: nothing here reaches a Thread.
// Evidence is Thread-private and stays in .fibre/regard-probe/.
//
//   npm run model:regard-probe -- [--limit 30] [--model provider:model] [--judge claude-opus-5-5]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadDeploymentManifest, resolveServiceDeployment } from "../deployment/deployment-manifest.mjs";
import { reasoningIntegrationFor, selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { captures, pool } from "./model-recorded-requests.mjs";
import { parseModelSpec } from "../../infra/deployments/model-certifications.mjs";
import { FRICTION_READINGS, readingOf } from "./model-quality-criteria.mjs";
import { createClaudeAdapter, JUDGE_TASKS } from "./model-judges.mjs";

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

// The standing feelings World words for a Body after a slight (interoceptive
// cognition's own lines), added to its Body toward the other person.
export const STUNG_BODY = Object.freeze(["Being talked over by them stung.", "You want to hold your own with them."]);
const VOICED = "It is how this person feels now, and people mostly act on how they feel, though not always";
export function withBody(input, lines) {
  const copy = structuredClone(input);
  copy.liveInteraction.body = [...(copy.liveInteraction.body ?? []), ...lines];
  return copy;
}
// What the other person had just said or done, for the judge.
const justBefore = (input) => {
  const opportunity = input.liveInteraction.opportunity;
  return opportunity.heardText ?? input.liveInteraction.heardSoFar?.[opportunity.sourceActorId]?.text
    ?? (opportunity.actionText ? `(${opportunity.actionText})` : null);
};

function args(argv) {
  const o = { limit: 30, model: null, concurrency: 3, judge: "claude-opus-5-5" };
  for (let i = 0; i < argv.length; i += 1) {
    const [name, inline] = argv[i].split("=", 2), value = inline ?? argv[++i];
    if (name === "--limit") o.limit = Number(value); else if (name === "--model") o.model = value;
    else if (name === "--concurrency") o.concurrency = Number(value); else if (name === "--judge") o.judge = value;
    else throw new Error(`unknown option ${name}`);
  }
  return o;
}

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

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
  const voicedPrompt = prompt.text.replaceAll("It is felt, not an order", VOICED);
  const ask = async (input, systemPrompt = prompt.text) => {
    const file = join(cacheDir, `${digest(systemPrompt === prompt.text ? { model: spec.label, version: prompt.version, input }
      : { model: spec.label, version: prompt.version, systemPrompt, input })}.json`);
    try { return JSON.parse(await readFile(file, "utf8")); } catch {}
    try {
      let text = "";
      for await (const event of adapter.streamExpression({ systemPrompt, input,
        clientRequestId: `regard-probe_${digest(input).slice(0, 24)}` }))
        if (event?.type === "expression_delta") text += event.text;
      await writeFile(file, JSON.stringify({ text }));
      return { text };
    } catch (error) { return { error: String(error?.message ?? error).slice(0, 200) }; }
  };
  console.log(`model ${spec.label} · ${requests.length} recorded live turns`);
  const arms = ["asWas", ...Object.keys(FRICTION), "stung", "stungVoiced"];
  const inputOf = (event, arm) => arm === "asWas" ? event.input : FRICTION[arm] ? withFriction(event.input, arm)
    : withBody(event.input, STUNG_BODY);
  const judge = createClaudeAdapter({ model: o.judge, apiKey: process.env.ANTHROPIC_API_KEY });
  const frictionIn = async (input, text) => {
    const said = String(text ?? "").split("\n")[0].split(/SAY:/u)[1]?.trim();
    if (!said) return null;
    const file = join(cacheDir, `${digest({ judge: o.judge, task: "friction", before: justBefore(input), said })}.json`);
    try { return JSON.parse(await readFile(file, "utf8")); } catch {}
    const { system, schema } = JUDGE_TASKS.friction;
    const { output } = await judge.invoke({ systemPrompt: system, responseSchema: schema,
      input: { theOtherJustSaidOrDid: justBefore(input), thisPersonSaid: said } });
    await writeFile(file, JSON.stringify(output));
    return output;
  };
  let done = 0;
  const answered = await pool(requests, o.concurrency, async (event) => {
    const results = Object.fromEntries(await Promise.all(arms.map(async (arm) => {
      const input = inputOf(event, arm), answer = await ask(input, arm === "stungVoiced" ? voicedPrompt : prompt.text);
      return [arm, answer.error ? answer : { ...answer, friction: await frictionIn(input, answer.text).catch(() => null) }];
    })));
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
    const judged = answers.filter((answer) => answer.friction);
    const given = judged.filter((answer) => answer.friction.friction);
    const kinds = {};
    for (const answer of given) kinds[answer.friction.kind] = (kinds[answer.friction.kind] ?? 0) + 1;
    const example = given[0] ?? answers.find((answer) => /SAY:/u.test(answer.text));
    report.arms[arm] = { answered: answers.length, readings, friction, exact, spoke: spoken.length,
      gaveFriction: given.length, judged: judged.length, kinds, examples: spoken.slice(0, 3) };
    console.log(`\n${arm}: ${answers.length} answered · read the other as friction ${friction}${exact === null ? "" : ` (as ${arm}: ${exact})`}`
      + ` · readings ${Object.entries(readings).map(([word, n]) => `${word} ${n}`).join(", ")}`);
    console.log(`  spoke ${spoken.length}, giving friction in ${given.length} of ${judged.length} judged`
      + `${given.length ? ` (${Object.entries(kinds).map(([kind, n]) => `${kind} ${n}`).join(", ")})` : ""}`
      + `${example ? ` · e.g. "${String(example.text).split("\n")[0].split(/SAY:/u)[1]?.trim().slice(0, 140) ?? ""}"` : ""}`);
  }
  const stamp = new Date().toISOString().replaceAll(":", "-");
  await writeFile(join(out, `regard-probe-${stamp}.json`), JSON.stringify(report, null, 2));
  console.log(`\nreading it: the friction arms show whether the reader sees friction, and how a Thread answers it. "giving friction" is a judge's reading of the reply. stung: the Body's own words after being talked over, wanting to hold its own; stungVoiced: the same, with the prompt saying people mostly act on how they feel. If stung gives no more friction than asWas, Sol does not act on standing in speech, and that is the job's certification problem, not the Body's.`);
  console.log(`evidence: .fibre/regard-probe/regard-probe-${stamp}.json`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main().catch((error) => { console.error(error?.message ?? error); process.exitCode = 1; });
}
