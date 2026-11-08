// Judging a candidate model for one cognitive job by replaying recorded
// requests. The standard (accepted by Guy, November 7, 2026): the candidate
// may differ from the current model no more than the current model differs
// from itself — same decisions, same outcome rates, and two different Threads
// facing the same event still deciding differently as often.

const AGREEMENT_SLACK = 0.02;
const RATE_SLACK = 0.03;
const DIFFERENTIAL_SLACK = 0.03;
const MIN_SHARED_EVENTS = 5;

// The decision an answer makes, for jobs whose answer is a choice. Text is
// judged by a blind read instead (a World event has both).
export function decisionOf(prompt, output) {
  const id = String(prompt).split("@")[0];
  if (output === null || typeof output !== "object") return null;
  // Whether anything happens at all is a decision; what happens is text.
  if (id === "encounter.attention" || id.startsWith("world.")) return output.outcome ?? null;
  if (id === "contact.decision") return `${output.decision}:${output.recipientPartyId ?? ""}`;
  if (id === "body.interoception") {
    return (output.states ?? []).map((state) => `${state.domain}:${state.dimension}`).sort().join(",") || "none";
  }
  return null;
}

// Requests about the same World event, seen by different Threads.
export function sharedEventKey(prompt, input) {
  const id = String(prompt).split("@")[0];
  if (id === "encounter.attention" && input?.encounterStory) {
    const story = input.encounterStory;
    return `${story.occurredAt}|${(story.story?.beats ?? []).map((beat) => beat.actorThreadId ?? "").join(",")}`;
  }
  return null;
}

function share(values) {
  return values.length === 0 ? null : values.filter(Boolean).length / values.length;
}

function rates(decisions) {
  const counts = new Map();
  for (const decision of decisions) counts.set(decision, (counts.get(decision) ?? 0) + 1);
  return new Map([...counts].map(([key, count]) => [key, count / decisions.length]));
}

function differentialRate(cases, pick) {
  const groups = new Map();
  for (const item of cases) {
    if (item.eventKey === null) continue;
    if (!groups.has(item.eventKey)) groups.set(item.eventKey, []);
    groups.get(item.eventKey).push(item);
  }
  const shared = [...groups.values()].filter((group) => new Set(group.map((item) => item.scope)).size > 1);
  if (shared.length < MIN_SHARED_EVENTS) return { events: shared.length, rate: null };
  return { events: shared.length, rate: share(shared.map((group) => new Set(group.map(pick)).size > 1)) };
}

// cases: [{ prompt, scope, eventKey, baseline: [output, output], candidate: output }]
export function judgeReplay(cases) {
  if (cases.length === 0) return Object.freeze({ verdict: "no_cases" });
  const prompt = cases[0].prompt;
  const decide = (output) => decisionOf(prompt, output);
  if (decide(cases[0].baseline[0]) === null && cases.every((item) => decide(item.baseline[0]) === null)) {
    return Object.freeze({ prompt, cases: cases.length, verdict: "blind_read_required" });
  }
  const self = share(cases.map((item) => decide(item.baseline[0]) === decide(item.baseline[1])));
  const cross = share(cases.flatMap((item) => item.baseline.map((output) => decide(item.candidate) === decide(output))));
  const baselineRates = rates(cases.map((item) => decide(item.baseline[0])));
  const candidateRates = rates(cases.map((item) => decide(item.candidate)));
  const rateGap = Math.max(0, ...[...new Set([...baselineRates.keys(), ...candidateRates.keys()])]
    .map((key) => Math.abs((baselineRates.get(key) ?? 0) - (candidateRates.get(key) ?? 0))));
  const baselineDifference = differentialRate(cases, (item) => decide(item.baseline[0]));
  const candidateDifference = differentialRate(cases, (item) => decide(item.candidate));
  const differentialGap = baselineDifference.rate === null ? null
    : Math.abs(baselineDifference.rate - candidateDifference.rate);
  const failures = [
    ...(cross < self - AGREEMENT_SLACK ? ["agrees with the current model less than it agrees with itself"] : []),
    ...(rateGap > RATE_SLACK ? ["changes how often each outcome happens"] : []),
    ...(differentialGap !== null && differentialGap > DIFFERENTIAL_SLACK
      ? ["changes how often different Threads decide differently"] : []),
  ];
  return Object.freeze({
    prompt, cases: cases.length,
    selfAgreement: self, candidateAgreement: cross,
    baselineRates: Object.fromEntries(baselineRates), candidateRates: Object.fromEntries(candidateRates),
    rateGap,
    sharedEvents: baselineDifference.events,
    baselineDifference: baselineDifference.rate, candidateDifference: candidateDifference.rate,
    verdict: failures.length === 0
      ? (differentialGap === null ? "passes_without_differential" : "passes")
      : "fails",
    failures: Object.freeze(failures),
  });
}
