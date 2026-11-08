import {promptRequest} from "./cognition-prompts.mjs";
import {assertPlainObject,canonicalJson,sha256} from "./persistence-common.mjs";
import {memoryInMind} from "./memory-in-mind.mjs";

// A Thread's interests: subjects that fascinate it, in its own words — what
// draws it, how it sees itself in that subject (perhaps romantically, as the
// one who knows, makes or teaches it; how it could be useful and valued), and
// what it still asks. Formed only in its own reflection over its own lived
// evidence, never assigned. See docs/concepts/interests-expertise-and-livelihood.md.

export const INTEREST_LIMIT=4;
export const INTEREST_CHANGE_LIMIT=2;
const FORMATIVE_MEMORY_LIMIT=16;
const FORMATIVE_SOURCE="formative_reflection";

const INTEREST_FIELDS=Object.freeze({
  subject:{type:"string",minLength:3,maxLength:120},
  draw:{type:"string",minLength:1,maxLength:400},
  selfImage:{type:"string",minLength:1,maxLength:300},
  openQuestions:{type:"array",maxItems:3,items:{type:"string",minLength:1,maxLength:200}},
  // Its own felt standing in the subject among the people around it: who comes
  // to it, who it learns from. There is no expertise level.
  standing:{anyOf:[{type:"string",minLength:1,maxLength:300},{type:"null"}]},
});

export const INTEREST_CHANGE_SCHEMA=Object.freeze({
  type:"array",maxItems:INTEREST_CHANGE_LIMIT,
  items:{type:"object",additionalProperties:false,
    required:["change","interestRef",...Object.keys(INTEREST_FIELDS)],
    properties:{
      change:{type:"string",enum:["form","deepen","revise","let_go"]},
      interestRef:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
      ...INTEREST_FIELDS,
    }},
});

function text(value,max){
  return typeof value==="string"&&value.trim()!==""&&value.trim().length<=max?value.trim():null;
}

// The meaning-bearing content of one interest, or null when it is not one.
export function normalizeInterest(item){
  if(item===null||typeof item!=="object")return null;
  const subject=text(item.subject,120),draw=text(item.draw,400),selfImage=text(item.selfImage,300);
  const openQuestions=Array.isArray(item.openQuestions)
    ?item.openQuestions.map(question=>text(question,200)).filter(Boolean).slice(0,3):[];
  if(subject===null||subject.length<3||draw===null||selfImage===null)return null;
  return Object.freeze({subject,draw,selfImage,openQuestions:Object.freeze(openQuestions),
    standing:text(item.standing,300)});
}

export function interestId({threadId,sourceRef,subject}){
  return `int_${sha256(canonicalJson({threadId,sourceRef,subject})).slice(0,32)}`;
}

// How an interest enters this Thread's own developed-self evidence.
export function interestText(interest){
  const asking=interest.openQuestions.length===0?""
    :" Still asking: "+interest.openQuestions.join(" ");
  const standing=interest.standing?" Where I stand in it among the people around me: "+interest.standing:"";
  return `Interest — ${interest.subject}: ${interest.draw} How I see myself in it: ${interest.selfImage}${standing}${asking}`;
}

// What the Thread's reflection sees of its interests.
export function interestsInReflection(interests){
  return interests.map(interest=>({interestRef:interest.interestId,subject:interest.subject,
    draw:interest.draw,selfImage:interest.selfImage,openQuestions:[...interest.openQuestions],
    standing:interest.standing??null}));
}

// A Thread that has never held an interest forms its first ones once, from its
// own formative past: one reflection over its own memories and self-description.
export async function formFormativeInterests({thread,memories,experienceStore,modelAdapter,asOf}){
  if(experienceStore.hasFormedInterests(thread.threadId))return Object.freeze([]);
  const formative=[...memories]
    .sort((a,b)=>(b.salience??0)-(a.salience??0)||String(a.memoryId).localeCompare(String(b.memoryId)))
    .slice(0,FORMATIVE_MEMORY_LIMIT);
  if(formative.length===0)return Object.freeze([]);
  const input={
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",
      selfModel:thread.currentState?.selfModel??"",
      stableTendencies:structuredClone(thread.genome?.textualTraits??{}),
    },
    formativeMemories:formative.map(memory=>({memoryId:memory.memoryId,
      subjectPeriod:memory.subjectPeriod??null,...memoryInMind(memory)})),
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("experience.interest-formation",{threadId:thread.threadId}),
    input,
    responseSchema:{type:"object",additionalProperties:false,required:["interests"],
      properties:{interests:{type:"array",minItems:1,maxItems:INTEREST_LIMIT,
        items:{type:"object",additionalProperties:false,
          required:[...Object.keys(INTEREST_FIELDS),"evidenceRefs"],
          properties:{...INTEREST_FIELDS,
            evidenceRefs:{type:"array",minItems:1,maxItems:6,items:{type:"string",minLength:1}}}}}}},
    clientRequestId:`interest-formation_${sha256(canonicalJson(input)).slice(0,32)}`,
  });
  assertPlainObject("interest formation output",invocation.output);
  const supplied=new Set(formative.map(memory=>memory.memoryId));
  const recorded=[];
  for(const item of (invocation.output.interests??[]).slice(0,INTEREST_LIMIT)){
    const interest=normalizeInterest(item);
    // An interest rests on memories this Thread actually has.
    const evidenceRefs=[...new Set((item?.evidenceRefs??[]).filter(ref=>supplied.has(ref)))];
    if(interest===null||evidenceRefs.length===0)continue;
    recorded.push(experienceStore.recordInterest({
      threadId:thread.threadId,
      interestId:interestId({threadId:thread.threadId,sourceRef:FORMATIVE_SOURCE,subject:interest.subject}),
      status:"current",interest,evidenceRefs,
      formedBy:FORMATIVE_SOURCE,sourceRef:FORMATIVE_SOURCE,asOf,
    }));
  }
  return Object.freeze(recorded);
}

// Changes from one delayed reflection, citing the experiences it reflected on.
// A change to an interest the Thread does not hold, a fifth interest, or one
// that is not an interest at all is dropped and counted.
export function admitInterestChanges({experienceStore,threadId,changes,current,
  evidenceRefs,sourceRef,asOf}){
  const held=new Map(current.map(interest=>[interest.interestId,interest]));
  let count=current.length;
  const admitted=[];
  let dropped=0;
  for(const change of changes){
    const interest=normalizeInterest(change);
    const existing=change.interestRef===null?null:held.get(change.interestRef)??null;
    const forming=change.change==="form";
    if(interest===null||(forming?change.interestRef!==null||count>=INTEREST_LIMIT:existing===null)){
      dropped+=1;continue;
    }
    const id=forming?interestId({threadId,sourceRef,subject:interest.subject}):existing.interestId;
    admitted.push(experienceStore.recordInterest({
      threadId,interestId:id,status:change.change==="let_go"?"let_go":"current",
      interest,evidenceRefs:[...evidenceRefs],formedBy:"consolidation",sourceRef,asOf,
    }).interestId);
    if(forming)count+=1;
  }
  return Object.freeze({admitted:Object.freeze(admitted),dropped});
}
