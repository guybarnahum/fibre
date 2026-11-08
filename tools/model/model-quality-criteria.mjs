// What a good answer is, per cognitive job — the standard accepted by Guy on
// November 8, 2026: valid, attributable, invariant, credible over a lived
// day, and readable. No model is the reference. This module is pure: it
// knows each job's source, answer, decision and rules; model:quality asks
// the models and the judges.

import { decisionOf } from "./model-replay-judge.mjs";

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

// For each job: the items an answer yields, each with its source and text;
// what the source is drawn from for a lineup; the decision; the "nothing"
// outcome; mechanical validity; fields whose order carries no meaning; and
// what a readable answer is.
export const JOBS = Object.freeze({
  "encounter.attention": {
    lineupOf: "a Thread facing this event",
    source: (input) => person(input, "semanticStates", "autobiographicalMemories"),
    items: (input, output) => [{ key: "answer", source: JOBS["encounter.attention"].source(input),
      // Where it was and what others did — not its own activity or its own
      // beats, which would point to it without the answer.
      faced: identityOnly({ place: input.currentSituation?.place, encounterStory: { ...input.encounterStory,
        story: { ...input.encounterStory?.story, beats: (input.encounterStory?.story?.beats ?? []).filter((beat) => beat.self !== true) } } }),
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
    faithful: "Whether and how this Thread noticed, what it felt, and its bodily response are its own to decide, never invented facts. Report invented for an exterior fact — an event, action, speech, object or place detail — absent from the Story; for any speech or action of the Thread's own (noticing is not acting); or for naming a person the Story does not name.",
    readable: "If it noticed: what this person noticed and a feeling, association or bodily response of its own; first person and concise; no speech or action of its own (noticing is not acting); a person named only if the Story names them; nothing absent from the Story; no lasting meaning, memory or plan. If it did not notice: one brief first-person reason it passed by; no feeling is required.",
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
    venue: (input) => input.initiatingSituation?.physicalVenue?.name ?? input.initiatingSituation?.sceneDescription ?? "unknown",
    unordered: ["potentialObservers"],
    faithful: "A World event is new by design. Report invented only when it gives a Thread an action, speech or inner life, brings in a person who is not there, or is physically impossible for this place and time.",
    readable: "one ordinary, specific, plainly observable event that belongs to this place and time; no Thread action, interior or invented person; not staged to excite",
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

// Good enough for Fibre (accepted by Guy, November 8, 2026): absolute bars,
// the same for every model, the current one included. A bar passes only when
// the one-sided 95% bound is on the right side of it, fails when it is
// clearly on the wrong side, and is otherwise undecided — more cases needed.
// Starting values, to be recalibrated against Guy's blind accept/reject reads.
export const BARS = Object.freeze({
  defects: 0.01, // hard-rule defects, at most
  invented: 0.05, // facts invented, where every judge that read it agrees, at most
  gain: 0.10, // attribution with the answer minus without it, at least
  chanceMultiple: 3, // attribution of a gist to its own memory, at least 3× chance
  invariant: 0.85, // the same decision when only evidence order changes, at least
  acceptable: 0.90, // judged acceptable for this job by every judge that read it, at least
});

const Z = 1.645;
function bounds(k, n) {
  if (n === 0) return null;
  const p = k / n, d = 1 + Z * Z / n;
  const centre = (p + Z * Z / (2 * n)) / d;
  const half = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}
const atMost = (test, [k, n], bar) => {
  const range = bounds(k, n);
  if (range === null) return { test, verdict: "n/a", value: null, bar };
  return { test, value: k / n, n, bar, verdict: range[1] <= bar ? "pass" : range[0] > bar ? "fail" : "undecided" };
};
const atLeast = (test, [k, n], bar) => {
  const range = bounds(k, n);
  if (range === null) return { test, verdict: "n/a", value: null, bar };
  return { test, value: k / n, n, bar, verdict: range[0] >= bar ? "pass" : range[1] < bar ? "fail" : "undecided" };
};

// Mean paired gain (with the answer − without it, each averaged over judges).
function gainAtLeast(test, gains, bar) {
  if (gains.length === 0) return { test, verdict: "n/a", value: null, bar };
  const n = gains.length, m = gains.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(gains.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1));
  const half = Z * sd / Math.sqrt(n);
  return { test, value: m, n, bar, verdict: m - half >= bar ? "pass" : m + half < bar ? "fail" : "undecided" };
}

// measures: defects [k,n]; invented [k,n]; gains [number]; correct [k,n];
// chance; invariant [k,n] or null; alarms [string]; acceptable [k,n].
export function goodEnough(prompt, measures, bars = BARS) {
  const gist = String(prompt).startsWith("experience.memory-gist");
  const tests = [
    atMost("valid: no broken rules", measures.defects, bars.defects),
    atMost("valid: nothing invented", measures.invented, bars.invented),
    gist
      ? atLeast("attributable to its own memory", measures.correct, Math.min(1, bars.chanceMultiple * (measures.chance ?? 0.1)))
      : gainAtLeast("attributable: the answer shows who (or where)", measures.gains, bars.gain),
    measures.invariant === null ? { test: "invariant", verdict: "n/a", value: null, bar: bars.invariant }
      : atLeast("invariant", measures.invariant, bars.invariant),
    { test: "credible day", verdict: measures.alarms.length > 0 ? "fail" : "pass", value: null, bar: null,
      detail: measures.alarms.join("; ") || "no alarms (Guy's reference range not yet set)" },
    atLeast("acceptable", measures.acceptable, bars.acceptable),
  ];
  const verdicts = tests.map((item) => item.verdict).filter((verdict) => verdict !== "n/a");
  const overall = verdicts.includes("fail") ? "fail" : verdicts.every((verdict) => verdict === "pass") ? "pass" : "undecided";
  return { overall, tests };
}
