import { birthEnvironment,birthDeployment,birthRequest } from "./birth-remote.mjs";

async function main(){
  const {environment,args}=birthEnvironment(process.argv.slice(2));
  if(args.includes("--help")||args.includes("-h")){
    process.stdout.write("Usage: npm run genesis:births -- --env staging [--limit 32] [--after CURSOR]\n");
    return;
  }
  let limit=32,after=null;
  for(let i=0;i<args.length;i++){
    if(args[i]==="--limit")limit=Number(args[++i]);
    else if(args[i].startsWith("--limit="))limit=Number(args[i].slice(8));
    else if(args[i]==="--after")after=args[++i]??null;
    else if(args[i].startsWith("--after="))after=args[i].slice(8);
    else throw new TypeError("Unsupported genesis:births option "+args[i]);
  }
  if(!Number.isSafeInteger(limit)||limit<1||limit>128)throw new TypeError("Births limit must be 1..128");
  const query=new URLSearchParams({limit:String(limit)});
  if(after)query.set("after",after);
  const data=await birthRequest(birthDeployment(environment),"/births?"+query);
  process.stdout.write(JSON.stringify({
    event:"genesis-births",environment,births:data.births,nextCursor:data.nextCursor,
  })+"\n");
}
main().catch(error=>{
  process.stderr.write("genesis:births failed: "+String(error?.message??error)+"\n");
  process.exitCode=1;
});
