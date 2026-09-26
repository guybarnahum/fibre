import {createHash} from "node:crypto";
import {normalizeAncestry} from "./ancestry.mjs";

function unit(seed,label){
  const hex=createHash("sha256").update(`${seed}\0${label}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}

function normalizeProfiles(profiles){
  if(!Array.isArray(profiles)||!profiles.length)throw Error("population family profiles are required");
  const clean=profiles.map((p,i)=>({
    id:String(p?.id??`profile-${i+1}`).trim(),
    share:Number(p?.share),
    maternalAncestry:normalizeAncestry(p?.maternalAncestry,`profiles[${i}].maternalAncestry`),
    paternalAncestry:normalizeAncestry(p?.paternalAncestry,`profiles[${i}].paternalAncestry`)
  }));
  if(clean.some(p=>!p.id||!Number.isFinite(p.share)||p.share<=0))throw Error("population family profiles must have positive shares");
  const total=clean.reduce((n,p)=>n+p.share,0);
  return clean.map(p=>({...p,share:p.share/total}));
}

function weighted(items,u){
  let n=0;
  for(const item of items){n+=item.share;if(u<n)return item}
  return items.at(-1);
}

export function sampleFamilyAncestry({profiles,seed}){
  if(seed===undefined||seed===null||String(seed).length===0)throw Error("seed is required");
  const family=weighted(normalizeProfiles(profiles),unit(seed,"family"));
  return {
    profileId:family.id,
    maternal:{ancestry:family.maternalAncestry},
    paternal:{ancestry:family.paternalAncestry}
  };
}
