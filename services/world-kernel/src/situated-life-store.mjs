import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  normalizeDatabasePath,
  migrateDatabase,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  normalizeLifeRelation,
  normalizePlaceEpisode,
} from "./situated-life-domain.mjs";
import { createSituatedLifeTables } from "./situated-life-schema.mjs";

export class SituatedLifeConflictError extends Error {}
export class SituatedLifeNotFoundError extends Error {}

function parseRecord(name, json) {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function relationFromRow(row) {
  const record = normalizeLifeRelation(parseRecord(`life relation ${row.relation_id}`, row.record_json));
  const checks = [
    [row.relation_id, record.relationId, "relation ID"],
    [Number(row.revision), record.revision, "revision"],
    [row.thread_id, record.threadId, "Thread"],
    [row.related_party_id, record.relatedParty.partyId, "related party"],
    [row.relation_kind, record.relationKind, "relation kind"],
    [row.genetic_contribution_role, record.geneticContributionRole, "genetic contribution role"],
    [row.visibility, record.visibility, "visibility"],
    [row.provenance, record.provenance, "provenance"],
    [row.recorded_at, record.recordedAt, "recordedAt"],
    [row.supersedes_revision, record.supersedesRevision ?? null, "supersedes revision"],
  ];
  for (const [actual, expected, field] of checks) {
    if (actual !== expected) throw new IntegrityError(`life relation ${record.relationId} ${field} column mismatch`);
  }
  if (row.record_json !== canonicalJson(record)) {
    throw new IntegrityError(`life relation ${record.relationId} is not canonical JSON`);
  }
  return record;
}

function placeFromRow(row) {
  const record = normalizePlaceEpisode(parseRecord(`place episode ${row.episode_id}`, row.record_json));
  const checks = [
    [row.episode_id, record.episodeId, "episode ID"],
    [Number(row.revision), record.revision, "revision"],
    [row.thread_id, record.threadId, "Thread"],
    [row.episode_kind, record.episodeKind, "episode kind"],
    [row.place_id, record.place.placeId, "place"],
    [row.visibility, record.visibility, "visibility"],
    [row.provenance, record.provenance, "provenance"],
    [row.recorded_at, record.recordedAt, "recordedAt"],
    [row.supersedes_revision, record.supersedesRevision ?? null, "supersedes revision"],
  ];
  for (const [actual, expected, field] of checks) {
    if (actual !== expected) throw new IntegrityError(`place episode ${record.episodeId} ${field} column mismatch`);
  }
  if (row.record_json !== canonicalJson(record)) {
    throw new IntegrityError(`place episode ${record.episodeId} is not canonical JSON`);
  }
  return record;
}

function verifyContiguous(name, records, sameSlot) {
  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    if (current.revision !== index + 1) throw new IntegrityError(`${name} has non-contiguous revisions`);
    if (index === 0) continue;
    const previous = records[index - 1];
    if (current.supersedesRevision !== previous.revision) {
      throw new IntegrityError(`${name} does not supersede its immediate predecessor`);
    }
    if (Date.parse(current.recordedAt) < Date.parse(previous.recordedAt)) {
      throw new IntegrityError(`${name} recordedAt moves backwards`);
    }
    if (!sameSlot(previous, current)) throw new IntegrityError(`${name} changes its stable identity slot`);
  }
  return records;
}

function sameRelationSlot(left, right) {
  return left.relationId === right.relationId &&
    left.threadId === right.threadId &&
    left.relatedParty.partyId === right.relatedParty.partyId &&
    left.relatedParty.kind === right.relatedParty.kind &&
    left.relationKind === right.relationKind;
}

function samePlaceSlot(left, right) {
  return left.episodeId === right.episodeId &&
    left.threadId === right.threadId &&
    left.episodeKind === right.episodeKind;
}

export class SituatedLifeStore {
  #database;
  #readOnly;

