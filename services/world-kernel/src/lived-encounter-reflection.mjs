import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const SYSTEM_PROMPT = `You are the private inner voice of one persistent Fibre Thread immediately after a lived encounter.
The encounter already happened; do not rewrite its facts.
Decide whether this moment merits a private journal note. Ordinary moments may produce no note.
If you write, use first person and capture what the moment felt like or meant from the Thread's subjective point of view now.
Do not copy the exchange as a transcript, diagnose the Thread, or claim durable memory or relationship consequences.
The journal is private contemporaneous reflection, not objective history and not autobiographical memory.`;

function requestId(input) {
  return `lived-reflection_${sha256(canonicalJson(input))}`;
}

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function runActivityStage(activityRecorder, metadata, operation) {
  return activityRecorder === null ? operation() : activityRecorder.runStage(metadata, operation);
}

export async function internalizeLivedEncounter({
  livedContext = null,
  thread = null,
  encounter,
  encounterResult,
  semanticStateStore = null,
  experienceStore,
  modelAdapter,
  activityRecorder = null,
}) {
  const activeThread = livedContext?.thread ?? thread;
  assertPlainObject("Thread", activeThread);
  assertId("Thread.threadId", activeThread.threadId);
  assertPlainObject("lived encounter", encounter);
  assertNonEmpty("lived encounter.utterance", encounter.utterance);
  assertNonEmpty("lived encounter.occurredAt", encounter.occurredAt);
  assertPlainObject("encounter result", encounterResult);
  assertNonEmpty("encounter result.responseText", encounterResult.responseText);
  assertPlainObject("encounter result.grounding", encounterResult.grounding);
  assertId("encounter result.grounding.situationId", encounterResult.grounding.situationId);
  if (livedContext !== null) {
    assertPlainObject("lived context", livedContext);
    assertExactKeys("lived context", livedContext, ["thread", "situation", "semanticStates", "memories"]);
    if (!Array.isArray(livedContext.semanticStates)) throw new TypeError("lived context semanticStates must be an array");
  } else {
    requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  }
  requireMethod("experienceStore", experienceStore, "recordEncounter");
  requireMethod("experienceStore", experienceStore, "recordJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

  const activity = Object.freeze({
    threadId: activeThread.threadId,
    correlationId: encounterResult.grounding.situationId,
  });
  const historyEvent = await runActivityStage(activityRecorder, {
    ...activity,
    stage: "encounter.history.record",
  }, () => experienceStore.recordEncounter({
    threadId: activeThread.threadId,
    situationId: encounterResult.grounding.situationId,
    occurredAt: encounter.occurredAt,
    visitorUtterance: encounter.utterance,
    responseText: encounterResult.responseText,
  }));

  try {
    const semanticRecords = livedContext?.semanticStates ?? semanticStateStore.listCurrentState(activeThread.threadId);
    const semanticStates = semanticRecords.map((state) => ({
      domain: state.domain,
      dimension: state.dimension,
      target: state.target ?? null,
      state: state.state,
    }));
    const input = {
      thread: {
        selfDescription: activeThread.identity?.selfDescription ?? "",
        selfModel: activeThread.currentState?.selfModel ?? "",
        unresolvedIntentions: [...(activeThread.currentState?.unresolvedIntentions ?? [])],
      },
      situationId: encounterResult.grounding.situationId,
      encounter: {
        visitorUtterance: encounter.utterance,
        responseText: encounterResult.responseText,
        occurredAt: encounter.occurredAt,
      },
      semanticStates,
    };

    const invocation = await runActivityStage(activityRecorder, {
      ...activity,
      stage: "encounter.journal.reflect",
      evidence: { eventId: historyEvent.eventId },
    }, () => modelAdapter.invoke({
      systemPrompt: SYSTEM_PROMPT,
      input,
      responseSchema: {
        type: "object",
        additionalProperties: false,
        required: ["journalEntry"],
        properties: {
          journalEntry: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        },
      },
      clientRequestId: requestId(input),
    }));
    assertPlainObject("lived encounter reflection result", invocation);
    assertPlainObject("lived encounter reflection output", invocation.output);
    assertExactKeys("lived encounter reflection output", invocation.output, ["journalEntry"]);
    if (invocation.output.journalEntry !== null) {
      assertNonEmpty("lived encounter journalEntry", invocation.output.journalEntry);
    }

    const journalEntry = invocation.output.journalEntry === null
      ? null
      : await runActivityStage(activityRecorder, {
          ...activity,
          stage: "encounter.journal.record",
          evidence: { eventId: historyEvent.eventId },
        }, () => experienceStore.recordJournalEntry({
          threadId: activeThread.threadId,
          aboutEventRef: historyEvent.eventId,
          writtenAt: encounter.occurredAt,
          entryText: invocation.output.journalEntry,
        }));

    return { historyEvent, journalEntry, privateAftermathComplete: true };
  } catch {
    return { historyEvent, journalEntry: null, privateAftermathComplete: false };
  }
}
