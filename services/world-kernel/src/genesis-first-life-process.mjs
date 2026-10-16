import { LivedNowCoverageError } from "./lived-now-service.mjs";

// The first waking of a born Thread is ordinary LivedNow authority. This
// process only delivers one durable birth obligation into that same mind and
// scheduler; it neither authors a plan nor reconstructs missing biography.
export function createGenesisFirstLifeProcess({
  workStore,livedNow,now=()=>new Date().toISOString(),
}={}){
  for(const method of ["due","complete","fail","block","nextDueAt"]){
    if(typeof workStore?.[method]!=="function"){
      throw new TypeError(`first-life work requires ${method}()`);
    }
  }
  if(typeof livedNow?.ensure!=="function"){
    throw new TypeError("first-life work requires LivedNow.ensure()");
  }
  return Object.freeze({
    async runOnce(){
      const at=now();
      const due=workStore.due(at);
      const results=[];
      if(due!==null){
        try{
          const situation=await livedNow.ensure({threadId:due.thread_id,at});
          workStore.complete(due.thread_id,situation.establishedAt);
          results.push({threadId:due.thread_id,outcome:"established",
            situationId:situation.situationId});
        }catch(error){
          const message=String(error?.message??error).slice(0,180);
          if(error instanceof LivedNowCoverageError){
            workStore.block(due.thread_id,message);
            results.push({threadId:due.thread_id,outcome:"blocked",message});
          }else{
            const failure=workStore.fail(due.thread_id,at,message);
            results.push({
              threadId:due.thread_id,
              outcome:failure.blocked?"blocked":"retrying",message,
            });
          }
        }
      }
      const nextDueAt=workStore.nextDueAt();
      return Object.freeze({
        attempted:due===null?0:1,
        failed:0,
        nextDueAt,
        hasDue:nextDueAt!==null&&nextDueAt<=at,
        results:Object.freeze(results),
      });
    },
  });
}
