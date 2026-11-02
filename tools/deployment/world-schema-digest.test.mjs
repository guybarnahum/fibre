import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,mkdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {readWorldSchemaDigest} from "./world-schema-digest.mjs";

test("World schema fingerprint changes with DDL but not unrelated logic",async()=>{
  const repoRoot=await mkdtemp(join(tmpdir(),"fibre-schema-digest-"));
  const dir=join(repoRoot,"services/world-kernel/src");
  try{
    await mkdir(dir,{recursive:true});
    await writeFile(join(dir,"world-schema-installation.mjs"),"export const witness = 1;");
    await writeFile(join(dir,"my-store.mjs"),"const ddl=`CREATE TABLE records(id TEXT PRIMARY KEY)`;");
    await writeFile(join(dir,"runtime.mjs"),"export function tick(){return 1}");
    const first=await readWorldSchemaDigest({repoRoot});
    await writeFile(join(dir,"runtime.mjs"),"export function tick(){return 2}");
    assert.equal(await readWorldSchemaDigest({repoRoot}),first,
      "runtime-only change forced schema installation");
    await writeFile(join(dir,"my-store.mjs"),"const ddl=`CREATE TABLE records(id TEXT PRIMARY KEY, value TEXT)`;");
    assert.notEqual(await readWorldSchemaDigest({repoRoot}),first,
      "schema DDL change was not reflected in schema stamp");
  }finally{await rm(repoRoot,{recursive:true,force:true});}
});
