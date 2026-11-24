// The chain, read one Thread at a time (effectiveness measures, Nov 23): does
// World's life move this Body as designed, does what it feels change what it
// does, what grows from that between people, and does its talk and its mind
// widen? Each Thread beside its own genes and the life it lived, so genes and
// experience can be read against every link. Read-only, from the evidence
// world-observatory and model:captures saved under .fibre/; results stay there.
//
// Signals are the Body's own levels from the Body panel (never its words);
// acts are World records. A decision is counted once, however many runs see
// it, and couplings accumulate across runs so a Thread's few daily choices add
// up. Words are compared by meaning (bge-m3), never by counting labels.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { subjectsOf } from "../../services/world-kernel/src/knowledge.mjs";
import { createCloudflareEmbeddingAdapter } from "../../integrations/ai/embedding/cloudflare.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const USAGE = "usage: thread:chain -- --env staging --label nov24 [--hours 24] [--no-meaning]";
const HOUR_MS = 3_600_000;
const GENE_FAMILIES = ["exploration", "mastery_itch", "social_contact", "attachment_proximity", "standing"];

// What counts as a Body signal at a decision: the Body panel's levels at the
// last moment before it. Thresholds are the felt edges the words use.
export const SIGNALS = Object.freeze({
  weary: (point) => (point.weariness ?? 0) >= 0.5,
  hungryForNew: (point) => (point.noveltyHunger ?? 0) > 0,
  lifted: (point) => point.lifted === true,
  wantsToTell: (point) => (point.share ?? 0) >= 0.05,
});
const PROMISE_FELT = 0.1;
const WARMTH_FELT = 0.25;
// The contact decision's Body is given in words; these name its hunger for company.
const COMPANY_WORDS = /company|closeness|someone familiar|being among people/iu;

const sha = (value) => createHash("sha256").update(value).digest("hex").slice(0, 24);
const round = (value, places = 2) => value === null || value === undefined || Number.isNaN(value) ? null
  : Math.round(value * 10 ** places) / 10 ** places;
const within = (at, from, to) => typeof at === "string" && at >= from && at <= to;
const pointBefore = (series, at) => series.filter((point) => point.at <= at).at(-1) ?? null;
// A subject is spoken of when one of its own words is said as a whole word:
// "Mars" in "a novel set on Mars", never in "marshal". Catalogue qualifiers
// and words that name a kind of book rather than what it is about are left out.
const GENERIC = new Set(["fiction", "history", "stories", "story", "literature", "english", "works", "juvenile",
  "early", "ancient", "modern", "century", "great", "britain", "england", "general", "description", "travel",
  "social", "life", "customs", "translations", "into", "poetry", "drama", "essays", "letters"]);
