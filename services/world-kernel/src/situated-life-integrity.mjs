import { canonicalJson, sha256, IntegrityError } from "./persistence-common.mjs";

export function situatedRecordDigest(kind, record) {
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}

function hasColumn(database, table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

export function ensureSituatedLifeDigestColumns(database) {
  database.exec(`
    DROP TRIGGER IF EXISTS life_relations_no_update;
    DROP TRIGGER IF EXISTS place_episodes_no_update;
  `);
  try {
    for (const table of ["life_relation_records", "place_episode_records"]) {
      if (!hasColumn(database, table, "record_digest")) {
        database.exec(`ALTER TABLE ${table} ADD COLUMN record_digest TEXT`);
      }
    }

    const relationRows = database.prepare("SELECT relation_id,revision,record_json,record_digest FROM life_relation_records").all();
    const updateRelation = database.prepare("UPDATE life_relation_records SET record_digest=? WHERE relation_id=? AND revision=?");
    for (const row of relationRows) {
      const expected = situatedRecordDigest("life_relation", JSON.parse(row.record_json));
      if (row.record_digest === null) updateRelation.run(expected, row.relation_id, row.revision);
      else if (row.record_digest !== expected) throw new IntegrityError(`life relation ${row.relation_id} digest mismatch`);
    }

    const placeRows = database.prepare("SELECT episode_id,revision,record_json,record_digest FROM place_episode_records").all();
    const updatePlace = database.prepare("UPDATE place_episode_records SET record_digest=? WHERE episode_id=? AND revision=?");
    for (const row of placeRows) {
      const expected = situatedRecordDigest("place_episode", JSON.parse(row.record_json));
      if (row.record_digest === null) updatePlace.run(expected, row.episode_id, row.revision);
      else if (row.record_digest !== expected) throw new IntegrityError(`place episode ${row.episode_id} digest mismatch`);
    }
  } finally {
    database.exec(`
      CREATE TRIGGER IF NOT EXISTS life_relations_no_update
        BEFORE UPDATE ON life_relation_records
        BEGIN SELECT RAISE(ABORT,'life_relation_records is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS place_episodes_no_update
        BEFORE UPDATE ON place_episode_records
        BEGIN SELECT RAISE(ABORT,'place_episode_records is append-only'); END;
    `);
  }
}
