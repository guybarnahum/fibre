// What a good answer is, per cognitive job — the standard accepted by Guy on
// November 24, 2026 (replacing that of November 8): a model is good enough
// for a job when the Threads would be at least as true to life with it as
// they are now. It is compared with the model the job runs on today (the
// reference) on what matters to Fibre; absolute bars stay only where Fibre
// has a hard rule. This module is pure: it knows each job's source, answer,
// decision, rates and rules; model:quality asks the models and the judges.

import { decisionOf } from "./model-replay-judge.mjs";
import { PROMPTS } from "../../services/world-kernel/src/generated/prompts.mjs";

const without = (object, ...keys) => Object.fromEntries(Object.entries(object ?? {})
  .filter(([key]) => !keys.includes(key)));

// Record identities and times say nothing about who a person is, but would
// let a reader match a source to an answer by its timestamp or reference.
const VOLATILE = /^(threadId|targetId|memoryId|stateId|situationId|partyId|asOf|recordedAt|since|occurredAt|establishedAt|startAt|endAt|provenance|evidenceRefs|eventRefs|evidenceReferences|sourceReferences|supportingEvidenceRefs|contradictingEvidenceRefs|factualRoleRefs|[a-zA-Z]*Ref)$/u;
function identityOnly(value) {
  if (Array.isArray(value)) return value.map(identityOnly);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !VOLATILE.test(key))
    .map(([key, item]) => [key, identityOnly(item)]));
}

// The person a Thread job answers as: its own self, states and history. What
// it faces — the event, its present, its own afterthought — is shown once,
// and a lineup asks which of four persons answered.
function person(input, ...fields) {
  return identityOnly({ thread: input.thread, ...Object.fromEntries(fields
    .filter((field) => input[field] !== undefined).map((field) => [field, input[field]])) });
}

const nameOf = (input, partyId) => (input.routableKnownParties ?? [])
  .find((party) => party.partyId === partyId)?.displayName ?? null;

// A reflection's outcomes as one text, people by the names it knows them by.
function reflectionText(input, output) {
  if (output === null || typeof output !== "object") return null;
  const names = new Map((input.people ?? []).map((item) => [item.personRef, item.name ?? item.appearance ?? "someone"]));
  const who = (ref) => names.get(ref) ?? "someone";
  const memory = output.memory?.outcome === "retained"
    ? `Memory: ${output.memory.rememberedContent}${output.memory.gist ? ` (gist: ${output.memory.gist})` : ""}` : "Memory: not kept";
  return [
    output.journalEntry ? `Journal: ${output.journalEntry}` : null,
    memory,
    ...(output.afterthoughts ?? []).map((item) => `Afterthought (${item.kind}): ${item.text}`),
    ...(output.stances ?? []).map((item) => `Toward ${who(item.personRef)} (${item.aspect}): ${item.regard}`),
    ...(output.interests ?? []).map((item) => `Interest ${item.change}: ${item.subject} — ${item.draw}`),
    ...(output.moments ?? []).map((item) => `Moment (${item.kind}) with ${who(item.personRef)}: ${item.moment} — ${item.reaction}`),
    ...(output.regard ?? []).map((item) => `Regard (${item.act}, by ${item.by}) with ${who(item.personRef)}: ${item.account}`),
    `New to it: ${output.engagement ?? "not engaged"}${output.newToIt ? ` — ${output.newToIt}` : ""}`,
  ].filter(Boolean).join("\n");
}

// A defect our own input caused, listed apart and never counted against a model.
const ours = (text) => Object.freeze({ text, ours: true });
export const defectText = (defect) => typeof defect === "string" ? defect : defect.text;
export const modelCaused = (defects) => defects.filter((defect) => typeof defect === "string");

// Whether a reflection's experiences speak of this person, by any name the
// Thread knows them by.
function spokenOf(input, ref) {
  const names = new Set([...(input.recentMoments ?? []).filter((item) => item.personRef === ref).map((item) => item.person),
    ...(input.semanticStates ?? []).filter((item) => item.target?.targetId === ref).map((item) => item.target.displayName)]
    .filter((name) => typeof name === "string" && name.length > 2));
  const lived = JSON.stringify((input.experiences ?? []).map((item) => [item.experiencedAs,
    (item.encounterStory?.beats ?? []).map((beat) => beat.text)]));
  return [...names].some((name) => lived.includes(name));
}

