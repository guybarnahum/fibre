export function createCivilRegistryTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS fibre_civil_registrations (
      registration_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      fibre_identity_number TEXT NOT NULL UNIQUE,
      birth_event_ref TEXT NOT NULL UNIQUE,
      world_ref TEXT NOT NULL,
      registered_at TEXT NOT NULL,
      issuer TEXT NOT NULL,
      fin_policy_ref TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (birth_event_ref) REFERENCES thread_events(event_id)
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS fibre_civil_registrations_no_update
      BEFORE UPDATE ON fibre_civil_registrations
      BEGIN SELECT RAISE(ABORT,'fibre_civil_registrations is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS fibre_civil_registrations_no_delete
      BEFORE DELETE ON fibre_civil_registrations
      BEGIN SELECT RAISE(ABORT,'fibre_civil_registrations is immutable'); END;
  `);
}
