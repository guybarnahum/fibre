import {promptRequest} from "./cognition-prompts.mjs";
import {assertPlainObject,canonicalJson,sha256} from "./persistence-common.mjs";
import {memoryInMind} from "./memory-in-mind.mjs";
import {proposedPlace,worldPlaceRef} from "./live-world-geography.mjs";

// A Thread's livelihood (ADR-0039, slice L1): what it can do, and what it is
// doing with its life now, in its own words and resting on its own memories.
// Never assigned and never a level: a skill is what it has evidence of being
// able to do; its situation is its own continuation of its own past. World
// attests only where it actually was (attendance).

export const SKILL_LIMIT=5;
const FORMATIVE_MEMORY_LIMIT=16;
const FORMATIVE_SOURCE="formative_reflection";
const DAY_MS=86_400_000;

const prose=(max)=>({type:"string",minLength:1,maxLength:max});
const SKILL_SCHEMA=Object.freeze({type:"object",additionalProperties:false,required:["skill","how","evidenceRefs"],
  properties:{skill:{type:"string",minLength:3,maxLength:120},how:prose(400),
    evidenceRefs:{type:"array",minItems:1,maxItems:6,items:{type:"string",minLength:1}}}});
const SITUATION_SCHEMA=Object.freeze({type:"object",additionalProperties:false,
  required:["now","place","rhythm","hopes","worries","openQuestions","evidenceRefs"],
  properties:{now:prose(600),place:{anyOf:[prose(200),{type:"null"}]},rhythm:prose(300),hopes:prose(300),
    worries:prose(300),openQuestions:{type:"array",maxItems:3,items:prose(200)},
    evidenceRefs:{type:"array",minItems:1,maxItems:6,items:{type:"string",minLength:1}}}});

const text=(value,max)=>typeof value==="string"&&value.trim()!==""&&value.trim().length<=max?value.trim():null;

export function skillId({threadId,sourceRef,skill}){
  return `skl_${sha256(canonicalJson({threadId,sourceRef,skill})).slice(0,32)}`;
}

// Where its working or learning days are spent, as World can name it: a place
// it already knows, or the reference a named new place will have once it goes.
function livelihoodPlace({threadId,place,offered}){
  if(place===null)return {place:null,placeRef:null};
  if(/^(wpl_|per:)/u.test(place))return offered.has(place)?{place,placeRef:place}:{place:null,placeRef:null};
  try{
    const named=proposedPlace(place);
    return {place,placeRef:worldPlaceRef({threadId,...named})};
  }catch{
    return {place:null,placeRef:null};
  }
}

