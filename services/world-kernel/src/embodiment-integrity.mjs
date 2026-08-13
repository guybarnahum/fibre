import { canonicalJson, IntegrityError, sha256 } from "./persistence-common.mjs";

export function embodimentContentDigest(record) {
  return `sha256:${sha256(canonicalJson({ kind: "embodiment_representation", record }))}`;
}

export function embodimentHeadDigest(record, previousHeadDigest = null) {
  return `sha256:${sha256(canonicalJson({
    kind: "embodiment_representation_lineage",
    previousHeadDigest,
    recordDigest: embodimentContentDigest(record),
  }))}`;
}

export function ensureEmbodimentIntegrity(database) {
  const ids = database.prepare("SELECT DISTINCT embodiment_id FROM embodiment_records ORDER BY embodiment_id").all();
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
    let previousHeadDigest = null;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (Number(row.revision) !== index + 1) {
        throw new IntegrityError(`embodiment ${embodimentId} has non-contiguous revisions`);
      }
      const record = JSON.parse(row.record_json);
      const contentDigest = embodimentContentDigest(record);
      if (row.record_digest !== contentDigest) {
        throw new IntegrityError(`embodiment ${embodimentId} content digest mismatch at revision ${row.revision}`);
      }
      const headDigest = embodimentHeadDigest(record, previousHeadDigest);
      if (heads.length === 0) {
        insertHead.run(embodimentId, row.revision, row.thread_id, headDigest, row.recorded_at);
      } else {
        const head = heads[index];
        if (
          Number(head.revision) !== index + 1 ||
          head.thread_id !== row.thread_id ||
          head.head_digest !== headDigest ||
          head.recorded_at !== row.recorded_at
        ) {
          throw new IntegrityError(`embodiment ${embodimentId} head mismatch at revision ${row.revision}`);
        }
      }
      previousHeadDigest = headDigest;
    }
  }
}
