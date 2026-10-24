import { projectPublicEmbodimentVisualIdentity } from "./thread-presentation-embodiment-projection.mjs";
import { canonicalVisualAppearanceLayers } from "./canonical-visual-identity-from-physical-genome.mjs";
import { ageYearsAt } from "./visual-identity-reference-domain.mjs";

// Only an already authorized public portrait may supply physical description.
// Canonical source attributes are context, never an inferred identity or motive.
function agePhrase(birthDate,at,sex){
  const years=ageYearsAt(birthDate,at);
  const adult=sex==="male"?"man":sex==="female"?"woman":"person";
  if(years===null)return "a "+adult;
  if(years<13)return sex==="male"?"a boy":sex==="female"?"a girl":"a child";
  if(years<20)return "a teenage "+(sex==="male"?"boy":sex==="female"?"girl":"person");
  if(years>=80)return "an older "+adult;
  const names=["twenties","thirties","forties","fifties","sixties","seventies"];
  const band=names[Math.floor(years/10)-2];
  return band?"a "+adult+" in "+(sex==="female"?"her":sex==="male"?"his":"their")+" "+band:"a "+adult;
}

function surfaceTrait(surface,key){
  const match=surface.match(new RegExp("(?:^|;\\s*)"+key+":\\s*([^;.\\n]+)","u"));
  return match?.[1]?.trim().toLowerCase()??null;
}

function visibleAppearance(layers,birthDate,at){
  const color=surfaceTrait(layers.surfaceDescription,"hairColor");
  const texture=surfaceTrait(layers.surfaceDescription,"hairTexture");
  const hairColors={
    "very light":"light-colored",blond:"blond",
    "light brown":"light brown",brown:"brown",
    "dark brown/black":"dark brown",
  };
  const hairTextures=new Set(["straight","wavy","curly","coily"]);
  const hair=[hairTextures.has(texture)?texture:null,hairColors[color]??null]
    .filter(Boolean).join(" ");
  const who=agePhrase(birthDate,at,layers.sex);
  return hair?who+" with "+hair+" hair":who;
}

// An available public portrait may inform what is visible, but its rendering
// specifications and inherited physical coordinates are never perception prose.
function publicAppearance(threadId,embodimentStore,birthDate,at){
  const portraits=embodimentStore?.listCurrent?.(threadId)??[];
  for(const embodiment of portraits){
    const projection=projectPublicEmbodimentVisualIdentity(embodiment,{
      provenanceRef:embodiment.embodimentId,
    });
    if(projection===null)continue;
    const layers=canonicalVisualAppearanceLayers(projection.subjectDescription);
    if(layers!==null)return visibleAppearance(layers,birthDate,at);
    const clause=projection.subjectDescription.split(/[;\n.]/u)[0]
      ?.replace(/\bThreads?\b/giu,"person").trim()??"";
    if(!clause||/:|\b(?:phenotype|zygomatic|faceWidth|pigmentation)\b/iu.test(clause))
      return "a person";
    const words=clause.split(/\s+/u),bounded=[];
    for(const word of words){
      if(([...bounded,word].join(" ")).length>120)break;
      bounded.push(word);
    }
    return bounded.join(" ")||"a person";
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

function boundedDescription(text){
  const words=[];
  for(const word of text.trim().split(/\s+/u)){
    if([...words,word].join(" ").length>120)break;
    words.push(word);
  }
  return words.join(" ")||"a person";
}

// This is an observer-relative projection, not a new identity authority.
// Objective stories have no observer and must not disclose civil names.
export function observablePerson({
  threadId,situation,observerThreadId=null,name=null,birthDate=null,
  embodimentStore=null,situatedLifeStore=null,experienceStore=null,
  at=situation.establishedAt,
}={}){
  const knowledge=observerNameKnowledge({
    observerThreadId,threadId,situatedLifeStore,experienceStore,at,
  });
  const known=knowledge.full;
  const heardName=knowledge.heard;
  const description=publicAppearance(threadId,embodimentStore,birthDate,at)??"a person";
  // Objective World Stories have no observer, hence no authority to reveal
  // names. For unfamiliar witnesses, redact any identity in portrait prose.
  return Object.freeze({
    name:typeof name!=="string"?null:known?name:heardName,
    observableDescription:boundedDescription(known?description
      :redactUnknownName(description,name,heardName)),
  });
}
