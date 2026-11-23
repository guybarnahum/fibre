// Who was told what, at what extent and form (ADR-0040). History is
// append-only: an audience's knowledge is derived from it, never edited.
export function createInformationDisclosureTables(database){
  database.exec(`
    CREATE TABLE IF NOT EXISTS information_disclosure_records (
      disclosure_id TEXT PRIMARY KEY,
      about_thread_id TEXT NOT NULL,
      item_kind TEXT NOT NULL,
      audience TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      record_json TEXT NOT NULL,
      record_digest TEXT NOT NULL,
      FOREIGN KEY (about_thread_id) REFERENCES threads(thread_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_information_disclosure_about
      ON information_disclosure_records(about_thread_id,item_kind,audience,occurred_at);
    CREATE TRIGGER IF NOT EXISTS information_disclosure_records_no_update
      BEFORE UPDATE ON information_disclosure_records
      BEGIN SELECT RAISE(ABORT,'information_disclosure_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS information_disclosure_records_no_delete
      BEFORE DELETE ON information_disclosure_records
      BEGIN SELECT RAISE(ABORT,'information_disclosure_records is append-only'); END;
  `);
}
