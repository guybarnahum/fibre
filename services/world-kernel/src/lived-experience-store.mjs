import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { migrateDatabase, translateStorageError } from "./persistence-sqlite.mjs";
import { createLivedExperienceTables } from "./lived-experience-schema.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function encounterEventId(record) {
  return `enc_${sha256(canonicalJson({
    threadId:record.threadId,
    situationId:record.situationId,
    occurredAt:record.occurredAt,
    visitorUtterance:record.visitorUtterance,
    responseText:record.responseText,
  })).slice(0, 48)}`;
}

function encounterStoryId(record) {
  return `story_${sha256(canonicalJson({
    occurredAt:record.occurredAt,
    participants:record.participants,
    story:record.story,
  })).slice(0, 48)}`;
}

function threadExperienceId({ threadId, encounterRef }) {
  return `exp_${sha256(canonicalJson({ threadId, encounterRef })).slice(0, 48)}`;
}

function experienceJournalEntryId({ threadId, aboutExperienceRef, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ threadId, aboutExperienceRef, writtenAt, entryText })).slice(0, 48)}`;
}

function journalEntryId({ threadId, aboutEventRef, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ threadId, aboutEventRef, writtenAt, entryText })).slice(0, 48)}`;
}

function normalizeStory(candidate, participantIds) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("encounter story must be an object");
  }
  if (!Array.isArray(candidate.beats) || candidate.beats.length < 1) {
    throw new TypeError("encounter story requires at least one beat");
  }
  return {
    storyVersion:candidate.storyVersion ?? "encounter-story-v0.1",
    beats:candidate.beats.map((beat) => {
      if (beat === null || typeof beat !== "object" || Array.isArray(beat)) {
        throw new TypeError("encounter story beat must be an object");
      }
      if (!["utterance","action","occurrence"].includes(beat.kind)) {
        throw new TypeError("encounter story beat kind is invalid");
      }
      if (beat.actorThreadId !== null && beat.actorThreadId !== undefined) {
        assertId("encounter story beat.actorThreadId", beat.actorThreadId);
        if (!participantIds.has(beat.actorThreadId)) {
          throw new TypeError("encounter story beat actor must be present");
        }
      }
      assertNonEmpty("encounter story beat.text", beat.text);
      return {
        actorThreadId:beat.actorThreadId ?? null,
        kind:beat.kind,
        text:beat.text,
      };
    }),
  };
}

