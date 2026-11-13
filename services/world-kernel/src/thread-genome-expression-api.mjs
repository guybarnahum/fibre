import { constantTimeEqual, json } from "./thread-life-rest-write-api.mjs";

export const GENOME_EXPRESSION_ROUTE="/internal/thread-genome/express";

// Operator surface for late expression (ADR-0036): GET shows what each Thread
// would receive; POST expresses it for every Thread that is not retired.
export function createThreadGenomeExpressionApi({expressionStore,privateToken,now=()=>new Date().toISOString()}={}){
  if(typeof expressionStore?.plan!=="function"||typeof expressionStore?.express!=="function"){
    throw new TypeError("genome expression API requires plan() and express()");
  }
  if(typeof privateToken!=="string"||!privateToken.trim())throw new TypeError("genome expression API requires privateToken");
  return Object.freeze({
    async fetch(request){
      if(new URL(request.url).pathname!==GENOME_EXPRESSION_ROUTE)return null;
      if(!constantTimeEqual(request.headers.get("x-fibre-private-token"),privateToken)){
        return json({error:"private_token_required"},403);
      }
      const plan=expressionStore.plan();
      if(request.method==="GET")return json({contract:"fibre-genome-expression-v1",threads:plan});
      if(request.method!=="POST")return json({error:"method_not_allowed"},405);
      const at=now();
      // Each entry keeps what the Body had before; receives is what it was given now.
      return json({contract:"fibre-genome-expression-v1",threads:plan.map(entry=>{
        if(entry.genome==="none")return {...entry,eventId:null};
        const {eventId,expressed,completed=[]}=expressionStore.express(entry.threadId,{at});
        return {...entry,eventId,receives:expressed,completes:completed};
      })});
    },
  });
}
