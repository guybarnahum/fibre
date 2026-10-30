import { birthEnvironment,birthDeployment,birthRequest } from "./birth-remote.mjs";

async function main(){
  const {environment,args}=birthEnvironment(process.argv.slice(2));
  if(args.includes("--help")||args.includes("-h")){
    process.stdout.write("Usage: npm run genesis:births -- --env staging [--limit 32] [--after CURSOR] [--failures] [--all]\n");
    return;
  }
  let limit=32,after=null,failures=false,all=false;
  for(let i=0;i<args.length;i++){
    if(args[i]==="--failures")failures=true;
    else if(args[i]==="--all")all=true;
    else if(args[i]==="--limit")limit=Number(args[++i]);
    else if(args[i].startsWith("--limit="))limit=Number(args[i].slice(8));
    else if(args[i]==="--after")after=args[++i]??null;
    else if(args[i].startsWith("--after="))after=args[i].slice(8);
    else throw new TypeError("Unsupported genesis:births option "+args[i]);
  }
  if(!Number.isSafeInteger(limit)||limit<1||limit>40)throw new TypeError("Births limit must be 1..40");
  if(failures){
    const groups=new Map();
    let cursor=after,pages=0,failed=0;
    do{
      const query=new URLSearchParams({limit:String(limit)});
      if(cursor)query.set("after",cursor);
      if(all)query.set("all","1");
      const data=await birthRequest(birthDeployment(environment),"/births?"+query);
      for(const birth of data.births??[]){
        if(birth.stage==="cancelled"||birth.status!=="failed")continue;
        failed++;
        const stage=birth.stage??"unknown",errorCode=birth.errorCode??"BIRTH_FAILED";
        const key=stage+"|"+errorCode;
        const group=groups.get(key)??{stage,errorCode,count:0,examples:[]};
        group.count++;
        if(group.examples.length<5)group.examples.push({
          requestId:birth.requestId,error:birth.error,retryable:birth.failureRetryable});
        groups.set(key,group);
      }
      cursor=data.nextCursor;
      pages++;
    }while(cursor!==null);
    process.stdout.write(JSON.stringify({event:"genesis-birth-failures",
      environment,failed,pages,groups:[...groups.values()].sort((a,b)=>
        a.stage.localeCompare(b.stage)||a.errorCode.localeCompare(b.errorCode))})+"\n");
    return;
  }
  const query=new URLSearchParams({limit:String(limit)});
  if(after)query.set("after",after);
  if(all)query.set("all","1");
  const data=await birthRequest(birthDeployment(environment),"/births?"+query);
  process.stdout.write(JSON.stringify({
    event:"genesis-births",environment,births:data.births,nextCursor:data.nextCursor,
  })+"\n");
}
main().catch(error=>{
  process.stderr.write("genesis:births failed: "+String(error?.message??error)+"\n");
  process.exitCode=1;
});
