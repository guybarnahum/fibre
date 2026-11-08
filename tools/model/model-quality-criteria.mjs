// What a good answer is, per cognitive job — the standard accepted by Guy on
// November 8, 2026: valid, attributable, invariant, credible over a lived
// day, and readable. No model is the reference. This module is pure: it
// knows each job's source, answer, decision and rules; model:quality asks
// the models and the judges.

import { decisionOf } from "./model-replay-judge.mjs";

const without = (object, ...keys) => Object.fromEntries(Object.entries(object ?? {})
  .filter(([key]) => !keys.includes(key)));

// The person a Thread job answers as: everything Thread-owned in its input.
// What it faces is shown once; a lineup offers four persons facing it.
function person(input, ...fields) {
  return { thread: without(input.thread, "threadId"), ...Object.fromEntries(fields
    .filter((field) => input[field] !== undefined).map((field) => [field, input[field]])) };
}

const nameOf = (input, partyId) => (input.routableKnownParties ?? [])
  .find((party) => party.partyId === partyId)?.displayName ?? null;

// For each job: the items an answer yields, each with its source and text;
// what the source is drawn from for a lineup; the decision; the "nothing"
// outcome; mechanical validity; fields whose order carries no meaning; and
// what a readable answer is.
export const JOBS = Object.freeze({
  "encounter.attention": {
    lineupOf: "a Thread facing this event",
    source: (input) => person(input, "semanticStates", "autobiographicalMemories", "currentSituation"),
    items: (input, output) => [{ key: "answer", source: JOBS["encounter.attention"].source(input),
      faced: { encounterStory: input.encounterStory },
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
    unordered: ["semanticStates", "autobiographicalMemories"],
    readable: "concrete; what this person noticed and a feeling, association or bodily response of its own, in the first person; concise; nothing absent from the Story; no lasting meaning, memory or plan claimed",
  },
  "body.interoception": {
    lineupOf: "a Thread whose body gave these signals",
    source: (input) => person(input, "currentSemanticState"),
    items: (input, output) => [{ key: "answer", source: JOBS["body.interoception"].source(input),
      faced: { interoception: input.interoception },
      text: (output?.states ?? []).map((state) => `${state.domain}/${state.dimension}: ${state.state}`).join("\n") || null }],
    nothing: (output) => (output?.states ?? []).length === 0,
    defects(input, output) {
      const states = output?.states;
      if (!Array.isArray(states)) return ["no states list"];
      return states.length > 3 ? ["more than three states"] : [];
    },
    unordered: ["currentSemanticState"],
    readable: "first person; what these signals mean to this particular person now; descriptive, never a command, commitment or consent; no mechanical mapping such as pressure to worry",
  },
  "contact.decision": {
    lineupOf: "a Thread after its own reflection",
    source: (input) => person(input, "semanticStates", "autobiographicalMemories", "currentSituation",
      "delayedPrivateResidue", "routableKnownParties"),
    items: (input, output) => [{ key: "answer", source: JOBS["contact.decision"].source(input),
      faced: {},
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
    unordered: ["semanticStates", "autobiographicalMemories", "routableKnownParties"],
    readable: "the decision and its private reason follow this person's own reflection, its regard for the person and their shared history; keeping private is normal; no contact merely because a route exists",
  },
  "world.happening": {
    lineupOf: "a place and time",
    source: (input) => ({ at: input.occurrenceAt, ...without(input.initiatingSituation, "situationId", "physicalVenue"),
      place: without(input.initiatingSituation?.physicalVenue, "ref") }),
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
    venue: (input) => input.initiatingSituation?.physicalVenue?.name ?? input.initiatingSituation?.sceneDescription ?? "unknown",
    unordered: ["potentialObservers"],
    readable: "one ordinary, specific, plainly observable event that belongs to this place and time; no Thread action, interior or invented person; not staged to excite",
  },
  "experience.memory-gist": {
    lineupOf: "one of this Thread's memories",
    items(input, output) {
      const memories = new Map((input.memories ?? []).map((memory) => [memory.memoryId, memory]));
      return (output?.gists ?? []).filter((item) => memories.has(item.memoryId)).map((item) => ({
        key: item.memoryId, source: without(memories.get(item.memoryId), "memoryId"), faced: {}, text: item.gist,
        // Distractors are the same Thread's other memories in this request.
        siblings: [...memories.values()].filter((memory) => memory.memoryId !== item.memoryId)
          .map((memory) => without(memory, "memoryId")),
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
    readable: "first person; carries this memory's essence and its particulars — who, where, what happened — with its feeling and uncertainty; adds nothing the recollection does not hold",
  },
});

// Whose source it is, so a lineup's distractors come from someone (or
// somewhere, or some time) else.
export function scopeOf(prompt, input) {
  return String(prompt).startsWith("world.") ? input.occurrenceAt : input.thread?.threadId ?? null;
}

export function jobOf(prompt) {
  const id = String(prompt).split("@")[0];
  return JOBS[id] ?? (id.startsWith("world.") ? JOBS["world.happening"] : null);
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
  const distractors = shuffle(others, `${requestKey}|${item.key}|pick`).slice(0, 3);
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
