import {createHash} from "node:crypto";
import {readdir,readFile} from "node:fs/promises";
import {join,relative,resolve} from "node:path";

// Conservative digest of the authoritative World schema definitions and their
// installation path. Runtime-only source changes elsewhere do not force the
// expensive install; changes to a schema-bearing module always do.
const SCHEMA_SQL=/\b(?:CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TRIGGER|VIEW)|ALTER\s+TABLE|DROP\s+(?:TABLE|INDEX|TRIGGER|VIEW))\b/iu;
const DEFINITIONS=["services/world-kernel/src"];
const INSTALLER="services/world-kernel/src/world-schema-installation.mjs";

async function filesUnder(dir){
  const files=[];
  for(const item of await readdir(dir,{withFileTypes:true})){
    const file=join(dir,item.name);
    if(item.isDirectory())files.push(...await filesUnder(file));
    else if(item.isFile()&&item.name.endsWith(".mjs"))files.push(file);
  }
  return files;
}

export async function readWorldSchemaDigest({repoRoot}={}){
  const root=resolve(repoRoot);
  const files=(await Promise.all(DEFINITIONS.map(p=>filesUnder(join(root,p)))))
    .flat().sort();
  const hash=createHash("sha256");
  let counted=0;
  for(const file of files){
    const content=await readFile(file,"utf8");
    const path=relative(root,file).replaceAll("\\","/");
    if(path!==INSTALLER&&!SCHEMA_SQL.test(content))continue;
    hash.update(path+"\0"+content+"\0");
    counted++;
  }
  if(counted===0)throw new Error("World schema digest has no schema definitions");
  return hash.digest("hex");
}
