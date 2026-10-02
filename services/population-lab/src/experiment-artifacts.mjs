import {requireInfraCapabilities} from "#infra";

const PREFIX="population-lab:experiment:";

function id(value){
  if(typeof value!=="string"||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)){
    throw new TypeError("experimentId must be a Fibre identifier");
  }
  return value;
}

async function digest(bytes){
  const hashed=await crypto.subtle.digest("SHA-256",bytes);
  return `sha256:${Array.from(new Uint8Array(hashed),byte=>byte.toString(16).padStart(2,"0")).join("")}`;
}

function jsonBytes(value){
  return JSON.stringify(value,null,2);
}

export function populationLabExperimentRef(experimentId,kind){
  const experiment=id(experimentId);
  if(typeof kind!=="string"||kind.trim()==="")throw new TypeError("experiment artifact kind is required");
  return `${PREFIX}${experiment}:${kind}`;
}

export function populationLabExperimentCatalogKey(experimentId){
  return `${PREFIX}${id(experimentId)}`;
}

export function createPopulationLabExperimentStore(infra){
  requireInfraCapabilities(infra,"objects","catalog");

  const put=async(experimentId,kind,bytes,metadata={})=>{
    const objectRef=populationLabExperimentRef(experimentId,kind);
    const value=typeof bytes==="string"
      ? new TextEncoder().encode(bytes)
      : bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes);
    const objectDigest=await digest(value);
    const write=await infra.objects.putImmutable(objectRef,value,objectDigest,{
      experimentId:id(experimentId),
      kind,
      ...metadata,
    });
    return Object.freeze({
      artifact:Object.freeze({objectRef,digest:objectDigest}),
      created:write?.duplicate!==true,
    });
  };

  const update=async(experimentId,patch)=>{
    const key=populationLabExperimentCatalogKey(experimentId);
    const current=await infra.catalog.get(key)??{
      contract:"fibre-population-lab-experiment-v0.1",
      experimentId:id(experimentId),
      status:"prepared",
      artifacts:{},
    };
    const next=Object.freeze({
      ...current,
      ...patch,
      artifacts:Object.freeze({...current.artifacts,...patch.artifacts}),
    });
    await infra.catalog.upsert(key,next);
    return next;
  };

  const indexArtifact=async(experimentId,write,patch)=>{
    try{
      await update(experimentId,patch);
      return write.artifact;
    }catch(error){
      if(write.created&&typeof infra.objects.remove==="function"){
        await infra.objects.remove(write.artifact.objectRef).catch(()=>{});
      }
      throw error;
    }
  };

  const updateVisual=async(experimentId,patch)=>{
    const key=populationLabExperimentCatalogKey(experimentId);
    const current=await infra.catalog.get(key);
    if(current===null)throw new Error("experiment not found");
    return update(experimentId,{
      visual:Object.freeze({...current.visual,...patch}),
    });
  };

  return Object.freeze({
    async queue(experimentId,manifest){
      const write=await put(experimentId,"manifest",jsonBytes(manifest),{mediaType:"application/json"});
      try{
        return await update(experimentId,{
          status:"queued",
          requestedAt:manifest.requestedAt??new Date().toISOString(),
          artifacts:{manifest:write.artifact},
        });
      }catch(error){
        if(write.created&&typeof infra.objects.remove==="function"){
          await infra.objects.remove(write.artifact.objectRef).catch(()=>{});
        }
        throw error;
      }
    },
    async running(experimentId,{startedAt=new Date().toISOString()}={}){
      const key=populationLabExperimentCatalogKey(experimentId);
      if(await infra.catalog.get(key)===null)throw new Error("experiment must be queued before running");
      return update(experimentId,{status:"running",startedAt});
    },
    async start(experimentId,manifest){
      const write=await put(experimentId,"manifest",jsonBytes(manifest),{mediaType:"application/json"});
      try{
        return await update(experimentId,{
          status:"running",
          startedAt:manifest.startedAt??new Date().toISOString(),
          artifacts:{manifest:write.artifact},
        });
      }catch(error){
        if(write.created&&typeof infra.objects.remove==="function"){
          await infra.objects.remove(write.artifact.objectRef).catch(()=>{});
        }
        throw error;
      }
    },
    async putPopulation(experimentId,population){
      const write=await put(experimentId,"population",jsonBytes(population),{mediaType:"application/json"});
      return indexArtifact(experimentId,write,{artifacts:{population:write.artifact}});
    },
    async putResult(experimentId,result){
      const write=await put(experimentId,"result",jsonBytes(result),{mediaType:"application/json"});
      return indexArtifact(experimentId,write,{artifacts:{result:write.artifact}});
    },
    async putReport(experimentId,html){
      const write=await put(experimentId,"report",html,{mediaType:"text/html; charset=utf-8"});
      return indexArtifact(experimentId,write,{artifacts:{report:write.artifact}});
    },
    async putImage(experimentId,{ordinal,role,bytes,mediaType="image/png"}){
      if(!Number.isInteger(ordinal)||ordinal<1)throw new TypeError("image ordinal must be a positive integer");
      if(!["geometry","portrait"].includes(role))throw new TypeError("image role must be geometry or portrait");
      const key=`image:${String(ordinal).padStart(3,"0")}:${role}`;
      const write=await put(experimentId,key,bytes,{mediaType,ordinal,role});
      const current=await infra.catalog.get(populationLabExperimentCatalogKey(experimentId));
      const images=(Array.isArray(current?.images)?current.images:[])
        .filter(image=>image?.objectRef!==write.artifact.objectRef);
      return indexArtifact(experimentId,write,{images:Object.freeze([
        ...images,
        Object.freeze({...write.artifact,ordinal,role,mediaType}),
      ])});
    },
    async queueVisual(experimentId,request){
      const key=populationLabExperimentCatalogKey(experimentId);
      const current=await infra.catalog.get(key);
      if(current===null)throw new Error("experiment not found");
      if(current.status!=="completed")throw new TypeError("visual calibration requires a completed experiment");
      if(current.visual!==undefined&&current.visual!==null){
        throw new TypeError("visual calibration already has an attempt for this experiment");
      }
      const write=await put(experimentId,"visual:manifest",jsonBytes(request),{mediaType:"application/json"});
      try{
        return await update(experimentId,{
          artifacts:{visualManifest:write.artifact},
          visual:Object.freeze({
            status:"queued",
            requestedAt:request.requestedAt??new Date().toISOString(),
            sampleSize:request.sampleSize??null,
            error:null,
          }),
        });
      }catch(error){
        if(write.created&&typeof infra.objects.remove==="function"){
          await infra.objects.remove(write.artifact.objectRef).catch(()=>{});
        }
        throw error;
      }
    },
    async runningVisual(experimentId,{startedAt=new Date().toISOString()}={}){
      return updateVisual(experimentId,{status:"running",startedAt,error:null});
    },
    async adoptImage(experimentId,{ordinal,role,objectRef,digest:expectedDigest,mediaType="image/png"}){
      if(!Number.isInteger(ordinal)||ordinal<1)throw new TypeError("image ordinal must be a positive integer");
      if(!["geometry","portrait"].includes(role))throw new TypeError("image role must be geometry or portrait");
      const expectedRef=populationLabExperimentRef(experimentId,`image:${String(ordinal).padStart(3,"0")}:${role}`);
      if(objectRef!==expectedRef)throw new TypeError("generated image objectRef does not match experiment artifact identity");
      const stored=await infra.objects.get(objectRef);
      if(stored===null)throw new Error("generated image artifact is missing");
      if(typeof expectedDigest==="string"&&stored.digest!==expectedDigest){
        throw new Error("generated image digest does not match stored artifact");
      }
      const artifact=Object.freeze({objectRef,digest:stored.digest});
      const current=await infra.catalog.get(populationLabExperimentCatalogKey(experimentId));
      const images=(Array.isArray(current?.images)?current.images:[])
        .filter(image=>image?.objectRef!==objectRef);
      await update(experimentId,{images:Object.freeze([
        ...images,
        Object.freeze({...artifact,ordinal,role,mediaType}),
      ])});
      return artifact;
    },
    async adoptArtifact(experimentId,{key,objectRef,digest:expectedDigest}){
      if(typeof key!=="string"||key.trim()==="")throw new TypeError("artifact key is required");
      const prefix=populationLabExperimentCatalogKey(experimentId)+":";
      if(!objectRef?.startsWith(prefix))throw new TypeError("adopted artifact must belong to the experiment namespace");
      const stored=await infra.objects.get(objectRef);
      if(stored===null)throw new Error("generated experiment artifact is missing");
      if(typeof expectedDigest==="string"&&stored.digest!==expectedDigest){
        throw new Error("generated experiment artifact digest does not match stored bytes");
      }
      const artifact=Object.freeze({objectRef,digest:stored.digest});
      await update(experimentId,{artifacts:{[key]:artifact}});
      return artifact;
    },
    async putVisualReport(experimentId,html){
      const write=await put(experimentId,"report:visual",html,{mediaType:"text/html; charset=utf-8"});
      return indexArtifact(experimentId,write,{artifacts:{visualReport:write.artifact}});
    },
    async completeVisual(experimentId,summary={}){
      return updateVisual(experimentId,{
        status:"completed",
        completedAt:new Date().toISOString(),
        summary:Object.freeze({...summary}),
        error:null,
      });
    },
    async failVisual(experimentId,error){
      return updateVisual(experimentId,{
        status:"failed",
        completedAt:new Date().toISOString(),
        error:{name:error?.name??"Error",message:error?.message??String(error)},
      });
    },
    async complete(experimentId,summary={}){
      return update(experimentId,{status:"completed",completedAt:new Date().toISOString(),summary});
    },
    async fail(experimentId,error){
      return update(experimentId,{
        status:"failed",
        completedAt:new Date().toISOString(),
        error:{name:error?.name??"Error",message:error?.message??String(error)},
      });
    },
    async get(experimentId){
      return infra.catalog.get(populationLabExperimentCatalogKey(experimentId));
    },
    async delete(experimentId){
      if(typeof infra.objects.remove!=="function")throw new Error("InfraDriver objects.remove is required to delete experiment artifacts");
      const key=populationLabExperimentCatalogKey(experimentId);
      const current=await infra.catalog.get(key);
      if(current===null)return Object.freeze({experimentId:id(experimentId),deleted:false,artifactCount:0});
      if(["queued","running"].includes(current.status)||["queued","running"].includes(current.visual?.status)){
        throw new TypeError("queued or running experiment cannot be deleted");
      }
      const refs=new Set([
        ...Object.values(current.artifacts??{}).map(value=>value?.objectRef),
        ...(current.images??[]).map(value=>value?.objectRef),
      ].filter(Boolean));
      let artifactCount=0;
      for(const objectRef of refs)if(await infra.objects.remove(objectRef))artifactCount+=1;
      await infra.catalog.remove(key);
      return Object.freeze({experimentId:id(experimentId),deleted:true,artifactCount});
    },
    async list({after=null,limit=100}={}){
      const page=await infra.catalog.list({prefix:PREFIX,after,limit});
      return{experiments:page.entries.map(entry=>entry.value),nextCursor:page.nextCursor};
    },
    async getArtifact(objectRef){
      return infra.objects.get(objectRef);
    },
  });
}
