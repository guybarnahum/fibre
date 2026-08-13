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
  situatedLifeRecordIsCurrent,
} from "./situated-life-domain.mjs";
import { createSituatedLifeTables } from "./situated-life-schema.mjs";
import {
  ensureSituatedLifeDigestColumns,
  situatedRecordDigest,
} from "./situated-life-integrity.mjs";
import {
  assertAllSituatedReferencesResolve,
} from "./situated-identity-grounding.mjs";

export class SituatedLifeConflictError extends Error {}
export class SituatedLifeNotFoundError extends Error {}

function parseRecord(name, json) {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
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
    left.episodeKind === right.episodeKind &&
    left.place.placeId === right.place.placeId;
}

function referencesAreSuperset(previous, current) {
  const currentSet = new Set(current);
  return previous.every((reference) => currentSet.has(reference));
}

function hasNewReference(previous, current) {
  const previousSet = new Set(previous);
  return current.some((reference) => !previousSet.has(reference));
}

function visibilityRank(value) {
  return { private: 0, restricted: 1, public: 2 }[value];
}

function verifyHeadRows(database, kind, lineageId, threadId, decoded) {
  const heads = database.prepare(`
    SELECT revision,thread_id,head_digest,recorded_at
    FROM situated_life_lineage_heads
    WHERE ledger_kind=? AND lineage_id=?
    ORDER BY revision
  `).all(kind, lineageId);
  if (heads.length !== decoded.length) {
    throw new IntegrityError(`${kind} ${lineageId} head chain length mismatch`);
  }
  for (let index = 0; index < decoded.length; index += 1) {
    const head = heads[index];
    const item = decoded[index];
    if (
      Number(head.revision) !== index + 1 ||
      head.thread_id !== threadId ||
      head.head_digest !== item.digest ||
      head.recorded_at !== item.record.recordedAt
    ) {
      throw new IntegrityError(`${kind} ${lineageId} head mismatch at revision ${index + 1}`);
    }
  }
}

function relationFromRow(row, previousDigest) {
  const record = normalizeLifeRelation(
    parseRecord(`life relation ${row.relation_id}`, row.record_json),
  );
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
    if (actual !== expected) {
      throw new IntegrityError(`life relation ${record.relationId} ${field} column mismatch`);
    }
  }
  if (row.record_json !== canonicalJson(record)) {
    throw new IntegrityError(`life relation ${record.relationId} is not canonical JSON`);
  }
  const digest = situatedRecordDigest("life_relation", record, previousDigest);
  if (row.record_digest !== digest) {
    throw new IntegrityError(`life relation ${record.relationId} digest mismatch`);
  }
  return { record, digest };
}

