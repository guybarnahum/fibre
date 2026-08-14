import { canonicalJson, sha256, IntegrityError } from "./persistence-common.mjs";

export function situatedRecordDigest(kind, record, previousDigest = null) {
  return `sha256:${sha256(canonicalJson({ kind, previousDigest, record }))}`;
}

function legacySituatedRecordDigest(kind, record) {
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}

function hasColumn(database, table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

function verifyOrUpgradeLineage(database, {
  table,
  idColumn,
  kind,
}) {
  const rows = database.prepare(`
    SELECT ${idColumn} AS lineage_id,revision,thread_id,recorded_at,record_json,record_digest
    FROM ${table}
    ORDER BY ${idColumn},revision
  `).all();
  const lineageIds = [...new Set(rows.map((row) => row.lineage_id))];
  const updateDigest = database.prepare(
    `UPDATE ${table} SET record_digest=? WHERE ${idColumn}=? AND revision=?`,
  );
  const insertHead = database.prepare(`
    INSERT INTO situated_life_lineage_heads(
      ledger_kind,lineage_id,revision,thread_id,head_digest,recorded_at
    ) VALUES (?,?,?,?,?,?)
  `);

  for (const lineageId of lineageIds) {
    const lineage = rows.filter((row) => row.lineage_id === lineageId);
    const heads = database.prepare(`
      SELECT revision,thread_id,head_digest,recorded_at
      FROM situated_life_lineage_heads
      WHERE ledger_kind=? AND lineage_id=?
      ORDER BY revision
    `).all(kind, lineageId);
    if (heads.length !== 0 && heads.length !== lineage.length) {
      throw new IntegrityError(`${kind} ${lineageId} head chain length mismatch`);
    }

    let previousDigest = null;
    for (let index = 0; index < lineage.length; index += 1) {
      const row = lineage[index];
      if (Number(row.revision) !== index + 1) {
        throw new IntegrityError(`${kind} ${lineageId} has non-contiguous revisions`);
      }
      if (row.record_digest === null) {
        throw new IntegrityError(`${kind} ${lineageId} has NULL digest; refusing to bless history`);
      }
      const record = JSON.parse(row.record_json);
      const chained = situatedRecordDigest(kind, record, previousDigest);
      if (heads.length === 0) {
        const legacy = legacySituatedRecordDigest(kind, record);
        if (row.record_digest !== chained && row.record_digest !== legacy) {
          throw new IntegrityError(`${kind} ${lineageId} digest mismatch before chain upgrade`);
        }
        if (row.record_digest !== chained) {
          updateDigest.run(chained, lineageId, row.revision);
        }
        insertHead.run(
          kind,
          lineageId,
          row.revision,
          row.thread_id,
          chained,
          row.recorded_at,
        );
      } else {
        const head = heads[index];
        if (
          row.record_digest !== chained ||
          Number(head.revision) !== index + 1 ||
          head.thread_id !== row.thread_id ||
          head.head_digest !== chained ||
          head.recorded_at !== row.recorded_at
        ) {
          throw new IntegrityError(`${kind} ${lineageId} chained-head integrity mismatch`);
        }
      }
      previousDigest = chained;
    }
  }
}

export function ensureSituatedLifeDigestColumns(database) {
  database.exec(`
    DROP TRIGGER IF EXISTS life_relations_no_update;
    DROP TRIGGER IF EXISTS place_episodes_no_update;
    DROP TRIGGER IF EXISTS situated_life_heads_no_update;
  `);
  try {
    for (const table of ["life_relation_records", "place_episode_records"]) {
      if (!hasColumn(database, table, "record_digest")) {
        const count = Number(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
        if (count !== 0) {
          throw new IntegrityError(`${table} has rows predating digest authority; explicit migration is required`);
        }
        database.exec(`ALTER TABLE ${table} ADD COLUMN record_digest TEXT`);
      }
      const counts = database.prepare(`
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN record_digest IS NULL THEN 1 ELSE 0 END) AS nulls
        FROM ${table}
      `).get();
      const total = Number(counts.total);
      const nulls = Number(counts.nulls ?? 0);
      if (nulls !== 0) {
        throw new IntegrityError(
          `${table} contains ${nulls}/${total} NULL digests; refusing to derive authority from mutable rows`,
        );
      }
    }

    verifyOrUpgradeLineage(database, {
      table: "life_relation_records",
      idColumn: "relation_id",
      kind: "life_relation",
    });
    verifyOrUpgradeLineage(database, {
      table: "place_episode_records",
      idColumn: "episode_id",
      kind: "place_episode",
    });
  } finally {
    database.exec(`
      CREATE TRIGGER IF NOT EXISTS life_relations_no_update
        BEFORE UPDATE ON life_relation_records
        BEGIN SELECT RAISE(ABORT,'life_relation_records is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS place_episodes_no_update
        BEFORE UPDATE ON place_episode_records
        BEGIN SELECT RAISE(ABORT,'place_episode_records is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS situated_life_heads_no_update
        BEFORE UPDATE ON situated_life_lineage_heads
        BEGIN SELECT RAISE(ABORT,'situated_life_lineage_heads is append-only'); END;
    `);
  }
}
