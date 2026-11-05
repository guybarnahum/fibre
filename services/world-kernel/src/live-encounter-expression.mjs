import { assertExpressionModelAdapter } from "./guardian-model-adapter.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

// Models sometimes wrap a spoken line in quotation marks; the Story records
// the words themselves. Only a single fully enclosing pair is removed.
export function spokenWords(text){
  const match=/^\s*["\u201c]([^"\u201c\u201d]+)["\u201d]\s*$/u.exec(text);
  return match===null?text:match[1].trim();
}

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
  cacheKey=null,
  promptRef=null,
  signal=null,
}={}){
  assertExpressionModelAdapter(modelAdapter);
  assertNonEmpty("live expression systemPrompt",systemPrompt);
  assertPlainObject("live expression input",input);
  assertId("live expression clientRequestId",clientRequestId);
  return relayExpressionIntoLiveEncounter({
    encounter,
    actorId,
    signal,
    open:(streamSignal)=>modelAdapter.streamExpression({
      systemPrompt,
      input,
      clientRequestId,
      ...(cacheKey===null?{}:{cacheKey}),
      ...(promptRef===null?{}:{promptRef}),
      signal:streamSignal,
    }),
  });
}

// Relays outward expression into the encounter as audible speech while it
// arrives. open(signal) yields expression_delta* then expression_complete;
// aborting is an interruption, after which only the audible prefix survives.
export async function relayExpressionIntoLiveEncounter({
  encounter,
  actorId,
  open,
  signal=null,
}={}){
  liveEncounterMethod(encounter,"pushSpeechDelta");
  liveEncounterMethod(encounter,"endSpeech");
  liveEncounterMethod(encounter,"interruptSpeech");
  liveEncounterMethod(encounter,"subscribe");
  assertId("live expression actorId",actorId);
  if(typeof open!=="function")throw new TypeError("live expression requires an expression stream");
  if(signal!==null&&typeof signal?.addEventListener!=="function"){
    throw new TypeError("live expression signal must be an AbortSignal");
  }

  let text="";
  let provenance=null;
  let completed=false;
  let interruption=null;
  // Speech ends audibly when it is cut, not whenever the model next yields.
  const interrupt=()=>interruption??=Object.freeze({
    text,
    completion:"interrupted",
    speechRef:text===""?null:encounter.interruptSpeech({actorId})?.speechRef??null,
    provenance:null,
  });
  const controller=new AbortController();
  controller.signal.addEventListener("abort",()=>queueMicrotask(interrupt),{once:true});
  const relayAbort=()=>controller.abort(signal?.reason);
  if(signal?.aborted)controller.abort(signal.reason);
  else signal?.addEventListener?.("abort",relayAbort,{once:true});
  const unsubscribe=encounter.subscribe(actorId,(event)=>{
    if(event.type==="scene_changed"&&event.participantId===actorId){
      controller.abort("scene_changed");
    }
  });

  try{
    for await(const event of open(controller.signal)){
      if(controller.signal.aborted)break;
      if(event?.type==="expression_delta"){
        assertNonEmpty("live expression delta",event.text);
        text+=event.text;
        encounter.pushSpeechDelta({actorId,text:event.text,signal:controller.signal});
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
    if(controller.signal.aborted)return interrupt();
    if(text!=="")encounter.interruptSpeech({actorId});
    throw error;
  }finally{
    unsubscribe();
    signal?.removeEventListener?.("abort",relayAbort);
  }

  if(controller.signal.aborted)return interrupt();

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
