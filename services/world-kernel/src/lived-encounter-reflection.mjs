import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { formThreadJournalProfile } from "./thread-journal-book.mjs";

const SYSTEM_PROMPT = `You are the private journal voice of one persistent Fibre Thread immediately after a lived encounter.
The encounter already happened; do not rewrite its objective facts.
Decide whether this moment merits a journal entry. Ordinary moments may produce no entry.
If you write, write as this particular Thread in first person. Let identity, self-understanding, stable tendencies, current feelings/needs and prior retained memory shape voice, attention, rhythm and what matters.
Include inner feeling, ambivalence, irritation, delight, embarrassment, tenderness, uncertainty, sensory detail or stray association when genuinely present. A journal is allowed to be subjective, fragmentary and unfair; it is not an incident report.
Do not copy the exchange as a transcript, diagnose the Thread, or claim that the entry is durable memory or that it automatically changed a relationship.
Free-form Markdown is welcome: paragraphs, fragments, quotations, emphasis and short headings may be used when they fit the Thread's own voice. Use ### or lower for headings inside an entry; ## is reserved by the journal book for entry dates.
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
  journalBook = null,
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
  if (journalBook !== null) {
    requireMethod("journalBook", journalBook, "getProfile");
    requireMethod("journalBook", journalBook, "append");
  }
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
    const journalProfile = journalBook === null ? null : await journalBook.getProfile(activeThread.threadId);
    const input = {
      thread: {
        name: activeThread.identity?.name ?? null,
        selfDescription: activeThread.identity?.selfDescription ?? "",
        selfModel: activeThread.currentState?.selfModel ?? "",
        stableTendencies: structuredClone(activeThread.genome?.textualTraits ?? {}),
        unresolvedIntentions: [...(activeThread.currentState?.unresolvedIntentions ?? [])],
      },
      journalProfile,
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

    let journalBookRecord = null;
    if (journalEntry !== null && journalBook !== null) {
      try {
        const profile = journalProfile ?? await formThreadJournalProfile({ thread:activeThread, modelAdapter });
        journalBookRecord = await runActivityStage(activityRecorder, {
          ...activity,
          stage:"encounter.journal.book",
          evidence:{ eventId:historyEvent.eventId },
        }, () => journalBook.append({
          threadId:activeThread.threadId,
          profile,
          writtenAt:journalEntry.writtenAt,
          entryText:journalEntry.entryText,
        }));
      } catch {
        journalBookRecord = null;
      }
    }

    return { historyEvent, journalEntry, journalBookRecord, privateAftermathComplete: true };
  } catch {
    return { historyEvent, journalEntry: null, journalBookRecord:null, privateAftermathComplete: false };
  }
}
