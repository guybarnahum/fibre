import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function visualIdentityReviewUrl(environment) {
  const hosts={staging:"admin.staging.insidefibre.com",production:"admin.insidefibre.com"};
  if(!Object.hasOwn(hosts,environment))throw new TypeError("Use --env staging or --env production");
  return "https://"+hosts[environment]+"/visual-identity-review.html";
}

function run(argv) {
  let environment=null,open=true;
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==="--env")environment=argv[++i];
    else if(arg.startsWith("--env="))environment=arg.slice(6);
    else if(arg==="--no-open")open=false;
    else throw new TypeError("Unsupported option: "+arg);
  }
  const url=visualIdentityReviewUrl(environment);
  console.log("Fibre visual identity review (read-only): "+url);
  console.log("Requires the Admin Dashboard to be deployed and authenticated.");
  if(open&&process.platform==="darwin"){
    const result=spawnSync("open",[url],{stdio:"inherit"});
    if(result.error||result.status!==0)throw new Error("Could not open browser; use the URL above");
  }else if(open){
    console.log("Open the URL above in your authenticated browser.");
  }
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{run(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}
}
