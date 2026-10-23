import { projectPublicEmbodimentVisualIdentity } from "./thread-presentation-embodiment-projection.mjs";
import { canonicalVisualAppearanceLayers } from "./canonical-visual-identity-from-physical-genome.mjs";

// Only an already authorized public portrait may supply physical description.
// Canonical source attributes are context, never an inferred identity or motive.
function publicAppearance(threadId,embodimentStore){
  const portraits=embodimentStore?.listCurrent?.(threadId)??[];
  for(const embodiment of portraits){
    const projection=projectPublicEmbodimentVisualIdentity(embodiment,{
      provenanceRef:embodiment.embodimentId,
    });
    if(projection===null)continue;
    const layers=canonicalVisualAppearanceLayers(projection.subjectDescription);
    const description=layers===null?projection.subjectDescription
      :[layers.geometryDescription.slice(0,160),
        layers.surfaceDescription.slice(0,160)].join("; ");
    return description.replace(/\bThreads?\b/gi,"person").trim().slice(0,340);
  }
  return null;
}

function observerNameKnowledge({
  observerThreadId,threadId,situatedLifeStore,experienceStore,at,
}={}){
  if(observerThreadId==null||observerThreadId===threadId)
    return {full:false,heard:null};
  const related=situatedLifeStore?.listCurrentLifeRelations?.(observerThreadId)
    ?.some(item=>item.relatedParty?.partyId===threadId
      &&(item.relatedParty.kind==="thread"
        ||item.relatedParty.kind===undefined))??false;
  if(related)return {full:true,heard:null};
  const heard=experienceStore?.heardSelfIntroductionName?.(
    observerThreadId,threadId,{before:at},
  )??null;
  if(heard!==null)return {full:false,heard};
  return {full:experienceStore?.hasMetEncounter?.(
    observerThreadId,threadId,{before:at},
  )??false,heard:null};
}

export function personKnownToObserver(options={}){
  const knowledge=observerNameKnowledge(options);
  return knowledge.full||knowledge.heard!==null;
}

function redactUnknownName(description,name,heardName=null){
  if(typeof name!=="string"||name.trim()==="")return description;
  const allowed=new Set((heardName?.match(/[\p{L}\p{N}]+/gu)??[])
    .map(token=>token.toLocaleLowerCase()));
  const parts=[name.trim(),...(name.match(/[\p{L}\p{N}]+/gu)??[])
    .filter(part=>!allowed.has(part.toLocaleLowerCase()))]
    .filter(part=>part.length>1).sort((a,b)=>b.length-a.length);
  return [...new Set(parts)].reduce((text,part)=>{
    const escaped=part.replace(/[|\\{}()[\]^$+*?.-]/g,"\\$&");
    return text.replace(new RegExp(
      "(?<![\\p{L}\\p{N}])"+escaped+"(?![\\p{L}\\p{N}])","giu",
    ),part===name.trim()&&heardName!==null?heardName:"a person");
  },description);
}

// This is an observer-relative projection, not a new identity authority.
// Objective stories have no observer and must not disclose civil names.
export function observablePerson({
  threadId,situation,observerThreadId=null,name=null,
  embodimentStore=null,situatedLifeStore=null,experienceStore=null,
  at=situation.establishedAt,
}={}){
  const knowledge=observerNameKnowledge({
    observerThreadId,threadId,situatedLifeStore,experienceStore,at,
  });
  const known=knowledge.full;
  const heardName=knowledge.heard;
  const appearance=publicAppearance(threadId,embodimentStore);
  const activity=typeof situation.activity==="string"
    ?situation.activity.trim().slice(0,120):"";
  const description=[
    appearance===null?"a person":appearance,
    ...(activity?[`Currently: ${activity}`]:[]),
  ].join("; ");
  // Objective World Stories have no observer, hence no authority to reveal
  // names. For unfamiliar witnesses, redact both portrait and activity prose.
  return Object.freeze({
    name:typeof name!=="string"?null:known?name:heardName,
    observableDescription:(known?description
      :redactUnknownName(description,name,heardName)).slice(0,480),
  });
}
