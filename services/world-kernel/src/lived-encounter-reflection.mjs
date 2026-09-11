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
  thread,
  encounter,
  encounterResult,
  semanticStateStore,
  experienceStore,
  modelAdapter,
  activityRecorder = null,
}) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  assertPlainObject("lived encounter", encounter);
  assertNonEmpty("lived encounter.utterance", encounter.utterance);
  assertNonEmpty("lived encounter.occurredAt", encounter.occurredAt);
  assertPlainObject("encounter result", encounterResult);
  assertNonEmpty("encounter result.responseText", encounterResult.responseText);
  assertPlainObject("encounter result.grounding", encounterResult.grounding);
  assertId("encounter result.grounding.situationId", encounterResult.grounding.situationId);
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("experienceStore", experienceStore, "recordEncounter");
  requireMethod("experienceStore", experienceStore, "recordJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

  const activity = Object.freeze({
    threadId: thread.threadId,
    correlationId: encounterResult.grounding.situationId,
  });
  const historyEvent = await runActivityStage(activityRecorder, {
    ...activity,
    stage: "encounter.history.record",
  }, () => experienceStore.recordEncounter({
    threadId: thread.threadId,
    situationId: encounterResult.grounding.situationId,
    occurredAt: encounter.occurredAt,
    visitorUtterance: encounter.utterance,
    responseText: encounterResult.responseText,
  }));

  const semanticStates = semanticStateStore.listCurrentState(thread.threadId).map((state) => ({
    domain: state.domain,
    dimension: state.dimension,
    target: state.target ?? null,
    state: state.state,
  }));
  const input = {
    thread: {
      selfDescription: thread.identity?.selfDescription ?? "",
      selfModel: thread.currentState?.selfModel ?? "",
      unresolvedIntentions: [...(thread.currentState?.unresolvedIntentions ?? [])],
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
        threadId: thread.threadId,
        aboutEventRef: historyEvent.eventId,
        writtenAt: encounter.occurredAt,
        entryText: invocation.output.journalEntry,
      }));

  return { historyEvent, journalEntry };
}
