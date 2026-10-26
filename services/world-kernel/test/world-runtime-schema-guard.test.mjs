import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {installedWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {openWorldStateDatabase} from "../src/world-state-storage.mjs";
import {RuntimeSchemaAccessError} from "../../../infra/runtime-schema-guard.mjs";

test("a deployed World rejects schema inspection and mutation, not lived facts",()=>{
  const dir=mkdtempSync(join(tmpdir(),"fibre-runtime-schema-"));
  try{
    const storage=installedWorldStateStorage(join(dir,"world.sqlite"));
    const database=openWorldStateDatabase(storage,{storeName:"RuntimeSchemaGuardTest"});
    try{
      assert.equal(database.prepare("SELECT COUNT(*) AS n FROM threads").get().n,0);
      for(const sql of [
        "SELECT name FROM sqlite_master",
        "SELECT name FROM sqlite_schema",
        "CREATE TABLE should_not_exist (id INTEGER)",
        "ALTER TABLE threads ADD COLUMN should_not_exist TEXT",
        "DROP TABLE threads",
        "PRAGMA table_info(threads)",
      ]){
        assert.throws(()=>database.prepare(sql),RuntimeSchemaAccessError,
          "a deployed World could inspect or alter schema");
      }
      assert.throws(()=>database.exec("CREATE TABLE should_not_exist(id INTEGER)"),
        RuntimeSchemaAccessError,"runtime DDL escaped exec guard");
      assert.equal(typeof database.prepare("PRAGMA user_version").get().user_version,
        "number","read-only user_version exception was lost");
    }finally{database.close();}
  }finally{rmSync(dir,{recursive:true,force:true});}
});
