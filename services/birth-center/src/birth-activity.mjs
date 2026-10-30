// Birth cognition is already journaled with invocation witnesses. D1 Activity
// records stage outcomes and failures, never a start/completion pair per call.
const completed=new Set([
  "birth.request.persist","birth.genesis.start","birth.genesis.compile",
  "birth.publish.prepare","birth.publish.queued","birth.request.resume",
  "birth.request.plan",
]);
const isCognition=stage=>typeof stage==="string"&&(
  stage.includes(".cognition_call")||stage.includes(".repair_call")
  ||stage.endsWith(".provider_commit")||stage.endsWith(".durable_replay")
);
export function compactBirthActivity(recorder){
  if(recorder===null)return null;
  const keep=record=>record.status==="failed"||(
    completed.has(record.stage)&&record.status==="succeeded");
  return Object.freeze({
    async record(record){
      if(!keep(record))return null;
      return recorder.record(record);
    },
    async runStage(meta,operation){
      try{
        const result=await operation(Object.freeze({operationId:null}));
        if(!isCognition(meta.stage)&&completed.has(meta.stage))
          await recorder.record({...meta,status:"succeeded"});
        return result;
      }catch(error){
        await recorder.record({...meta,status:"failed",
          message:String(error?.message??error).slice(0,1000),
          error:{category:"workflow",code:String(error?.code??"BIRTH_STAGE_FAILED")
            .replace(/[^A-Za-z0-9._:-]/gu,"_"),retryable:error?.retryable!==false}});
        throw error;
      }
    },
  });
}
