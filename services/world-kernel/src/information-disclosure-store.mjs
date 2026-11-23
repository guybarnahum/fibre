import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { migrateDatabase } from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import { normalizeDisclosure, publicWhereaboutsOf } from "./information-disclosure.mjs";

const MAX_THREADS = 500;
const read = (rows) => rows.map((row) => Object.freeze(JSON.parse(row.record_json)));

// The public's knowledge of each Thread's whereabouts, in one query, for any
// World reader that projects what the public may see.
export function publicWhereaboutsIn(database, threadIds) {
  if (!Array.isArray(threadIds) || threadIds.length > MAX_THREADS) throw new TypeError(`at most ${MAX_THREADS} Threads`);
  const rows = read(database.prepare(`SELECT record_json FROM information_disclosure_records
    WHERE about_thread_id IN (SELECT value FROM json_each(?)) AND audience='public'`).all(JSON.stringify(threadIds)));
  return new Map(threadIds.map((threadId) => [threadId,
    publicWhereaboutsOf(rows.filter((item) => item.aboutThreadId === threadId))]));
}

// Tellings as World facts (ADR-0040). Recording one is the Thread's own act;
// nothing here decides what anyone tells.
export function openInformationDisclosureStore(storage, { readOnly = false } = {}) {
  const database = openWorldStateDatabase(storage, { readOnly, storeName: "InformationDisclosureStore" });
  try {
    if (!readOnly && !storage.schemaReady) migrateDatabase(database);
  } catch (error) { database.close(); throw error; }

  return Object.freeze({
    record(value) {
      if (readOnly) throw new TypeError("a read-only World cannot record a disclosure");
      const disclosure = normalizeDisclosure(value);
      const json = canonicalJson(disclosure);
      database.prepare(`INSERT INTO information_disclosure_records
        (disclosure_id,about_thread_id,item_kind,audience,occurred_at,record_json,record_digest)
        VALUES(?,?,?,?,?,?,?) ON CONFLICT(disclosure_id) DO NOTHING`)
        .run(disclosure.disclosureId, disclosure.aboutThreadId, disclosure.itemKind, disclosure.audience,
          disclosure.occurredAt, json, `sha256:${sha256(json)}`);
      return disclosure;
    },
    list(aboutThreadId) {
      return read(database.prepare(`SELECT record_json FROM information_disclosure_records
        WHERE about_thread_id=? ORDER BY occurred_at,disclosure_id`).all(aboutThreadId));
    },
    publicWhereabouts(threadIds) { return publicWhereaboutsIn(database, threadIds); },
    close() { database.close(); },
  });
}
