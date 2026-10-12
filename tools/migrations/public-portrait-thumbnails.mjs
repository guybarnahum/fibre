import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));

function argumentsFrom(argv){
  let environment=null,apply=false,limit=50;
  for(let i=0;i<argv.length;i+=1){
    if(argv[i]==="--env")environment=argv[++i]??null;
    else if(argv[i]==="--apply")apply=true;
    else if(argv[i]==="--limit")limit=Number(argv[++i]);
    else throw new TypeError("Unknown option "+argv[i]);
  }
  if(!["staging","production"].includes(environment))throw new TypeError("Use --env staging|production");
  if(!Number.isSafeInteger(limit)||limit<1||limit>200)throw new TypeError("--limit must be 1-200");
  return {environment,apply,limit};
}

export async function backfillPortraitThumbnails({
  environment,apply=false,limit=50,fetchImpl=fetch,log=console.log,
}={}){
  const deployed=JSON.parse(readFileSync(resolve(ROOT,
    ".fibre/cloudflare",environment,"deployment.json"),"utf8"));
  const base=(service)=>deployed.deployments.find((d)=>d.serviceId===service)?.baseUrl;
  const presentation=base("thread-presentation");
  const world=base("world-kernel");
  if(deployed.environment!==environment||!presentation||!world)
    throw new Error("Missing deployment evidence for "+environment);
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(apply&&!token)throw new Error("FIBRE_PRIVATE_TOKEN is required for --apply");

  const directoryResponse=await fetchImpl(new URL("/api/threads/search?limit=200",presentation));
  if(!directoryResponse.ok)throw new Error("Directory: HTTP "+directoryResponse.status);
  const directory=await directoryResponse.json();
  if(directory.threads?.length && !Object.hasOwn(directory.threads[0],"portraitThumbnailObjectRef")){
    throw new Error("Deploy updated Thread Presentation before thumbnail backfill");
  }
  const missing=(directory.threads??[]).filter((t)=>!t.portraitThumbnailObjectRef).slice(0,limit);
  const summary={environment,mode:apply?"apply":"preview",candidates:missing.length,
    published:0,notReady:0,failed:0};
  if(!apply){log(JSON.stringify(summary,null,2));return summary;}

  for(const entry of missing){
    try{
      const response=await fetchImpl(new URL(
        "/internal/threads/"+encodeURIComponent(entry.threadId)+"/observatory",world),
      {headers:{"x-fibre-private-token":token}});
      if(!response.ok)throw new Error("World observatory HTTP "+response.status);
      const worldBody=await response.json();
      const embodiments=worldBody?.observatory?.embodiments??[];
      const candidates=embodiments.filter((e)=>e.kind==="portrait"&&e.visibility==="public"
        &&e.status==="available"&&e.asset?.referenceObjectRef);
      if(candidates.length!==1){summary.notReady+=1;continue;}
      const submitted=await fetchImpl(new URL(
        "/internal/visual-publication/reconcile",presentation),{
        method:"POST",
        headers:{"content-type":"application/json","x-fibre-private-token":token},
        body:JSON.stringify({
          threadId:entry.threadId,embodiment:candidates[0],
          observedAt:new Date().toISOString(),thumbnailOnly:true,
        }),
      });
      const result=await submitted.json().catch(()=>null);
      if(!submitted.ok||result?.result?.complete!==true){
        log(JSON.stringify({threadId:entry.threadId,
          status:"pending",detail:result?.result?.detail??result?.detail??null}));
        summary.failed+=1;
        continue;
      }
      summary.published+=1;
      log(JSON.stringify({threadId:entry.threadId,
        thumbnailObjectRef:result.result.detail.portraitThumbnailObjectRef,
        reused:result.result.detail.reused===true}));
    }catch(error){
      summary.failed+=1;
      log(JSON.stringify({threadId:entry.threadId,
        error:error instanceof Error?error.message:String(error)}));
    }
  }
  log(JSON.stringify(summary,null,2));
  if(summary.failed)process.exitCode=1;
  return summary;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=argumentsFrom(process.argv.slice(2));
  backfillPortraitThumbnails(args).catch(error=>{
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=1;
  });
}
