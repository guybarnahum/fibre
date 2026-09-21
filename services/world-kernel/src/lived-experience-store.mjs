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
    threadId: record.threadId,
    situationId: record.situationId,
    occurredAt: record.occurredAt,
    visitorUtterance: record.visitorUtterance,
    responseText: record.responseText,
  })).slice(0, 48)}`;
}

function sharedEncounterId(record) {
  return `story_${sha256(canonicalJson({
    occurredAt:record.occurredAt,
    initiatorThreadId:record.initiatorThreadId,
    participants:record.participants,
    story:record.story,
  })).slice(0, 48)}`;
}

function sharedExperienceId({ threadId, sharedEventRef }) {
  return `exp_${sha256(canonicalJson({ threadId, sharedEventRef })).slice(0, 48)}`;
}

function sharedJournalEntryId({ threadId, aboutExperienceRef, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ threadId, aboutExperienceRef, writtenAt, entryText })).slice(0, 48)}`;
}

function journalEntryId({ threadId, aboutEventRef, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ threadId, aboutEventRef, writtenAt, entryText })).slice(0, 48)}`;
}

export class LivedExperienceStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName: "LivedExperienceStore" });
    try {
      migrateDatabase(this.#database);
      createLivedExperienceTables(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  recordSharedEncounter(candidate) {
    assertIsoTimestamp("shared encounter.occurredAt", candidate.occurredAt);
    assertId("shared encounter.initiatorThreadId", candidate.initiatorThreadId);
    if (!Array.isArray(candidate.participants) || candidate.participants.length < 2) {
      throw new TypeError("shared encounter requires at least two participants");
    }
    const participantIds = new Set();
    for (const participant of candidate.participants) {
      if (participant === null || typeof participant !== "object" || Array.isArray(participant)) {
        throw new TypeError("shared encounter participant must be an object");
      }
      assertId("shared encounter participant.threadId", participant.threadId);
      assertId("shared encounter participant.situationId", participant.situationId);
      if (participantIds.has(participant.threadId)) throw new TypeError("shared encounter participant is duplicated");
      participantIds.add(participant.threadId);
    }
    if (!participantIds.has(candidate.initiatorThreadId)) {
      throw new TypeError("shared encounter initiator must be present");
    }
    if (candidate.story === null || typeof candidate.story !== "object" || Array.isArray(candidate.story)) {
      throw new TypeError("shared encounter story must be an object");
    }
    if (!Array.isArray(candidate.story.beats) || candidate.story.beats.length < 1) {
      throw new TypeError("shared encounter story requires at least one beat");
    }
    for (const beat of candidate.story.beats) {
      if (beat === null || typeof beat !== "object" || Array.isArray(beat)) {
        throw new TypeError("shared encounter beat must be an object");
      }
      if (!["utterance","action"].includes(beat.kind)) throw new TypeError("shared encounter beat kind is invalid");
      if (beat.actorThreadId !== null) {
        assertId("shared encounter beat.actorThreadId", beat.actorThreadId);
        if (!participantIds.has(beat.actorThreadId)) throw new TypeError("shared encounter beat actor must be present");
      }
      assertNonEmpty("shared encounter beat.text", beat.text);
    }

    const normalized = {
      occurredAt:candidate.occurredAt,
      initiatorThreadId:candidate.initiatorThreadId,
      participants:candidate.participants.map((participant) => ({
        threadId:participant.threadId,
        situationId:participant.situationId,
      })),
      story:{
        storyVersion:candidate.story.storyVersion ?? "shared-encounter-story-v0.1",
        beats:candidate.story.beats.map((beat) => ({
          actorThreadId:beat.actorThreadId ?? null,
          kind:beat.kind,
          text:beat.text,
        })),
      },
    };
    const sharedEventId = sharedEncounterId(normalized);
    const record = { sharedEventId, ...normalized };
    const recordDigest = digest(record);

    try {
      return this.#database.transaction(() => {
        for (const participant of normalized.participants) {
          if (this.#database.prepare("SELECT 1 AS present FROM threads WHERE thread_id=?").get(participant.threadId) === undefined) {
            throw new TypeError(`Thread ${participant.threadId} was not found`);
          }
        }
        const prior = this.#database.prepare(
          "SELECT record_digest FROM lived_shared_encounter_records WHERE shared_event_id=?",
        ).get(sharedEventId);
        if (prior !== undefined) {
          if (prior.record_digest !== recordDigest) throw new TypeError(`shared encounter ${sharedEventId} conflicts with its existing record`);
          return record;
        }
        this.#database.prepare(`
          INSERT INTO lived_shared_encounter_records(
            shared_event_id,occurred_at,initiator_thread_id,story_json,record_digest
          ) VALUES (?,?,?,?,?)
        `).run(
          sharedEventId,
          normalized.occurredAt,
          normalized.initiatorThreadId,
          canonicalJson(normalized.story),
          recordDigest,
        );
        const insertParticipant = this.#database.prepare(`
          INSERT INTO lived_shared_encounter_participants(
            shared_event_ref,thread_id,situation_id
          ) VALUES (?,?,?)
        `);
        for (const participant of normalized.participants) {
          insertParticipant.run(sharedEventId,participant.threadId,participant.situationId);
        }
        return record;
      });
    } catch (error) { throw translateStorageError(error); }
  }

  getSharedEncounter(sharedEventId, { required = true } = {}) {
    assertId("sharedEventId", sharedEventId);
    const row = this.#database.prepare(
      "SELECT * FROM lived_shared_encounter_records WHERE shared_event_id=?",
    ).get(sharedEventId);
    if (row === undefined) {
      if (!required) return null;
      throw new TypeError(`shared encounter ${sharedEventId} was not found`);
    }
    const participants = this.#database.prepare(`
      SELECT thread_id,situation_id FROM lived_shared_encounter_participants
      WHERE shared_event_ref=? ORDER BY thread_id
    `).all(sharedEventId).map((participant) => ({
      threadId:participant.thread_id,
      situationId:participant.situation_id,
    }));
    return {
      sharedEventId:row.shared_event_id,
      occurredAt:row.occurred_at,
      initiatorThreadId:row.initiator_thread_id,
      participants,
      story:JSON.parse(row.story_json),
    };
  }

  recordSharedEncounterExperience(candidate) {
    assertId("shared experience.threadId", candidate.threadId);
    assertId("shared experience.sharedEventRef", candidate.sharedEventRef);
    assertId("shared experience.situationId", candidate.situationId);
    assertIsoTimestamp("shared experience.occurredAt", candidate.occurredAt);
    const experienceId = sharedExperienceId(candidate);
    const record = { experienceId, ...candidate };
    const recordDigest = digest(record);
    try {
      const participant = this.#database.prepare(`
        SELECT situation_id FROM lived_shared_encounter_participants
        WHERE shared_event_ref=? AND thread_id=?
      `).get(candidate.sharedEventRef,candidate.threadId);
      if (participant === undefined) throw new TypeError("shared experience requires presence in the encounter");
      if (participant.situation_id !== candidate.situationId) throw new TypeError("shared experience situation does not match encounter presence");
      const shared = this.#database.prepare(
        "SELECT occurred_at FROM lived_shared_encounter_records WHERE shared_event_id=?",
      ).get(candidate.sharedEventRef);
      if (shared === undefined) throw new TypeError(`shared encounter ${candidate.sharedEventRef} was not found`);
      if (shared.occurred_at !== candidate.occurredAt) throw new TypeError("shared experience time must match encounter");
      const prior = this.#database.prepare(
        "SELECT record_digest FROM thread_shared_encounter_experiences WHERE experience_id=?",
      ).get(experienceId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`shared experience ${experienceId} conflicts`);
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_shared_encounter_experiences(
          experience_id,thread_id,shared_event_ref,situation_id,occurred_at,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(
        experienceId,candidate.threadId,candidate.sharedEventRef,candidate.situationId,candidate.occurredAt,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  recordSharedEncounterJournalEntry(candidate) {
    assertId("shared journal.threadId", candidate.threadId);
    assertId("shared journal.aboutExperienceRef", candidate.aboutExperienceRef);
    assertIsoTimestamp("shared journal.writtenAt", candidate.writtenAt);
    assertNonEmpty("shared journal.entryText", candidate.entryText);
    const journalEntryIdValue = sharedJournalEntryId(candidate);
    const record = { journalEntryId:journalEntryIdValue, ...candidate };
    const recordDigest = digest(record);
    try {
      const experience = this.#database.prepare(`
        SELECT thread_id,occurred_at FROM thread_shared_encounter_experiences
        WHERE experience_id=?
      `).get(candidate.aboutExperienceRef);
      if (experience === undefined) throw new TypeError(`shared experience ${candidate.aboutExperienceRef} was not found`);
      if (experience.thread_id !== candidate.threadId) throw new TypeError("shared journal cannot cite another Thread's experience");
      if (Date.parse(candidate.writtenAt) < Date.parse(experience.occurred_at)) {
        throw new TypeError("shared journal cannot predate its experience");
      }
      const prior = this.#database.prepare(`
        SELECT journal_entry_id,entry_text,written_at
        FROM thread_shared_encounter_journal_entries
        WHERE thread_id=? AND about_experience_ref=?
      `).get(candidate.threadId,candidate.aboutExperienceRef);
      if (prior !== undefined) {
        if (prior.journal_entry_id !== journalEntryIdValue || prior.entry_text !== candidate.entryText || prior.written_at !== candidate.writtenAt) {
          throw new TypeError(`shared experience ${candidate.aboutExperienceRef} already has a different journal entry`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_shared_encounter_journal_entries(
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
      const thread = this.#database.prepare("SELECT 1 AS present FROM threads WHERE thread_id=?").get(candidate.threadId);
      if (thread === undefined) throw new TypeError(`Thread ${candidate.threadId} was not found`);
      const prior = this.#database.prepare("SELECT record_digest FROM lived_encounter_records WHERE event_id=?").get(eventId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`encounter ${eventId} conflicts with its existing record`);
        return record;
      }
      this.#database.prepare(`
        INSERT INTO lived_encounter_records(
          event_id,thread_id,situation_id,occurred_at,visitor_utterance,response_text,record_digest
        ) VALUES (?,?,?,?,?,?,?)
      `).run(eventId, core.threadId, core.situationId, core.occurredAt,
        core.visitorUtterance, core.responseText, recordDigest);
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  recordJournalEntry(candidate) {
    assertId("journal.threadId", candidate.threadId);
    assertId("journal.aboutEventRef", candidate.aboutEventRef);
    assertIsoTimestamp("journal.writtenAt", candidate.writtenAt);
    assertNonEmpty("journal.entryText", candidate.entryText);
    const journalEntryIdValue = journalEntryId(candidate);
    const record = { journalEntryId: journalEntryIdValue, ...candidate };
    const recordDigest = digest(record);

    try {
      const encounter = this.#database.prepare(
        "SELECT thread_id,occurred_at FROM lived_encounter_records WHERE event_id=?",
      ).get(candidate.aboutEventRef);
      if (encounter === undefined) throw new TypeError(`journal event ${candidate.aboutEventRef} was not found`);
      if (encounter.thread_id !== candidate.threadId) throw new TypeError("journal entry cannot cite another Thread's encounter");
      if (Date.parse(candidate.writtenAt) < Date.parse(encounter.occurred_at)) {
        throw new TypeError("journal entry cannot predate its encounter");
      }
      const prior = this.#database.prepare(
        "SELECT journal_entry_id,entry_text,written_at FROM thread_journal_entries WHERE thread_id=? AND about_event_ref=?",
      ).get(candidate.threadId, candidate.aboutEventRef);
      if (prior !== undefined) {
        if (prior.journal_entry_id !== journalEntryIdValue || prior.entry_text !== candidate.entryText || prior.written_at !== candidate.writtenAt) {
          throw new TypeError(`encounter ${candidate.aboutEventRef} already has a different journal entry`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_journal_entries(
          journal_entry_id,thread_id,about_event_ref,written_at,entry_text,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(journalEntryIdValue, candidate.threadId, candidate.aboutEventRef,
        candidate.writtenAt, candidate.entryText, recordDigest);
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  listSharedEncounters(threadId) {
    assertId("threadId", threadId);
    const ids = this.#database.prepare(`
      SELECT shared_event_ref FROM lived_shared_encounter_participants
      WHERE thread_id=? ORDER BY shared_event_ref
    `).all(threadId);
    return ids.map(({ shared_event_ref }) => this.getSharedEncounter(shared_event_ref));
  }

  listSharedEncounterJournal(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT journal_entry_id,thread_id,about_experience_ref,written_at,entry_text
      FROM thread_shared_encounter_journal_entries
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
      eventId: row.event_id,
      threadId: row.thread_id,
      situationId: row.situation_id,
      occurredAt: row.occurred_at,
      visitorUtterance: row.visitor_utterance,
      responseText: row.response_text,
    }));
  }

  listJournal(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT journal_entry_id,thread_id,about_event_ref,written_at,entry_text
      FROM thread_journal_entries WHERE thread_id=? ORDER BY written_at,journal_entry_id
    `).all(threadId).map((row) => ({
      journalEntryId: row.journal_entry_id,
      threadId: row.thread_id,
      aboutEventRef: row.about_event_ref,
      writtenAt: row.written_at,
      entryText: row.entry_text,
    }));
  }
}

export function openLivedExperienceStore(storage) { return new LivedExperienceStore(storage); }
