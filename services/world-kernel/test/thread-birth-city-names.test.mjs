import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {localWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {readThreadBirthCityNames} from "../src/thread-directory-store.mjs";

test("birth-city names use only Thread identity, never directory locations",t=>{
  const dir=mkdtempSync(join(tmpdir(),"fibre-birth-name-read-"));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,"world.sqlite");
  const db=new DatabaseSync(file);
  // Only a Thread identity table exists. Any location or other-table read fails.
  db.exec("CREATE TABLE threads (thread_id TEXT PRIMARY KEY,state_json TEXT NOT NULL)");
  const write=db.prepare("INSERT INTO threads(thread_id,state_json) VALUES (?,?)");
  for(const [id,name,city] of [
    ["t1","Joanna Lewandowski","London, United Kingdom"],
    ["t2","Aaron Kelly","Manchester, United Kingdom"],
    ["t3","Oliver Jones","London, United Kingdom"],
  ]){
    write.run(id,JSON.stringify({identity:{name,birthCity:city}}));
  }
  db.close();
  const names=readThreadBirthCityNames(
    localWorldStateStorage(file),"London, United Kingdom");
  assert.deepEqual(names,["Joanna Lewandowski","Oliver Jones"],
    "World birth-city name seed read another city's identity or location");
  assert.deepEqual(readThreadBirthCityNames(
    localWorldStateStorage(file),"London, United Kingdom - other"),[]);
});
