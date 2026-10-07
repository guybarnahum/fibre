import { assertExpressionModelAdapter } from "./guardian-model-adapter.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

function liveEncounterMethod(encounter,name){
  if(!encounter||typeof encounter!=="object"||typeof encounter[name]!=="function"){
    throw new TypeError(`live encounter must expose ${name}()`);
  }
}

export async function streamExpressionIntoLiveEncounter({
  encounter,
  actorId,
  modelAdapter,
  systemPrompt,
  input,
  clientRequestId,
  signal=null,
}={}){
  liveEncounterMethod(encounter,"pushSpeechDelta");
  liveEncounterMethod(encounter,"endSpeech");
  liveEncounterMethod(encounter,"interruptSpeech");
  assertId("live expression actorId",actorId);
  assertExpressionModelAdapter(modelAdapter);
  assertNonEmpty("live expression systemPrompt",systemPrompt);
  assertPlainObject("live expression input",input);
  assertId("live expression clientRequestId",clientRequestId);
  if(signal!==null&&typeof signal?.addEventListener!=="function"){
    throw new TypeError("live expression signal must be an AbortSignal");
  }

  let text="";
  let provenance=null;
  let completed=false;

  try{
    for await(const event of modelAdapter.streamExpression({
      systemPrompt,
      input,
      clientRequestId,
      signal,
    })){
      if(event?.type==="expression_delta"){
        assertNonEmpty("live expression delta",event.text);
        text+=event.text;
        encounter.pushSpeechDelta({actorId,text:event.text});
        continue;
      }
      if(event?.type==="expression_complete"){
        if(event.provenance!==null&&event.provenance!==undefined){
          assertPlainObject("live expression provenance",event.provenance);
          provenance=structuredClone(event.provenance);
        }
        completed=true;
      }
    }
  }catch(error){
    if(signal?.aborted){
      const interrupted=text===""?null:encounter.interruptSpeech({actorId});
      return Object.freeze({
        text,
        completion:"interrupted",
        speechRef:interrupted?.speechRef??null,
        provenance:null,
      });
    }
    if(text!=="")encounter.interruptSpeech({actorId});
    throw error;
  }

  if(signal?.aborted){
    const interrupted=text===""?null:encounter.interruptSpeech({actorId});
    return Object.freeze({
      text,
      completion:"interrupted",
      speechRef:interrupted?.speechRef??null,
      provenance:null,
    });
  }

  if(!completed){
    throw new Error("live expression ended without completion");
  }

  if(text===""){
    throw new Error("live expression completed without audible speech");
  }

  encounter.endSpeech({actorId});
  return Object.freeze({
    text,
    completion:"complete",
    speechRef:null,
    provenance:provenance===null?null:Object.freeze(provenance),
  });
}

export function expressionEncounterBeat({
  actorThreadId,
  expression,
}={}){
  if(actorThreadId!==null&&actorThreadId!==undefined)assertId("expression beat actorThreadId",actorThreadId);
  assertPlainObject("live expression result",expression);
  assertNonEmpty("live expression result.text",expression.text);
  if(!["complete","interrupted"].includes(expression.completion)){
    throw new TypeError("live expression completion is invalid");
  }
  return Object.freeze({
    actorThreadId:actorThreadId??null,
    kind:"utterance",
    text:expression.text,
    ...(expression.completion==="interrupted"?{completion:"interrupted"}:{}),
  });
}
