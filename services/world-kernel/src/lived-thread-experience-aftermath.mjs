import {
  assertId,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { formEncounterStoryMemory } from "./lived-encounter-memory.mjs";
import { formThreadJournalProfile } from "./thread-journal-book.mjs";

const SYSTEM_PROMPT = `You are the private journal voice of one persistent Fibre Thread after a lived Encounter Story.
The story is objective World evidence of what was observably said or done. Do not rewrite those facts.
Write from this Thread's first-person point of view and distinctive voice. Let identity, self-understanding, stable tendencies, current feelings/needs and prior retained memory shape what mattered and how it felt.
Inner response matters: embarrassment, attraction, anger, relief, protectiveness, suspicion, delight, awkwardness, moral judgment, uncertainty or mixed feelings may appear when warranted.
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
  return `encounter-reflection_${sha256(canonicalJson(input))}`;
}

function runStage(activityRecorder, metadata, operation) {
  return activityRecorder === null ? operation() : activityRecorder.runStage(metadata, operation);
}

export async function internalizeThreadEncounterExperience({
  livedContext,
  encounterStory,
  participantSummaries,
  experienceRecord = null,
  experienceStore,
  memoryStore,
  journalBook = null,
  modelAdapter,
  activityRecorder = null,
}) {
  assertPlainObject("encounter livedContext", livedContext);
  assertPlainObject("encounter Thread", livedContext.thread);
  assertId("encounter Thread.threadId", livedContext.thread.threadId);
  assertPlainObject("Encounter Story", encounterStory);
  assertId("Encounter Story.encounterId", encounterStory.encounterId);
  if (!Array.isArray(encounterStory.story?.beats)) throw new TypeError("Encounter Story beats are required");
  if (!Array.isArray(participantSummaries)) throw new TypeError("encounter participant summaries are required");
  if (experienceRecord === null) requireMethod("experienceStore", experienceStore, "recordThreadExperience");
  requireMethod("experienceStore", experienceStore, "recordThreadExperienceJournalEntry");
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (journalBook !== null) {
    requireMethod("journalBook", journalBook, "getProfile");
    requireMethod("journalBook", journalBook, "append");
  }
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

  const threadId = livedContext.thread.threadId;
  const activity = Object.freeze({
    threadId,
    correlationId:encounterStory.encounterId,
  });

  const activeExperience = experienceRecord === null
    ? await runStage(activityRecorder, {
        ...activity,
        stage:"encounter.experience.record",
        evidence:{ encounterRef:encounterStory.encounterId },
      }, () => experienceStore.recordThreadExperience({
        threadId,
        encounterRef:encounterStory.encounterId,
        situationId:livedContext.situation.situationId,
        occurredAt:encounterStory.occurredAt,
        experienceText:null,
      }))
    : experienceRecord;

  assertPlainObject("Thread Experience", activeExperience);
  assertId("Thread Experience.experienceId", activeExperience.experienceId);
  if (activeExperience.threadId !== threadId
    || activeExperience.encounterRef !== encounterStory.encounterId
    || activeExperience.situationId !== livedContext.situation.situationId) {
    throw new TypeError("Thread Experience does not belong to this lived encounter");
  }

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
      currentSituation:structuredClone(livedContext.situation),
      experienceText:activeExperience.experienceText ?? null,
      participants:structuredClone(participantSummaries),
      story:structuredClone(encounterStory.story),
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
      stage:"encounter.journal.reflect",
      evidence:{ experienceId:activeExperience.experienceId },
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
        stage:"encounter.journal.record",
        evidence:{ experienceId:activeExperience.experienceId },
      }, () => experienceStore.recordThreadExperienceJournalEntry({
        threadId,
        aboutExperienceRef:activeExperience.experienceId,
        writtenAt:encounterStory.occurredAt,
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
            stage:"encounter.journal.book",
            evidence:{ experienceId:activeExperience.experienceId },
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
      stage:"encounter.memory.retain",
      evidence:{ experienceId:activeExperience.experienceId },
    }, () => formEncounterStoryMemory({
      livedContext,
      experienceRecord:activeExperience,
      encounterStory,
      journalEntry,
      memoryStore,
      modelAdapter,
    }));
  } catch {
    memory = { outcome:"incomplete", memory:null };
  }

  return Object.freeze({
    experienceRecord:activeExperience,
    journalEntry,
    journalBookRecord,
    memory,
  });
}
