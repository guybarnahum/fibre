import { selectReasoningIntegration } from "./integration-selection.mjs";

// Whether the minds a service is configured to think with can be reached:
// every reasoning integration its deployment manifest names, probed through
// that provider's own adapter with the smallest request it can make. Nothing
// here names a provider, so a change of provider in the manifest is what
// infrastructure health reports next.
//
// One probe per provider, model and key, however many ports share it, held
// for a quarter of an hour (two minutes after a failure, so recovery shows
// soon). A probe costs a few dozen tokens. Image integrations are not probed:
// the smallest request there is an image.
const HELD_MS=15*60_000,FAILURE_HELD_MS=2*60_000;
const outcomes=new Map();
const PROBE_SCHEMA=Object.freeze({type:"object",properties:{ok:{type:"boolean"}},required:["ok"],
  additionalProperties:false});
// The provider answered, if not in the shape asked for: reachable and paid.
const ANSWERED=new Set(["MODEL_INCOMPLETE_RESPONSE","UNPARSEABLE_MODEL_OUTPUT",
  "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR"]);
// Nothing will think until an operator acts: billing, credentials, access,
// or a model the provider no longer serves. Anything else may pass.
const NEEDS_OPERATOR=new Set(["MODEL_BILLING_QUOTA_EXHAUSTED","MODEL_AUTHENTICATION_ERROR",
  "MODEL_PERMISSION_ERROR","MODEL_REQUEST_CONFIGURATION_ERROR"]);

async function probe(value,environment,select){
  try{
    const adapter=select({...value,config:{...value.config,maxOutputTokens:16,retryLimit:0,timeoutMs:20_000}},
      {environment});
    await adapter.invoke({clientRequestId:"model-provider-health",
      systemPrompt:"Infrastructure health probe. Return {\"ok\":true}.",input:{probe:true},
      responseSchema:PROBE_SCHEMA});
    return {level:"normal"};
  }catch(error){
    if(ANSWERED.has(error?.code))return {level:"normal"};
    const detail=String(error?.message??error);
    return {level:NEEDS_OPERATOR.has(error?.code)?"critical":"elevated",
      error:Object.freeze({code:error?.code??"MODEL_PROVIDER_UNAVAILABLE",
        detail:detail.length<=512?detail:detail.slice(0,511)+"…"})};
  }
}

export async function modelProviderChecks({service,integrations,environment,now=Date.now(),
  select=selectReasoningIntegration}){
  const targets=new Map();
  for(const [port,value] of Object.entries(integrations??{})){
    if(value?.kind!=="ai.reasoning")continue;
    const key=[value.provider,value.config?.model,value.secrets?.apiKey].join("/");
    if(!targets.has(key))targets.set(key,{value,ports:[]});
    targets.get(key).ports.push(port);
  }
  return Promise.all([...targets].map(async ([key,{value,ports}])=>{
    const held=outcomes.get(key);
    const outcome=held&&now-held.at<(held.error?FAILURE_HELD_MS:HELD_MS)
      ?held:{at:now,...await probe(value,environment,select)};
    outcomes.set(key,outcome);
    return Object.freeze({kind:"model_provider",resource:`${value.provider} ${value.config?.model}`,
      provider:value.provider,service,ports:Object.freeze(ports),level:outcome.level,
      observedAt:new Date(outcome.at).toISOString(),...(outcome.error?{error:outcome.error}:{})});
  }));
}

// A service's infrastructure health with its model providers added. The
// response status stays its own storage's, so deployment health and the
// state route never depend on a provider.
export function withModelProviders(health,checks){
  const worst=["critical","elevated"].find(level=>[health,...checks].some(item=>item.level===level))??health.level;
  return Object.freeze({...health,level:worst,checks:Object.freeze([...(health.checks??[]),...checks])});
}
