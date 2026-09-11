import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { migrateDatabase, translateStorageError } from "./persistence-sqlite.mjs";
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

function journalEntryId({ threadId, aboutEventRef, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ threadId, aboutEventRef, writtenAt, entryText })).slice(0, 48)}`;
}

export class LivedExperienceStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName: "LivedExperienceStore" });
    try { migrateDatabase(this.#database); }
    catch (error) { this.#database.close(); throw error; }
  }

  close() { this.#database.close(); }

  recordEncounter(candidate) {
    assertId("encounter.threadId", candidate.threadId);
    assertId("encounter.situationId", candidate.situationId);
    assertIsoTimestamp("encounter.occurredAt", candidate.occurredAt);
    assertNonEmpty("encounter.visitorUtterance", candidate.visitorUtterance);
    assertNonEmpty("encounter.responseText", candidate.responseText);
    const eventId = encounterEventId(candidate);
    const record = { eventId, ...candidate };
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
      `).run(eventId, candidate.threadId, candidate.situationId, candidate.occurredAt,
        candidate.visitorUtterance, candidate.responseText, recordDigest);
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
