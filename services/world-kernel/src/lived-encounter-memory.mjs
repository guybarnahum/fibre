import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMeaningPartId,
  autobiographicalMemoryId,
} from "./autobiographical-memory-domain.mjs";

const SYSTEM_PROMPT = `You are autobiographical memory formation for one persistent Fibre Thread after a lived encounter.
The encounter is historical evidence. The private journal, when present, is the Thread's contemporaneous subjective account; it is not itself memory.
Decide what this particular Thread retains autobiographically, given who they are, their current concerns, semantic state, stable tendencies and bounded prior memories.
Do not preserve the encounter merely because it happened. not_remembered is a normal outcome.
If retained, write a selective first-person recollection rather than a transcript. rememberedMeaning is optional and should exist only when some durable personal meaning is already warranted.
Do not invent new objective facts, relationships, obligations or changes to World state.`;

const MAX_PRIOR_MEMORIES = 6;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function requestId(input) {
  return `lived-memory_${sha256(canonicalJson(input))}`;
}

function boundedPriorMemories(memoryStore, threadId) {
  return memoryStore.listCurrentMemories(threadId)
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    .slice(0, MAX_PRIOR_MEMORIES)
    .map((memory) => ({
      memoryId: memory.memoryId,
      rememberedContent: memory.rememberedContent ?? null,
      rememberedMeaning: memory.rememberedMeaning ?? null,
      salience: memory.salience,
      accessibility: memory.accessibility,
      asOf: memory.asOf,
    }));
}

function semanticContext(record) {
  return {
    domain: record.domain,
    dimension: record.dimension,
    target: record.target ?? null,
    state: record.state,
  };
}

function validateOutput(output) {
  assertPlainObject("lived encounter memory output", output);
  assertExactKeys("lived encounter memory output", output, [
    "outcome",
    "rememberedContent",
    "rememberedMeaning",
    "confidence",
    "salience",
    "uncertainty",
  ]);
  if (!["not_remembered", "retained"].includes(output.outcome)) {
    throw new TypeError("lived encounter memory outcome is invalid");
  }
  assertStringArray("lived encounter memory uncertainty", output.uncertainty);
  if (output.outcome === "not_remembered") {
    if (output.rememberedContent !== null || output.rememberedMeaning !== null || output.confidence !== null || output.salience !== null) {
      throw new TypeError("not_remembered cannot carry autobiographical content or scores");
    }
    return;
  }
  assertNonEmpty("lived encounter rememberedContent", output.rememberedContent);
  if (output.rememberedMeaning !== null) assertNonEmpty("lived encounter rememberedMeaning", output.rememberedMeaning);
  assertFiniteNumber("lived encounter memory confidence", output.confidence, { minimum: 0 });
  assertFiniteNumber("lived encounter memory salience", output.salience, { minimum: 0 });
  if (output.confidence > 1 || output.salience > 1) throw new TypeError("lived encounter memory scores must be at most 1");
}

export async function formLivedEncounterMemory({
  thread,
  historyEvent,
  journalEntry,
  semanticStateStore,
  memoryStore,
  modelAdapter,
}) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  assertPlainObject("lived encounter historyEvent", historyEvent);
  assertId("lived encounter historyEvent.eventId", historyEvent.eventId);
  if (historyEvent.threadId !== thread.threadId) throw new TypeError("lived encounter history belongs to another Thread");
  if (journalEntry !== null) {
    assertPlainObject("lived encounter journalEntry", journalEntry);
    if (journalEntry.threadId !== thread.threadId || journalEntry.aboutEventRef !== historyEvent.eventId) {
      throw new TypeError("lived encounter journal does not belong to this Thread experience");
    }
  }
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("modelAdapter", modelAdapter, "invoke");

  const input = {
    thread: {
      selfDescription: thread.identity?.selfDescription ?? "",
      selfModel: thread.currentState?.selfModel ?? "",
      stableTendencies: structuredClone(thread.genome?.textualTraits ?? {}),
      unresolvedIntentions: [...(thread.currentState?.unresolvedIntentions ?? [])],
    },
    semanticStates: semanticStateStore.listCurrentState(thread.threadId).map(semanticContext),
    priorMemories: boundedPriorMemories(memoryStore, thread.threadId),
    experience: {
      eventId: historyEvent.eventId,
      situationId: historyEvent.situationId,
      occurredAt: historyEvent.occurredAt,
      visitorUtterance: historyEvent.visitorUtterance,
      responseText: historyEvent.responseText,
      journalEntry: journalEntry?.entryText ?? null,
    },
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt: SYSTEM_PROMPT,
    input,
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["outcome", "rememberedContent", "rememberedMeaning", "confidence", "salience", "uncertainty"],
      properties: {
        outcome: { type: "string", enum: ["not_remembered", "retained"] },
        rememberedContent: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        rememberedMeaning: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
        confidence: { anyOf: [{ type: "number", minimum: 0, maximum: 1 }, { type: "null" }] },
        salience: { anyOf: [{ type: "number", minimum: 0, maximum: 1 }, { type: "null" }] },
        uncertainty: { type: "array", items: { type: "string", minLength: 1 } },
      },
    },
    clientRequestId: requestId(input),
  });
  assertPlainObject("lived encounter memory result", invocation);
  validateOutput(invocation.output);

  if (invocation.output.outcome === "not_remembered") {
    return { outcome: "not_remembered", memory: null };
  }

  const slot = "lived-encounter";
  const memoryId = autobiographicalMemoryId({
    threadId: thread.threadId,
    originReference: historyEvent.eventId,
    slot,
  });
  const durableMeaning = invocation.output.rememberedMeaning !== null;
  const memory = memoryStore.recordMemory({
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId,
    revision: 1,
    threadId: thread.threadId,
    subject: { originEventRef: historyEvent.eventId, slot },
    subjectPeriod: { startAt: historyEvent.occurredAt, endAt: historyEvent.occurredAt },
    eventRefs: [historyEvent.eventId],
    rememberedContent: invocation.output.rememberedContent,
    rememberedMeaning: invocation.output.rememberedMeaning,
    meaningOutcome: durableMeaning ? "durable_meaning" : "no_durable_meaning",
    meaningParts: durableMeaning ? [{
      meaningPartId: autobiographicalMeaningPartId({ memoryId, ordinal: 1 }),
      meaning: invocation.output.rememberedMeaning,
    }] : [],
    asOf: historyEvent.occurredAt,
    confidence: invocation.output.confidence,
    uncertainty: invocation.output.uncertainty,
    salience: invocation.output.salience,
    accessibility: "accessible",
    retentionState: "retained",
    authorship: {
      kind: "fibre_policy_derived",
      entityId: "fibre.world-kernel",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [historyEvent.eventId],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: "current",
    recordedAt: historyEvent.occurredAt,
  });

  return { outcome: "retained", memory };
}