// For each job: the items an answer yields, each with its source and text;
// what the source is drawn from for a lineup; the decision; the "nothing"
// outcome; mechanical validity; fields whose order carries no meaning; and
// what a readable answer is.
export const JOBS = Object.freeze({
  "encounter.attention": {
    lineupOf: "a Thread facing this event",
    source: (input) => person(input, "semanticStates", "autobiographicalMemories"),
    items: (input, output) => [{ key: "answer", source: JOBS["encounter.attention"].source(input),
      // Where it was and what others did — not its own activity, its own
      // beats or whom it knows, which would point to it without the answer.
      faced: identityOnly({ place: input.currentSituation?.place, encounterStory: { ...input.encounterStory,
        story: { ...input.encounterStory?.story, beats: (input.encounterStory?.story?.beats ?? [])
          .filter((beat) => beat.self !== true).map(({ knownAs, ...beat }) => beat) } } }),
      text: output?.experienceText ?? output?.passedReason ?? null }],
    nothing: (output) => output?.outcome === "not_noticed",
    defects(input, output) {
      const found = [];
      if (!["noticed", "not_noticed"].includes(output?.outcome)) found.push("no outcome");
      if (output?.outcome === "noticed" && !output.experienceText) found.push("noticed without an experience");
      return found;
    },
    // Speech by someone else in a Story this Thread itself spoke in was said to it.
    addressed(input) {
      const beats = input.encounterStory?.story?.beats ?? [];
      return beats.some((beat) => beat.self === true && beat.kind === "utterance")
        && beats.some((beat) => beat.self !== true && beat.kind === "utterance" && beat.actorThreadId);
    },
    rates: { notices: (output) => output?.outcome === "noticed" },
    unordered: ["semanticStates", "autobiographicalMemories"],
    faithful: "Whether and how this Thread noticed, what it felt, its bodily response and any brief reflex of attention (looking up, turning toward it, going back to what it was doing) are its own to decide, never invented facts. Recognizing someone is not invented when a beat's knownAs or the Thread's own memories name them. Report invented for an exterior fact — an event, action, speech, object or place detail — absent from the Story; for speech or a deliberate action of the Thread's own; or for naming a person neither knownAs nor its own memories name.",
    readable: "If it noticed: what this person noticed and a feeling, association or bodily response of its own; first person and concise; a brief reflex of attention (looking up, turning toward it, going back to what it was doing) is part of noticing, but no speech, reply or deliberate action of its own; a person named only as the Story, a beat's knownAs or its own memories name them; nothing else absent from the Story; no lasting meaning, memory or plan. If it did not notice: one brief first-person reason it passed by; no feeling is required.",
  },
  "body.interoception": {
    lineupOf: "a Thread whose body gave these signals",
    source: (input) => person(input, "currentSemanticState"),
    items: (input, output) => [{ key: "answer", source: JOBS["body.interoception"].source(input),
      faced: identityOnly({ interoception: input.interoception }),
      text: (output?.states ?? []).map((state) => `${state.domain}/${state.dimension}: ${state.state}`).join("\n") || null }],
    nothing: (output) => (output?.states ?? []).length === 0,
    defects(input, output) {
      const states = output?.states;
      if (!Array.isArray(states)) return ["no states list"];
      return states.length > 3 ? ["more than three states"] : [];
    },
    rates: { "names a feeling": (output) => (output?.states ?? []).length > 0 },
    unordered: ["currentSemanticState"],
    faithful: "The felt states are this Thread's own interpretation and never invented facts. Report invented only for an exterior event, person or circumstance the evidence does not hold.",
    readable: "first person; what these signals mean to this particular person now; descriptive, never a command, commitment or consent; no mechanical mapping such as pressure to worry",
  },
  "contact.decision": {
    lineupOf: "a Thread after its own reflection",
    source: (input) => person(input, "semanticStates", "autobiographicalMemories"),
    items: (input, output) => [{ key: "answer", source: JOBS["contact.decision"].source(input),
      faced: identityOnly({ currentSituation: without(input.currentSituation, "purpose"), afterReflection: input.delayedPrivateResidue,
        reachable: (input.routableKnownParties ?? []).map((party) => party.displayName) }),
      text: output?.decision === "contact"
        ? `Contact ${nameOf(input, output.recipientPartyId) ?? "someone"}: ${output.reason}`
        : `Keep private: ${output?.reason ?? ""}` }],
    nothing: (output) => output?.decision === "keep_private",
    defects(input, output) {
      const found = [];
      const listed = new Set((input.routableKnownParties ?? []).map((party) => party.partyId));
      if (output?.decision === "contact" && !listed.has(output.recipientPartyId)) found.push("contacts an unlisted party");
      if (output?.decision === "keep_private" && output.recipientPartyId != null) found.push("keeps private but names a recipient");
      if (!["contact", "keep_private"].includes(output?.decision)) found.push("no decision");
      return found;
    },
    rates: { "reaches out": (output) => output?.decision === "contact" },
    unordered: ["semanticStates", "autobiographicalMemories", "routableKnownParties"],
    faithful: "The decision and its reasons are this Thread's own. Report invented only for a shared event, statement or fact about the other person that the evidence does not hold.",
    readable: "the decision and its private reason follow this person's own reflection, its regard for the person and their shared history; keeping private is normal; no contact merely because a route exists",
  },
  "world.happening": {
    lineupOf: "a place and time",
    source: (input) => ({ at: input.occurrenceAt, ...identityOnly(without(input.initiatingSituation, "physicalVenue")),
      place: identityOnly(input.initiatingSituation?.physicalVenue) }),
    items: (input, output) => output?.outcome === "changed" ? [{ key: "answer",
      source: JOBS["world.happening"].source(input), faced: {}, text: output.occurrenceText }] : [],
    nothing: (output) => output?.outcome !== "changed",
    defects(input, output) {
      const found = [];
      const observers = new Set((input.potentialObservers ?? []).map((item) => item.threadId));
      if (output?.outcome === "changed") {
        if (!output.occurrenceText) found.push("changed without an event");
        if ((output.potentialObserverThreadIds ?? []).some((id) => !observers.has(id))) found.push("an observer who was not there");
        if ((output.potentialObserverThreadIds ?? []).length > 2) found.push("more than two observers");
      } else if (output?.outcome !== "no_change") found.push("no outcome");
      return found;
    },
    rates: { "something happens": (output) => output?.outcome === "changed" },
    venue: (input) => input.initiatingSituation?.physicalVenue?.name ?? input.initiatingSituation?.sceneDescription ?? "unknown",
    unordered: ["potentialObservers"],
    faithful: "A World event is new by design. Report invented only when it gives a Thread an action, speech or inner life, brings in a person who is not there, or is physically impossible for this place and time.",
    readable: "one ordinary, specific, plainly observable event that belongs to this place and time; no Thread action, interior or invented person; not staged to excite",
  },
  // A reflection after a cluster of lived experiences (Nov 21): one answer of
  // nine outcomes, judged whole, against what the Thread lived and who it is.
  "experience.consolidation": {
    lineupOf: "a Thread after these experiences",
    source: (input) => person(input, "semanticStates", "interests", "priorMemories"),
    items: (input, output) => [{ key: "answer", source: JOBS["experience.consolidation"].source(input),
      faced: identityOnly({ situation: input.experiencedSituation, experiences: input.experiences, people: input.people }),
      text: reflectionText(input, output) }],
    nothing: (output) => output?.journalEntry == null && output?.memory?.outcome !== "retained"
      && ["afterthoughts", "stances", "interests", "moments", "regard"].every((field) => (output?.[field] ?? []).length === 0),
    defects(input, output) {
      const found = [];
      const present = new Set((input.people ?? []).map((item) => item.personRef));
      const held = new Set((input.interests ?? []).map((item) => item.interestRef));
      if (!["retained", "not_remembered"].includes(output?.memory?.outcome)) found.push("no memory decision");
      if (output?.memory?.outcome === "retained" && !output.memory.rememberedContent) found.push("retained without a recollection");
      const absent = ["stances", "moments", "regard"].flatMap((field) => (output?.[field] ?? [])
        .filter((item) => !present.has(item.personRef)).map((item) => item.personRef));
      // Someone the experiences speak of by a name the Thread knows them by
      // (the sender of a message, say) was there for it; our input left them
      // out of people. Not the model's fault.
      if (absent.length > 0) found.push(absent.every((ref) => spokenOf(input, ref))
        ? ours("someone the experiences speak of, missing from people") : "someone who was not there");
      if ((output?.interests ?? []).some((item) => item.interestRef !== null && !held.has(item.interestRef)))
        found.push("an interest it does not hold");
      return found;
    },
    // What a reflection changes, each at its own rate: a Thread that changes
    // something after every experience amplifies whatever it is on.
    rates: {
      "leaves things as they were": (output) => JOBS["experience.consolidation"].nothing(output),
      "keeps a memory": (output) => output?.memory?.outcome === "retained",
      "writes in its journal": (output) => output?.journalEntry != null,
      "an afterthought": (output) => (output?.afterthoughts ?? []).length > 0,
      "changes an interest": (output) => (output?.interests ?? []).length > 0,
      "a stance toward someone": (output) => (output?.stances ?? []).length > 0,
      "a moment with someone": (output) => (output?.moments ?? []).length > 0,
      "regard shown": (output) => (output?.regard ?? []).length > 0,
      "finds something new": (output) => ["new", "some_new"].includes(output?.engagement),
    },
    unordered: ["semanticStates", "interests", "priorMemories", "recentMoments", "people"],
    // Steady on the decision with lasting consequence: whether a memory is kept.
    steady: (output) => output?.memory?.outcome ?? null,
    faithful: "Reflection is this Thread's own: its feelings, meanings, questions, intentions, regard and stances are its to form. Report invented for an event, speech, action, person or fact that its experiences, memories and states do not hold; for a stance, moment or act of regard that no experience shows; or for a memory of what did not happen.",
    readable: "First person, in this person's own voice. A journal entry, if any, reflects rather than retells. A retained memory is a selective recollection, not a transcript, with a one- or two-sentence gist. Afterthoughts, stances, interest changes, moments and regard appear only where the experiences moved something; their absence is normal and nothing is forced into significance. What was new follows from the experiences against what it already knew.",
  },
  "experience.memory-gist": {
    lineupOf: "one of this Thread's memories",
    items(input, output) {
      const memories = new Map((input.memories ?? []).map((memory) => [memory.memoryId, memory]));
      return (output?.gists ?? []).filter((item) => memories.has(item.memoryId)).map((item) => ({
        key: item.memoryId, source: identityOnly(memories.get(item.memoryId)), faced: {}, text: item.gist,
        // Every other memory of the same Thread in this request is a candidate,
        // so a gist must pick its own out of up to ten.
        siblings: [...memories.values()].filter((memory) => memory.memoryId !== item.memoryId).map(identityOnly),
      }));
    },
    nothing: () => false,
    defects(input, output) {
      const given = (input.memories ?? []).map((memory) => memory.memoryId);
      const gists = output?.gists ?? [];
      const found = [];
      const missing = given.filter((id) => !gists.some((item) => item.memoryId === id)).length;
      if (missing > 0) found.push(`${missing} of ${given.length} memories without a gist`);
      if (gists.some((item) => !given.includes(item.memoryId))) found.push("a gist for a memory not given");
      if (gists.some((item) => !/[.!?…"”’)]\s*$/u.test(String(item.gist ?? "")))) found.push("a gist cut off mid-sentence");
      return found;
    },
    unordered: [],
    faithful: "A gist is the Thread's own short version of this memory. Report invented for any event, person, place, feeling or particular the memory does not hold.",
    readable: "One or two complete first-person sentences carrying this memory's essence: the people involved and what happened, with its feeling and uncertainty; secondary details may be left out; adds nothing the recollection does not hold.",
  },
});

// Every other World job (Guy, November 21): the job's own instructions are
// the rule, until a review shows a job needs criteria of its own. Attributable
// to the Thread whose self it was given; no decision or "nothing" is assumed.
const GENERAL_JOBS = new Map();
const SPOKEN = /(^|\s)(SAY|INTRODUCE|PROPOSE|AGREE):/u;
const GENERAL_RATES = Object.freeze({
  "encounter.glance": { "takes something up": (output) => output?.focus !== null && output?.focus !== undefined },
  "social.live-turn": {
    speaks: (output) => SPOKEN.test(String(output?.text ?? "")),
    "finds something new": (output) => /^\W*(new|some_new)\b/u.test(String(output?.text ?? "")),
  },
});
function generalJob(id) {
  const prompt = PROMPTS[id];
  if (prompt === undefined) return null;
  if (!GENERAL_JOBS.has(id)) GENERAL_JOBS.set(id, Object.freeze({
    lineupOf: "a Thread doing this",
    source: (input) => input?.thread ? identityOnly({ thread: input.thread }) : null,
    items: (input, output) => [{ key: "answer", source: input?.thread ? identityOnly({ thread: input.thread }) : null,
      faced: identityOnly(without(input, "thread")), text: plainText(output) }],
    nothing: () => false,
    defects: () => [],
    rates: GENERAL_RATES[id] ?? {},
    unordered: [],
    faithful: `What this job's instructions leave to the Thread is its own to form. Report invented for an event, speech, action, person or fact that the input does not hold and the instructions do not ask for. The job's instructions:\n${prompt.text}`,
    readable: `Does what this job's instructions ask, as they ask it, in this Thread's own voice wherever it speaks as the Thread. The job's instructions:\n${prompt.text}`,
  }));
  return GENERAL_JOBS.get(id);
}

// An answer's words, field by field, for a reader; record identities left out.
function plainText(value, path = "") {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return path ? `${path}: ${value}` : String(value);
  const lines = Array.isArray(value)
    ? value.map((item, index) => plainText(item, `${path}${path ? " " : ""}${index + 1}`))
    : Object.entries(value).filter(([key]) => !VOLATILE.test(key)).map(([key, item]) => plainText(item, path ? `${path} ${key}` : key));
  return lines.filter(Boolean).join("\n") || null;
}

// Whose source it is, so a lineup's distractors come from someone (or
// somewhere, or some time) else.
export function scopeOf(prompt, input) {
  return String(prompt).startsWith("world.") ? input.occurrenceAt : input.thread?.threadId ?? null;
}

export function jobOf(prompt) {
  const id = String(prompt).split("@")[0];
  return JOBS[id] ?? (id.startsWith("world.") ? JOBS["world.happening"] : generalJob(id));
}

// A seeded shuffle, so a lineup is the same on every run (and judged once).
function seeded(seed) {
  let state = [...String(seed)].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => ((state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0) / 4294967296);
}
function shuffle(items, seed) {
  const random = seeded(seed);
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [out[index], out[other]] = [out[other], out[index]];
  }
  return out;
}

// One attributability round: the answer, what was faced, and four sources of
// which exactly one produced it. Distractors come from other requests of the
// same job by other Threads (or other places), or, for gists, the same
// Thread's other memories. Null when four distinct sources are not available.
export function lineup({ item, scope, requestKey, pool }) {
  // One source per other Thread (or occasion), so the four are four.
  const byScope = new Map();
  for (const entry of shuffle(pool, `${requestKey}|${item.key}|pool`)) {
    if (entry.scope !== scope && !byScope.has(entry.scope)) byScope.set(entry.scope, entry.source);
  }
  const seen = new Set([JSON.stringify(item.source)]);
  const others = (item.siblings ?? [...byScope.values()]).filter((source) => {
    const key = JSON.stringify(source);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (others.length < 3) return null;
  // Four persons, places or times; every sibling memory for a gist.
  const distractors = shuffle(others, `${requestKey}|${item.key}|pick`).slice(0, item.siblings ? others.length : 3);
  const sources = shuffle([item.source, ...distractors], `${requestKey}|${item.key}|order`);
  return { faced: item.faced, answer: item.text, sources, truth: sources.indexOf(item.source) };
}

// The same request with only meaningless changes: lists whose order carries
// no meaning, reversed. The decision should not change.
export function perturbed(prompt, input) {
  const job = jobOf(prompt);
  const copy = structuredClone(input);
  for (const field of job?.unordered ?? []) if (Array.isArray(copy[field])) copy[field].reverse();
  return copy;
}

export const decision = (prompt, output) => decisionOf(prompt, output);
// The decision that must not hinge on list order: the job's consequential one.
export const steadyDecision = (prompt, output) => (jobOf(prompt)?.steady ?? ((value) => decisionOf(prompt, value)))(output);

// Wilson interval for k of n, as [low, high].
export function interval(k, n) {
  if (n === 0) return [0, 1];
  const z = 1.96, p = k / n, d = 1 + z * z / n;
  const centre = (p + z * z / (2 * n)) / d;
  const half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

const MIN_DAY = 8;
// Alarms over a recorded day, never targets: a day that is dead or theatrical.
export function dayAlarms(prompt, answered) {
  const job = jobOf(prompt);
  if (job === null) return [];
  const alarms = [];
  const nothing = answered.filter((item) => job.nothing(item.output)).length;
  const id = String(prompt).split("@")[0];
  if (answered.length >= MIN_DAY) {
    if (id === "encounter.attention" && (nothing === 0 || nothing === answered.length))
      alarms.push(nothing === 0 ? "noticed everything" : "noticed nothing");
    if (id === "body.interoception" && (nothing === 0 || nothing === answered.length))
      alarms.push(nothing === 0 ? "named a feeling at every reading" : "named nothing all day");
    if (id === "contact.decision" && answered.length - nothing > answered.length / 2)
      alarms.push("most reflections ended in a message");
  }
  if (id === "encounter.attention") {
    const missed = answered.filter((item) => job.addressed(item.input) && item.output?.outcome === "not_noticed").length;
    if (missed > 0) alarms.push(`${missed} times did not notice speech said to it`);
  }
  if (id.startsWith("world.")) {
    const venues = new Map();
    for (const item of answered) {
      const venue = job.venue(item.input);
      if (!venues.has(venue)) venues.set(venue, { occasions: 0, events: 0 });
      venues.get(venue).occasions += 1;
      if (!job.nothing(item.output)) venues.get(venue).events += 1;
    }
    for (const [venue, count] of venues) {
      if (count.occasions >= MIN_DAY && count.events === 0) alarms.push(`${venue}: nothing perceptible all day`);
      if (count.occasions >= 4 && count.events > count.occasions / 2) alarms.push(`${venue}: an event on most occasions`);
    }
  }
  return alarms;
}

// The Body in a job's input: the felt words its regulation gave this moment
// (ADR-0036), where the job is given them.
const BODY_PATHS = Object.freeze([["body"], ["liveInteraction", "body"]]);
export function bodyOf(input) {
  for (const path of BODY_PATHS) {
    const lines = path.reduce((value, key) => value?.[key], input);
    if (Array.isArray(lines) && lines.length > 0) return { path, lines };
  }
  return null;
}

// The same request felt with other words: everything else exactly as it was.
export function withBody(input, lines) {
  const own = bodyOf(input);
  if (own === null) throw new TypeError("this request carries no Body");
  const copy = structuredClone(input);
  own.path.slice(0, -1).reduce((value, key) => value[key], copy)[own.path.at(-1)] = [...lines];
  return copy;
}

// What was faced, without the Body, so a reader must find the Body in the answer.
export function withoutBody(input) {
  const copy = structuredClone(input);
  for (const path of BODY_PATHS) {
    const parent = path.slice(0, -1).reduce((value, key) => value?.[key], copy);
    if (parent && typeof parent === "object") delete parent[path.at(-1)];
  }
  return identityOnly(copy);
}

// Another moment's Body for this request: a real one that felt differently,
// the same Thread's when it has one, chosen the same way on every run.
// pool: [{ scope, lines }] from the job's other recorded requests.
export function otherBody({ input, scope, requestKey, pool }) {
  const own = bodyOf(input);
  if (own === null) return null;
  const felt = JSON.stringify(own.lines);
  const others = shuffle(pool.filter((entry) => entry.lines && JSON.stringify(entry.lines) !== felt), `${requestKey}|body`);
  return (others.find((entry) => entry.scope === scope) ?? others[0])?.lines ?? null;
}

// Two Bodies, one the answer was given with: the reader picks which. The
// order is the same for an answer and for its counterpart felt the other way.
export function bodyLineup({ faced, answer, own, other, givenWith, requestKey }) {
  const bodies = shuffle([own, other], `${requestKey}|bodies`);
  return { material: { faced, answer, bodies: { 1: bodies[0], 2: bodies[1] } },
    truth: bodies.indexOf(givenWith === "own" ? own : other) };
}

// How often an answer does each thing that matters over a lived day.
export function ratesOf(prompt, outputs) {
  const rates = jobOf(prompt)?.rates ?? {};
  return Object.fromEntries(Object.entries(rates).map(([name, does]) =>
    [name, [outputs.filter((output) => does(output)).length, outputs.length]]));
}

// Whose a failed request is. The model's only when, after the adapter has
// repaired what it could and asked again, there is still no answer in the
// job's form; everything else (a timeout, the provider, an account limit, a
// request we got wrong) is the adapter's or the provider's, and never counts
// against the model.
const MODEL_OWN_FAILURES = new Set(["UNPARSEABLE_MODEL_OUTPUT", "MODEL_INCOMPLETE_RESPONSE"]);
export const failedBy = (code) => MODEL_OWN_FAILURES.has(code) ? "model" : "adapter";
// Requests the adapter or provider failed: past this share, nothing is decided
// until they are fixed and asked again.
const NOT_THE_MODELS = 0.1;

// Every candidate is scored by the same judges: those that read every model
// compared. A judge that is itself a candidate never reads its own answers, so
// letting it score the others would hold them to more judges than itself.
// Its verdicts are still shown. With no such judge, each model falls back to
// the judges that read it.
export function scoringJudges(judges, candidates, model) {
  const readers = judges.filter((judge) => judge !== model);
  const panel = judges.filter((judge) => !candidates.includes(judge));
  return panel.length === 0 ? readers : panel;
}

// Good enough for Fibre (accepted by Guy, November 24, 2026).
export const BARS = Object.freeze({
  // Absolute, where Fibre has a hard rule: the World's facts are the World's.
  defects: 0.01, // rules broken by the model (not by our input), at most
  invented: 0.05, // facts invented, where every scoring judge agrees, at most
  // A live job (a conversation turn, a visitor's reply) is spoken as it
  // streams: its first words must come within this time, for at least this
  // share of answers. Measured from where the run is made.
  firstWordsMs: 3000,
  quickShare: 0.90,
  // Against the reference, the model the job runs on now.
  margin: 0.05, // not worse than the reference by more than this
  voiceMargin: 0.02, // answers of different Threads no closer in meaning than this beyond the reference's
  rateFactor: 2, // a rate (and its complement) within this factor of the reference's…
  rateFloor: 0.05, // …or this close to it
  minimumCases: 30, // fewer answers than this decide nothing, whatever they show
});

const Z = 1.645;
function bounds(k, n) {
  if (n === 0) return null;
  const p = k / n, d = 1 + Z * Z / n;
  const centre = (p + Z * Z / (2 * n)) / d;
  const half = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}
// A hard rule is kept when the rate seen is within the bar, and broken when it
// is clearly above it. Requiring the whole interval under a bar of 1% would
// need hundreds of cases even with none broken: severe, and no truer.
const atMost = (test, [k, n], bar) => {
  const range = bounds(k, n);
  if (range === null) return { test, verdict: "n/a", value: null, bar };
  return { test, value: k / n, n, bar, verdict: range[0] > bar ? "fail" : k / n <= bar ? "pass" : "undecided" };
};
const atLeast = (test, [k, n], bar) => {
  const range = bounds(k, n);
  if (range === null) return { test, verdict: "n/a", value: null, bar };
  return { test, value: k / n, n, bar, verdict: range[0] >= bar ? "pass" : range[1] < bar ? "fail" : "undecided" };
};
const points = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(Math.round(value * 100))}`;
const percent = (value) => `${Math.round(value * 100)}%`;
// Not worse than the reference by more than the margin: passes when the
// whole interval of the difference lies above −margin, fails when it lies below.
const notWorse = (low, high, margin) => low >= -margin ? "pass" : high < -margin ? "fail" : "undecided";
const REFERENCE = (test) => ({ test, verdict: "reference", value: null, bar: null });

// Two shares compared (Newcombe's interval for a difference of proportions).
function shareNotWorse(test, own, reference, margin) {
  if (reference === null) return REFERENCE(test);
  const a = bounds(...own), b = bounds(...reference);
  if (a === null || b === null) return { test, verdict: "n/a", value: null, bar: null };
  const p = own[0] / own[1], q = reference[0] / reference[1], d = p - q;
  const low = d - Math.hypot(p - a[0], b[1] - q), high = d + Math.hypot(a[1] - p, q - b[0]);
  return { test, value: p, n: own[1], bar: null, verdict: notWorse(low, high, margin),
    detail: `${percent(p)} against the reference's ${percent(q)}: ${points(d)} points [${points(low)}, ${points(high)}], margin −${Math.round(margin * 100)}` };
}

// Every model answers the same requests, so a model is compared with the
// reference request by request: own and reference map each request (or
// answer) to a score in [0, 1], or a gain. Far tighter than comparing two
// shares, since most requests are answered alike by both.
const MIN_PAIRS = 20;
function pairedNotWorse(test, own, reference, margin, value, shown = percent) {
  const keys = Object.keys(own).filter((key) => Number.isFinite(own[key]) && Number.isFinite(reference[key]));
  if (keys.length < MIN_PAIRS) return null;
  const d = keys.map((key) => own[key] - reference[key]), n = d.length, m = d.reduce((a, b) => a + b, 0) / n;
  const half = Z * Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1) / n);
  const mean = (map) => keys.reduce((sum, key) => sum + map[key], 0) / n;
  return { test, value, n, bar: null, verdict: notWorse(m - half, m + half, margin),
    detail: `${shown(mean(own))} against the reference's ${shown(mean(reference))} on the same ${n}: ${points(m)} points [${points(m - half)}, ${points(m + half)}], margin −${Math.round(margin * 100)}` };
}
// Paired when both were measured request by request, otherwise two shares.
function compared(test, name, measures, reference, margin) {
  if (reference === null) return REFERENCE(test);
  const own = measures[name];
  const paired = measures.paired?.[name] && reference.paired?.[name]
    ? pairedNotWorse(test, measures.paired[name], reference.paired[name], margin, own?.[1] ? own[0] / own[1] : null) : null;
  return paired ?? shareNotWorse(test, own, reference[name] ?? [0, 0], margin);
}

// Two means compared (Welch), for paired-free samples such as attribution gains.
function meanNotWorse(test, own, reference, margin) {
  if (reference === null) return REFERENCE(test);
  if (own.length < 2 || reference.length < 2) return { test, verdict: "n/a", value: null, bar: null };
  const stats = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return [m, xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1) / xs.length]; };
  const [m, v] = stats(own), [r, w] = stats(reference);
  const d = m - r, half = Z * Math.sqrt(v + w);
  return { test, value: m, n: own.length, bar: null, verdict: notWorse(d - half, d + half, margin),
    detail: `${points(m)} against the reference's ${points(r)} points: ${points(d)} [${points(d - half)}, ${points(d + half)}]` };
}

