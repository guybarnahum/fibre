import { publicInsideFibreAvailability } from "./inside-fibre-public-availability.mjs";
import { projectInsideFibreLivedScene } from "./inside-fibre-lived-scene.mjs";

export const COMMITTED_MEET_SELECTION_POLICY = "inside-fibre-committed-meet-v1";

function requireFunction(name, value) {
  if (typeof value !== "function") throw new TypeError(`${name} must be a function`);
  return value;
}

export async function selectCommittedAvailableThread({
  requestUrl,
  selectCandidate,
  admitCandidate,
  maxAttempts = 100,
}) {
  const url = new URL(requestUrl);
  requireFunction("selectCandidate", selectCandidate);
  requireFunction("admitCandidate", admitCandidate);
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError("maxAttempts must be an integer between 1 and 100");
  }

  const rejected = [];
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidateUrl = new URL(url);
    for (const threadId of rejected) candidateUrl.searchParams.append("exclude", threadId);
    const selected = await selectCandidate(candidateUrl);
    if (selected === null || typeof selected !== "object" || Array.isArray(selected)) {
      throw new TypeError("Thread directory selection must return an object");
    }
    const thread = selected.thread ?? null;
    if (thread === null) {
      return Object.freeze({
        thread:null,
        selection:selected.selection ?? null,
        currentPresent:null,
        livedScene:null,
        availability:null,
        availabilityPolicyVersion:COMMITTED_MEET_SELECTION_POLICY,
      });
    }
    const threadId = thread.threadId;
    if (typeof threadId !== "string" || threadId === "") {
      throw new TypeError("Thread directory selection must return a Thread ID");
    }

    const admitted = await admitCandidate(threadId);
    if (admitted === null) {
      rejected.push(threadId);
      continue;
    }
    if (typeof admitted !== "object" || Array.isArray(admitted) || admitted.present === null) {
      throw new TypeError("committed meeting admission must return a public present");
    }

    const livedScene = projectInsideFibreLivedScene({
      present:admitted.present,
      availability:admitted.availability,
    });
    if (livedScene === null) {
      throw new TypeError("committed meeting admission requires active visitor availability");
    }

    return Object.freeze({
      thread,
      selection:selected.selection ?? null,
      currentPresent:Object.freeze({ payload:admitted.present }),
      livedScene,
      availability:publicInsideFibreAvailability(admitted.availability),
      availabilityPolicyVersion:COMMITTED_MEET_SELECTION_POLICY,
    });
  }

  return Object.freeze({
    thread:null,
    selection:null,
    currentPresent:null,
    livedScene:null,
    availability:null,
    availabilityPolicyVersion:COMMITTED_MEET_SELECTION_POLICY,
  });
}
