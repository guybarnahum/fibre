import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalizeCloudflareEnvironment } from "./cloudflare-operator.mjs";
const REPO_ROOT=fileURLToPath(new URL("../../",import.meta.url));
function parseArgs(argv){
  let environment=null;
  let secretsFile=".env";
  for(let index=0;index<argv.length;index+=1){
    if(argv[index]==="--env")environment=argv[++index]??null;
    else if(argv[index]==="--file")secretsFile=argv[++index]??null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if(typeof secretsFile!=="string"||secretsFile.trim()==="")throw new TypeError("--file requires a path");
  return Object.freeze({environment:normalizeCloudflareEnvironment(environment),secretsFile:secretsFile.trim()});
}
function npmRun(script,args){execFileSync("npm",["run",script,"--",...args],{cwd:REPO_ROOT,stdio:"inherit"});}
export function prepareCloudflare({environment,secretsFile=".env"}){
  const target=normalizeCloudflareEnvironment(environment);
  npmRun("cloud:provision",["--env",target]);
  npmRun("cloud:configure-secrets",["--env",target,"--file",secretsFile]);
  npmRun("cloud:deploy",["--env",target]);
  npmRun("cloud:deploy:apps",["--env",target,"--file",secretsFile]);
}
try{const args=parseArgs(process.argv.slice(2));prepareCloudflare(args);}
catch(error){process.stderr.write(`${error?.message??String(error)}\n`);process.exitCode=1;}
