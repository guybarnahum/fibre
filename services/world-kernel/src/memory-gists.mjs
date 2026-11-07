import {promptRequest} from "./cognition-prompts.mjs";
import {AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2} from "./autobiographical-memory-domain.mjs";
import {assertPlainObject,canonicalJson,sha256} from "./persistence-common.mjs";

// A memory formed before gists existed is still carried in full wherever a job
// holds it in the background. The Thread writes gists for its own such
// memories, a few at a time; each becomes a new revision of the same memory,
// whose recollection, meaning, evidence and accessibility stay as they were.
const GIST_BATCH=10;

function gistless(memory){
  return memory.recordFormat===AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2
    &&memory.gist===undefined&&memory.status==="current";
}

export async function writeMissingGists({thread,memoryStore,modelAdapter,now}){
  const batch=memoryStore.listCurrentMemories(thread.threadId).filter(gistless)
    .sort((a,b)=>(b.salience??0)-(a.salience??0)||a.memoryId.localeCompare(b.memoryId))
    .slice(0,GIST_BATCH);
  if(batch.length===0)return Object.freeze([]);
  const input={
    thread:{threadId:thread.threadId,name:thread.identity?.name??null,
      selfModel:thread.currentState?.selfModel??""},
    memories:batch.map(memory=>({memoryId:memory.memoryId,
      rememberedContent:memory.rememberedContent,rememberedMeaning:memory.rememberedMeaning??null})),
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("experience.memory-gist",{threadId:thread.threadId}),
    input,
    responseSchema:{type:"object",additionalProperties:false,required:["gists"],
      properties:{gists:{type:"array",maxItems:GIST_BATCH,items:{type:"object",
        additionalProperties:false,required:["memoryId","gist"],
        properties:{memoryId:{type:"string",minLength:1},
          gist:{type:"string",minLength:12,maxLength:280}}}}}},
    clientRequestId:`memory-gist_${sha256(canonicalJson(input)).slice(0,32)}`,
  });
  assertPlainObject("memory gist output",invocation.output);
  const byId=new Map(batch.map(memory=>[memory.memoryId,memory]));
  const written=[];
  for(const item of invocation.output.gists??[]){
    const memory=byId.get(item?.memoryId);
    const gist=typeof item?.gist==="string"?item.gist.trim():"";
    if(memory===undefined||gist.length<12||gist.length>280)continue;
    byId.delete(memory.memoryId);
    written.push(memoryStore.recordMemory({
      ...structuredClone(memory),gist,
      revision:memory.revision+1,supersedesRevision:memory.revision,recordedAt:now(),
    }).memoryId);
  }
  return Object.freeze(written);
}
