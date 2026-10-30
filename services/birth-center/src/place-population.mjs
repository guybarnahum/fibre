import { sha256 } from "./state-codec.mjs";
import { referencePopulationIds } from "../../../core/src/human-appearance/index.mjs";

// A Place is a shared civic/population prior, never a pre-authored person.
const textField = {type:"string",minLength:1};
const textList = (minItems=1,maxItems=8) => ({type:"array",minItems,maxItems,items:textField});
const fraction = {type:"number",minimum:0,maximum:1};
const positive = {type:"number",exclusiveMinimum:0};
const originSchema = {
  type:"object",additionalProperties:false,
  required:["originId","label","share","heritageTags","referencePopulations","heritageLanguages","householdRetentionRate"],
  properties:{
    originId:textField,label:textField,share:positive,
    heritageTags:textList(1,3),
    referencePopulations:{type:"array",minItems:1,maxItems:3,items:{
      type:"object",additionalProperties:false,required:["population","share","referencePopulation"],
      properties:{population:textField,share:positive,referencePopulation:{type:"string",enum:referencePopulationIds}},
    }},
    heritageLanguages:textList(1,3),householdRetentionRate:fraction,
  },
};
const coupleSchema = {
  type:"object",additionalProperties:false,
  required:["motherOriginId","fatherOriginId","weight","childGivenNameTradition"],
  properties:{
    motherOriginId:textField,fatherOriginId:textField,weight:positive,
    childGivenNameTradition:{
      type:"object",additionalProperties:false,required:["mother","father","local"],
      properties:{mother:fraction,father:fraction,local:fraction},
    },
  },
};
const householdPatternSchema={
  type:"object",additionalProperties:false,
  required:["caregivers","siblings","weight"],
  properties:{
    caregivers:{type:"array",minItems:1,maxItems:4,items:{
      type:"string",enum:["mother","father","grandmother","grandfather"],
    }},
    siblings:{type:"integer",minimum:0,maximum:4},
    weight:positive,
  },
};
export const PLACE_POPULATION_SCHEMA = {
  type:"object",additionalProperties:false,
  required:[
    "timeZone","homeDescription","schoolDescription","transitDescription",
    "learningDescription","commerceDescription","mobilityPattern",
    "schoolingOrCommunityContext","culturalContext","availableInstitutions",
    "intellectualEnvironment","schoolingLanguages","originGroups","couples",
    "mixedParentShare","localNamingOriginId","householdPatterns",
  ],
  properties:{
    timeZone:textField,homeDescription:textField,schoolDescription:textField,
    transitDescription:textField,learningDescription:textField,commerceDescription:textField,
    mobilityPattern:textField,schoolingOrCommunityContext:textField,culturalContext:textField,
    availableInstitutions:textList(3,12),intellectualEnvironment:textField,
    schoolingLanguages:textList(1,3),
    originGroups:{type:"array",minItems:8,maxItems:20,items:originSchema},
    couples:{type:"array",minItems:2,maxItems:40,items:coupleSchema},
    mixedParentShare:fraction,localNamingOriginId:textField,
    householdPatterns:{type:"array",minItems:3,maxItems:6,items:householdPatternSchema},
  },
};

function nonEmpty(value){return typeof value==="string"&&value.trim().length>0;}
function validList(value,min=1,max=100){
  return Array.isArray(value)&&value.length>=min&&value.length<=max&&value.every(nonEmpty);
}
function bad(reason){throw new TypeError("Invalid authored Place Population: "+reason);}
const referenceIds = new Set(referencePopulationIds);

