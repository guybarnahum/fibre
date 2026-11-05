import { relayExpressionIntoLiveEncounter } from "./live-encounter-expression.mjs";
import { promptRequest } from "./cognition-prompts.mjs";
import {
  assertId,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

function requestId(kind, input) {
  return `${kind}_${sha256(canonicalJson(input))}`;
}

function socialLiveInput({
  thread,
  situation,
  perspective,
  story,
  liveEncounter,
  opportunity,
}){
  assertPlainObject("live social Thread",thread);
  assertId("live social Thread.threadId",thread.threadId);
  assertPlainObject("live social situation",situation);
  assertPlainObject("live social perspective",perspective);
  if(!Array.isArray(perspective.counterparts)||perspective.counterparts.length<1){
    throw new TypeError("live social perspective requires the people this Thread is with");
  }
  assertPlainObject("live social story",story);
  if(!Array.isArray(story.beats)||story.beats.length<1){
    throw new TypeError("live social story requires observable history");
  }
  if(!liveEncounter||typeof liveEncounter.heardSoFar!=="function"
    ||typeof liveEncounter.perceivedWorldEvents!=="function"){
    throw new TypeError("live social cognition requires Live Encounter state");
  }
  assertPlainObject("live social opportunity",opportunity);

  // The Thread speaks from its own developed self and present, and perceives
  // the other person only as it can: observable appearance, a name it actually
  // knows, and what it noticed of them before.
  return Object.freeze({
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfModel:thread.currentState?.selfModel??"",
    },
    developedSelfEvidence:(perspective.developedSelfEvidence??[])
      .map(({kind,text})=>({kind,text})),
    currentSituation:{
      since:situation.establishedAt??null,
      place:perspective.placeName??null,
      activity:situation.activity??null,
      outwardActivity:situation.outwardActivity??null,
      purpose:situation.reason??null,
      wakefulness:situation.wakefulness??null,
    },
    counterparties:structuredClone(perspective.counterparts),
    story:structuredClone(story),
    liveInteraction:{
      heardSoFar:liveEncounter.heardSoFar(thread.threadId),
      perceivedWorldEvents:liveEncounter.perceivedWorldEvents(thread.threadId),
      opportunity:structuredClone(opportunity),
    },
  });
}

// One streamed call per speaking opportunity. Its text opens with a turn
// marker; speech streams live as soon as "SAY:" and the first words arrive.
// "INTRODUCE:" is speech in which the Thread chooses to tell its own name;
// World still admits only the part of the name actually spoken.
const TURN_MARKERS=Object.freeze([
  ["SAY:","speak"],
  ["INTRODUCE:","introduce"],
  ["ACT:","act"],
  ["SILENT","silent"],
]);
const SILENCE=Object.freeze({decision:"silent"});
const SPEECH=new Set(["speak","introduce"]);
const MARKER_LENGTH=Math.max(...TURN_MARKERS.map(([marker])=>marker.length));

// Models sometimes dress the marker as markdown ("**SAY:** ..."); that styling
// is not part of the turn.
const MARKER_STYLE=/^[\s*_`#>]+/u;

// undefined while the opening could still become a marker; null when it cannot.
function turnMarker(text){
  const opening=text.replace(MARKER_STYLE,"");
  const head=opening.slice(0,MARKER_LENGTH).toUpperCase();
  for(const [marker,decision] of TURN_MARKERS){
    if(head.startsWith(marker)){
      return {decision,rest:opening.slice(marker.length).replace(/^[*_`]+/u,"")};
    }
  }
  return TURN_MARKERS.some(([marker])=>marker.startsWith(head))?undefined:null;
}

function iterable(events){
  return {[Symbol.asyncIterator]:()=>events};
}

async function remainder(events){
  let text="";
  let provenance=null;
  for await(const event of iterable(events)){
    if(event?.type==="expression_delta")text+=event.text;
    if(event?.type==="expression_complete")provenance=event.provenance??null;
  }
  return {text,provenance};
}

// A turn that does not open recognizably is silence for this opportunity only:
// the conversation continues, and no words are logged.
function unclearTurn(text){
  console.warn(JSON.stringify({
    event:"live-social-turn-unclear",outcome:"silent",chars:text.length,
  }));
  return SILENCE;
}

// Aborting signal ends the turn: before it opens it is silence; once speaking,
// only the audible prefix survives. The caller decides when to abort.
export async function takeLiveSocialTurn({
  thread,
  situation,
  perspective,
  story,
  liveEncounter,
  opportunity,
  modelAdapter,
  signal=null,
}={}){
  const input=socialLiveInput({
    thread,
    situation,
    perspective,
    story,
    liveEncounter,
    opportunity,
  });
  const events=modelAdapter.streamExpression({
    ...promptRequest("social.live-turn",{threadId:thread.threadId}),
    // Within one conversation the Thread, its present and the person it faces
    // stay the same; only what has been said grows.
    cacheThrough:"counterparties",
    input,
    clientRequestId:requestId("social-live-turn",input),
    signal,
  })[Symbol.asyncIterator]();

  let text="";
  let turn;
  for(;;){
    const {value,done}=await events.next();
    if(done||signal?.aborted)break;
    if(value?.type!=="expression_delta")continue;
    text+=value.text;
    turn=turnMarker(text);
    if(turn===undefined)continue;
    if(turn===null||!SPEECH.has(turn.decision)||turn.rest.trim()!=="")break;
  }
  if(signal?.aborted){
    await events.return?.();
    return SILENCE;
  }
  if(!turn||SPEECH.has(turn.decision)&&turn.rest.trim()===""){
    await remainder(events);
    return unclearTurn(text);
  }
  if(turn.decision==="silent"){
    await remainder(events);
    return SILENCE;
  }
  if(turn.decision==="act"){
    const rest=await remainder(events);
    const actionText=(turn.rest+rest.text).trim();
    if(actionText==="")return unclearTurn(text);
    return Object.freeze({decision:"act",actionText,provenance:rest.provenance});
  }

  const expression=await relayExpressionIntoLiveEncounter({
    encounter:liveEncounter,
    actorId:thread.threadId,
    signal,
    open:async function*(){
      yield {type:"expression_delta",text:turn.rest.trimStart()};
      yield* iterable(events);
    },
  });
  if(expression.text==="")return SILENCE;
  return Object.freeze({decision:"speak",expression,introducesSelf:turn.decision==="introduce"});
}
