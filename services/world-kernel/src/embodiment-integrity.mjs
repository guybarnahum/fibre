import { canonicalJson, IntegrityError, sha256 } from "./persistence-common.mjs";

export function embodimentRecordDigest(record, previousDigest = null) {
  return `sha256:${sha256(canonicalJson({ kind: "embodiment_representation", previousDigest, record }))}`;
}

function legacyEmbodimentRecordDigest(record) {
  return `sha256:${sha256(canonicalJson({ kind: "embodiment_representation", record }))}`;
}

export function ensureEmbodimentIntegrity(database) {
  database.exec("DROP TRIGGER IF EXISTS embodiment_no_update;");
  try {
    const ids = database.prepare("SELECT DISTINCT embodiment_id FROM embodiment_records ORDER BY embodiment_id").all();
    const updateDigest = database.prepare(
      "UPDATE embodiment_records SET record_digest=? WHERE embodiment_id=? AND revision=?",
    );
    const insertHead = database.prepare(`
      INSERT INTO embodiment_lineage_heads(embodiment_id,revision,thread_id,head_digest,recorded_at)
      VALUES (?,?,?,?,?)
    `);
    for (const { embodiment_id: embodimentId } of ids) {
      const rows = database.prepare(`
        SELECT revision,thread_id,recorded_at,record_json,record_digest
        FROM embodiment_records WHERE embodiment_id=? ORDER BY revision
      `).all(embodimentId);
      const heads = database.prepare(`
        SELECT revision,thread_id,head_digest,recorded_at
        FROM embodiment_lineage_heads WHERE embodiment_id=? ORDER BY revision
      `).all(embodimentId);
      if (heads.length !== 0 && heads.length !== rows.length) {
        throw new IntegrityError(`embodiment ${embodimentId} head chain length mismatch`);
      }
      let previousDigest = null;
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (Number(row.revision) !== index + 1) throw new IntegrityError(`embodiment ${embodimentId} has non-contiguous revisions`);
        const record = JSON.parse(row.record_json);
        const chained = embodimentRecordDigest(record, previousDigest);
        if (heads.length === 0) {
          const legacy = legacyEmbodimentRecordDigest(record);
          if (row.record_digest !== legacy && row.record_digest !== chained) {
            throw new IntegrityError(`embodiment ${embodimentId} digest mismatch before chain upgrade`);
          }
          if (row.record_digest !== chained) updateDigest.run(chained, embodimentId, row.revision);
          insertHead.run(embodimentId, row.revision, row.thread_id, chained, row.recorded_at);
        } else {
          const head = heads[index];
          if (
            row.record_digest !== chained ||
            Number(head.revision) !== index + 1 ||
            head.thread_id !== row.thread_id ||
            head.head_digest !== chained ||
            head.recorded_at !== row.recorded_at
          ) {
            throw new IntegrityError(`embodiment ${embodimentId} head mismatch at revision ${row.revision}`);
          }
        }
        previousDigest = chained;
      }
    }
  } finally {
    database.exec(`
      CREATE TRIGGER IF NOT EXISTS embodiment_no_update
        BEFORE UPDATE ON embodiment_records
        BEGIN SELECT RAISE(ABORT,'embodiment_records is append-only'); END;
    `);
  }
}
