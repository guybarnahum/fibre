import {canonicalJson,sha256} from "./persistence-common.mjs";

// Useful and learning moments: in its own reflection a Thread recognises that
// it helped, informed, showed or made something for someone, and how that was
// taken, or that it learned something from someone, and how it feels about
// it. Each is tied to the person, who must have acted in the experiences
// reflected on. Its felt standing per interest is its own words on the
// interest, revised from these moments as it weighs who they came from.
// There is no expertise level. See docs/concepts/interests-expertise-and-livelihood.md.

export const MOMENT_LIMIT=2;
const REFLECTION_MOMENTS=6;
// How the Thread felt something it offered was taken. Operator inspection
// only: never model-visible; the moment's own words carry the meaning.
const TAKEN=Object.freeze(["valued","ignored","corrected","unclear"]);

export const MOMENT_SCHEMA=Object.freeze({
  type:"array",maxItems:MOMENT_LIMIT,
  items:{type:"object",additionalProperties:false,
    required:["kind","personRef","interestRef","moment","taken","reaction"],
    properties:{
      kind:{type:"string",enum:["useful","learning"]},
      personRef:{type:"string",minLength:1},
      interestRef:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
      moment:{type:"string",minLength:1,maxLength:400},
      taken:{anyOf:[{type:"string",enum:[...TAKEN]},{type:"null"}]},
      reaction:{type:"string",minLength:1,maxLength:300},
    }},
});

function text(value,max){
  return typeof value==="string"&&value.trim()!==""&&value.trim().length<=max?value.trim():null;
}

// Decisions recorded before moments existed have none; one that is not a
// moment is left out here and counted when admitted.
export function normalizeMoments(items){
  return Object.freeze((Array.isArray(items)?items:[]).slice(0,MOMENT_LIMIT).map(item=>{
    if(item===null||typeof item!=="object")return null;
    const kind=["useful","learning"].includes(item.kind)?item.kind:null;
    const moment=text(item.moment,400),reaction=text(item.reaction,300);
    if(kind===null||typeof item.personRef!=="string"||moment===null||reaction===null)return null;
    return Object.freeze({kind,personRef:item.personRef,
      interestRef:typeof item.interestRef==="string"?item.interestRef:null,
      moment,reaction,taken:kind==="useful"&&TAKEN.includes(item.taken)?item.taken:null});
  }));
}

// A moment names someone who acted here and, if any, an interest this Thread
// holds; otherwise it is dropped. Recording again after an interruption adds nothing.
export function admitMoments({experienceStore,threadId,moments,people,interests,sourceRef,asOf}){
  const held=new Set(interests.map(interest=>interest.interestId));
  const admitted=[];
  let dropped=0;
  moments.forEach((item,ordinal)=>{
    const person=item===null?undefined:people.find(entry=>entry.personRef===item.personRef);
    if(person===undefined||(item.interestRef!==null&&!held.has(item.interestRef))){dropped+=1;return;}
    admitted.push(experienceStore.recordSocialMoment({
      momentId:`mom_${sha256(canonicalJson({threadId,sourceRef,ordinal})).slice(0,32)}`,
      threadId,kind:item.kind,personThreadId:person.personRef,interestId:item.interestRef,
      moment:{person:(person.name??person.appearance??"someone").slice(0,200),
        moment:item.moment,taken:item.taken,reaction:item.reaction},
      evidenceRefs:[...person.evidenceRefs],sourceRef,asOf,
    }).momentId);
  });
  return Object.freeze({admitted:Object.freeze(admitted),dropped});
}

// What the Thread's reflection sees of its recent moments, so it can revise
// its standing weighing who they came from by its own regard for them.
export function momentsInReflection(experienceStore,threadId){
  return (experienceStore.listSocialMoments?.(threadId,{limit:REFLECTION_MOMENTS})??[])
    .map(moment=>({kind:moment.kind,personRef:moment.personThreadId,person:moment.person,
      interestRef:moment.interestId,moment:moment.moment,reaction:moment.reaction,asOf:moment.asOf}));
}

// How a moment with the person it faces enters this Thread's evidence.
export function momentText(moment){
  const lead=moment.kind==="useful"?`Useful to ${moment.person}`:`Learned from ${moment.person}`;
  return `${lead}: ${moment.moment} How I felt: ${moment.reaction}`;
}