export class LivedExperienceStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"LivedExperienceStore" });
    try {
      migrateDatabase(this.#database);
      createLivedExperienceTables(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  recordEncounterStory(candidate) {
    assertIsoTimestamp("encounter story.occurredAt", candidate.occurredAt);
    if (!Array.isArray(candidate.participants) || candidate.participants.length < 1) {
      throw new TypeError("encounter story requires at least one Thread presence");
    }
    const participantIds = new Set();
    const participants = candidate.participants.map((participant) => {
      if (participant === null || typeof participant !== "object" || Array.isArray(participant)) {
        throw new TypeError("encounter story participant must be an object");
      }
      assertId("encounter story participant.threadId", participant.threadId);
      assertId("encounter story participant.situationId", participant.situationId);
      if (participantIds.has(participant.threadId)) throw new TypeError("encounter story participant is duplicated");
      participantIds.add(participant.threadId);
      return { threadId:participant.threadId, situationId:participant.situationId };
    });
    const story = normalizeStory(candidate.story, participantIds);
    const normalized = { occurredAt:candidate.occurredAt, participants, story };
    const encounterId = encounterStoryId(normalized);
    const record = { encounterId, ...normalized };
    const recordDigest = digest(record);

    try {
      return this.#database.transaction(() => {
        for (const participant of participants) {
          const thread = this.#database.prepare(
            "SELECT 1 AS present FROM threads WHERE thread_id=?",
          ).get(participant.threadId);
          if (thread === undefined) throw new TypeError(`Thread ${participant.threadId} was not found`);
        }
        const prior = this.#database.prepare(
          "SELECT record_digest FROM encounter_story_records WHERE encounter_id=?",
        ).get(encounterId);
        if (prior !== undefined) {
          if (prior.record_digest !== recordDigest) throw new TypeError(`encounter story ${encounterId} conflicts`);
          return record;
        }
        this.#database.prepare(`
          INSERT INTO encounter_story_records(encounter_id,occurred_at,story_json,record_digest)
          VALUES (?,?,?,?)
        `).run(encounterId,normalized.occurredAt,canonicalJson(story),recordDigest);
        const insertPresence = this.#database.prepare(`
          INSERT INTO encounter_story_thread_presence(encounter_ref,thread_id,situation_id)
          VALUES (?,?,?)
        `);
        for (const participant of participants) {
          insertPresence.run(encounterId,participant.threadId,participant.situationId);
        }
        return record;
      });
    } catch (error) { throw translateStorageError(error); }
  }

  getEncounterStory(encounterId, { required = true } = {}) {
    assertId("encounterId", encounterId);
    const row = this.#database.prepare(
      "SELECT encounter_id,occurred_at,story_json FROM encounter_story_records WHERE encounter_id=?",
    ).get(encounterId);
    if (row === undefined) {
      if (!required) return null;
      throw new TypeError(`encounter story ${encounterId} was not found`);
    }
    const participants = this.#database.prepare(`
      SELECT thread_id,situation_id
      FROM encounter_story_thread_presence
      WHERE encounter_ref=?
      ORDER BY thread_id
    `).all(encounterId).map((participant) => ({
      threadId:participant.thread_id,
      situationId:participant.situation_id,
    }));
    return {
      encounterId:row.encounter_id,
      occurredAt:row.occurred_at,
      participants,
      story:JSON.parse(row.story_json),
    };
  }

  recordThreadExperience(candidate) {
    assertId("Thread experience.threadId", candidate.threadId);
    assertId("Thread experience.encounterRef", candidate.encounterRef);
    assertId("Thread experience.situationId", candidate.situationId);
    assertIsoTimestamp("Thread experience.occurredAt", candidate.occurredAt);
    const experienceId = threadExperienceId(candidate);
    const record = { experienceId, ...candidate };
    const recordDigest = digest(record);

    try {
      const presence = this.#database.prepare(`
        SELECT situation_id FROM encounter_story_thread_presence
        WHERE encounter_ref=? AND thread_id=?
      `).get(candidate.encounterRef,candidate.threadId);
      if (presence === undefined) throw new TypeError("Thread experience requires admitted encounter presence");
      if (presence.situation_id !== candidate.situationId) {
        throw new TypeError("Thread experience situation does not match encounter presence");
      }
      const encounter = this.#database.prepare(
        "SELECT occurred_at FROM encounter_story_records WHERE encounter_id=?",
      ).get(candidate.encounterRef);
      if (encounter === undefined) throw new TypeError(`encounter story ${candidate.encounterRef} was not found`);
      if (encounter.occurred_at !== candidate.occurredAt) {
        throw new TypeError("Thread experience time must match encounter story");
      }
      const prior = this.#database.prepare(
        "SELECT record_digest FROM thread_encounter_experiences WHERE experience_id=?",
      ).get(experienceId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`Thread experience ${experienceId} conflicts`);
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_encounter_experiences(
          experience_id,thread_id,encounter_ref,situation_id,occurred_at,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(
        experienceId,candidate.threadId,candidate.encounterRef,
        candidate.situationId,candidate.occurredAt,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  recordThreadExperienceJournalEntry(candidate) {
    assertId("experience journal.threadId", candidate.threadId);
    assertId("experience journal.aboutExperienceRef", candidate.aboutExperienceRef);
    assertIsoTimestamp("experience journal.writtenAt", candidate.writtenAt);
    assertNonEmpty("experience journal.entryText", candidate.entryText);
    const journalEntryIdValue = experienceJournalEntryId(candidate);
    const record = { journalEntryId:journalEntryIdValue, ...candidate };
    const recordDigest = digest(record);

    try {
      const experience = this.#database.prepare(`
        SELECT thread_id,occurred_at FROM thread_encounter_experiences
        WHERE experience_id=?
      `).get(candidate.aboutExperienceRef);
      if (experience === undefined) throw new TypeError(`Thread experience ${candidate.aboutExperienceRef} was not found`);
      if (experience.thread_id !== candidate.threadId) {
        throw new TypeError("experience journal cannot cite another Thread's experience");
      }
      if (Date.parse(candidate.writtenAt) < Date.parse(experience.occurred_at)) {
        throw new TypeError("experience journal cannot predate its experience");
      }
      const prior = this.#database.prepare(`
        SELECT journal_entry_id,entry_text,written_at
        FROM thread_encounter_journal_entries
        WHERE thread_id=? AND about_experience_ref=?
      `).get(candidate.threadId,candidate.aboutExperienceRef);
      if (prior !== undefined) {
        if (prior.journal_entry_id !== journalEntryIdValue
          || prior.entry_text !== candidate.entryText
          || prior.written_at !== candidate.writtenAt) {
          throw new TypeError(`Thread experience ${candidate.aboutExperienceRef} already has a different journal entry`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_encounter_journal_entries(
          journal_entry_id,thread_id,about_experience_ref,written_at,entry_text,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(
        journalEntryIdValue,candidate.threadId,candidate.aboutExperienceRef,
        candidate.writtenAt,candidate.entryText,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  recordEncounter(candidate) {
    assertId("encounter.threadId", candidate.threadId);
    assertId("encounter.situationId", candidate.situationId);
    assertIsoTimestamp("encounter.occurredAt", candidate.occurredAt);
    assertNonEmpty("encounter.visitorUtterance", candidate.visitorUtterance);
    assertNonEmpty("encounter.responseText", candidate.responseText);
    const core = {
      threadId:candidate.threadId,
      situationId:candidate.situationId,
      occurredAt:candidate.occurredAt,
      visitorUtterance:candidate.visitorUtterance,
      responseText:candidate.responseText,
    };
    const eventId = encounterEventId(core);
    const record = { eventId, ...core };
    const recordDigest = digest(record);

    try {
      const thread = this.#database.prepare(
        "SELECT 1 AS present FROM threads WHERE thread_id=?",
      ).get(candidate.threadId);
      if (thread === undefined) throw new TypeError(`Thread ${candidate.threadId} was not found`);
      const prior = this.#database.prepare(
        "SELECT record_digest FROM lived_encounter_records WHERE event_id=?",
      ).get(eventId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`encounter ${eventId} conflicts with its existing record`);
        return record;
      }
      this.#database.prepare(`
        INSERT INTO lived_encounter_records(
          event_id,thread_id,situation_id,occurred_at,visitor_utterance,response_text,record_digest
        ) VALUES (?,?,?,?,?,?,?)
      `).run(
        eventId,core.threadId,core.situationId,core.occurredAt,
        core.visitorUtterance,core.responseText,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  recordJournalEntry(candidate) {
    assertId("journal.threadId", candidate.threadId);
    assertId("journal.aboutEventRef", candidate.aboutEventRef);
    assertIsoTimestamp("journal.writtenAt", candidate.writtenAt);
    assertNonEmpty("journal.entryText", candidate.entryText);
    const journalEntryIdValue = journalEntryId(candidate);
    const record = { journalEntryId:journalEntryIdValue, ...candidate };
    const recordDigest = digest(record);

    try {
      const encounter = this.#database.prepare(
        "SELECT thread_id,occurred_at FROM lived_encounter_records WHERE event_id=?",
      ).get(candidate.aboutEventRef);
      if (encounter === undefined) throw new TypeError(`journal event ${candidate.aboutEventRef} was not found`);
      if (encounter.thread_id !== candidate.threadId) {
        throw new TypeError("journal entry cannot cite another Thread's encounter");
      }
      if (Date.parse(candidate.writtenAt) < Date.parse(encounter.occurred_at)) {
        throw new TypeError("journal entry cannot predate its encounter");
      }
      const prior = this.#database.prepare(
        "SELECT journal_entry_id,entry_text,written_at FROM thread_journal_entries WHERE thread_id=? AND about_event_ref=?",
      ).get(candidate.threadId,candidate.aboutEventRef);
      if (prior !== undefined) {
        if (prior.journal_entry_id !== journalEntryIdValue
          || prior.entry_text !== candidate.entryText
          || prior.written_at !== candidate.writtenAt) {
          throw new TypeError(`encounter ${candidate.aboutEventRef} already has a different journal entry`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_journal_entries(
          journal_entry_id,thread_id,about_event_ref,written_at,entry_text,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(
        journalEntryIdValue,candidate.threadId,candidate.aboutEventRef,
        candidate.writtenAt,candidate.entryText,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  listEncounterStories(threadId) {
    assertId("threadId", threadId);
    const rows = this.#database.prepare(`
      SELECT encounter_ref FROM encounter_story_thread_presence
      WHERE thread_id=? ORDER BY encounter_ref
    `).all(threadId);
    return rows.map(({ encounter_ref }) => this.getEncounterStory(encounter_ref));
  }

  listThreadExperienceJournal(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT journal_entry_id,thread_id,about_experience_ref,written_at,entry_text
      FROM thread_encounter_journal_entries
      WHERE thread_id=? ORDER BY written_at,journal_entry_id
    `).all(threadId).map((row) => ({
      journalEntryId:row.journal_entry_id,
      threadId:row.thread_id,
      aboutExperienceRef:row.about_experience_ref,
      writtenAt:row.written_at,
      entryText:row.entry_text,
    }));
  }

  listEncounters(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT event_id,thread_id,situation_id,occurred_at,visitor_utterance,response_text
      FROM lived_encounter_records WHERE thread_id=? ORDER BY occurred_at,event_id
    `).all(threadId).map((row) => ({
      eventId:row.event_id,
      threadId:row.thread_id,
      situationId:row.situation_id,
      occurredAt:row.occurred_at,
      visitorUtterance:row.visitor_utterance,
      responseText:row.response_text,
    }));
  }

  listJournal(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT journal_entry_id,thread_id,about_event_ref,written_at,entry_text
      FROM thread_journal_entries WHERE thread_id=? ORDER BY written_at,journal_entry_id
    `).all(threadId).map((row) => ({
      journalEntryId:row.journal_entry_id,
      threadId:row.thread_id,
      aboutEventRef:row.about_event_ref,
      writtenAt:row.written_at,
      entryText:row.entry_text,
    }));
  }
}

export function openLivedExperienceStore(storage) {
  return new LivedExperienceStore(storage);
}