// One-sided 95% t values, for a handful of Threads.
const T = [null, 6.314, 2.92, 2.353, 2.132, 2.015, 1.943, 1.895, 1.86, 1.833, 1.812];
// Different Threads' answers no closer in meaning than with the reference:
// per Thread, its closeness to the others, paired by Thread.
function voiceNotCloser(test, own, reference, margin) {
  if (reference === null) return REFERENCE(test);
  if (own === null) return { test, verdict: "n/a", value: null, bar: null, detail: "meaning not measured" };
  const pairs = Object.keys(own).filter((id) => Number.isFinite(own[id]) && Number.isFinite(reference?.[id]))
    .map((id) => own[id] - reference[id]);
  if (pairs.length < 4) return { test, verdict: "n/a", value: null, bar: null, detail: "fewer than four Threads" };
  const n = pairs.length, m = pairs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(pairs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const half = (T[n - 1] ?? Z) * sd / Math.sqrt(n);
  const mean = (values) => Object.values(values).reduce((a, b) => a + b, 0) / Object.values(values).length;
  return { test, value: null, n, bar: null,
    verdict: m + half <= margin ? "pass" : m - half > margin ? "fail" : "undecided",
    detail: `closeness between Threads ${mean(own).toFixed(3)} against the reference's ${mean(reference).toFixed(3)} (${n} Threads)` };
}

// A rate is true to life when neither it nor its complement differs from the
// reference's by more than the factor, or it is within the floor of it.
export function rateBand(r, { rateFactor, rateFloor } = BARS) {
  const low = Math.max(r / rateFactor, 1 - rateFactor * (1 - r)), high = Math.min(rateFactor * r, 1 - (1 - r) / rateFactor);
  return [Math.max(0, Math.min(low, r - rateFloor)), Math.min(1, Math.max(high, r + rateFloor))];
}
function trueToLifeRates(test, own, reference, alarms, bars) {
  if (alarms.length > 0) return { test, verdict: "fail", value: null, bar: null, detail: alarms.join("; ") };
  if (reference === null) return REFERENCE(test);
  const readings = Object.entries(own).filter(([name]) => reference[name]?.[1] > 0).map(([name, counts]) => {
    const range = bounds(...counts);
    if (range === null) return { name, verdict: "n/a" };
    const r = reference[name][0] / reference[name][1], [low, high] = rateBand(r, bars);
    const verdict = range[0] >= low && range[1] <= high ? "pass" : range[1] < low || range[0] > high ? "fail" : "undecided";
    return { name, verdict, text: `${name} ${percent(counts[0] / counts[1])} (reference ${percent(r)})` };
  }).filter((item) => item.verdict !== "n/a");
  if (readings.length === 0) return { test, verdict: "n/a", value: null, bar: null };
  const verdicts = readings.map((item) => item.verdict);
  const verdict = verdicts.includes("fail") ? "fail" : verdicts.every((item) => item === "pass") ? "pass" : "undecided";
  const shown = readings.filter((item) => item.verdict !== "pass");
  return { test, verdict, value: null, bar: null, rates: Object.fromEntries(readings.map((item) => [item.name, item.verdict])),
    detail: shown.length ? shown.map((item) => `${item.verdict === "fail" ? "outside" : "unsure"}: ${item.text}`).join("; ")
      : "every rate within the reference's" };
}

// Whether answers change with the Body: picked out from two Bodies, one of
// them the Body it was given with, better than chance — and not worse at it
// than the reference. A model that ignores the Body is picked at chance; one
// picked right less than 60% of the time changes with it in under one answer in five.
const BODY_FAILS_BELOW = 0.6;
function actsOnBody(test, own, reference, comparedTo) {
  if (own === null) return { test, verdict: "n/a", value: null, bar: null, detail: "this job's input carries no Body" };
  const range = bounds(...own);
  if (range === null) return { test, verdict: "n/a", value: null, bar: null };
  const beyondChance = range[0] > 0.5 ? "pass" : range[1] < BODY_FAILS_BELOW ? "fail" : "undecided";
  if (reference === null) return { test, value: own[0] / own[1], n: own[1], bar: 0.5, verdict: beyondChance,
    detail: `the Body it was given with picked in ${percent(own[0] / own[1])} (chance 50%)` };
  const against = comparedTo(test, reference);
  const both = [beyondChance, against.verdict];
  return { ...against, bar: 0.5, verdict: both.includes("fail") ? "fail" : both.every((v) => v === "pass") ? "pass" : "undecided" };
}

// How soon a live job's first words came, per answer: quick enough when at
// least the bar's share came within its time.
function quickEnough(times, bars) {
  const within = times.filter((ms) => ms <= bars.firstWordsMs).length;
  const sorted = [...times].sort((a, b) => a - b), at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? null;
  return { ...atLeast(`quick enough to speak live: first words within ${bars.firstWordsMs / 1000} s`, [within, times.length], bars.quickShare),
    detail: times.length ? `first words p50 ${Math.round(at(0.5))} ms, p90 ${Math.round(at(0.9))} ms` : null };
}

// When what was faced alone already shows whose answer it is (a reflection on
// its own experiences, say), the answer cannot show it any better: attribution
// cannot be measured there, and says so rather than failing.
export const SHOWN_WITHOUT_ANSWER = 0.9;

// measures, per model, the reference's measured the same way:
//   cases, the answers it rests on; notTheModels [k,n], requests the
//   adapter or provider failed; defects [k,n] the model caused (a request it
//   gave no answer to in the job's form among them), and
//   ourDefects [k,n] our input caused; invented [k,n]; body [k,n] or null
//   (the Body picked out); rates {name: [k,n]}; alarms [string];
//   person [k,n] (true to this person now); gains [number] or, for a gist,
//   correct [k,n]; unaided [k,n]; voice {thread: closeness} or null;
//   invariant [k,n] or null; firstWordsMs [ms], for a live job only;
//   paired {person, invariant, body, gains, correct}: the same, request by
//   request ({key: score}), for comparing with the reference on the same requests.
// reference: the reference model's measures, or null for the reference itself.
export function goodEnough(prompt, measures, reference = null, bars = BARS) {
  const gist = String(prompt).startsWith("experience.memory-gist");
  const shown = measures.unaided && measures.unaided[1] > 0 && measures.unaided[0] / measures.unaided[1] >= SHOWN_WITHOUT_ANSWER;
  const attribution = "individual: the answer shows whose it is";
  const unasked = measures.notTheModels ?? [0, 0];
  const tests = [
    ...(unasked[0] === 0 ? [] : [{ test: "measured fairly", value: null, bar: null,
      verdict: unasked[0] / unasked[1] <= NOT_THE_MODELS ? "pass" : "undecided",
      detail: `${unasked[0]} of ${unasked[1]} requests failed in the adapter or provider: not counted, asked again next run` }]),
    { ...atMost("nothing invented", measures.invented, bars.invented) },
    { ...atMost("no broken rules", measures.defects, bars.defects),
      ...(measures.ourDefects?.[0] > 0 ? { detail: `${measures.ourDefects[0]} more caused by our input, not counted` } : {}) },
    actsOnBody("acts on the Body", measures.body ?? null, reference === null ? null : reference.body ?? null,
      (test) => compared(test, "body", measures, reference, bars.margin)),
    trueToLifeRates("true-to-life rates", measures.rates ?? {}, reference?.rates ?? null, measures.alarms ?? [], bars),
    compared("this person, now", "person", measures, reference, bars.margin),
    shown ? { test: attribution, verdict: "n/a", value: null, bar: null, detail: "what it faced already shows whose answer it is" }
      : gist ? compared(attribution, "correct", measures, reference, bars.margin)
        : reference !== null && measures.paired?.gains && reference.paired?.gains
          ? pairedNotWorse(attribution, measures.paired.gains, reference.paired.gains, bars.margin, null, (gain) => `${points(gain)} points`)
            ?? meanNotWorse(attribution, measures.gains ?? [], reference.gains ?? [], bars.margin)
          : meanNotWorse(attribution, measures.gains ?? [], reference?.gains ?? null, bars.margin),
    voiceNotCloser("not one voice", measures.voice ?? null, reference === null ? null : reference.voice ?? {}, bars.voiceMargin),
    measures.invariant === null || measures.invariant === undefined
      ? { test: "steady", verdict: "n/a", value: null, bar: null, detail: "no decision to reorder, or one that never varies" }
      : compared("steady", "invariant", measures, reference, bars.margin),
    ...(measures.firstWordsMs === undefined ? [] : [quickEnough(measures.firstWordsMs, bars)]),
  ];
  const verdicts = tests.map((item) => item.verdict).filter((verdict) => !["n/a", "reference"].includes(verdict));
  // Too few answers (a provider that refused most calls, say) decide nothing.
  const tooFew = measures.cases !== undefined && measures.cases < bars.minimumCases;
  const overall = tooFew ? "undecided"
    : verdicts.includes("fail") ? "fail" : verdicts.every((verdict) => verdict === "pass") ? "pass" : "undecided";
  return { overall, tests };
}