export function validatePlacePopulation(value){
  if(!value||typeof value!=="object"||Array.isArray(value))bad("missing Place");
  if(!Number.isFinite(value.mixedParentShare)||value.mixedParentShare<0||value.mixedParentShare>1)
    bad("mixedParentShare must be between 0 and 1");
  if(!validList(value.schoolingLanguages,1,3))bad("schooling languages must contain 1–3 names");
  if(!Array.isArray(value.householdPatterns)||value.householdPatterns.length<3||value.householdPatterns.length>6)
    bad("householdPatterns must contain 3–6 weighted entries");
  const householdKeys=new Set();
  for(const pattern of value.householdPatterns){
    const caregivers=pattern?.caregivers;
    if(!Array.isArray(caregivers)||caregivers.length<1||caregivers.length>4
      ||caregivers.some(role=>!["mother","father","grandmother","grandfather"].includes(role))
      ||new Set(caregivers).size!==caregivers.length
      ||(!caregivers.includes("mother")&&!caregivers.includes("father")))
      bad("a household needs distinct permitted caregivers and at least one parent");
    if(!Number.isSafeInteger(pattern.siblings)||pattern.siblings<0||pattern.siblings>4
      ||!Number.isFinite(pattern.weight)||pattern.weight<=0)
      bad("household siblings or weight is invalid");
    const key=[...caregivers].sort().join(",")+":"+pattern.siblings;
    if(householdKeys.has(key))bad("duplicate household pattern");
    householdKeys.add(key);
  }
  if(!Array.isArray(value.originGroups)||value.originGroups.length<8||value.originGroups.length>20)
    bad("expected 8–20 distinct origin groups");
  const origins=new Map();
  for(const group of value.originGroups){
    if(!nonEmpty(group?.originId)||!nonEmpty(group.label)||origins.has(group.originId))
      bad("origin IDs must be distinct and named");
    if(!Number.isFinite(group.share)||group.share<=0)bad("origin share must be positive");
    if(!validList(group.heritageTags)||!validList(group.heritageLanguages,1,3))
      bad("origin heritage and language evidence are required");
    if(!Number.isFinite(group.householdRetentionRate)||group.householdRetentionRate<0||group.householdRetentionRate>1)
      bad("household retention rate must be between 0 and 1");
    if(!Array.isArray(group.referencePopulations)||group.referencePopulations.length<1)
      bad("physical reference populations missing");
    let total=0;
    for(const ancestry of group.referencePopulations){
      if(!nonEmpty(ancestry?.population)||!referenceIds.has(ancestry.referencePopulation)
        ||!Number.isFinite(ancestry.share)||ancestry.share<=0)
        bad("invalid physical reference ancestry");
      total+=ancestry.share;
    }
    if(Math.abs(total-1)>0.015)bad("physical ancestry shares must sum to one");
    origins.set(group.originId,group);
  }
  const residentTotal=[...origins.values()].reduce((sum,group)=>sum+group.share,0);
  if(Math.abs(residentTotal-1)>0.03)bad("resident origin shares must sum to one");
  if(!origins.has(value.localNamingOriginId))bad("local naming origin does not exist");
  if(!Array.isArray(value.couples)||value.couples.length<2)bad("couples are required");
  let same=0,mixed=0;
  const unique=new Set();
  for(const couple of value.couples){
    if(!origins.has(couple?.motherOriginId)||!origins.has(couple.fatherOriginId)
      ||!Number.isFinite(couple.weight)||couple.weight<=0)
      bad("couple references unknown origin or invalid weight");
    const key=couple.motherOriginId+"|"+couple.fatherOriginId;
    if(unique.has(key))bad("duplicate couple");
    unique.add(key);
    const weights=couple.childGivenNameTradition;
    if(!weights||["mother","father","local"].some(k=>!Number.isFinite(weights[k])||weights[k]<0)
      ||weights.mother+weights.father+weights.local<=0)
      bad("child naming source weights must be nonnegative with a positive total");
    if(couple.motherOriginId===couple.fatherOriginId)same++;else mixed++;
  }
  if(value.mixedParentShare>0&&mixed===0)bad("mixedParentShare requires a different-origin couple");
  if(value.mixedParentShare<1&&same===0)bad("mixedParentShare requires a same-origin couple");
  try { new Intl.DateTimeFormat("en-US",{timeZone:value.timeZone}).format(new Date(0)); }
  catch {bad("time zone is invalid");}
  return value;
}

function unit(seed){
  return Number.parseInt(sha256(seed).slice(0,12),16)/0x1000000000000;
}
function weighted(entries,seed,weight){
  const total=entries.reduce((sum,item)=>sum+weight(item),0);
  if(total<=0)throw new TypeError("No weighted candidates");
  let draw=unit(seed)*total;
  for(const item of entries){draw-=weight(item);if(draw<0)return item;}
  return entries.at(-1);
}
export function chooseHouseholdPattern({place,requestId}){
  return weighted(place.householdPatterns,requestId+"\\0household-pattern",item=>item.weight);
}