function placeFromRow(row, previousDigest) {
  const record = normalizePlaceEpisode(
    parseRecord(`place episode ${row.episode_id}`, row.record_json),
  );
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
    if (actual !== expected) {
      throw new IntegrityError(`place episode ${record.episodeId} ${field} column mismatch`);
    }
  }
  if (row.record_json !== canonicalJson(record)) {
    throw new IntegrityError(`place episode ${record.episodeId} is not canonical JSON`);
  }
  const digest = situatedRecordDigest("place_episode", record, previousDigest);
  if (row.record_digest !== digest) {
    throw new IntegrityError(`place episode ${record.episodeId} digest mismatch`);
  }
  return { record, digest };
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
        this.#database.exec(
          "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
        );
        migrateDatabase(this.#database);
        this.#database.exec("BEGIN IMMEDIATE");
        createSituatedLifeTables(this.#database);
        ensureSituatedLifeDigestColumns(this.#database);
        this.#database.exec("COMMIT");
      }
    } catch (error) {
      safeRollback(this.#database);
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }
  queryOnly() {
    return Number(this.#database.prepare("PRAGMA query_only").get().query_only) === 1;
  }

  #requireThread(threadId) {
    const row = this.#database.prepare(
      "SELECT created_at FROM threads WHERE thread_id=?",
    ).get(threadId);
    if (row === undefined) {
      throw new SituatedLifeNotFoundError(`Thread ${threadId} was not found`);
    }
    return row;
  }

  #requireRelatedParty(record) {
    if (record.relatedParty.kind !== "thread") return;
    if (
      record.relationKind === "biological_parent" &&
      record.relatedParty.partyId === record.threadId
    ) {
      throw new SituatedLifeConflictError("a Thread cannot be its own biological parent");
    }
    const party = this.#database.prepare(
      "SELECT 1 AS present FROM threads WHERE thread_id=?",
    ).get(record.relatedParty.partyId);
    if (party === undefined) {
      throw new SituatedLifeConflictError(
        `related Thread ${record.relatedParty.partyId} does not exist`,
      );
    }
  }

  #resolvedEvidence(threadId, references) {
    const resolved = assertAllSituatedReferencesResolve(
      this.#database,
      threadId,
      references,
    );
    if (!resolved.some((witness) => witness.kind === "thread_event")) {
      throw new SituatedLifeConflictError(
        "situated-life records require at least one resolved Thread-event witness",
      );
    }
    return resolved;
  }

  lifeRelationHistory(threadId, relationId, { required = true } = {}) {
    this.#requireThread(threadId);
    const rows = this.#database.prepare(`
      SELECT relation_id,revision,thread_id,related_party_id,relation_kind,
        genetic_contribution_role,visibility,provenance,recorded_at,
        supersedes_revision,record_json,record_digest
      FROM life_relation_records
      WHERE thread_id=? AND relation_id=? ORDER BY revision
    `).all(threadId, relationId);
    if (rows.length === 0) {
      if (required) {
        throw new SituatedLifeNotFoundError(`life relation ${relationId} was not found`);
      }
      return [];
    }
    const decoded = [];
    let previousDigest = null;
    for (let index = 0; index < rows.length; index += 1) {
      const item = relationFromRow(rows[index], previousDigest);
      const current = item.record;
      if (current.revision !== index + 1) {
        throw new IntegrityError(`life relation ${relationId} has non-contiguous revisions`);
      }
      if (index > 0) {
        const previous = decoded[index - 1].record;
        if (current.supersedesRevision !== previous.revision) {
          throw new IntegrityError(`life relation ${relationId} does not supersede its predecessor`);
        }
        if (Date.parse(current.recordedAt) < Date.parse(previous.recordedAt)) {
          throw new IntegrityError(`life relation ${relationId} recordedAt moves backwards`);
        }
        if (!sameRelationSlot(previous, current)) {
          throw new IntegrityError(`life relation ${relationId} changes its stable identity slot`);
        }
      }
      decoded.push(item);
      previousDigest = item.digest;
    }
    verifyHeadRows(this.#database, "life_relation", relationId, threadId, decoded);
    return decoded.map((item) => item.record);
  }

  placeEpisodeHistory(threadId, episodeId, { required = true } = {}) {
    this.#requireThread(threadId);
    const rows = this.#database.prepare(`
      SELECT episode_id,revision,thread_id,episode_kind,place_id,visibility,
        provenance,recorded_at,supersedes_revision,record_json,record_digest
      FROM place_episode_records
      WHERE thread_id=? AND episode_id=? ORDER BY revision
    `).all(threadId, episodeId);
    if (rows.length === 0) {
      if (required) {
        throw new SituatedLifeNotFoundError(`place episode ${episodeId} was not found`);
      }
      return [];
    }
    const decoded = [];
    let previousDigest = null;
    for (let index = 0; index < rows.length; index += 1) {
      const item = placeFromRow(rows[index], previousDigest);
      const current = item.record;
      if (current.revision !== index + 1) {
        throw new IntegrityError(`place episode ${episodeId} has non-contiguous revisions`);
      }
      if (index > 0) {
        const previous = decoded[index - 1].record;
        if (current.supersedesRevision !== previous.revision) {
          throw new IntegrityError(`place episode ${episodeId} does not supersede its predecessor`);
        }
        if (Date.parse(current.recordedAt) < Date.parse(previous.recordedAt)) {
          throw new IntegrityError(`place episode ${episodeId} recordedAt moves backwards`);
        }
        if (!samePlaceSlot(previous, current)) {
          throw new IntegrityError(`place episode ${episodeId} changes its stable place slot`);
        }
      }
      decoded.push(item);
      previousDigest = item.digest;
    }
    verifyHeadRows(this.#database, "place_episode", episodeId, threadId, decoded);
    return decoded.map((item) => item.record);
  }

  listCurrentLifeRelations(threadId) {
    this.#requireThread(threadId);
    const ids = this.#database.prepare(
      "SELECT DISTINCT relation_id FROM life_relation_records WHERE thread_id=? ORDER BY relation_id",
    ).all(threadId);
    return ids
      .map(({ relation_id: id }) => this.lifeRelationHistory(threadId, id).at(-1))
      .filter(situatedLifeRecordIsCurrent);
  }

  listCurrentPlaceEpisodes(threadId) {
    this.#requireThread(threadId);
    const ids = this.#database.prepare(
      "SELECT DISTINCT episode_id FROM place_episode_records WHERE thread_id=? ORDER BY episode_id",
    ).all(threadId);
    return ids
      .map(({ episode_id: id }) => this.placeEpisodeHistory(threadId, id).at(-1))
      .filter(situatedLifeRecordIsCurrent);
  }

  recordLifeRelation(candidate) {
    if (this.#readOnly) {
      throw new SituatedLifeConflictError("read-only situated-life store cannot write");
    }
    const record = normalizeLifeRelation(candidate);
    const thread = this.#requireThread(record.threadId);
    if (Date.parse(record.recordedAt) < Date.parse(thread.created_at)) {
      throw new SituatedLifeConflictError("life relation cannot be recorded before Thread creation");
    }

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#requireRelatedParty(record);
      this.#resolvedEvidence(record.threadId, record.sourceReferences);
      const history = this.lifeRelationHistory(
        record.threadId,
        record.relationId,
        { required: false },
      );
      if (history.length !== record.revision - 1) {
        throw new SituatedLifeConflictError(
          `life relation ${record.relationId} expected revision ${history.length + 1}`,
        );
      }
      const previous = history.at(-1) ?? null;
      if (previous !== null) {
        if (!sameRelationSlot(previous, record)) {
          throw new SituatedLifeConflictError(
            `life relation ${record.relationId} changes its stable identity slot`,
          );
        }
        if (!referencesAreSuperset(previous.sourceReferences, record.sourceReferences)) {
          throw new SituatedLifeConflictError("life relation revision cannot discard prior evidence");
        }
        if (
          record.provenance === "genesis_created" &&
          previous.provenance !== "genesis_created"
        ) {
          throw new SituatedLifeConflictError(
            "later relation revision cannot retroactively mint genesis_created provenance",
          );
        }
        if (
          visibilityRank(record.visibility) > visibilityRank(previous.visibility) &&
          !hasNewReference(previous.sourceReferences, record.sourceReferences)
        ) {
          throw new SituatedLifeConflictError(
            "widening relation visibility requires new evidence",
          );
        }
        if (
          record.geneticContributionRole !== previous.geneticContributionRole &&
          !hasNewReference(previous.sourceReferences, record.sourceReferences)
        ) {
          throw new SituatedLifeConflictError(
            "changing genetic contribution role requires new evidence",
          );
        }
      }

      if (
        record.geneticContributionRole === "parent_genome_source" &&
        situatedLifeRecordIsCurrent(record)
      ) {
        const other = this.listCurrentLifeRelations(record.threadId).filter(
          (relation) => relation.relationId !== record.relationId &&
            relation.geneticContributionRole === "parent_genome_source",
        );
        if (other.length >= 2) {
          throw new SituatedLifeConflictError(
            "a Thread may have at most two current parent_genome_source relations",
          );
        }
      }

      const previousDigest = previous === null
        ? null
        : this.#database.prepare(`
            SELECT record_digest FROM life_relation_records
            WHERE relation_id=? AND revision=?
          `).get(record.relationId, previous.revision).record_digest;
      const digest = situatedRecordDigest("life_relation", record, previousDigest);
      this.#database.prepare(`
        INSERT INTO life_relation_records(
          relation_id,revision,thread_id,related_party_id,relation_kind,
          genetic_contribution_role,visibility,provenance,recorded_at,
          supersedes_revision,record_json,record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.relationId,
        record.revision,
        record.threadId,
        record.relatedParty.partyId,
        record.relationKind,
        record.geneticContributionRole,
        record.visibility,
        record.provenance,
        record.recordedAt,
        record.supersedesRevision ?? null,
        canonicalJson(record),
        digest,
      );
      this.#database.prepare(`
        INSERT INTO situated_life_lineage_heads(
          ledger_kind,lineage_id,revision,thread_id,head_digest,recorded_at
        ) VALUES ('life_relation',?,?,?,?,?)
      `).run(
        record.relationId,
        record.revision,
        record.threadId,
        digest,
        record.recordedAt,
      );
      this.#database.exec("COMMIT");
      return record;
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }

  recordPlaceEpisode(candidate) {
    if (this.#readOnly) {
      throw new SituatedLifeConflictError("read-only situated-life store cannot write");
    }
    const record = normalizePlaceEpisode(candidate);
    const thread = this.#requireThread(record.threadId);
    if (Date.parse(record.recordedAt) < Date.parse(thread.created_at)) {
      throw new SituatedLifeConflictError("place episode cannot be recorded before Thread creation");
    }

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#resolvedEvidence(record.threadId, record.sourceReferences);
      const history = this.placeEpisodeHistory(
        record.threadId,
        record.episodeId,
        { required: false },
      );
      if (history.length !== record.revision - 1) {
        throw new SituatedLifeConflictError(
          `place episode ${record.episodeId} expected revision ${history.length + 1}`,
        );
      }
      const previous = history.at(-1) ?? null;
      if (previous !== null) {
        if (!samePlaceSlot(previous, record)) {
          throw new SituatedLifeConflictError(
            `place episode ${record.episodeId} changes its stable place slot`,
          );
        }
        if (!referencesAreSuperset(previous.sourceReferences, record.sourceReferences)) {
          throw new SituatedLifeConflictError("place revision cannot discard prior evidence");
        }
        if (
          record.provenance === "genesis_created" &&
          previous.provenance !== "genesis_created"
        ) {
          throw new SituatedLifeConflictError(
            "later place revision cannot retroactively mint genesis_created provenance",
          );
        }
        if (
          visibilityRank(record.visibility) > visibilityRank(previous.visibility) &&
          !hasNewReference(previous.sourceReferences, record.sourceReferences)
        ) {
          throw new SituatedLifeConflictError(
            "widening place visibility requires new evidence",
          );
        }
      }

      if (
        record.episodeKind === "birth" &&
        situatedLifeRecordIsCurrent(record)
      ) {
        const existingBirth = this.listCurrentPlaceEpisodes(record.threadId).find(
          (episode) => episode.episodeKind === "birth" && episode.episodeId !== record.episodeId,
        );
        if (existingBirth !== undefined) {
          throw new SituatedLifeConflictError(
            `Thread ${record.threadId} already has current birth episode ${existingBirth.episodeId}`,
          );
        }
      }

      const previousDigest = previous === null
        ? null
        : this.#database.prepare(`
            SELECT record_digest FROM place_episode_records
            WHERE episode_id=? AND revision=?
          `).get(record.episodeId, previous.revision).record_digest;
      const digest = situatedRecordDigest("place_episode", record, previousDigest);
      this.#database.prepare(`
        INSERT INTO place_episode_records(
          episode_id,revision,thread_id,episode_kind,place_id,visibility,
          provenance,recorded_at,supersedes_revision,record_json,record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.episodeId,
        record.revision,
        record.threadId,
        record.episodeKind,
        record.place.placeId,
        record.visibility,
        record.provenance,
        record.recordedAt,
        record.supersedesRevision ?? null,
        canonicalJson(record),
        digest,
      );
      this.#database.prepare(`
        INSERT INTO situated_life_lineage_heads(
          ledger_kind,lineage_id,revision,thread_id,head_digest,recorded_at
        ) VALUES ('place_episode',?,?,?,?,?)
      `).run(
        record.episodeId,
        record.revision,
        record.threadId,
        digest,
        record.recordedAt,
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
