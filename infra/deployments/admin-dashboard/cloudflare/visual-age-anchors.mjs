import {createCloudflareInfraDriver} from "#infra/providers/cloudflare";
import {
  createAssetGenerationJobFromIdentity,
  verifyProvenancedAssetForPublication,
} from "#services/asset-generator/src/index.mjs";
import {createVisualAgeAnchorLifecycle} from "fibre/thread-presentation/visual-age-anchor-lifecycle";
import {resolveAdminWorldThreadIdentity} from "./thread-identity.mjs";

const PROFILE="openai-gpt-image-2-medium-v1";

function infraFor(env){
  return createCloudflareInfraDriver({
    objectBucket:env?.PRESENTATION_OBJECTS,
    catalogDatabase:env?.PRESENTATION_CATALOG,
    serviceBindings:env?.ASSET_GENERATOR?{asset_generator:env.ASSET_GENERATOR}:{},
    privateToken:env?.FIBRE_PRIVATE_TOKEN,
  });
}
function worldFetch(env){
  if(typeof env?.WORLD_KERNEL?.fetch!=="function")throw new Error("World service is unavailable");
  return (url,init)=>env.WORLD_KERNEL.fetch(new Request(url,{
    ...init,headers:{...init?.headers,"x-fibre-private-token":env.FIBRE_PRIVATE_TOKEN},
  }));
}
async function identitySource(env,infra,threadId){
  const world=await resolveAdminWorldThreadIdentity({threadId,fetchImpl:worldFetch(env)});
  if(!world)throw new Error("Thread does not exist in World");
  const portraits=world.embodiments.filter(e=>e.kind==="portrait"&&e.status==="available"
    &&e.visibility==="public"&&typeof e.asset?.referenceObjectRef==="string");
  if(!portraits.length)throw new Error("Thread has no admitted canonical portrait");
  const portrait=portraits.sort((a,b)=>(b.revision??0)-(a.revision??0))[0];
  const objectRef=portrait.asset.referenceObjectRef;
  const stored=await infra.objects.head(objectRef);
  if(!stored || stored.digest!==portrait.asset.sha256)throw new Error("Canonical image is unavailable or changed");
  return Object.freeze({threadId,objectRef,digest:stored.digest,
    originRefs:[portrait.embodimentId,portrait.provenanceRef].filter(Boolean)});
}

/** Admin supplies deployed ports and the operator's current World-owned visual root. */
export function createAdminVisualAgeAnchors({
  env,infra=infraFor(env),source=null,verify=verifyProvenancedAssetForPublication,
}={}){
  const readSource=threadId=>source===null?identitySource(env,infra,threadId):source(threadId);
  return createVisualAgeAnchorLifecycle({
    infra,readSource,verify,
    createJob:createAssetGenerationJobFromIdentity,
    providerProfile:PROFILE,expectedProvider:"openai",
  });
}
