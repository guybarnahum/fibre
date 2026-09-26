import {createHash} from "node:crypto";
import {normalizeAncestry} from "./ancestry.mjs";

function unit(seed, label) {
  const hex=createHash("sha256").update(`${seed}\0${label}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0x1fffffffffffff;
}
function normalizeProfiles(profiles) {
  if(!Array.isArray(profiles)||!profiles.length) throw Error("population profiles are required");
  const clean=profiles.map((p,i)=>({
    id:String(p?.id??`profile-${i+1}`).trim(),
    share:Number(p?.share),
    ancestry:normalizeAncestry(p?.ancestry,`profiles[${i}].ancestry`)
  }));
  if(clean.some(p=>!p.id||!Number.isFinite(p.share)||p.share<=0)) throw Error("population profiles must have positive shares");
  const total=clean.reduce((n,p)=>n+p.share,0);
  return clean.map(p=>({...p,share:p.share/total}));
}
function weighted(profiles,u) {
  let n=0;
  for(const p of profiles){n+=p.share;if(u<n)return p}
  return profiles.at(-1);
}
export function sampleFamilyAncestry({profiles,seed,partnerSimilarity=0.72}) {
  if(seed===undefined||seed===null||String(seed).length===0) throw Error("seed is required");
  const ps=normalizeProfiles(profiles);
  const maternal=weighted(ps,unit(seed,"maternal"));
  const same=unit(seed,"partner-similarity")<partnerSimilarity;
  const paternal=same?maternal:weighted(ps,unit(seed,"paternal"));
  return {
    maternal:{profileId:maternal.id,ancestry:maternal.ancestry},
    paternal:{profileId:paternal.id,ancestry:paternal.ancestry}
  };
}