export function choosePlaceCouple({place,requestId,heritage=null}){
  // Model output is checked before entering the versioned Place store.
  // Never redo that authoring-time validation for every child draw.
  const origins=new Map(place.originGroups.map(group=>[group.originId,group]));
  const heritageKey=heritage?.trim().toLocaleLowerCase("en-US")??null;
  const filtered=place.couples.filter(couple=>heritageKey===null||
    [couple.motherOriginId,couple.fatherOriginId].some(id=>
      origins.get(id).heritageTags.some(tag=>tag.toLocaleLowerCase("en-US")===heritageKey)));
  if(filtered.length===0)throw new TypeError("No Place couples match heritage "+heritage);
  const preferMixed=unit(requestId+"\\0couple-class")<place.mixedParentShare;
  const preferred=filtered.filter(c=>(c.motherOriginId!==c.fatherOriginId)===preferMixed);
  const chosen=weighted(preferred.length?preferred:filtered.filter(c=>(c.motherOriginId!==c.fatherOriginId)!==preferMixed),
    requestId+"\\0couple-weight",c=>c.weight);
  return Object.freeze({couple:chosen,mother:origins.get(chosen.motherOriginId),
    father:origins.get(chosen.fatherOriginId),mixed:chosen.motherOriginId!==chosen.fatherOriginId});
}

export async function authorPlacePopulation({adapter,selector,placeKey,version,repair=null}){
  const prompt=[
    "Author one bounded civic Place and resident population for a Fibre birth cohort.",
    "Return one compact JSON object with civic context, schoolingLanguages, 8–20 concrete originGroups, at most 40 weighted couples, localNamingOriginId and mixedParentShare.",
    "The place describes residents, not one family or a future person's personality. Give each civic description only one or two concrete sentences; avoid repetition.",
    "Choose 8–20 concrete local resident origin groups. Use at most 3 heritageTags and 3 referencePopulations per group; only include meaningful roots and household languages.",
    "Every origin's referencePopulations must sum to 1. Select referencePopulation only from the codes permitted by the schema.",
    "Use no more than 40 plausible mother/father origin pairings, concentrating on couples representing the large majority of births; rare pairings can be omitted. Weights are relative within same/mixed classes, not independent resident draws. mixedParentShare must still estimate the true mixed-child fraction.",
    "Author 3–6 distinct householdPatterns, each {caregivers,siblings,weight}, with positive plausible relative weights for this city and child birth decade. Caregivers are a unique subset of mother, father, grandmother, grandfather and include at least one parent. Siblings is 0–4. Include ordinary variation: some only children, some younger siblings, and some households with one non-caregiving parent or a grandparent. Do not default everyone to two caregivers and an older sibling.",
    "mixedParentShare is the estimated share of children in this exact place and child's birth decade with different mother/father originId values, not a worldwide constant. It may be high in Hilo and low in Chengdu. A group with internally mixed ancestry paired with itself counts as same-origin.",
    "If mixedParentShare > 0 include a different-origin couple; if < 1 include a same-origin couple. Couple's childGivenNameTradition gives nonnegative weights for mother, father or local mainstream naming source. No name lists in the Place record.",
    "A heritage filter selects existing couples, never reauthors a place. Do not assign religion, ability, character, class, work, political orientation, trauma or interests to an individual from a group.",
    "Use a valid IANA time zone and ordinary plausible school language exposure. Avoid claims of census precision.",
  ].join("\n");
  const result=await adapter.invoke({
    clientRequestId:"birth_population_"+sha256(placeKey+":"+version).slice(0,24)+(repair===null?"_author":"_repair"),
    systemPrompt:repair===null?prompt:prompt+"\n"+(
      /incomplete|cut off|max_output_tokens|max_tokens/iu.test(repair)
        ?"The previous output was cut off before completion. Return a more concise, complete JSON object within the output token budget. Do not omit required fields."
        :"Previous material failed validation: "+repair+". Return a concise, complete corrected object."
    ),
    input:{country:selector.country,city:selector.city,decade:placeKey.split(":")[1]},
    responseSchema:PLACE_POPULATION_SCHEMA,
  });
  return validatePlacePopulation(result.output);
}

