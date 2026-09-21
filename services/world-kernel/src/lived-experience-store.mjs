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

function sharedMeetingId(record) {
  return `meet_${sha256(canonicalJson({
    occurredAt:record.occurredAt,
    initiatorThreadId:record.initiatorThreadId,
    responderThreadId:record.responderThreadId,
    initiatorSituationId:record.initiatorSituationId,
    responderSituationId:record.responderSituationId,
    openingText:record.openingText,
    responseText:record.responseText,
    followupText:record.followupText,
  })).slice(0, 48)}`;
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

  recordSharedMeeting(candidate) {
    assertIsoTimestamp("shared meeting.occurredAt", candidate.occurredAt);
    assertId("shared meeting.initiatorThreadId", candidate.initiatorThreadId);
    assertId("shared meeting.responderThreadId", candidate.responderThreadId);
    if (candidate.initiatorThreadId === candidate.responderThreadId) {
      throw new TypeError("shared meeting requires two Threads");
    }
    assertId("shared meeting.initiatorSituationId", candidate.initiatorSituationId);
    assertId("shared meeting.responderSituationId", candidate.responderSituationId);
    assertNonEmpty("shared meeting.openingText", candidate.openingText);
    assertNonEmpty("shared meeting.responseText", candidate.responseText);
    assertNonEmpty("shared meeting.followupText", candidate.followupText);
    const sharedEventId = sharedMeetingId(candidate);
    const record = { sharedEventId, ...candidate };
    const recordDigest = digest(record);
    try {
      for (const threadId of [candidate.initiatorThreadId, candidate.responderThreadId]) {
        if (this.#database.prepare("SELECT 1 AS present FROM threads WHERE thread_id=?").get(threadId) === undefined) {
          throw new TypeError(`Thread ${threadId} was not found`);
        }
      }
      const prior = this.#database.prepare(
        "SELECT record_digest FROM lived_shared_meeting_records WHERE shared_event_id=?",
      ).get(sharedEventId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`shared meeting ${sharedEventId} conflicts with its existing record`);
        return record;
      }
      this.#database.prepare(`
        INSERT INTO lived_shared_meeting_records(
          shared_event_id,occurred_at,initiator_thread_id,responder_thread_id,
          initiator_situation_id,responder_situation_id,opening_text,response_text,followup_text,record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(
        sharedEventId,candidate.occurredAt,candidate.initiatorThreadId,candidate.responderThreadId,
        candidate.initiatorSituationId,candidate.responderSituationId,
        candidate.openingText,candidate.responseText,candidate.followupText,recordDigest,
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
    const sharedEventRef = candidate.sharedEventRef ?? null;
    if (sharedEventRef !== null) assertId("encounter.sharedEventRef", sharedEventRef);
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
      if (sharedEventRef !== null) {
        const shared = this.#database.prepare(
          "SELECT 1 AS present FROM lived_shared_meeting_records WHERE shared_event_id=?",
        ).get(sharedEventRef);
        if (shared === undefined) throw new TypeError(`shared meeting ${sharedEventRef} was not found`);
      }
      const prior = this.#database.prepare("SELECT record_digest FROM lived_encounter_records WHERE event_id=?").get(eventId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`encounter ${eventId} conflicts with its existing record`);
        const linked = this.#database.prepare(
          "SELECT shared_event_ref FROM lived_encounter_shared_refs WHERE event_id=?",
        ).get(eventId)?.shared_event_ref ?? null;
        if (linked !== sharedEventRef) throw new TypeError(`encounter ${eventId} shared meeting link conflicts`);
        return sharedEventRef === null ? record : { ...record, sharedEventRef };
      }
      this.#database.prepare(`
        INSERT INTO lived_encounter_records(
          event_id,thread_id,situation_id,occurred_at,visitor_utterance,response_text,record_digest
        ) VALUES (?,?,?,?,?,?,?)
      `).run(eventId, core.threadId, core.situationId, core.occurredAt,
        core.visitorUtterance, core.responseText, recordDigest);
      if (sharedEventRef !== null) {
        this.#database.prepare(
          "INSERT INTO lived_encounter_shared_refs(event_id,shared_event_ref) VALUES (?,?)",
        ).run(eventId, sharedEventRef);
      }
      return sharedEventRef === null ? record : { ...record, sharedEventRef };
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

  listSharedMeetings(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT * FROM lived_shared_meeting_records
      WHERE initiator_thread_id=? OR responder_thread_id=?
      ORDER BY occurred_at,shared_event_id
    `).all(threadId,threadId).map((row) => ({
      sharedEventId:row.shared_event_id,
      occurredAt:row.occurred_at,
      initiatorThreadId:row.initiator_thread_id,
      responderThreadId:row.responder_thread_id,
      initiatorSituationId:row.initiator_situation_id,
      responderSituationId:row.responder_situation_id,
      openingText:row.opening_text,
      responseText:row.response_text,
      followupText:row.followup_text,
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
