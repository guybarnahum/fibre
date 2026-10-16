import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createEmbodimentTables } from "../src/embodiment-schema.mjs";
import { resolveSituatedReference } from "../src/situated-identity-grounding.mjs";

test("embodiment provenance remains Thread-owned across index installation and new admission",()=>{
  const db=new DatabaseSync(":memory:");
  try{
    db.exec(`
      CREATE TABLE threads(thread_id TEXT PRIMARY KEY) STRICT;
      CREATE TABLE thread_events(event_id TEXT PRIMARY KEY,thread_id TEXT NOT NULL) STRICT;
      INSERT INTO threads VALUES ('thr_embodied_a'),('thr_embodied_b');
    `);
    createEmbodimentTables(db);

    function record(threadId,id,source,permission){
      const data={embodimentId:id,sourceReferences:[source],permissionReferences:[permission]};
      db.prepare(`
        INSERT INTO embodiment_records(
          embodiment_id,revision,thread_id,kind,representation_kind,
          truth_status,rights_basis,visibility,status,recorded_at,
          supersedes_revision,specification_digest,asset_sha256,record_json,record_digest
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        id,1,threadId,"portrait","image","verified","authorized","private",
        "active","2026-10-15T00:00:00Z",null,"sha256:test",null,
        JSON.stringify(data),"sha256:test",
      );
    }

    record("thr_embodied_a","emb_portrait_a","source_photo_a","permission_grant");
    // A preexisting immutable embodiment must acquire the same references
    // when the indexed projection is first installed.
    db.exec(`
      DROP TRIGGER embodiment_references_on_insert;
      DROP TABLE embodiment_reference_index;
    `);
    createEmbodimentTables(db);

    for(const reference of ["emb_portrait_a","source_photo_a","permission_grant"]){
      assert.deepEqual(resolveSituatedReference(db,"thr_embodied_a",reference),
        {kind:"embodiment_revision",reference},
        "historical embodied provenance was lost");
    }
    assert.equal(resolveSituatedReference(db,"thr_embodied_b","source_photo_a"),null,
      "another Thread acquired historical embodiment evidence");

    record("thr_embodied_b","emb_portrait_b","source_photo_b","permission_grant");
    for(const reference of ["emb_portrait_b","source_photo_b","permission_grant"]){
      assert.deepEqual(resolveSituatedReference(db,"thr_embodied_b",reference),
        {kind:"embodiment_revision",reference},
        "new embodied provenance did not remain authoritative");
    }
    assert.equal(resolveSituatedReference(db,"thr_embodied_b","source_photo_a"),null,
      "new embodiment evidence crossed Thread identities");
  }finally{db.close();}
});
