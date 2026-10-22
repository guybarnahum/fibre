import { projectPublicEmbodimentVisualIdentity } from "./thread-presentation-embodiment-projection.mjs";
import { canonicalVisualAppearanceLayers } from "./canonical-visual-identity-from-physical-genome.mjs";

// Only an already authorized public portrait may supply physical description.
// Canonical source attributes are context, never an inferred identity or motive.
function publicAppearance(threadId,embodimentStore){
  const portraits=embodimentStore?.listCurrent?.(threadId)??[];
  for(const embodiment of portraits){
    const projection=projectPublicEmbodimentVisualIdentity(embodiment);
    if(projection===null)continue;
    const layers=canonicalVisualAppearanceLayers(projection.subjectDescription);
    const description=layers===null?projection.subjectDescription
      :[layers.geometryDescription,layers.surfaceDescription].join("; ");
    return description.trim().slice(0,340);
  }
  return null;
}

export function personKnownToObserver({
  observerThreadId,threadId,situatedLifeStore,experienceStore,at,
}={}){
  if(observerThreadId==null||observerThreadId===threadId)return false;
  const relation=situatedLifeStore?.listCurrentLifeRelations?.(observerThreadId)
    ?.some(item=>item.relatedParty?.kind==="thread"
      &&item.relatedParty.partyId===threadId)??false;
  return relation||(experienceStore?.hasMetEncounter?.(
    observerThreadId,threadId,{before:at},
  )??false);
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
  // A public appearance can contain an identity label in an older portrait
  // brief. Do not disclose the name unless the observer already knows it.
  const physical=known||typeof name!=="string"?appearance
    :appearance?.replaceAll(name,"a person")??null;
  const description=[
    physical===null?"a person":physical,
    ...(activity?[`Currently: ${activity}`]:[]),
  ].join("; ");
  return Object.freeze({
    name:known&&typeof name==="string"?name:null,
    observableDescription:description.slice(0,480),
    appearanceRef:appearance===null?null:threadId,
  });
}
