import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync,readFileSync} from "node:fs";

const sourceDir=new URL("../src/",import.meta.url);

test("World schema installation never renames tables",()=>{
  const files=readdirSync(sourceDir).filter(name=>
    name.endsWith("-schema.mjs")||name.includes("migration")&&name.endsWith(".mjs")
      ||name==="world-schema-installation.mjs");
  for(const name of files){
    const source=readFileSync(new URL(name,sourceDir),"utf8");
    assert.doesNotMatch(source,/\bALTER\s+TABLE\b[^;]*\bRENAME\b/iu,
      "World migration renames a table; Cloudflare re-parses every trigger (depth limit 100): "+name);
  }
});
