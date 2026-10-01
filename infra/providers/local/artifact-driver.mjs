import {mkdir,readFile,readdir,rm,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {
  INFRA_DRIVER_VERSION,
  InfraImmutableObjectConflictError,
  assertInfraDriver,
} from "../../infra-driver.mjs";
import {
  assertInfraFiniteNumber,
  assertInfraId,
  assertInfraJsonValue,
  assertInfraNonEmpty,
  assertInfraPlainObject,
  infraCanonicalJson,
} from "../../internal.mjs";

function rootPath(root){
  if(typeof root!=="string"||root.trim()==="")throw new TypeError("local artifact root is required");
  return resolve(root);
}

function encoded(value){
  assertInfraId("infra key",value);
  return encodeURIComponent(value);
}

function bytesOf(value){
  if(typeof value==="string")return new TextEncoder().encode(value);
  if(value instanceof Uint8Array)return value.slice();
  if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));
  if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength));
  throw new TypeError("object bytes must be string, Uint8Array, ArrayBuffer, or ArrayBufferView");
}

function sameBytes(left,right){
  if(left.length!==right.length)return false;
  for(let i=0;i<left.length;i+=1)if(left[i]!==right[i])return false;
  return true;
}

function listOptions({prefix="",after=null,limit=100}={}){
  if(typeof prefix!=="string")throw new TypeError("catalog list prefix must be a string");
  if(after!==null)assertInfraId("catalog list after",after);
  assertInfraFiniteNumber("catalog list limit",limit,{integer:true,minimum:1});
  if(limit>1000)throw new TypeError("catalog list limit must be <= 1000");
  return{prefix,after,limit};
}

async function jsonOrNull(path){
  try{return JSON.parse(await readFile(path,"utf8"))}
  catch(error){
    if(error?.code==="ENOENT")return null;
    throw error;
  }
}

export function createLocalArtifactInfraDriver({root}={}){
  const base=rootPath(root);
  const objectsDir=resolve(base,"objects");
  const catalogDir=resolve(base,"catalog");
  const objectBytesPath=ref=>resolve(objectsDir,`${encoded(ref)}.bin`);
  const objectMetaPath=ref=>resolve(objectsDir,`${encoded(ref)}.json`);
  const catalogPath=key=>resolve(catalogDir,`${encoded(key)}.json`);

  const objects=Object.freeze({
    async putImmutable(objectRef,bytes,digest,metadata={}){
      assertInfraId("objectRef",objectRef);
      assertInfraNonEmpty("digest",digest);
      assertInfraPlainObject("metadata",metadata);
      assertInfraJsonValue("metadata",metadata);
      const next=bytesOf(bytes);
      await mkdir(objectsDir,{recursive:true});
      const priorMeta=await jsonOrNull(objectMetaPath(objectRef));
      if(priorMeta!==null){
        const prior=bytesOf(await readFile(objectBytesPath(objectRef)));
        if(priorMeta.digest!==digest
          ||infraCanonicalJson(priorMeta.metadata)!==infraCanonicalJson(metadata)
          ||!sameBytes(prior,next)){
          throw new InfraImmutableObjectConflictError(`immutable object ${objectRef} already exists with different content`);
        }
        return{objectRef,digest,duplicate:true};
      }
      await writeFile(objectBytesPath(objectRef),next,{flag:"wx"});
      try{
        await writeFile(objectMetaPath(objectRef),JSON.stringify({digest,metadata}),{flag:"wx"});
      }catch(error){
        await rm(objectBytesPath(objectRef),{force:true});
        throw error;
      }
      return{objectRef,digest,duplicate:false};
    },
    async get(objectRef){
      assertInfraId("objectRef",objectRef);
      const meta=await jsonOrNull(objectMetaPath(objectRef));
      if(meta===null)return null;
      return{
        bytes:bytesOf(await readFile(objectBytesPath(objectRef))),
        digest:meta.digest,
        metadata:structuredClone(meta.metadata),
      };
    },
    async head(objectRef){
      assertInfraId("objectRef",objectRef);
      const meta=await jsonOrNull(objectMetaPath(objectRef));
      return meta===null?null:{
        objectRef,
        digest:meta.digest,
        metadata:structuredClone(meta.metadata),
      };
    },
    async remove(objectRef){
      assertInfraId("objectRef",objectRef);
      const present=await jsonOrNull(objectMetaPath(objectRef));
      if(present===null)return false;
      await Promise.all([
        rm(objectBytesPath(objectRef),{force:true}),
        rm(objectMetaPath(objectRef),{force:true}),
      ]);
      return true;
    },
  });

  const readCatalog=async key=>{
    const value=await jsonOrNull(catalogPath(key));
    return value===null?null:structuredClone(value);
  };

  const catalog=Object.freeze({
    async upsert(key,value){
      assertInfraId("catalog key",key);
      assertInfraPlainObject("catalog value",value);
      assertInfraJsonValue("catalog value",value);
      await mkdir(catalogDir,{recursive:true});
      await writeFile(catalogPath(key),infraCanonicalJson(value));
      return structuredClone(value);
    },
    async get(key){
      assertInfraId("catalog key",key);
      return readCatalog(key);
    },
    async remove(key){
      assertInfraId("catalog key",key);
      try{await rm(catalogPath(key));return true}
      catch(error){if(error?.code==="ENOENT")return false;throw error}
    },
    async list(options={}){
      const{prefix,after,limit}=listOptions(options);
      let names=[];
      try{names=await readdir(catalogDir)}
      catch(error){if(error?.code!=="ENOENT")throw error}
      const keys=names
        .filter(name=>name.endsWith(".json"))
        .map(name=>decodeURIComponent(name.slice(0,-5)))
        .filter(key=>key.startsWith(prefix)&&(after===null||key>after))
        .sort();
      const selected=keys.slice(0,limit);
      return{
        entries:await Promise.all(selected.map(async key=>({key,value:await readCatalog(key)}))),
        nextCursor:keys.length>limit?selected.at(-1):null,
      };
    },
  });

  return Object.freeze(assertInfraDriver({
    driverId:"local-artifacts-v1",
    driverVersion:INFRA_DRIVER_VERSION,
    capabilities:["objects","catalog"],
    objects,
    catalog,
  }));
}