export const subjectWords = (subject) => [...new Set(String(subject).replace(/\([^)]*\)/gu, " ").split(/\s+--\s+/u)[0]
  .toLowerCase().match(/[a-z][a-z'-]{3,}/gu) ?? [])].filter((word) => !GENERIC.has(word));
export const mentions = (text, subject) => {
  const lower = ` ${String(text).toLowerCase().replace(/[^a-z'-]+/gu, " ")} `;
  return subjectWords(subject).some((word) => lower.includes(` ${word} `) || lower.includes(` ${word}s `));
};

// The subjects a Thread held at a moment: met on or before it.
export function heldAt(knowledge, at) {
  return new Map((knowledge?.subjects ?? []).filter((item) => item.firstAt <= at).map((item) => [item.subject, item]));
}

// ---- Decisions: what the Body felt, and what the Thread did ----

// Arriving somewhere: what it took up, against how it felt then and how it
// takes each person present.
export function glanceDecisions({ threadId, glances, series, knowledge }) {
  const rows = [];
  for (const glance of glances ?? []) {
    const point = pointBefore(series, glance.occurredAt);
    if (point === null || glance.occurredAt < series[0]?.at) continue;
    const held = new Set([...heldAt(knowledge, glance.occurredAt).values()].map((item) => item.subject.toLowerCase()));
    const chosen = glance.focus === null || glance.focus === undefined ? null : glance.items[glance.focus];
    const books = glance.items.filter((item) => item.kind === "book");
    // Glances recorded before World kept which book was its own cannot tell
    // going back from taking up something else; their book choices are left out.
    const known = books.every((item) => typeof item.own === "boolean");
    const unknown = (item) => subjectsOf({ subjects: item.subjects ?? [] }).some((subject) => !held.has(subject.subject.toLowerCase()));
    const signals = Object.fromEntries(Object.entries(SIGNALS).map(([name, test]) => [name, test(point)]));
    signals.unfinishedBook = books.some((item) => item.own === true);
    const bookActs = !known ? {} : { ownBook: chosen?.kind === "book" && chosen.own === true,
      otherBook: chosen?.kind === "book" && chosen.own !== true,
      newSubjectBook: chosen?.kind === "book" && chosen.own !== true && unknown(chosen) };
    rows.push({ id: glance.glanceId, kind: "glance", threadId, at: glance.occurredAt, signals,
      acts: { ...bookActs, person: chosen?.kind === "person", nothing: chosen === null },
      offered: { otherBook: books.some((item) => item.own !== true), ownBook: books.some((item) => item.own === true),
        newSubjectBook: books.some((item) => item.own !== true && unknown(item)), person: glance.items.some((item) => item.kind === "person") },
      people: glance.items.filter((item) => item.kind === "person").map((item) => ({ personRef: item.ref,
        promise: point.people?.[item.ref]?.promise ?? 0, warmth: point.people?.[item.ref]?.warmth ?? 0,
        chosen: chosen?.kind === "person" && chosen.ref === item.ref })),
      book: chosen?.kind === "book" ? { title: chosen.title, ref: chosen.ref } : null });
  }
  return rows;
}

const SPOKE = /^(SAY|INTRODUCE|PROPOSE|AGREE):/u;
// A turn's output: its two private readings, then what it did.
export function turnOutput(text) {
  const [first = "", ...rest] = String(text ?? "").trim().split(/\s+/u);
  const [second = "", ...after] = rest;
  const act = after.join(" ");
  return { reading: first, regard: second, spoke: SPOKE.test(act), said: act.replace(SPOKE, "").trim() };
}
const outputText = (output) => typeof output === "string" ? output : output?.text ?? output?.content ?? JSON.stringify(output ?? "");

// Speaking in a conversation, and deciding whether to write or go over: from
// recorded requests that carry their time.
export function captureDecisions({ threadId, captures, series, knowledge }) {
  const rows = [];
  for (const event of captures) {
    if (event.at === null || event.at === undefined) continue;
    let capture; try { capture = JSON.parse(event.capture); } catch { continue; }
    if (capture?.input?.thread?.threadId !== threadId) continue;
    const point = pointBefore(series, event.at);
    if (point === null || event.at < series[0]?.at) continue;
    const signals = Object.fromEntries(Object.entries(SIGNALS).map(([name, test]) => [name, test(point)]));
    if (event.prompt.startsWith("social.live-turn")) {
      const turn = turnOutput(outputText(capture.output));
      const recent = [...heldAt(knowledge, event.at).values()].filter((item) => Date.parse(event.at) - Date.parse(item.firstAt) <= 72 * HOUR_MS);
      rows.push({ id: `turn_${sha(event.capture)}`, kind: "turn", threadId, at: event.at, signals,
        acts: { spoke: turn.spoke, toldWhatItLearned: turn.spoke && recent.some((item) => mentions(turn.said, item.subject)) },
        offered: { toldWhatItLearned: recent.length > 0 }, reading: turn.reading });
    } else if (event.prompt.startsWith("contact.decision")) {
      const body = (capture.input.body ?? []).join(" ");
      rows.push({ id: `contact_${sha(event.capture)}`, kind: "contact", threadId, at: event.at,
        signals: { ...signals, hungryForCompany: COMPANY_WORDS.test(body) },
        acts: { reachedOut: ["contact", "go_over"].includes(capture.output?.decision) } });
    }
  }
  return rows;
}

// How much more often it acts when the signal is felt than when it is not,
// counting only decisions where the act was possible. Counts are shown with
// it: a Thread makes few choices a day.
export function uplift(rows, signal, act) {
  const possible = rows.filter((row) => row.acts[act] !== undefined && row.offered?.[act] !== false);
  const felt = possible.filter((row) => row.signals[signal]), not = possible.filter((row) => !row.signals[signal]);
  const rate = (list) => list.length === 0 ? null : list.filter((row) => row.acts[act]).length / list.length;
  const [withSignal, without] = [rate(felt), rate(not)];
  return { signal, act, felt: [felt.filter((row) => row.acts[act]).length, felt.length],
    notFelt: [not.filter((row) => row.acts[act]).length, not.length],
    uplift: withSignal === null || without === null ? null : round(withSignal - without) };
}
// Toward a person present: drawn to the one who brings something new, or the one it is warm to.
export function personUplift(rows, key, edge) {
  const present = rows.filter((row) => row.kind === "glance" && row.acts.person !== undefined).flatMap((row) => row.people);
  const rate = (list) => list.length === 0 ? null : list.filter((item) => item.chosen).length / list.length;
  const felt = present.filter((item) => item[key] >= edge), not = present.filter((item) => item[key] < edge);
  return { signal: key, act: "lookedTo", felt: [felt.filter((item) => item.chosen).length, felt.length],
    notFelt: [not.filter((item) => item.chosen).length, not.length],
    uplift: rate(felt) === null || rate(not) === null ? null : round(rate(felt) - rate(not)) };
}

export const COUPLINGS = Object.freeze([
  ["weary", "otherBook"], ["hungryForNew", "newSubjectBook"], ["unfinishedBook", "ownBook"],
  ["wantsToTell", "spoke"], ["wantsToTell", "toldWhatItLearned"], ["hungryForCompany", "reachedOut"],
]);

// ---- The Body (link 1) ----

export function bodyLink({ series, knowledge, readings, from, to }) {
  const discoveries = (knowledge?.subjects ?? []).filter((item) => within(item.firstAt, from, to)).map((item) => item.firstAt);
  const newTurns = (readings ?? []).filter((item) => item.reading === "new").map((item) => item.at);
  const lifted = series.filter((point) => point.lifted);
  const backed = lifted.filter((point) => [...discoveries, ...newTurns].some((at) =>
    at <= point.at && Date.parse(point.at) - Date.parse(at) <= 12 * HOUR_MS));
  const followed = discoveries.filter((at) => series.some((point) => point.lifted && point.at >= at
    && Date.parse(point.at) - Date.parse(at) <= 4 * HOUR_MS));
  const mean = (key) => series.length === 0 ? null : round(series.reduce((sum, point) => sum + (point[key] ?? 0), 0) / series.length);
  return { discoveries: discoveries.length, liftedPoints: lifted.length, points: series.length,
    liftPrecision: lifted.length === 0 ? null : round(backed.length / lifted.length),
    liftRecall: discoveries.length === 0 ? null : round(followed.length / discoveries.length),
    meanWeariness: mean("weariness"), meanShare: mean("share"), meanNovelty: mean("novelty") };
}

// ---- Between people (link 3) ----

// It said something about a subject it held and the other did not; the other
// read that talk as bringing something new.
export function tellings({ threadId, stories, knowledgeOf, readingsOf, from, to }) {
  const told = [];
  for (const story of stories ?? []) {
    if (!within(story.occurredAt, from, to)) continue;
    const others = (story.threadPresence ?? []).map((item) => item.threadId).filter((id) => id !== threadId);
    const mine = (story.story?.beats ?? []).filter((beat) => beat.kind === "utterance" && beat.actorThreadId === threadId)
      .map((beat) => beat.spokenText ?? beat.text ?? "");
    const held = [...heldAt(knowledgeOf(threadId), story.occurredAt).values()];
    for (const other of others) {
      const theirs = heldAt(knowledgeOf(other), story.occurredAt);
      for (const item of held.filter((subject) => !theirs.has(subject.subject) && mine.some((text) => mentions(text, subject.subject)))) {
        const heard = (readingsOf(other) ?? []).some((reading) => reading.at === story.occurredAt && ["new", "some_new"].includes(reading.reading));
        told.push({ to: other, subject: item.subject, at: story.occurredAt, heardAsNew: heard });
      }
    }
  }
  return told;
}

// ---- Meaning (links 4 and 5) ----

const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const norm = (a) => { const length = Math.hypot(...a); return length === 0 ? a : a.map((value) => value / length); };
export const centroid = (vectors) => vectors.length === 0 ? null
  : norm(vectors[0].map((_, i) => vectors.reduce((sum, vector) => sum + vector[i], 0) / vectors.length));
// How varied a set of texts is: mean distance between any two (0 the same, ~1 unrelated).
export function spread(vectors) {
  const unit = vectors.map(norm);
  let sum = 0, pairs = 0;
  for (let i = 0; i < unit.length; i++) for (let j = i + 1; j < unit.length; j++) { sum += 1 - dot(unit[i], unit[j]); pairs++; }
  return pairs === 0 ? null : round(sum / pairs, 3);
}
// How close one Thread is to the others: mean closeness of its centroid to theirs.
export function closenessToOthers(own, others) {
  const peers = others.filter(Boolean);
  return own === null || peers.length === 0 ? null : round(peers.reduce((sum, other) => sum + dot(own, other), 0) / peers.length, 3);
}

async function meaningOf(texts, cachePath, embedder) {
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
  const missing = [...new Set(texts.filter((text) => !cache[sha(text)]))];
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const { vectors } = await embedder.embed(batch);
    batch.forEach((text, index) => { cache[sha(text)] = vectors[index].map((value) => Math.round(value * 1e4) / 1e4); });
  }
  if (missing.length) writeFileSync(cachePath, JSON.stringify(cache));
  return (text) => cache[sha(text)] ?? null;
}

// ---- Genes, and reading genes against a link across Threads ----

export function genesOf(genetics) {
  return Object.fromEntries((genetics ?? []).filter((gene) => GENE_FAMILIES.includes(gene.family))
    .map((gene) => [gene.family, { orientation: gene.orientation, ...gene.positions }]));
}
// Spearman's rank correlation, for reading a gene against a measure across a
// few Threads: a direction, never proof.
export function rankCorrelation(pairs) {
  const usable = pairs.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (usable.length < 4) return null;
  const ranks = (values) => { const sorted = [...values].sort((a, b) => a - b);
    return values.map((value) => (sorted.indexOf(value) + sorted.lastIndexOf(value)) / 2); };
  const xs = ranks(usable.map(([x]) => x)), ys = ranks(usable.map(([, y]) => y));
  const mean = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;
  const [mx, my] = [mean(xs), mean(ys)];
  const cov = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
  const sd = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0) * ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
  return sd === 0 ? null : { rho: round(cov / sd), n: usable.length };
}

// ---- The run ----

function options(argv) {
  const config = { env: null, label: null, hours: 24, meaning: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env") config.env = normalizeCloudflareEnvironment(argv[++i]);
    else if (argv[i] === "--label") config.label = argv[++i];
    else if (argv[i] === "--hours") config.hours = Number(argv[++i]);
    else if (argv[i] === "--no-meaning") config.meaning = false;
    else throw new TypeError(USAGE);
  }
  if (config.env === null || !/^[a-z0-9-]+$/u.test(config.label ?? "") || !(config.hours > 0)) throw new TypeError(USAGE);
  return config;
}

const show = ([acted, of]) => `${acted}/${of}`;
const line = (item) => item.uplift === null ? `${item.signal}→${item.act} felt ${show(item.felt)} vs not ${show(item.notFelt)}`
  : `${item.signal}→${item.act} ${item.uplift >= 0 ? "+" : ""}${item.uplift} (felt ${show(item.felt)} vs not ${show(item.notFelt)})`;

async function main(argv) {
  const args = options(argv);
  const dir = resolve(REPO_ROOT, ".fibre", "world-social", args.env);
  const out = resolve(REPO_ROOT, ".fibre", "chain");
  mkdirSync(out, { recursive: true });
  const suffix = `-${args.label}.json`;
  const ids = readdirSync(dir).filter((file) => file.startsWith("observatory-") && file.endsWith(suffix))
    .map((file) => file.slice("observatory-".length, -suffix.length));
  if (ids.length === 0) throw new Error(`no observatory files for ${args.label}; run world-observatory first`);
  const load = (kind, id) => JSON.parse(readFileSync(resolve(dir, `${kind}-${id}${suffix}`), "utf8")).observatory;
  const lives = Object.fromEntries(ids.map((id) => [id, { o: load("observatory", id), b: load("body", id).body }]));
  const name = (id) => lives[id]?.o.thread?.identity?.name ?? id.slice(0, 12);
  const to = Object.values(lives).map(({ b }) => b.asOf).sort().at(-1);
  const from = new Date(Date.parse(to) - args.hours * HOUR_MS).toISOString();

  // Recorded requests, each once, from every saved capture file.
  const captureDir = resolve(REPO_ROOT, ".fibre", "infra-measure");
  const seen = new Set(), captures = [], meanings = [];
  for (const file of existsSync(captureDir) ? readdirSync(captureDir).filter((f) => f.startsWith(`model-captures-${args.env}-`)) : []) {
    const saved = JSON.parse(readFileSync(resolve(captureDir, file), "utf8"));
    for (const event of saved.events ?? []) { const key = sha(event.capture); if (!seen.has(key)) { seen.add(key); captures.push(event); } }
    for (const item of saved.meanings ?? []) if (item.threadId && within(item.at, from, to)) meanings.push(item);
  }

  const knowledgeOf = (id) => lives[id]?.b.knowledge ?? null;
  const readingsOf = (id) => (lives[id]?.b.events?.readings ?? []).filter((item) => item.source === "turn");
  const cards = {}, rows = [];
  for (const id of ids) {
    const { o, b } = lives[id];
    // The two-hourly series for the day's Body; with the Body just before
    // each decision moment, for reading what it felt against what it did.
    const series = b.series ?? [];
    const felt = [...series, ...(b.atMoments ?? [])].sort((a, c) => a.at.localeCompare(c.at));
    const decisions = [...glanceDecisions({ threadId: id, glances: o.glances, series: felt, knowledge: b.knowledge }),
      ...captureDecisions({ threadId: id, captures, series: felt, knowledge: b.knowledge })];
    rows.push(...decisions);
    const stories = (o.encounterStories ?? []).filter((story) => within(story.occurredAt, from, to));
    const utterances = stories.flatMap((story) => (story.story?.beats ?? [])
      .filter((beat) => beat.kind === "utterance" && beat.actorThreadId === id).map((beat) => beat.spokenText ?? beat.text ?? ""))
      .filter((text) => text.trim().length > 12);
    const chosenBooks = decisions.filter((row) => row.kind === "glance" && row.book !== null && within(row.at, from, to));
    const read = chosenBooks.filter((row) => stories.some((story) => (story.story?.beats ?? []).some((beat) =>
      beat.actorThreadId === id && String(beat.text ?? "").includes(`reads from "${row.book.title}"`))));
    const turnReadings = readingsOf(id).filter((item) => within(item.at, from, to));
    const tally = (word) => turnReadings.filter((item) => item.reading === word).length;
    const closeness = meanings.filter((item) => item.threadId === id && typeof item.cosine === "number").map((item) => item.cosine)
      .sort((a, c) => a - c);
    const last = series.at(-1) ?? {};
    // Each interest once, as it stands now (the record keeps its revisions).
    const interests = [...(o.interests ?? []).reduce((latest, item) => (latest.get(item.interestId)?.revision ?? -1) < item.revision
      ? latest.set(item.interestId, item) : latest, new Map()).values()].filter((item) => item.status === "current");
    cards[id] = {
      name: name(id), genes: genesOf(b.genetics),
      lived: { conversations: stories.filter((story) => (story.story?.beats ?? []).some((beat) => beat.kind === "utterance")).length,
        turnsSpoken: utterances.length, arrivals: decisions.filter((row) => row.kind === "glance" && within(row.at, from, to)).length },
      reading: { chosen: chosenBooks.length, read: read.length, rate: chosenBooks.length ? round(read.length / chosenBooks.length) : null },
      body: bodyLink({ series, knowledge: b.knowledge, from, to,
        readings: (b.events?.readings ?? []).filter((item) => within(item.at, from, to)) }),
      toward: Object.fromEntries(Object.entries(last.people ?? {}).filter(([, p]) => (p.promise ?? 0) >= PROMISE_FELT || Math.abs(p.warmth ?? 0) >= WARMTH_FELT)
        .map(([person, p]) => [name(person), { warmth: round(p.warmth), promise: round(p.promise ?? 0), bond: round(p.bond) }])),
      told: tellings({ threadId: id, stories, knowledgeOf, readingsOf, from, to }).map((item) => ({ ...item, to: name(item.to) })),
      talk: { readings: { new: tally("new"), some: tally("some_new"), nothing: tally("nothing_new") },
        feltNovel: turnReadings.length ? round((tally("new") + tally("some_new")) / turnReadings.length) : null,
        meaningCloseness: closeness.length ? round(closeness[Math.floor(closeness.length / 2)]) : null, spread: null, closenessToOthers: null },
      width: { held: b.knowledge?.measures?.width ?? 0, depth: b.knowledge?.measures?.depth ?? 0,
        newSubjects: (b.knowledge?.subjects ?? []).filter((item) => within(item.firstAt, from, to)).map((item) => item.subject),
        interests: interests.length, interestSpread: null, individuation: null },
      texts: { utterances: utterances.slice(-40), interests: interests.map((item) => `${item.subject}: ${item.draw ?? ""}`.slice(0, 600)) },
    };
  }

  if (args.meaning) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID, apiToken = process.env.CLOUDFLARE_AI_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) throw new Error("meaning needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN (or --no-meaning)");
    const embedder = createCloudflareEmbeddingAdapter({ accountId, apiToken, modelId: "@cf/baai/bge-m3" });
    const vectorOf = await meaningOf(Object.values(cards).flatMap((card) => [...card.texts.utterances, ...card.texts.interests]),
      resolve(out, "meaning-cache.json"), embedder);
    const talkCentre = {}, interestCentre = {};
    for (const [id, card] of Object.entries(cards)) {
      const talk = card.texts.utterances.map(vectorOf).filter(Boolean), minds = card.texts.interests.map(vectorOf).filter(Boolean);
      card.talk.spread = spread(talk); card.width.interestSpread = spread(minds);
      talkCentre[id] = centroid(talk); interestCentre[id] = centroid(minds);
    }
    for (const [id, card] of Object.entries(cards)) {
      card.talk.closenessToOthers = closenessToOthers(talkCentre[id], ids.filter((other) => other !== id).map((other) => talkCentre[other]));
      const near = closenessToOthers(interestCentre[id], ids.filter((other) => other !== id).map((other) => interestCentre[other]));
      card.width.individuation = near === null ? null : round(1 - near, 3);
    }
  }

  // Couplings over every decision any run has seen, once each.
  const pastRuns = readdirSync(out).filter((file) => file.startsWith(`${args.env}-`) && file.endsWith(".json") && file !== `${args.env}-${args.label}.json`)
    .map((file) => JSON.parse(readFileSync(resolve(out, file), "utf8")));
  const allRows = [...new Map([...pastRuns.flatMap((run) => run.rows ?? []), ...rows].map((row) => [row.id, row])).values()];
  for (const [id, card] of Object.entries(cards)) {
    const mine = allRows.filter((row) => row.threadId === id);
    card.couplings = [...COUPLINGS.map(([signal, act]) => uplift(mine, signal, act)),
      personUplift(mine, "promise", PROMISE_FELT), personUplift(mine, "warmth", WARMTH_FELT)];
    card.decisions = { glances: mine.filter((row) => row.kind === "glance").length, turns: mine.filter((row) => row.kind === "turn").length,
      contacts: mine.filter((row) => row.kind === "contact").length };
  }

  // Genes against links, across Threads: a direction to look into, never proof.
  const gene = (card, family, key = "gain") => card.genes[family]?.[key];
  const coupled = (card, signal, act) => card.couplings.find((item) => item.signal === signal && item.act === act)?.uplift;
  const across = {
    "exploration gain ~ weary→otherBook": rankCorrelation(Object.values(cards).map((card) => [gene(card, "exploration"), coupled(card, "weary", "otherBook")])),
    "exploration gain ~ subjects held": rankCorrelation(Object.values(cards).map((card) => [gene(card, "exploration"), card.width.held])),
    "mastery_itch gain ~ unfinishedBook→ownBook": rankCorrelation(Object.values(cards).map((card) => [gene(card, "mastery_itch"), coupled(card, "unfinishedBook", "ownBook")])),
    "social_contact gain ~ wantsToTell→spoke": rankCorrelation(Object.values(cards).map((card) => [gene(card, "social_contact"), coupled(card, "wantsToTell", "spoke")])),
    "attachment persistence ~ warmth→lookedTo": rankCorrelation(Object.values(cards).map((card) => [gene(card, "attachment_proximity", "persistence"), coupled(card, "warmth", "lookedTo")])),
  };

  const saved = { label: args.label, env: args.env, from, to, cards, across, rows };
  writeFileSync(resolve(out, `${args.env}-${args.label}.json`), JSON.stringify(saved) + "\n");

  // Earlier runs, for each Thread's own trend.
  const history = [...pastRuns, saved].sort((a, b) => a.to.localeCompare(b.to));
  const trend = (id, read) => history.map((run) => run.cards?.[id] ? read(run.cards[id]) : null).map((value) => value ?? "—").join(" → ");

  console.log(`\n=== The chain, Thread by Thread: ${args.label} (${from.slice(0, 16)} – ${to.slice(0, 16)} UTC) ===`);
  for (const [id, card] of Object.entries(cards)) {
    const g = card.genes;
    const geneText = Object.entries(g).map(([family, item]) => `${family} ${item.orientation} gain ${round(item.gain)} persist ${round(item.persistence)}`).join("; ");
    console.log(`\n■ ${card.name}`);
    console.log(`  genes: ${geneText || "none"}`);
    console.log(`  lived: ${card.lived.conversations} conversations, ${card.lived.turnsSpoken} turns spoken, ${card.lived.arrivals} arrivals`);
    console.log(`  0 reading: chose ${card.reading.chosen} book(s), read ${card.reading.read}`);
    const bd = card.body;
    console.log(`  1 body: ${bd.discoveries} discoveries; lifted ${bd.liftedPoints}/${bd.points} moments (precision ${bd.liftPrecision ?? "—"}, recall ${bd.liftRecall ?? "—"}); `
      + `mean weariness ${bd.meanWeariness}, novelty ${bd.meanNovelty}, pull to tell ${bd.meanShare}`);
    console.log(`  2 felt→did (all runs; ${card.decisions.glances} arrivals, ${card.decisions.turns} turns, ${card.decisions.contacts} contact decisions):`);
    for (const item of card.couplings.filter((entry) => entry.felt[1] + entry.notFelt[1] > 0)) console.log(`      ${line(item)}`);
    const toward = Object.entries(card.toward).map(([who, p]) => `${who} w${p.warmth} p${p.promise} b${p.bond}`).join("; ");
    console.log(`  3 between: told ${card.told.length}${card.told.length ? ` (${card.told.slice(0, 3).map((item) => `${item.subject}→${item.to}${item.heardAsNew ? " ✓new" : ""}`).join(", ")})` : ""}; toward: ${toward || "no one in particular"}`);
    const t = card.talk;
    console.log(`  4 talk: read new ${t.readings.new} / some ${t.readings.some} / nothing ${t.readings.nothing} (felt novel ${t.feltNovel ?? "—"}); `
      + `World closeness p50 ${t.meaningCloseness ?? "—"}; spread ${t.spread ?? "—"}; closeness to others' talk ${t.closenessToOthers ?? "—"}`);
    const w = card.width;
    console.log(`  5 width: holds ${w.held} subjects (deepest ${w.depth}); new today ${w.newSubjects.length}${w.newSubjects.length ? ` (${w.newSubjects.slice(0, 4).join(" | ")})` : ""}; `
      + `${w.interests} interests, spread ${w.interestSpread ?? "—"}, individuation ${w.individuation ?? "—"}`);
    if (history.length > 1) console.log(`  trend: held ${trend(id, (c) => c.width.held)} · felt novel ${trend(id, (c) => c.talk.feltNovel)} · `
      + `talk spread ${trend(id, (c) => c.talk.spread)} · individuation ${trend(id, (c) => c.width.individuation)}`);
  }
  console.log("\n--- Genes against links, across Threads (direction only, few Threads) ---");
  for (const [what, value] of Object.entries(across)) console.log(`  ${what}: ${value === null ? "not enough yet" : `ρ ${value.rho} (n ${value.n})`}`);
  console.log(`\nEvidence: ${resolve(out, `${args.env}-${args.label}.json`)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`Thread chain: ${error.message}\n`); process.exitCode = 1; });
}