  constructor(databasePath, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      readOnly,
      enableForeignKeyConstraints: true,
    });
    try {
      if (readOnly) {
        this.#database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
      } else {
        this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
        migrateDatabase(this.#database);
        this.#database.exec("BEGIN IMMEDIATE");
        createSituatedLifeTables(this.#database);
        this.#database.exec("COMMIT");
      }
    } catch (error) {
      safeRollback(this.#database);
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }
  queryOnly() { return Number(this.#database.prepare("PRAGMA query_only").get().query_only) === 1; }

  #requireThread(threadId) {
    const row = this.#database.prepare("SELECT created_at FROM threads WHERE thread_id=?").get(threadId);
    if (row === undefined) throw new SituatedLifeNotFoundError(`Thread ${threadId} was not found`);
    return row;
  }

  lifeRelationHistory(threadId, relationId, { required = true } = {}) {
    this.#requireThread(threadId);
    const records = this.#database.prepare(`
      SELECT relation_id,revision,thread_id,related_party_id,relation_kind,
        genetic_contribution_role,visibility,provenance,recorded_at,
        supersedes_revision,record_json
      FROM life_relation_records
      WHERE thread_id=? AND relation_id=? ORDER BY revision
    `).all(threadId, relationId).map(relationFromRow);
    if (records.length === 0 && required) throw new SituatedLifeNotFoundError(`life relation ${relationId} was not found`);
    return verifyContiguous(`life relation ${relationId}`, records, sameRelationSlot);
  }

  placeEpisodeHistory(threadId, episodeId, { required = true } = {}) {
    this.#requireThread(threadId);
    const records = this.#database.prepare(`
      SELECT episode_id,revision,thread_id,episode_kind,place_id,visibility,
        provenance,recorded_at,supersedes_revision,record_json
      FROM place_episode_records
      WHERE thread_id=? AND episode_id=? ORDER BY revision
    `).all(threadId, episodeId).map(placeFromRow);
    if (records.length === 0 && required) throw new SituatedLifeNotFoundError(`place episode ${episodeId} was not found`);
    return verifyContiguous(`place episode ${episodeId}`, records, samePlaceSlot);
  }

  listCurrentLifeRelations(threadId) {
    this.#requireThread(threadId);
    const ids = this.#database.prepare("SELECT DISTINCT relation_id FROM life_relation_records WHERE thread_id=? ORDER BY relation_id").all(threadId);
    return ids.map(({ relation_id: id }) => this.lifeRelationHistory(threadId, id).at(-1));
  }

  listCurrentPlaceEpisodes(threadId) {
    this.#requireThread(threadId);
    const ids = this.#database.prepare("SELECT DISTINCT episode_id FROM place_episode_records WHERE thread_id=? ORDER BY episode_id").all(threadId);
    return ids.map(({ episode_id: id }) => this.placeEpisodeHistory(threadId, id).at(-1));
  }

  recordLifeRelation(candidate) {
    if (this.#readOnly) throw new SituatedLifeConflictError("read-only situated-life store cannot write");
    const record = normalizeLifeRelation(candidate);
    const thread = this.#requireThread(record.threadId);
    if (Date.parse(record.recordedAt) < Date.parse(thread.created_at)) {
      throw new SituatedLifeConflictError("life relation cannot be recorded before Thread creation");
    }
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const history = this.lifeRelationHistory(record.threadId, record.relationId, { required: false });
      if (history.length !== record.revision - 1) {
        throw new SituatedLifeConflictError(`life relation ${record.relationId} expected revision ${history.length + 1}`);
      }
      if (history.length > 0 && !sameRelationSlot(history[0], record)) {
        throw new SituatedLifeConflictError(`life relation ${record.relationId} changes its stable identity slot`);
      }
      this.#database.prepare(`
        INSERT INTO life_relation_records(
          relation_id,revision,thread_id,related_party_id,relation_kind,
          genetic_contribution_role,visibility,provenance,recorded_at,
          supersedes_revision,record_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.relationId, record.revision, record.threadId, record.relatedParty.partyId,
        record.relationKind, record.geneticContributionRole, record.visibility,
        record.provenance, record.recordedAt, record.supersedesRevision ?? null,
        canonicalJson(record),
      );
      this.#database.exec("COMMIT");
      return record;
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }

  recordPlaceEpisode(candidate) {
    if (this.#readOnly) throw new SituatedLifeConflictError("read-only situated-life store cannot write");
    const record = normalizePlaceEpisode(candidate);
    const thread = this.#requireThread(record.threadId);
    if (Date.parse(record.recordedAt) < Date.parse(thread.created_at)) {
      throw new SituatedLifeConflictError("place episode cannot be recorded before Thread creation");
    }
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const history = this.placeEpisodeHistory(record.threadId, record.episodeId, { required: false });
      if (history.length !== record.revision - 1) {
        throw new SituatedLifeConflictError(`place episode ${record.episodeId} expected revision ${history.length + 1}`);
      }
      if (history.length > 0 && !samePlaceSlot(history[0], record)) {
        throw new SituatedLifeConflictError(`place episode ${record.episodeId} changes its stable identity slot`);
      }
      this.#database.prepare(`
        INSERT INTO place_episode_records(
          episode_id,revision,thread_id,episode_kind,place_id,visibility,
          provenance,recorded_at,supersedes_revision,record_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.episodeId, record.revision, record.threadId, record.episodeKind,
        record.place.placeId, record.visibility, record.provenance, record.recordedAt,
        record.supersedesRevision ?? null, canonicalJson(record),
      );
      this.#database.exec("COMMIT");
      return record;
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }

  inspectThread(threadId) {
    return {
      threadId,
      lifeRelations: this.listCurrentLifeRelations(threadId),
      placeEpisodes: this.listCurrentPlaceEpisodes(threadId),
    };
  }
}

export function openSituatedLifeStore(databasePath) {
  return new SituatedLifeStore(databasePath);
}

export function openSituatedLifeInspectionStore(databasePath) {
  return new SituatedLifeStore(databasePath, { readOnly: true });
}
