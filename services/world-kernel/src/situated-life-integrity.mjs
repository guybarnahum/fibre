import { canonicalJson, sha256 } from "./persistence-common.mjs";

export function situatedRecordDigest(kind, record) {
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}

export function ensureSituatedLifeDigestColumns(database) {
  for (const table of ["life_relation_records", "place_episode_records"]) {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
    if (!columns.includes("record_digest")) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN record_digest TEXT`);
    }
  }

  const relationRows = database.prepare("SELECT relation_id,revision,record_json,record_digest FROM life_relation_records").all();
  const updateRelation = database.prepare("UPDATE life_relation_records SET record_digest=? WHERE relation_id=? AND revision=?");
  for (const row of relationRows) {
    const expected = situatedRecordDigest("life_relation", JSON.parse(row.record_json));
    if (row.record_digest === null) updateRelation.run(expected, row.relation_id, row.revision);
    else if (row.record_digest !== expected) throw new Error(`life relation ${row.relation_id} digest mismatch`);
  }

  const placeRows = database.prepare("SELECT episode_id,revision,record_json,record_digest FROM place_episode_records").all();
  const updatePlace = database.prepare("UPDATE place_episode_records SET record_digest=? WHERE episode_id=? AND revision=?");
  for (const row of placeRows) {
    const expected = situatedRecordDigest("place_episode", JSON.parse(row.record_json));
    if (row.record_digest === null) updatePlace.run(expected, row.episode_id, row.revision);
    else if (row.record_digest !== expected) throw new Error(`place episode ${row.episode_id} digest mismatch`);
  }
}
