import { sampleFamilyAncestry } from "../../core/src/human-phenotype/index.mjs";

const REFERENCE_POPULATIONS=Object.freeze([
  "afr_west","afr_east","eur_north","eur_south","west_asia","south_asia","east_asia","southeast_asia","indigenous_america","oceania"
]);

const ancestrySchema={type:"array",minItems:1,maxItems:3,items:{type:"object",additionalProperties:false,required:["population","share","referencePopulation"],properties:{
  population:{type:"string",minLength:1},share:{type:"number",minimum:0.01,maximum:1},referencePopulation:{type:"string",enum:REFERENCE_POPULATIONS}
}}};
const languagesSchema={type:"array",minItems:1,maxItems:3,items:{type:"string",minLength:1}};
const namesSchema={type:"array",minItems:24,items:{type:"string",minLength:1}};

export const MODERN_FAMILY_PROFILES_SCHEMA=Object.freeze({
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

function validateLanguages(values,label){
  if(!Array.isArray(values)||values.length<1||values.length>3)throw new TypeError(`${label} must contain 1 to 3 languages`);
  const clean=values.map(value=>String(value??"").trim());
  if(clean.some(value=>!value))throw new TypeError(`${label} contains an empty language`);
  if(clean.some(value=>value.length>48||/[;,|\n]|」「/u.test(value)||value.includes("/")||/\s(?:and|or)\s/iu.test(value)))throw new TypeError(`${label} must contain one bare language name per item`);
  if(new Set(clean.map(fold)).size!==clean.length)throw new TypeError(`${label} contains duplicate languages`);
  return clean;
}

function validateNames(values,label){
  if(!Array.isArray(values)||values.length<12)throw new TypeError(`${label} must contain at least 12 names`);
  const clean=values.map(value=>String(value??"").trim());
  if(clean.some(value=>!value))throw new TypeError(`${label} contains an empty name`);
  if(new Set(clean.map(fold)).size!==clean.length)throw new TypeError(`${label} contains duplicate names`);
}

export function validateModernFamilyProfiles(profiles){
  if(!Array.isArray(profiles)||profiles.length===0)throw new TypeError("modern Genesis requires family profiles");
  const ids=new Set();
  for(const [index,profile] of profiles.entries()){
    const id=String(profile?.id??"").trim();
    if(!id||ids.has(id))throw new TypeError("modern Genesis family profile ids must be unique");
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
    if(!profile.physicalAncestry?.maternal||!profile.physicalAncestry?.paternal)throw new TypeError(`family profile ${id} requires maternal and paternal physical ancestry`);
  }
  return profiles;
}

export function sampleModernFamilyProfile({ profiles, requestId }) {
  validateModernFamilyProfiles(profiles);
  if (typeof requestId !== "string" || requestId.trim() === "") throw new TypeError("modern Genesis family sampling requires requestId");

  const normalized = profiles.map((profile, index) => ({
    ...profile,
    id:profile?.id ?? `family-${index + 1}`,
    share:profile?.share ?? 1,
    maternalAncestry:profile?.physicalAncestry?.maternal,
    paternalAncestry:profile?.physicalAncestry?.paternal,
  }));
  const sampled = sampleFamilyAncestry({ profiles:normalized, seed:`modern-genesis:${requestId}` });
  const profile = normalized.find((candidate) => candidate.id === sampled.profileId);
  if (!profile) throw new Error("sampled Genesis family profile is unavailable");

  const { maternalAncestry: _maternal, paternalAncestry: _paternal, ...material } = profile;
  return Object.freeze({
    ...material,
    physicalAncestry:Object.freeze({
      maternal:sampled.maternal.ancestry,
      paternal:sampled.paternal.ancestry,
    }),
  });
}
