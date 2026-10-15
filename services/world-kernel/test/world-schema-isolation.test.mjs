import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {localWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {installWorldSchemas} from "../src/world-schema-installation.mjs";
import {openLivedNowInspectionStore} from "../src/lived-now-store.mjs";

test("World schema installation does not initialize cognition or prompt assets",()=>{
  const root=fileURLToPath(new URL("../src/",import.meta.url));
  const entry=resolve(root,"world-schema-installation.mjs");
  const visited=new Set(),pending=[entry];
  while(pending.length>0){
    const path=pending.pop();
    if(visited.has(path))continue;
    visited.add(path);
    const source=readFileSync(path,"utf8");
    assert.doesNotMatch(source,/\bresolvePromptAsset\s*\(|\b(?:new URL)\s*\([^\n]*import\.meta\.url/u,
      "World schema installation reached prompt initialization: "+path.slice(root.length));
    // Resolve local static imports, including multi-line named imports.
    for(const match of source.matchAll(/\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/gsu)){
      const spec=match[1];
      if(spec.startsWith("./")||spec.startsWith("../")){
        const next=resolve(dirname(path),spec);
        if(next.startsWith(root))pending.push(next);
      }else if(spec.startsWith("#services/world-kernel/src/")){
        pending.push(resolve(root,spec.slice("#services/world-kernel/src/".length)));
      }else{
        assert.ok(!spec.includes("/reasoning/")&&!spec.includes("model-adapter"),
          "World schema installation reached cognitive integration: "+spec);
      }
    }
  }
});

test("deployment prepares an inspectable World without creating a Thread or running cognition",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-schema-"));
  try{
    const storage=localWorldStateStorage(join(directory,"world.sqlite"));
    installWorldSchemas(storage);
    const reader=openLivedNowInspectionStore({...storage,schemaReady:true});
    try{
      assert.deepEqual(reader.listCurrentSituations({
        at:"2026-10-15T00:00:00.000Z",livingOnly:true,
      }),[],"installing the World should not manufacture a living person");
    }finally{reader.close();}
  }finally{rmSync(directory,{recursive:true,force:true});}
});
