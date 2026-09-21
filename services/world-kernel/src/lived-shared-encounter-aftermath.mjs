import {
  assertId,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { formSharedEncounterMemory } from "./lived-encounter-memory.mjs";
import { formThreadJournalProfile } from "./thread-journal-book.mjs";

const SYSTEM_PROMPT = `You are the private journal voice of one persistent Fibre Thread after a shared encounter story.
The story is objective World evidence of what was observably said or done. Do not rewrite those facts.
This Thread may have spoken or acted, or may only have witnessed what other people did.
Write from this Thread's first-person point of view and distinctive voice. Let identity, self-understanding, stable tendencies, current feelings/needs and prior retained memory shape what is noticed and how it feels.
Inner response matters: embarrassment, attraction, anger, relief, protectiveness, suspicion, delight, awkwardness, moral judgment, uncertainty or mixed feelings may appear when warranted.
A witness may be affected by how one person treated another even though the witness was not addressed and never spoke.
The journal is allowed to be subjective, partial and emotionally unfair; it is not an objective incident report.
Do not claim durable memory or automatic relationship change. Do not invent actions, dialogue or relationships absent from the supplied story/context.
Free-form Markdown is welcome. Use ### or lower for headings inside an entry; ## is reserved by the journal book for entry dates.
Return null when the experience does not merit a journal entry.`;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function requestId(input) {
  return `shared-reflection_${sha256(canonicalJson(input))}`;
}

function runStage(activityRecorder, metadata, operation) {
  return activityRecorder === null ? operation() : activityRecorder.runStage(metadata, operation);
}

export async function internalizeSharedEncounterExperience({
  livedContext,
  sharedEncounter,
  participantSummaries,
  experienceStore,
  memoryStore,
  journalBook = null,
  modelAdapter,
  activityRecorder = null,
}) {
  assertPlainObject("shared encounter livedContext", livedContext);
  assertPlainObject("shared encounter Thread", livedContext.thread);
  assertId("shared encounter Thread.threadId", livedContext.thread.threadId);
  assertPlainObject("shared encounter", sharedEncounter);
  assertId("shared encounter.sharedEventId", sharedEncounter.sharedEventId);
  if (!Array.isArray(sharedEncounter.story?.beats)) throw new TypeError("shared encounter story beats are required");
  if (!Array.isArray(participantSummaries)) throw new TypeError("shared encounter participant summaries are required");
  requireMethod("experienceStore", experienceStore, "recordSharedEncounterExperience");
  requireMethod("experienceStore", experienceStore, "recordSharedEncounterJournalEntry");
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (journalBook !== null) {
    requireMethod("journalBook", journalBook, "getProfile");
    requireMethod("journalBook", journalBook, "append");
  }
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

  const threadId = livedContext.thread.threadId;
  const role = sharedEncounter.story.beats.some((beat) => beat.actorThreadId === threadId)
    ? "actor"
    : "witness";
  const activity = Object.freeze({
    threadId,
    correlationId:sharedEncounter.sharedEventId,
  });

  const experienceRecord = await runStage(activityRecorder, {
    ...activity,
    stage:"shared-encounter.experience.record",
    evidence:{ sharedEventRef:sharedEncounter.sharedEventId, role },
  }, () => experienceStore.recordSharedEncounterExperience({
    threadId,
    sharedEventRef:sharedEncounter.sharedEventId,
    situationId:livedContext.situation.situationId,
    occurredAt:sharedEncounter.occurredAt,
    role,
  }));

  let journalEntry = null;
  let journalBookRecord = null;
  try {
    const journalProfile = journalBook === null ? null : await journalBook.getProfile(threadId);
    const input = {
      thread:{
        name:livedContext.thread.identity?.name ?? null,
        selfDescription:livedContext.thread.identity?.selfDescription ?? "",
        selfModel:livedContext.thread.currentState?.selfModel ?? "",
        stableTendencies:structuredClone(livedContext.thread.genome?.textualTraits ?? {}),
        unresolvedIntentions:[...(livedContext.thread.currentState?.unresolvedIntentions ?? [])],
      },
      role,
      currentSituation:structuredClone(livedContext.situation),
      participants:structuredClone(participantSummaries),
      story:structuredClone(sharedEncounter.story),
      semanticStates:livedContext.semanticStates.map((state) => ({
        domain:state.domain,
        dimension:state.dimension,
        target:state.target ?? null,
        state:state.state,
      })),
      journalProfile,
    };
    const invocation = await runStage(activityRecorder, {
      ...activity,
      stage:"shared-encounter.journal.reflect",
      evidence:{ experienceId:experienceRecord.experienceId },
    }, () => modelAdapter.invoke({
      systemPrompt:SYSTEM_PROMPT,
      input,
      responseSchema:{
        type:"object",
        additionalProperties:false,
        required:["journalEntry"],
        properties:{
          journalEntry:{ anyOf:[{ type:"string", minLength:1 },{ type:"null" }] },
        },
      },
      clientRequestId:requestId(input),
    }));

    const entryText = invocation.output?.journalEntry ?? null;
    if (entryText !== null) {
      journalEntry = await runStage(activityRecorder, {
        ...activity,
        stage:"shared-encounter.journal.record",
        evidence:{ experienceId:experienceRecord.experienceId },
      }, () => experienceStore.recordSharedEncounterJournalEntry({
        threadId,
        aboutExperienceRef:experienceRecord.experienceId,
        writtenAt:sharedEncounter.occurredAt,
        entryText,
      }));

      if (journalBook !== null) {
        try {
          const profile = journalProfile ?? await formThreadJournalProfile({
            thread:livedContext.thread,
            modelAdapter,
          });
          journalBookRecord = await runStage(activityRecorder, {
            ...activity,
            stage:"shared-encounter.journal.book",
            evidence:{ experienceId:experienceRecord.experienceId },
          }, () => journalBook.append({
            threadId,
            profile,
            writtenAt:journalEntry.writtenAt,
            entryText:journalEntry.entryText,
          }));
        } catch {
          journalBookRecord = null;
        }
      }
    }
  } catch {
    journalEntry = null;
    journalBookRecord = null;
  }

  let memory = { outcome:"not_attempted", memory:null };
  try {
    memory = await runStage(activityRecorder, {
      ...activity,
      stage:"shared-encounter.memory.retain",
      evidence:{ experienceId:experienceRecord.experienceId },
    }, () => formSharedEncounterMemory({
      livedContext,
      experienceRecord,
      sharedEncounter,
      journalEntry,
      memoryStore,
      modelAdapter,
    }));
  } catch {
    memory = { outcome:"incomplete", memory:null };
  }

  return Object.freeze({
    experienceRecord,
    journalEntry,
    journalBookRecord,
    memory,
  });
}
