import {canonicalJson,sha256} from "./persistence-common.mjs";

// Perceived regard (ADR-0037): in its own reflection a Thread recognises
// moments where regard showed between it and one person: credited or passed
// over, asked for advice, corrected (before others or not), talked over,
// giving way or holding ground in a disagreement, left out. Each is this
// Thread's perception, never a fact about the other; two Threads may take
// the same talk differently. The account is its own words. It is recorded
// for the Body's felt status (ADR-0037 C3); nothing reads it yet.

export const REGARD_LIMIT=3;
export const REGARD_ACTS=Object.freeze([
  "credited","overlooked","asked_advice","corrected","corrected_publicly",
  "talked_over","gave_way","held_ground","left_out",
]);

export const REGARD_SCHEMA=Object.freeze({
  type:"array",maxItems:REGARD_LIMIT,
  items:{type:"object",additionalProperties:false,
    required:["personRef","act","by","account"],
    properties:{
      personRef:{type:"string",minLength:1},
      act:{type:"string",enum:[...REGARD_ACTS]},
      by:{type:"string",enum:["them","me"]},
      account:{type:"string",minLength:1,maxLength:300},
    }},
});

// Decisions recorded before perceived regard existed have none; an item that
// is not one is left out here and counted when admitted.
export function normalizeRegard(items){
  return Object.freeze((Array.isArray(items)?items:[]).slice(0,REGARD_LIMIT).map(item=>{
    if(item===null||typeof item!=="object")return null;
    const account=typeof item.account==="string"&&item.account.trim()!==""&&item.account.trim().length<=300
      ?item.account.trim():null;
    if(typeof item.personRef!=="string"||!REGARD_ACTS.includes(item.act)
      ||!["them","me"].includes(item.by)||account===null)return null;
    return Object.freeze({personRef:item.personRef,act:item.act,by:item.by,account});
  }));
}

// Regard names someone who acted here, or it is dropped. Recording again
// after an interruption adds nothing.
export function admitRegard({experienceStore,threadId,regard,people,sourceRef,asOf}){
  const admitted=[];
  let dropped=0;
  regard.forEach((item,ordinal)=>{
    const person=item===null?undefined:people.find(entry=>entry.personRef===item.personRef);
    if(person===undefined){dropped+=1;return;}
    admitted.push(experienceStore.recordPerceivedRegard({
      regardId:`reg_${sha256(canonicalJson({threadId,sourceRef,ordinal})).slice(0,32)}`,
      threadId,personThreadId:person.personRef,act:item.act,
      actorThreadId:item.by==="me"?threadId:person.personRef,account:item.account,
      evidenceRefs:[...person.evidenceRefs],sourceRef,asOf,
    }).regardId);
  });
  return Object.freeze({admitted:Object.freeze(admitted),dropped});
}
