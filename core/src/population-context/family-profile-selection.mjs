import {createHash} from "node:crypto";

import {normalizeAncestry} from "../human-phenotype/ancestry.mjs";

function unit(seed,label){
  const hex=createHash("sha256").update(`${seed}\0${label}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}

function normalizeProfiles(profiles){
  if(!Array.isArray(profiles)||profiles.length===0)throw new TypeError("population family profiles are required");
  const clean=profiles.map((profile,index)=>({
    id:String(profile?.id??`profile-${index+1}`).trim(),
    share:Number(profile?.share),
    maternalPhysicalLineage:normalizeAncestry(
      profile?.maternalPhysicalLineage,
      `profiles[${index}].maternalPhysicalLineage`,
    ),
    paternalPhysicalLineage:normalizeAncestry(
      profile?.paternalPhysicalLineage,
      `profiles[${index}].paternalPhysicalLineage`,
    ),
  }));
  if(clean.some(profile=>!profile.id||!Number.isFinite(profile.share)||profile.share<=0)){
    throw new TypeError("population family profiles must have positive shares");
  }
  const total=clean.reduce((sum,profile)=>sum+profile.share,0);
  return clean.map(profile=>({...profile,share:profile.share/total}));
}

function weighted(items,value){
  let cursor=0;
  for(const item of items){
    cursor+=item.share;
    if(value<cursor)return item;
  }
  return items.at(-1);
}

/**
 * Deterministically choose one concrete family path from an already-authored
 * place/era population context. This component does not author demographics.
 */
export function selectPopulationFamilyProfile({profiles,selectionSeed}={}){
  if(selectionSeed===undefined||selectionSeed===null||String(selectionSeed).length===0){
    throw new TypeError("selectionSeed is required");
  }
  const selected=weighted(normalizeProfiles(profiles),unit(selectionSeed,"family"));
  return Object.freeze({
    profileId:selected.id,
    maternalPhysicalLineage:selected.maternalPhysicalLineage,
    paternalPhysicalLineage:selected.paternalPhysicalLineage,
  });
}
