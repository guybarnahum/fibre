import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

function normalizeAfterthought(item,index){
  assertPlainObject(`live afterthoughts[${index}]`,item);
  if(!["insight","question","intention"].includes(item.kind)){
    throw new TypeError("live afterthought kind is invalid");
  }
  assertNonEmpty(`live afterthoughts[${index}].text`,item.text);
  return Object.freeze({
    kind:item.kind,
    text:item.text.trim(),
  });
}

export function createLiveEncounterRegistry(){
  const sinks=new Map();

  return Object.freeze({
    register(threadId,sink){
      assertId("live encounter registry threadId",threadId);
      if(typeof sink!=="function")throw new TypeError("live encounter registry sink must be a function");
      const current=sinks.get(threadId)??new Set();
      current.add(sink);
      sinks.set(threadId,current);
      return ()=>{
        current.delete(sink);
        if(current.size===0)sinks.delete(threadId);
      };
    },

    publishAfterthoughts({threadId,consolidationId,afterthoughts}={}){
      assertId("live afterthought threadId",threadId);
      assertId("live afterthought consolidationId",consolidationId);
      if(!Array.isArray(afterthoughts)||afterthoughts.length<1||afterthoughts.length>3){
        throw new TypeError("live afterthoughts must contain 1-3 items");
      }
      const residue=Object.freeze({
        threadId,
        consolidationId,
        afterthoughts:Object.freeze(afterthoughts.map(normalizeAfterthought)),
      });
      const current=[...(sinks.get(threadId)??[])];
      for(const sink of current)sink(residue);
      return Object.freeze({
        threadId,
        consolidationId,
        activeEncounters:current.length,
      });
    },

    activeCount(threadId){
      assertId("live encounter registry threadId",threadId);
      return sinks.get(threadId)?.size??0;
    },
  });
}