// Once, for a Thread that has never given an account of its livelihood: one
// reflection over its formative memories, family, interests and the places
// it knows. Skills and situation each cite memories it actually has.
export async function formLivelihood({thread,memories,interests=[],relations=[],places=[],city=null,
  experienceStore,modelAdapter,asOf}){
  const threadId=thread.threadId;
  if(experienceStore.getCurrentLivelihood(threadId)!==null)return null;
  const formative=[...memories]
    .sort((a,b)=>(b.salience??0)-(a.salience??0)||String(a.memoryId).localeCompare(String(b.memoryId)))
    .slice(0,FORMATIVE_MEMORY_LIMIT);
  if(formative.length===0)return null;
  const born=Date.parse(thread.identity?.birthDate??"");
  const input={
    thread:{threadId,name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",selfModel:thread.currentState?.selfModel??"",
      stableTendencies:structuredClone(thread.genome?.textualTraits??{})},
    family:relations.map(relation=>({relation:relation.relationKind,name:relation.relatedParty?.displayName??null,
      facts:[...(relation.relationshipFacts??[])]})),
    interests:interests.map(interest=>({subject:interest.subject,draw:interest.draw})),
    formativeMemories:formative.map(memory=>({memoryId:memory.memoryId,
      subjectPeriod:memory.subjectPeriod??null,...memoryInMind(memory)})),
    places:places.map(place=>({placeRef:place.ref,name:place.displayName??null,kind:place.placeKind??null})),
    now:{at:asOf,city,...(Number.isFinite(born)?{age:Math.floor((Date.parse(asOf)-born)/(365.25*DAY_MS))}:{})},
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("experience.livelihood-formation",{threadId}),
    input,
    responseSchema:{type:"object",additionalProperties:false,required:["skills","situation"],
      properties:{skills:{type:"array",minItems:1,maxItems:SKILL_LIMIT,items:SKILL_SCHEMA},situation:SITUATION_SCHEMA}},
    clientRequestId:`livelihood-formation_${sha256(canonicalJson(input)).slice(0,32)}`,
  });
  assertPlainObject("livelihood formation output",invocation.output);
  const supplied=new Set(formative.map(memory=>memory.memoryId));
  // Only what rests on memories this Thread actually has.
  const own=(refs)=>[...new Set((Array.isArray(refs)?refs:[]).filter(ref=>supplied.has(ref)))];
  const skills=[];
  for(const item of (invocation.output.skills??[]).slice(0,SKILL_LIMIT)){
    const skill=text(item?.skill,120),how=text(item?.how,400),evidenceRefs=own(item?.evidenceRefs);
    if(skill===null||how===null||evidenceRefs.length===0)continue;
    skills.push(experienceStore.recordSkill({threadId,skillId:skillId({threadId,sourceRef:FORMATIVE_SOURCE,skill}),
      skill:{skill,how},evidenceRefs,formedBy:FORMATIVE_SOURCE,sourceRef:FORMATIVE_SOURCE,asOf}));
  }
  const situation=invocation.output.situation;
  const now=text(situation?.now,600),evidenceRefs=own(situation?.evidenceRefs);
  if(now===null||evidenceRefs.length===0)return Object.freeze({skills,livelihood:null});
  const livelihood=Object.freeze({now,
    ...livelihoodPlace({threadId,place:text(situation.place,200),offered:new Set(places.map(place=>place.ref))}),
    rhythm:text(situation.rhythm,300),hopes:text(situation.hopes,300),worries:text(situation.worries,300),
    openQuestions:(Array.isArray(situation.openQuestions)?situation.openQuestions:[])
      .map(question=>text(question,200)).filter(Boolean).slice(0,3)});
  experienceStore.recordLivelihood({threadId,livelihood,evidenceRefs,formedBy:FORMATIVE_SOURCE,
    sourceRef:FORMATIVE_SOURCE,asOf});
  return Object.freeze({skills,livelihood});
}

// How its skills and life enter this Thread's own developed-self evidence.
export function livelihoodRef(threadId,revision){
  return `lvh_${sha256(canonicalJson({threadId,revision})).slice(0,32)}`;
}
export function skillText(skill){
  return `Skill — ${skill.skill}: ${skill.how}`;
}
export function livelihoodText(livelihood){
  const part=(label,value)=>value?` ${label}: ${value}`:"";
  const asking=livelihood.openQuestions.length===0?"":` What I am still asking about my path: ${livelihood.openQuestions.join(" ")}`;
  return `My life now: ${livelihood.now}${part("My week",livelihood.rhythm)}${part("I hope",livelihood.hopes)}`
    +`${part("I worry",livelihood.worries)}${asking}`;
}

// What the day plan sees: its life, its rhythm, and where those days are
// spent — a known place by reference, or a place to go by name. Whether to
// go today is its own choice.
export function livelihoodForPlanning({experienceStore,livedNowStore,threadId}){
  const livelihood=experienceStore?.getCurrentLivelihood?.(threadId)??null;
  if(livelihood===null)return null;
  const known=livelihood.placeRef===null?null
    :livedNowStore.getWorldPlace?.(threadId,livelihood.placeRef,{required:false})??null;
  return Object.freeze({now:livelihood.now,rhythm:livelihood.rhythm,
    ...(known!==null?{placeRef:known.ref,placeName:known.displayName??null}
      :livelihood.place!==null&&livelihood.placeRef!==null?{newPlace:livelihood.place}:{})});
}

// Hours this Thread was actually at the place of its livelihood between two
// instants, from where World enacted it: a World fact, not its own account.
export function attendedHours({situations,placeRef,from,to}){
  if(placeRef===null)return 0;
  const start=Date.parse(from),end=Date.parse(to);
  const ordered=[...situations].sort((a,b)=>a.establishedAt.localeCompare(b.establishedAt));
  let ms=0;
  ordered.forEach((situation,index)=>{
    if(situation.location?.kind!=="place"||situation.location.placeRef!==placeRef)return;
    const begin=Math.max(start,Date.parse(situation.establishedAt));
    const until=Math.min(end,index+1<ordered.length?Date.parse(ordered[index+1].establishedAt):end);
    if(until>begin)ms+=until-begin;
  });
  return Math.round(ms/360_000)/10;
}
