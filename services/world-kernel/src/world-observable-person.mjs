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

export function personKnownToObserver({
  observerThreadId,threadId,situatedLifeStore,experienceStore,at,
}={}){
  if(observerThreadId==null||observerThreadId===threadId)return false;
  const relation=situatedLifeStore?.listCurrentLifeRelations?.(observerThreadId)
    ?.some(item=>item.relatedParty?.partyId===threadId
      &&(item.relatedParty.kind==="thread"
        ||item.relatedParty.kind===undefined))??false;
  return relation||(experienceStore?.hasMetEncounter?.(
    observerThreadId,threadId,{before:at},
  )??false);
}

function redactUnknownName(description,name){
  if(typeof name!=="string"||name.trim()==="")return description;
  // Remove a complete name and its individual words from public prose.
  const parts=[name.trim(),...(name.match(/[\p{L}\p{N}]+/gu)??[])]
    .filter(part=>part.length>1).sort((a,b)=>b.length-a.length);
  return [...new Set(parts)].reduce((text,part)=>{
    const escaped=part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    return text.replace(new RegExp(
      `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,"giu",
    ),"a person");
  },description);
}
// One World-owned projection reused by objective arrival and private percept.");
    return text.replace(new RegExp(
      `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,"giu",
    ),"a person");
  },description);
}

// One World-owned projection reused by objective arrival and private percept.
// The name field reflects *observer knowledge*, never the other person's
// globally stored legal identity being magically visible to strangers.
export function observablePerson({
  threadId,situation,observerThreadId=null,name=null,
  embodimentStore=null,situatedLifeStore=null,experienceStore=null,
  at=situation.establishedAt,
}={}){
  const known=personKnownToObserver({
    observerThreadId,threadId,situatedLifeStore,experienceStore,at,
  });
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
    name:known&&typeof name==="string"?name:null,
    observableDescription:(known?description
      :redactUnknownName(description,name)).slice(0,480),
  });
}
