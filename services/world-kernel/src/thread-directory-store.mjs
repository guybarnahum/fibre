import { IntegrityError } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

const MAX_THREADS = 5000;

function clean(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function strings(value) {
  return Object.freeze(Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim())
    : []);
}

function parse(name, value) {
  if (value === null || value === undefined) return null;
  try { return JSON.parse(value); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function registryEntry(row) {
  const thread = parse(`Thread ${row.thread_id}`, row.state_json);
  const identity = thread?.identity ?? {};
  const worldSpec = parse(`Thread ${row.thread_id} WorldSpec`, row.world_spec_json);
  const raisedAs = worldSpec === null ? null : Object.freeze({
    culturalContext: clean(worldSpec.culturalContext),
    languages: strings(worldSpec.languages),
    schoolingOrCommunityContext: clean(worldSpec.schoolingOrCommunityContext),
  });
  const reconciliation = clean(row.reconciliation_state) === null ? null : Object.freeze({
    state:clean(row.reconciliation_state),
    lastError:parse(`Thread ${row.thread_id} reconciliation error`, row.reconciliation_error_json),
    updatedAt:clean(row.reconciliation_updated_at),
  });
  return Object.freeze({
    threadId: row.thread_id,
    fibreIdentityNumber: clean(row.fibre_identity_number),
    displayName: clean(identity.name),
    sex: clean(identity.sex),
    status: clean(row.status),
    originOrientation: clean(identity.originOrientation),
    birthDate: clean(identity.birthDate),
    birthPlace: clean(identity.birthCity),
    culture: strings(identity.culture),
    languages: strings(identity.languages),
    raisedAs,
    summary: clean(identity.selfDescription),
    version: Number(row.version),
    stateHash: clean(row.state_hash),
    updatedAt: clean(row.updated_at),
    reconciliation,
  });
}

export class ThreadDirectoryStore {
  #database;
  #tables;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, {
      readOnly: true,
      storeName: "ThreadDirectoryStore",
    });
    this.#tables = new Set(this.#database.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN (
        'threads','fibre_civil_registrations','genesis_manifests','genesis_world_specs','thread_visual_publication_work'
      )
    `).all().map((row) => row.name));
  }

  close() { this.#database.close(); }

  getEntry(threadId) {
    if (typeof threadId !== "string" || threadId.trim() === "") throw new TypeError("Thread directory threadId is required");
    if (!this.#tables.has("threads")) return null;
    const hasCivilRegistry = this.#tables.has("fibre_civil_registrations");
    const hasGenesis = this.#tables.has("genesis_manifests") && this.#tables.has("genesis_world_specs");
    const row = this.#database.prepare(`
      SELECT
        t.thread_id,t.version,t.status,t.state_json,t.state_hash,t.updated_at,
        ${hasCivilRegistry ? "r.fibre_identity_number" : "NULL"} AS fibre_identity_number,
        ${hasGenesis ? "w.record_json" : "NULL"} AS world_spec_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.state" : "NULL"} AS reconciliation_state,
        ${this.#tables.has("thread_visual_publication_work") ? "v.last_error_json" : "NULL"} AS reconciliation_error_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.updated_at" : "NULL"} AS reconciliation_updated_at
      FROM threads t
      ${hasCivilRegistry ? "LEFT JOIN fibre_civil_registrations r ON r.thread_id=t.thread_id" : ""}
      ${hasGenesis ? "LEFT JOIN genesis_manifests m ON m.thread_id=t.thread_id AND m.publication_status='published' LEFT JOIN genesis_world_specs w ON w.world_spec_id=m.world_spec_id" : ""}
      ${this.#tables.has("thread_visual_publication_work") ? "LEFT JOIN thread_visual_publication_work v ON v.thread_id=t.thread_id" : ""}
      WHERE t.thread_id=?
      LIMIT 1
    `).get(threadId.trim());
    return row === undefined ? null : registryEntry(row);
  }

  listEntries({ limit = MAX_THREADS, fin = null } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_THREADS) {
      throw new TypeError(`Thread directory limit must be between 1 and ${MAX_THREADS}`);
    }
    if (!this.#tables.has("threads")) return [];
    const hasCivilRegistry = this.#tables.has("fibre_civil_registrations");
    const hasGenesis = this.#tables.has("genesis_manifests") && this.#tables.has("genesis_world_specs");
    if (fin !== null && !hasCivilRegistry) return [];

    const sql = `
      SELECT
        t.thread_id,t.version,t.status,t.state_json,t.state_hash,t.updated_at,
        ${hasCivilRegistry ? "r.fibre_identity_number" : "NULL"} AS fibre_identity_number,
        ${hasGenesis ? "w.record_json" : "NULL"} AS world_spec_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.state" : "NULL"} AS reconciliation_state,
        ${this.#tables.has("thread_visual_publication_work") ? "v.last_error_json" : "NULL"} AS reconciliation_error_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.updated_at" : "NULL"} AS reconciliation_updated_at
      FROM threads t
      ${hasCivilRegistry ? "LEFT JOIN fibre_civil_registrations r ON r.thread_id=t.thread_id" : ""}
      ${hasGenesis ? "LEFT JOIN genesis_manifests m ON m.thread_id=t.thread_id AND m.publication_status='published' LEFT JOIN genesis_world_specs w ON w.world_spec_id=m.world_spec_id" : ""}
      ${this.#tables.has("thread_visual_publication_work") ? "LEFT JOIN thread_visual_publication_work v ON v.thread_id=t.thread_id" : ""}
      ${fin === null ? "" : "WHERE r.fibre_identity_number=?"}
      ORDER BY t.thread_id ASC
      LIMIT ?
    `;
    const rows = fin === null
      ? this.#database.prepare(sql).all(limit)
      : this.#database.prepare(sql).all(fin, limit);
    return rows.map(registryEntry);
  }
}
