import {pathToFileURL} from "node:url";
import {normalizeCloudflareEnvironment} from "../deployment/cloudflare-operator.mjs";
import {topology} from "../validation/encounter-autonomy-probe.mjs";

async function main(argv){
  let environment=null,question=null,asker="human",locality=null,countryCode=null;
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==="--env")environment=argv[++i];
    else if(arg==="--question")question=argv[++i];
    else if(arg==="--asker")asker=argv[++i];
    else if(arg==="--locality")locality=argv[++i];
    else if(arg==="--country-code")countryCode=argv[++i];
    else throw new TypeError(`unsupported Guy argument: ${arg}`);
  }
  if(!environment||!question)throw new TypeError("Guy requires --env and --question");
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new TypeError("FIBRE_PRIVATE_TOKEN is required");
  const env=normalizeCloudflareEnvironment(environment);
  const url=new URL(topology(env).worldBaseUrl);
  url.pathname="/internal/guy/ask";
  const response=await fetch(url,{
    method:"POST",
    headers:{"content-type":"application/json","x-fibre-private-token":token},
    body:JSON.stringify({
      question,asker,
      ...(locality===null&&countryCode===null?{}:{
        location:{locality,countryCode},
      }),
    }),
    signal:AbortSignal.timeout(15000),
  });
  const result=await response.json();
  if(!response.ok||result.ok!==true){
    throw new Error(`Guy failed HTTP ${response.status}: ${result.detail??result.error??"unknown"}`);
  }
  process.stdout.write(JSON.stringify(result.result,null,2)+"\n");
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`Guy: ${String(error.message??error).slice(0,300)}\n`);
    process.exitCode=1;
  });
}
