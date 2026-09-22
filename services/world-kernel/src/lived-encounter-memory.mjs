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

const SYSTEM_PROMPT = `You are autobiographical memory formation for one persistent Fibre Thread after a lived experience.
The supplied experience is historical evidence. It may be a direct conversation, a shared encounter story, or something the Thread merely witnessed.
The private journal, when present, is the Thread's contemporaneous subjective account; it is not itself memory.
Decide what this particular Thread retains autobiographically, given who they are, their current concerns, semantic state, stable tendencies and bounded prior memories.
Do not preserve the experience merely because it happened. not_remembered is a normal outcome.
If retained, write a selective first-person recollection rather than a transcript or incident report. rememberedMeaning is optional and should exist only when some durable personal meaning is already warranted.
A witness may remember another person's behavior because seeing it mattered to them; do not require the Thread to have spoken or been the target.
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

function boundedPriorMemories(memories) {
  return [...memories]
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

function normalizeOutput(output) {
  assertPlainObject("lived experience memory output", output);
  assertExactKeys("lived experience memory output", output, [
    "outcome",
    "rememberedContent",
    "rememberedMeaning",
    "confidence",
    "salience",
    "uncertainty",
  ]);
  if (!["not_remembered", "retained"].includes(output.outcome)) {
    throw new TypeError("lived experience memory outcome is invalid");
  }
  assertStringArray("lived experience memory uncertainty", output.uncertainty);

  if (output.outcome === "not_remembered") {
    return Object.freeze({
      outcome:"not_remembered",
      rememberedContent:null,
      rememberedMeaning:null,
      confidence:null,
      salience:null,
      uncertainty:Object.freeze([...output.uncertainty]),
    });
  }

  assertNonEmpty("lived experience rememberedContent", output.rememberedContent);
  if (output.rememberedMeaning !== null) assertNonEmpty("lived experience rememberedMeaning", output.rememberedMeaning);
  assertFiniteNumber("lived experience memory confidence", output.confidence, { minimum: 0 });
  assertFiniteNumber("lived experience memory salience", output.salience, { minimum: 0 });
  if (output.confidence > 1 || output.salience > 1) throw new TypeError("lived experience memory scores must be at most 1");
  return Object.freeze({
    outcome:"retained",
    rememberedContent:output.rememberedContent,
    rememberedMeaning:output.rememberedMeaning,
    confidence:output.confidence,
    salience:output.salience,
    uncertainty:Object.freeze([...output.uncertainty]),
  });
}

function livedState({ livedContext, thread, semanticStateStore, memoryStore }) {
  const activeThread = livedContext?.thread ?? thread;
  assertPlainObject("Thread", activeThread);
  assertId("Thread.threadId", activeThread.threadId);
  if (livedContext !== null) {
    assertPlainObject("lived context", livedContext);
    assertExactKeys("lived context", livedContext, ["thread", "situation", "semanticStates", "memories"]);
    if (!Array.isArray(livedContext.semanticStates) || !Array.isArray(livedContext.memories)) {
      throw new TypeError("lived context state must be arrays");
    }
    return {
      thread:activeThread,
      semanticStates:livedContext.semanticStates,
      memories:livedContext.memories,
    };
  }
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  return {
    thread:activeThread,
    semanticStates:semanticStateStore.listCurrentState(activeThread.threadId),
    memories:memoryStore.listCurrentMemories(activeThread.threadId),
  };
}

async function formExperienceMemory({
  livedContext = null,
  thread = null,
  eventId,
  occurredAt,
  situationId,
  experience,
  journalEntryText,
  slot,
  semanticStateStore = null,
  memoryStore,
  modelAdapter,
}) {
  const state = livedState({ livedContext, thread, semanticStateStore, memoryStore });
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  assertId("lived experience eventId", eventId);
  assertNonEmpty("lived experience occurredAt", occurredAt);
  assertId("lived experience situationId", situationId);
  assertPlainObject("lived experience payload", experience);

  const input = {
    thread: {
      selfDescription: state.thread.identity?.selfDescription ?? "",
      selfModel: state.thread.currentState?.selfModel ?? "",
      stableTendencies: structuredClone(state.thread.genome?.textualTraits ?? {}),
      unresolvedIntentions: [...(state.thread.currentState?.unresolvedIntentions ?? [])],
    },
    semanticStates: state.semanticStates.map(semanticContext),
    priorMemories: boundedPriorMemories(state.memories),
    experience: {
      eventId,
      situationId,
      occurredAt,
      ...structuredClone(experience),
      journalEntry:journalEntryText,
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
  assertPlainObject("lived experience memory result", invocation);
  const output = normalizeOutput(invocation.output);

  if (output.outcome === "not_remembered") {
    return { outcome: "not_remembered", memory: null };
  }

  const memoryId = autobiographicalMemoryId({
    threadId: state.thread.threadId,
    originReference:eventId,
    slot,
  });
  const durableMeaning = output.rememberedMeaning !== null;
  const memory = memoryStore.recordMemory({
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId,
    revision: 1,
    threadId: state.thread.threadId,
    subject: { originEventRef:eventId, slot },
    subjectPeriod: { startAt:occurredAt, endAt:occurredAt },
    eventRefs: [eventId],
    rememberedContent: output.rememberedContent,
    rememberedMeaning: output.rememberedMeaning,
    meaningOutcome: durableMeaning ? "durable_meaning" : "no_durable_meaning",
    meaningParts: durableMeaning ? [{
      meaningPartId: autobiographicalMeaningPartId({ memoryId, ordinal: 1 }),
      meaning: output.rememberedMeaning,
    }] : [],
    asOf:occurredAt,
    confidence: output.confidence,
    uncertainty: output.uncertainty,
    salience: output.salience,
    accessibility: "accessible",
    retentionState: "retained",
    authorship: {
      kind: "fibre_policy_derived",
      entityId: "fibre.world-kernel",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [eventId],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: "current",
    recordedAt:occurredAt,
  });

  return { outcome: "retained", memory };
}

export async function formLivedEncounterMemory({
  livedContext = null,
  thread = null,
  historyEvent,
  journalEntry,
  semanticStateStore = null,
  memoryStore,
  modelAdapter,
}) {
  const activeThread = livedContext?.thread ?? thread;
  assertPlainObject("Thread", activeThread);
  assertId("Thread.threadId", activeThread.threadId);
  assertPlainObject("lived encounter historyEvent", historyEvent);
  assertId("lived encounter historyEvent.eventId", historyEvent.eventId);
  if (historyEvent.threadId !== activeThread.threadId) throw new TypeError("lived encounter history belongs to another Thread");
  if (journalEntry !== null) {
    assertPlainObject("lived encounter journalEntry", journalEntry);
    if (journalEntry.threadId !== activeThread.threadId || journalEntry.aboutEventRef !== historyEvent.eventId) {
      throw new TypeError("lived encounter journal does not belong to this Thread experience");
    }
  }
  return formExperienceMemory({
    livedContext,
    thread,
    eventId:historyEvent.eventId,
    occurredAt:historyEvent.occurredAt,
    situationId:historyEvent.situationId,
    experience:{
      kind:"direct_encounter",
      visitorUtterance:historyEvent.visitorUtterance,
      responseText:historyEvent.responseText,
    },
    journalEntryText:journalEntry?.entryText ?? null,
    slot:"lived-encounter",
    semanticStateStore,
    memoryStore,
    modelAdapter,
  });
}

export async function formEncounterStoryMemory({
  livedContext,
  experienceRecord,
  encounterStory,
  journalEntry,
  memoryStore,
  modelAdapter,
}) {
  assertPlainObject("Thread experience", experienceRecord);
  assertId("Thread experience.experienceId", experienceRecord.experienceId);
  assertId("Thread experience.threadId", experienceRecord.threadId);
  assertId("Thread experience.situationId", experienceRecord.situationId);
  assertPlainObject("Encounter Story", encounterStory);
  assertId("Encounter Story.encounterId", encounterStory.encounterId);
  if (experienceRecord.encounterRef !== encounterStory.encounterId) {
    throw new TypeError("Thread experience does not cite this Encounter Story");
  }
  if (journalEntry !== null) {
    assertPlainObject("experience journal", journalEntry);
    if (journalEntry.threadId !== experienceRecord.threadId
      || journalEntry.aboutExperienceRef !== experienceRecord.experienceId) {
      throw new TypeError("experience journal does not belong to this Thread experience");
    }
  }
  return formExperienceMemory({
    livedContext,
    eventId:experienceRecord.experienceId,
    occurredAt:experienceRecord.occurredAt,
    situationId:experienceRecord.situationId,
    experience:{
      kind:"encounter_story",
      encounterRef:encounterStory.encounterId,
      experiencedAs:experienceRecord.experienceText ?? null,
      story:encounterStory.story,
    },
    journalEntryText:journalEntry?.entryText ?? null,
    slot:"encounter-story",
    memoryStore,
    modelAdapter,
  });
}
