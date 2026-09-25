import { resolveLocalityGeography } from "#core/src/locality-geography.mjs";
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

function birthLocation(identity) {
  const place = identity?.birthPlace;
  if (
    place
    && typeof place === "object"
    && Number.isFinite(place.lat)
    && Number.isFinite(place.long)
  ) {
    return Object.freeze({
      displayName:clean(place.displayName) ?? clean(identity.birthCity),
      country:clean(place.country),
      city:clean(place.city),
      lat:place.lat,
      long:place.long,
      source:"thread_identity",
    });
  }
  const legacy = resolveLocalityGeography(identity?.birthCity);
  if (legacy === null) return null;
  return Object.freeze({
    displayName:clean(identity?.birthCity) ?? legacy.displayName,
    country:legacy.country,
    city:legacy.city,
    lat:legacy.lat,
    long:legacy.long,
    source:"legacy_identity_projection",
  });
}

function registryEntry(row) {
  const thread = parse(`Thread ${row.thread_id}`, row.state_json);
  const identity = thread?.identity ?? {};
  const worldSpec = parse(`Thread ${row.thread_id} WorldSpec`, row.world_spec_json);
  const manifest = parse(`Thread ${row.thread_id} Genesis manifest`, row.manifest_json);
  const correctedRaisedLanguages = parse(`Thread ${row.thread_id} raised languages`, row.raised_languages_json);
  const raisedAs = worldSpec === null ? null : Object.freeze({
    culturalContext: clean(worldSpec.culturalContext),
    languages: strings(correctedRaisedLanguages ?? manifest?.raisedLanguages ?? worldSpec.languages),
    schoolingOrCommunityContext: clean(worldSpec.schoolingOrCommunityContext),
  });
  const reconciliation = clean(row.reconciliation_state) === null ? null : Object.freeze({
    state:clean(row.reconciliation_state),
    lastError:parse(`Thread ${row.thread_id} reconciliation error`, row.reconciliation_error_json),
    updatedAt:clean(row.reconciliation_updated_at),
  });
  const runtime = row.runtime_session_status === "active" && row.runtime_lease_status === "active"
    ? Object.freeze({
      state:"active",
      sessionId:clean(row.runtime_session_id),
      leaseId:clean(row.runtime_lease_id),
      startedAt:clean(row.runtime_started_at),
      expiresAt:clean(row.runtime_expires_at),
    })
    : null;
  return Object.freeze({
    threadId: row.thread_id,
    fibreIdentityNumber: clean(row.fibre_identity_number),
    displayName: clean(identity.name),
    sex: clean(identity.sex),
    status: clean(row.status),
    originOrientation: clean(identity.originOrientation),
    birthDate: clean(identity.birthDate),
    birthPlace: clean(identity.birthCity),
    birthLocation:birthLocation(identity),
    culture: strings(identity.culture),
    languages: strings(identity.languages),
    raisedAs,
    summary: clean(identity.selfDescription),
    version: Number(row.version),
    stateHash: clean(row.state_hash),
    updatedAt: clean(row.updated_at),
    runtime,
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
        'threads','fibre_civil_registrations','genesis_manifests','genesis_world_specs','genesis_raised_language_corrections','thread_visual_publication_work','thaw_leases','runtime_sessions'
      )
    `).all().map((row) => row.name));
  }

  close() { this.#database.close(); }

  getEntry(threadId) {
    if (typeof threadId !== "string" || threadId.trim() === "") throw new TypeError("Thread directory threadId is required");
    if (!this.#tables.has("threads")) return null;
    const hasCivilRegistry = this.#tables.has("fibre_civil_registrations");
    const hasGenesis = this.#tables.has("genesis_manifests") && this.#tables.has("genesis_world_specs");
    const hasRaisedCorrections = this.#tables.has("genesis_raised_language_corrections");
    const hasRuntime = this.#tables.has("thaw_leases") && this.#tables.has("runtime_sessions");
    const row = this.#database.prepare(`
      SELECT
        t.thread_id,t.version,t.status,t.state_json,t.state_hash,t.updated_at,
        ${hasCivilRegistry ? "r.fibre_identity_number" : "NULL"} AS fibre_identity_number,
        ${hasGenesis ? "w.record_json" : "NULL"} AS world_spec_json,
        ${hasGenesis ? "m.record_json" : "NULL"} AS manifest_json,
        ${hasGenesis && hasRaisedCorrections ? "(SELECT languages_json FROM genesis_raised_language_corrections c WHERE c.thread_id=t.thread_id ORDER BY c.recorded_at DESC,c.correction_id DESC LIMIT 1)" : "NULL"} AS raised_languages_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.state" : "NULL"} AS reconciliation_state,
        ${this.#tables.has("thread_visual_publication_work") ? "v.last_error_json" : "NULL"} AS reconciliation_error_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.updated_at" : "NULL"} AS reconciliation_updated_at,
        ${hasRuntime ? "s.status" : "NULL"} AS runtime_session_status,
        ${hasRuntime ? "s.session_id" : "NULL"} AS runtime_session_id,
        ${hasRuntime ? "s.started_at" : "NULL"} AS runtime_started_at,
        ${hasRuntime ? "l.status" : "NULL"} AS runtime_lease_status,
        ${hasRuntime ? "l.lease_id" : "NULL"} AS runtime_lease_id,
        ${hasRuntime ? "l.expires_at" : "NULL"} AS runtime_expires_at
      FROM threads t
      ${hasCivilRegistry ? "LEFT JOIN fibre_civil_registrations r ON r.thread_id=t.thread_id" : ""}
      ${hasGenesis ? "LEFT JOIN genesis_manifests m ON m.thread_id=t.thread_id AND m.publication_status='published' LEFT JOIN genesis_world_specs w ON w.world_spec_id=m.world_spec_id" : ""}
      ${this.#tables.has("thread_visual_publication_work") ? "LEFT JOIN thread_visual_publication_work v ON v.thread_id=t.thread_id" : ""}
      ${hasRuntime ? "LEFT JOIN thaw_leases l ON l.lease_id=(SELECT x.lease_id FROM thaw_leases x WHERE x.thread_id=t.thread_id AND x.status='active' ORDER BY x.acquired_at DESC LIMIT 1) LEFT JOIN runtime_sessions s ON s.lease_id=l.lease_id AND s.status='active'" : ""}
      WHERE t.thread_id=?
      LIMIT 1
    `).get(threadId.trim());
    return row === undefined ? null : registryEntry(row);
  }

  presentThreadIds(threadIds) {
    if (!Array.isArray(threadIds) || threadIds.length < 1 || threadIds.length > 256) {
      throw new TypeError("Thread directory presence requires 1 through 256 Thread IDs");
    }
    const normalized = [...new Set(threadIds.map((threadId) => {
      if (typeof threadId !== "string" || threadId.trim() === "") {
        throw new TypeError("Thread directory presence requires non-empty Thread IDs");
      }
      return threadId.trim();
    }))];
    if (!this.#tables.has("threads")) return [];
    return this.#database.prepare(`
      WITH requested(thread_id) AS (SELECT value FROM json_each(?))
      SELECT t.thread_id
      FROM requested r
      JOIN threads t ON t.thread_id=r.thread_id
      ORDER BY t.thread_id
    `).all(JSON.stringify(normalized)).map((row) => row.thread_id);
  }

  listEntries({ limit = MAX_THREADS, fin = null } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_THREADS) {
      throw new TypeError(`Thread directory limit must be between 1 and ${MAX_THREADS}`);
    }
    if (!this.#tables.has("threads")) return [];
    const hasCivilRegistry = this.#tables.has("fibre_civil_registrations");
    const hasGenesis = this.#tables.has("genesis_manifests") && this.#tables.has("genesis_world_specs");
    const hasRaisedCorrections = this.#tables.has("genesis_raised_language_corrections");
    const hasRuntime = this.#tables.has("thaw_leases") && this.#tables.has("runtime_sessions");
    if (fin !== null && !hasCivilRegistry) return [];

    const sql = `
      SELECT
        t.thread_id,t.version,t.status,t.state_json,t.state_hash,t.updated_at,
        ${hasCivilRegistry ? "r.fibre_identity_number" : "NULL"} AS fibre_identity_number,
        ${hasGenesis ? "w.record_json" : "NULL"} AS world_spec_json,
        ${hasGenesis ? "m.record_json" : "NULL"} AS manifest_json,
        ${hasGenesis && hasRaisedCorrections ? "(SELECT languages_json FROM genesis_raised_language_corrections c WHERE c.thread_id=t.thread_id ORDER BY c.recorded_at DESC,c.correction_id DESC LIMIT 1)" : "NULL"} AS raised_languages_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.state" : "NULL"} AS reconciliation_state,
        ${this.#tables.has("thread_visual_publication_work") ? "v.last_error_json" : "NULL"} AS reconciliation_error_json,
        ${this.#tables.has("thread_visual_publication_work") ? "v.updated_at" : "NULL"} AS reconciliation_updated_at,
        ${hasRuntime ? "s.status" : "NULL"} AS runtime_session_status,
        ${hasRuntime ? "s.session_id" : "NULL"} AS runtime_session_id,
        ${hasRuntime ? "s.started_at" : "NULL"} AS runtime_started_at,
        ${hasRuntime ? "l.status" : "NULL"} AS runtime_lease_status,
        ${hasRuntime ? "l.lease_id" : "NULL"} AS runtime_lease_id,
        ${hasRuntime ? "l.expires_at" : "NULL"} AS runtime_expires_at
      FROM threads t
      ${hasCivilRegistry ? "LEFT JOIN fibre_civil_registrations r ON r.thread_id=t.thread_id" : ""}
      ${hasGenesis ? "LEFT JOIN genesis_manifests m ON m.thread_id=t.thread_id AND m.publication_status='published' LEFT JOIN genesis_world_specs w ON w.world_spec_id=m.world_spec_id" : ""}
      ${this.#tables.has("thread_visual_publication_work") ? "LEFT JOIN thread_visual_publication_work v ON v.thread_id=t.thread_id" : ""}
      ${hasRuntime ? "LEFT JOIN thaw_leases l ON l.lease_id=(SELECT x.lease_id FROM thaw_leases x WHERE x.thread_id=t.thread_id AND x.status='active' ORDER BY x.acquired_at DESC LIMIT 1) LEFT JOIN runtime_sessions s ON s.lease_id=l.lease_id AND s.status='active'" : ""}
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
