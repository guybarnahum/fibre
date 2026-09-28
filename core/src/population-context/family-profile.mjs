import {referencePopulationIds} from "../human-appearance/index.mjs";
import {selectPopulationFamilyProfile} from "./family-profile-selection.mjs";

const ancestrySchema={type:"array",minItems:1,maxItems:3,items:{type:"object",additionalProperties:false,required:["population","share","referencePopulation"],properties:{
  population:{type:"string",minLength:1},share:{type:"number",minimum:0.01,maximum:1},referencePopulation:{type:"string",enum:referencePopulationIds,description:"Physical founder population code from Fibre's shared calibrated hierarchy."}
}}};
const languagesSchema={type:"array",minItems:1,maxItems:3,items:{type:"string",minLength:1}};
const namesSchema={type:"array",minItems:24,items:{type:"string",minLength:1}};

export const FAMILY_PROFILES_SCHEMA=Object.freeze({
  type:"array",minItems:3,maxItems:8,
  items:{type:"object",additionalProperties:false,required:["id","share","familyOriginContext","languages","raisedLanguages","nameOrder","femaleGivenNames","maleGivenNames","familyNames","physicalAncestry"],properties:{
    id:{type:"string",minLength:1},share:{type:"number",minimum:0.01,maximum:1},
    familyOriginContext:{type:"string",minLength:1},
    languages:languagesSchema,raisedLanguages:languagesSchema,
    nameOrder:{type:"string",enum:["given_family","family_given"]},
    femaleGivenNames:namesSchema,maleGivenNames:namesSchema,familyNames:namesSchema,
    physicalAncestry:{type:"object",additionalProperties:false,required:["maternal","paternal"],properties:{maternal:ancestrySchema,paternal:ancestrySchema}}
  }}
});

const fold=value=>String(value??"").trim().toLocaleLowerCase("en-US");
const uniqueClean=values=>{
  const seen=new Set(),out=[];
  for(const value of Array.isArray(values)?values:[]){
    const clean=String(value??"").trim(),key=fold(clean);
    if(!clean||seen.has(key))continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
};

export function normalizeFamilyProfiles(profiles){
  if(!Array.isArray(profiles))return profiles;
  return profiles.map(profile=>({
    ...profile,
    id:String(profile?.id??"").trim(),
    familyOriginContext:String(profile?.familyOriginContext??"").trim(),
    languages:uniqueClean(profile?.languages),
    raisedLanguages:uniqueClean(profile?.raisedLanguages),
    femaleGivenNames:uniqueClean(profile?.femaleGivenNames),
    maleGivenNames:uniqueClean(profile?.maleGivenNames),
    familyNames:uniqueClean(profile?.familyNames),
  }));
}

function validateLanguages(values,label){
  if(!Array.isArray(values)||values.length<1||values.length>3)throw new TypeError(`${label} must contain 1 to 3 languages`);
  const clean=values.map(value=>String(value??"").trim());
  if(clean.some(value=>!value))throw new TypeError(`${label} contains an empty language`);
  if(clean.some(value=>value.length>48||/[;,|\n]|」「/u.test(value)||value.includes("/")||/\s(?:and|or)\s/iu.test(value))){
    throw new TypeError(`${label} must contain one bare language name per item`);
  }
  return clean;
}

function validateNames(values,label){
  if(!Array.isArray(values)||values.length<12)throw new TypeError(`${label} must contain at least 12 names`);
  const clean=values.map(value=>String(value??"").trim());
  if(clean.some(value=>!value))throw new TypeError(`${label} contains an empty name`);
}

export function validateFamilyProfiles(profiles){
  if(!Array.isArray(profiles)||profiles.length===0)throw new TypeError("Population Context requires family profiles");
  const ids=new Set();
  for(const profile of profiles){
    const id=String(profile?.id??"").trim();
    if(!id||ids.has(id))throw new TypeError("Population Context family profile ids must be unique");
    ids.add(id);
    if(!Number.isFinite(Number(profile.share))||Number(profile.share)<=0)throw new TypeError(`family profile ${id} requires a positive share`);
    if(typeof profile.familyOriginContext!=="string"||!profile.familyOriginContext.trim())throw new TypeError(`family profile ${id} requires familyOriginContext`);
    const languages=validateLanguages(profile.languages,`family profile ${id} languages`);
    const raised=validateLanguages(profile.raisedLanguages,`family profile ${id} raisedLanguages`);
    const spoken=new Set(languages.map(fold));
    if(raised.some(value=>!spoken.has(fold(value))))throw new TypeError(`family profile ${id} raised language is absent from eventual languages`);
    if(!["given_family","family_given"].includes(profile.nameOrder))throw new TypeError(`family profile ${id} has unsupported name order`);
    validateNames(profile.femaleGivenNames,`family profile ${id} femaleGivenNames`);
    validateNames(profile.maleGivenNames,`family profile ${id} maleGivenNames`);
    validateNames(profile.familyNames,`family profile ${id} familyNames`);
    if(!profile.physicalAncestry?.maternal||!profile.physicalAncestry?.paternal){
      throw new TypeError(`family profile ${id} requires maternal and paternal physical ancestry`);
    }
  }
  return profiles;
}

export function sampleFamilyProfile({profiles,requestId}={}){
  profiles=normalizeFamilyProfiles(profiles);
  validateFamilyProfiles(profiles);
  if(typeof requestId!=="string"||requestId.trim()==="")throw new TypeError("Population Context family sampling requires requestId");

  const normalized=profiles.map((profile,index)=>({
    ...profile,
    id:profile?.id??`family-${index+1}`,
    share:profile?.share??1,
    maternalPhysicalLineage:profile?.physicalAncestry?.maternal,
    paternalPhysicalLineage:profile?.physicalAncestry?.paternal,
  }));
  const sampled=selectPopulationFamilyProfile({
    profiles:normalized,
    selectionSeed:`modern-genesis:${requestId}`,
  });
  const profile=normalized.find(candidate=>candidate.id===sampled.profileId);
  if(!profile)throw new Error("sampled Population Context family profile is unavailable");

  const {maternalPhysicalLineage:_maternal,paternalPhysicalLineage:_paternal,...material}=profile;
  return Object.freeze({
    ...material,
    physicalAncestry:Object.freeze({
      maternal:sampled.maternalPhysicalLineage,
      paternal:sampled.paternalPhysicalLineage,
    }),
  });
}
