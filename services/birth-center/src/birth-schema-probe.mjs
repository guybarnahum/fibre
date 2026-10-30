import {createOpenAIModelAdapter} from "#integrations/ai/reasoning/openai.mjs";
import {BIRTH_RESPONSE_SCHEMAS,assertBirthResponseSchemaPatterns} from "./model-response-schemas.mjs";

// The same seven exact transport schemas on the laptop and deployed Worker.
// Responses are deliberately tiny; truncated output still proves acceptance.
export async function probeBirthModelSchemas(environment,{creative,repair}){
  if(!environment?.OPENAI_API_KEY)throw new Error("BIRTH PREFLIGHT needs OPENAI_API_KEY from .env");
  const adapters=new Map();
  for(const entry of BIRTH_RESPONSE_SCHEMAS){
    assertBirthResponseSchemaPatterns(entry);
    if(!adapters.has(entry.role)){
      const profile=entry.role==="repair"?repair:creative;
      const authoring=["population","authoring"].includes(entry.role);
      adapters.set(entry.role,createOpenAIModelAdapter({
        environment,modelId:profile.config.model,
        temperature:profile.config.temperature,topP:profile.config.topP,
        reasoningEffort:authoring?"low":profile.config.reasoningEffort,
        maxOutputTokens:64,retryLimit:0,timeoutMs:60_000,
        ...(authoring?{fetchImpl:async(input,init)=>{
          const body=JSON.parse(init.body);
          delete body.temperature;
          delete body.top_p;
          return fetch(input,{...init,body:JSON.stringify(body)});
        }}:{}),
      }));
    }
    try{
      await adapters.get(entry.role).invoke({
        clientRequestId:"birth-preflight-"+entry.name.toLowerCase().replace(/[^a-z0-9]+/gu,"-"),
        systemPrompt:"Deployment schema acceptance probe. Return the smallest valid object possible.",
        input:{probe:true},responseSchema:entry.schema,
      });
    }catch(error){
      if(["MODEL_INCOMPLETE_RESPONSE","UNPARSEABLE_MODEL_OUTPUT",
        "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR"].includes(error?.code))continue;
      throw new Error("schema "+entry.name+": "+String(error?.message??error));
    }
  }
  return BIRTH_RESPONSE_SCHEMAS.length;
}
