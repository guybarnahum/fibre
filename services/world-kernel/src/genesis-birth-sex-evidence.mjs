import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";
import { assertId, canonicalJson, sha256 } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function tableExists(database, tableName) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) !== undefined;
}

export class GenesisBirthSexEvidence {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"GenesisBirthSexEvidence" });
  }

  close() { this.#database.close(); }

  listMigrationThreadIds() {
    if (!tableExists(this.#database, "genesis_birth_publications")
      || !tableExists(this.#database, "threads")) return Object.freeze([]);
    const rows=this.#database.prepare(`
      SELECT g.thread_id,g.result_json,t.state_json
      FROM genesis_birth_publications g
      JOIN threads t ON t.thread_id=g.thread_id
      ORDER BY g.thread_id
    `).all();
    return Object.freeze(rows.flatMap((row)=>{
      let result;
      let state;
      try {
        result=JSON.parse(row.result_json);
        state=JSON.parse(row.state_json);
      } catch {
        return [];
      }
      return state?.identity?.sex===undefined && result?.thread?.identity?.sex!==undefined
        ? [row.thread_id]
        : [];
    }));
  }

  resolve(threadId) {
    assertId("threadId", threadId);
    if (!tableExists(this.#database, "genesis_birth_publications")) return null;
    const row = this.#database.prepare(`
      SELECT genesis_id,result_json
      FROM genesis_birth_publications
      WHERE thread_id=?
      LIMIT 1
    `).get(threadId);
    if (row === undefined) return null;

    let result;
    try { result = JSON.parse(row.result_json); }
    catch { throw new Error(`Genesis birth publication ${row.genesis_id} contains invalid JSON`); }
    if (canonicalJson(result) !== row.result_json) {
      throw new Error(`Genesis birth publication ${row.genesis_id} failed canonical verification`);
    }
    if (result?.thread?.threadId !== threadId) {
      throw new Error(`Genesis birth publication ${row.genesis_id} belongs to a different Thread`);
    }
    if (result?.thread?.identity?.sex === undefined) return null;
    const sex = normalizeGenesisSex(result.thread.identity.sex);
    return Object.freeze({
      sex,
      genesisId:row.genesis_id,
      source:"genesis_birth_publication",
      resultDigest:`sha256:${sha256(row.result_json)}`,
    });
  }
}
