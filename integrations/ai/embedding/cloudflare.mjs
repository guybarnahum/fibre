// Workers AI embeddings as replaceable machinery for World's own measures,
// never a Thread's cognition: through the World's AI binding beside it, or
// the account's REST endpoint for operator tools. A failure is thrown for
// the caller, which falls back to its word-based measure.
const DEFAULT_TIMEOUT_MS=20_000;

export function createCloudflareEmbeddingAdapter({binding=null,accountId=null,apiToken=null,modelId,
  fetchImpl=globalThis.fetch,timeoutMs=DEFAULT_TIMEOUT_MS}={}){
  if(typeof modelId!=="string"||modelId==="")throw new TypeError("Workers AI embedding modelId is required");
  const viaBinding=typeof binding?.run==="function";
  if(!viaBinding&&(typeof accountId!=="string"||typeof apiToken!=="string")){
    throw new TypeError("Workers AI embeddings need the World's AI binding, or an account id and API token");
  }
  const endpoint=viaBinding?null
    :`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelId}`;

  async function run(body){
    if(viaBinding){
      let timer;
      try{
        return await Promise.race([binding.run(modelId,body),new Promise((_,reject)=>{
          timer=setTimeout(()=>reject(new Error("Workers AI embedding timed out")),timeoutMs);
        })]);
      }finally{clearTimeout(timer);}
    }
    const response=await fetchImpl(endpoint,{method:"POST",
      headers:{"content-type":"application/json",authorization:`Bearer ${apiToken}`},
      body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
    const payload=await response.json().catch(()=>null);
    if(!response.ok||payload?.success===false){
      throw new Error(`Workers AI embedding failed: ${payload?.errors?.map(item=>item?.message).join("; ")||`HTTP ${response.status}`}`);
    }
    return payload;
  }

  return Object.freeze({
    provider:"cloudflare",
    modelId,
    async embed(texts){
      if(!Array.isArray(texts)||texts.some(text=>typeof text!=="string"||text===""))
        throw new TypeError("embedding texts must be non-empty strings");
      if(texts.length===0)return Object.freeze({vectors:[],modelId});
      const result=await run({text:texts});
      const data=(result?.result??result)?.data;
      if(!Array.isArray(data)||data.length!==texts.length
        ||data.some(vector=>!Array.isArray(vector)||vector.length===0||vector.some(value=>typeof value!=="number"))){
        throw new Error("Workers AI embedding returned no usable vectors");
      }
      return Object.freeze({vectors:data,modelId});
    },
  });
}
