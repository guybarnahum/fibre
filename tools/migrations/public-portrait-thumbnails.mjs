import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));

function options(argv){
  let environment=null,apply=false;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")environment=argv[++i]??null;
    else if(argv[i]==="--apply")apply=true;
    else throw new TypeError("Unknown option "+argv[i]);
  }
  if(!["staging","production"].includes(environment))
    throw new TypeError("Use --env staging|production [--apply]");
  return {environment,apply};
}

export async function backfillPortraitThumbnails({
  environment,apply=false,fetchImpl=fetch,log=console.log,
}={}){
  const deployed=JSON.parse(readFileSync(resolve(ROOT,
    ".fibre/cloudflare",environment,"deployment.json"),"utf8"));
  const base=deployed.deployments.find(d=>d.serviceId==="thread-presentation")?.baseUrl;
  if(deployed.environment!==environment||!base)throw new Error("Missing Presentation deployment");
  const response=await fetchImpl(new URL("/api/threads/search?limit=200",base));
  if(!response.ok)throw new Error("Public directory HTTP "+response.status);
  const directory=await response.json();
  if(directory.threads?.length===200)throw new Error("Directory exceeds bounded backfill; paginate first");
  if(directory.threads?.length&&!Object.hasOwn(directory.threads[0],"portraitThumbnailObjectRef"))
    throw new Error("Deploy updated Presentation before thumbnail backfill");
  const missing=(directory.threads??[]).filter(t=>!t.portraitThumbnailObjectRef);
  const summary={environment,mode:apply?"apply":"preview",candidates:missing.length,
    published:0,notReady:0};
  log(JSON.stringify(summary,null,2));
  if(!apply)return summary;
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN required");
  for(const thread of missing){
    const published=await fetchImpl(new URL("/internal/visual-publication/reconcile",base),{
      method:"POST",
      headers:{"content-type":"application/json","x-fibre-private-token":token},
      body:JSON.stringify({threadId:thread.threadId,thumbnailOnly:true}),
    });
    const result=await published.json().catch(()=>null);
    if(!published.ok||result?.ok!==true)
      throw new Error("Thumbnail "+thread.threadId+": HTTP "+published.status+" "+JSON.stringify(result));
    if(result.result?.complete!==true){
      summary.notReady+=1;
      log("SKIP "+thread.threadId+": "+(result.result?.detail?.reason??result.result?.stage));
      continue;
    }
    const ref=result.result.detail.portraitThumbnailObjectRef;
    const asset=await fetchImpl(new URL("/api/assets/"+encodeURIComponent(ref),base));
    if(!asset.ok||!asset.headers.get("content-type")?.startsWith("image/webp"))
      throw new Error("Thumbnail was not publicly deliverable for "+thread.threadId);
    summary.published+=1;
    log("READY "+thread.threadId+" "+ref);
  }
  log(JSON.stringify(summary,null,2));
  return summary;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  backfillPortraitThumbnails(options(process.argv.slice(2))).catch(error=>{
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=1;
  });
}