const names={type:"array",minItems:24,maxItems:48,items:textField};
export const NAMING_TRADITION_SCHEMA={
  type:"object",additionalProperties:false,
  required:["parentNamesByDecade","childFemaleGivenNames","childMaleGivenNames",
    "familyNames","transmission","nameOrder","joiner","patronymicMaleSuffix","patronymicFemaleSuffix"],
  properties:{
    parentNamesByDecade:{type:"array",minItems:3,maxItems:3,items:{
      type:"object",additionalProperties:false,
      required:["decade","femaleGivenNames","maleGivenNames"],
      properties:{decade:{type:"integer"},femaleGivenNames:names,maleGivenNames:names},
    }},
    childFemaleGivenNames:names,childMaleGivenNames:names,familyNames:names,
    transmission:{type:"string",enum:["father","mother","mother+father","patronymic"]},
    nameOrder:{type:"string",enum:["given_family","family_given"]},
    joiner:{type:"string"},patronymicMaleSuffix:{type:"string"},patronymicFemaleSuffix:{type:"string"},
  },
};
function distinctNames(value){
  return validList(value,24,48)
    &&new Set(value.map(n=>n.toLocaleLowerCase("en-US"))).size===value.length;
}
export function validateNamingTradition(value,childDecade){
  if(!value||typeof value!=="object")throw new TypeError("Naming tradition is missing");
  if(!Number.isSafeInteger(childDecade)||childDecade%10!==0)
    throw new TypeError("Naming child decade is invalid");
  const expected=new Set([childDecade-40,childDecade-30,childDecade-20]);
  if(!Array.isArray(value.parentNamesByDecade)||value.parentNamesByDecade.length!==3)
    throw new TypeError("Naming tradition must cover three parent birth decades");
  for(const group of value.parentNamesByDecade){
    if(!expected.delete(group.decade)
      ||!distinctNames(group.femaleGivenNames)||!distinctNames(group.maleGivenNames))
      throw new TypeError("Naming tradition has missing or invalid parent-decade names");
  }
  if(expected.size)throw new TypeError("Naming tradition omitted a parent birth decade");
  for(const field of ["childFemaleGivenNames","childMaleGivenNames","familyNames"]){
    if(!distinctNames(value[field]))
      throw new TypeError("Naming tradition has insufficient distinct "+field);
  }
  if(!["father","mother","mother+father","patronymic"].includes(value.transmission)
    ||!["given_family","family_given"].includes(value.nameOrder))
    throw new TypeError("Naming tradition lacks valid composition rules");
  if(typeof value.joiner!=="string"||typeof value.patronymicMaleSuffix!=="string"
    ||typeof value.patronymicFemaleSuffix!=="string")
    throw new TypeError("Naming tradition joiner/suffix is invalid");
  return value;
}
export async function authorNamingTradition({adapter,place,origin,childDecade,placeVersion,repair=null}){
  const prompt=[
    "Author concise naming material for one concrete resident origin in a Fibre Place and child's birth decade.",
    "Supply 24–48 distinct plausible female/male given names for the child's decade, 24–48 family names, and THREE separate parentNamesByDecade pools (24–48 female/male given names each) for the precise decades childDecade-40, -30 and -20.",
    "Parent birth decades are selected deterministically from plausible ages at childbirth. Each pool must fit that particular era; a generalized parent pool is not valid.",
    "Return transmission: father, mother, mother+father, or patronymic, plus nameOrder: given_family or family_given, and a joiner for two-part family names (usually a space or hyphen).",
    "If patronymic, return gender-specific patronymic suffixes; otherwise both can be empty. Do not infer observance, personality, values or class from naming.",
    "Preserve authentic Unicode orthography, spaces and culturally meaningful joins. Names are candidates, not people.",
  ].join("\n");
  const result=await adapter.invoke({
    clientRequestId:"birth_names_"+sha256(place.key+":"+placeVersion+":"+origin.originId+":"+childDecade).slice(0,24)+(repair===null?"_author":"_repair"),
    systemPrompt:repair===null?prompt:prompt+"\nPrevious naming output was rejected: "+repair+". Regenerate the complete object.",
    input:{country:place.selector?.country??null,city:place.selector?.city??null,
      origin:origin.label,childDecade:Number(childDecade),
      parentDecades:[Number(childDecade)-40,Number(childDecade)-30,Number(childDecade)-20]},
    responseSchema:NAMING_TRADITION_SCHEMA,
  });
  return validateNamingTradition(result.output,Number(childDecade));
}

export function selectName(parts,requestId,label,ordinal=0){
  return parts[Math.floor(unit(requestId+"\\0"+label+"\\0"+ordinal)*parts.length)];
}
export function chooseChildTradition({couple,place,requestId}){
  const choices=[
    {id:couple.motherOriginId,weight:couple.childGivenNameTradition.mother},
    {id:couple.fatherOriginId,weight:couple.childGivenNameTradition.father},
    {id:place.localNamingOriginId,weight:couple.childGivenNameTradition.local},
  ];
  return weighted(choices,requestId+"\\0child-tradition",item=>item.weight).id;
}
