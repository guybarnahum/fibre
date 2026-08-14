import { IntegrityError } from "./persistence-common.mjs";

function expectedReference(kind, sourceId, revision) {
  return kind === "life_relation_revision"
    ? `lrr:${sourceId}:${revision}`
    : `per:${sourceId}:${revision}`;
}

function backfillWitnesses(database, {
  table,
  idColumn,
  witnessKind,
}) {
  const rows = database.prepare(`
    SELECT ${idColumn} AS source_id,revision,thread_id,record_digest,recorded_at
    FROM ${table}
    ORDER BY ${idColumn},revision
  `).all();
  const insert = database.prepare(`
    INSERT INTO situated_evidence_witnesses(
      reference,thread_id,witness_kind,source_id,revision,record_digest,recorded_at
    ) VALUES (?,?,?,?,?,?,?)
  `);
  for (const row of rows) {
    const reference = expectedReference(witnessKind, row.source_id, row.revision);
    const existing = database.prepare(`
      SELECT thread_id,witness_kind,source_id,revision,record_digest,recorded_at
      FROM situated_evidence_witnesses WHERE reference=?
    `).get(reference);
    if (existing === undefined) {
      insert.run(
        reference,
        row.thread_id,
        witnessKind,
        row.source_id,
        row.revision,
        row.record_digest,
        row.recorded_at,
      );
      continue;
    }
    if (
      existing.thread_id !== row.thread_id ||
      existing.witness_kind !== witnessKind ||
      existing.source_id !== row.source_id ||
      Number(existing.revision) !== Number(row.revision) ||
      existing.record_digest !== row.record_digest ||
      existing.recorded_at !== row.recorded_at
    ) {
      throw new IntegrityError(`situated evidence witness ${reference} conflicts with verified ledger history`);
    }
  }
}

export function ensureSituatedWitnessPublication(database) {
  backfillWitnesses(database, {
    table: "life_relation_records",
    idColumn: "relation_id",
    witnessKind: "life_relation_revision",
  });
  backfillWitnesses(database, {
    table: "place_episode_records",
    idColumn: "episode_id",
    witnessKind: "place_episode_revision",
  });

  database.exec(`
    CREATE TRIGGER IF NOT EXISTS life_relation_publish_witness
      AFTER INSERT ON life_relation_records
      BEGIN
        INSERT INTO situated_evidence_witnesses(
          reference,thread_id,witness_kind,source_id,revision,record_digest,recorded_at
        ) VALUES (
          'lrr:' || NEW.relation_id || ':' || NEW.revision,
          NEW.thread_id,'life_relation_revision',NEW.relation_id,NEW.revision,
          NEW.record_digest,NEW.recorded_at
        );
      END;

    CREATE TRIGGER IF NOT EXISTS place_episode_publish_witness
      AFTER INSERT ON place_episode_records
      BEGIN
        INSERT INTO situated_evidence_witnesses(
          reference,thread_id,witness_kind,source_id,revision,record_digest,recorded_at
        ) VALUES (
          'per:' || NEW.episode_id || ':' || NEW.revision,
          NEW.thread_id,'place_episode_revision',NEW.episode_id,NEW.revision,
          NEW.record_digest,NEW.recorded_at
        );
      END;
  `);
}
