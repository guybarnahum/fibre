import {createHash} from "node:crypto";
import {normalizeAncestry} from "./ancestry.mjs";

function unit(seed,label){const hex=createHash("sha256").update(`${seed}\0${label}`).digest("hex").slice(0,13);return Number.parseInt(hex,16)/0xfffffffffffff}
function normalizeProfiles(profiles){
 if(!Array.isArray(profiles)||!profiles.length)throw Error("population profiles are required");
 const clean=profiles.map((p,i)=>({id:String(p?.id??`profile-${i+1}`).trim(),share:Number(p?.share),ancestry:normalizeAncestry(p?.ancestry,`profiles[${i}].ancestry`)}));
 if(clean.some(p=>!p.id||!Number.isFinite(p.share)||p.share<=0))throw Error("population profiles must have positive shares");
 const total=clean.reduce((n,p)=>n+p.share,0);return clean.map(p=>({...p,share:p.share/total}));
}
function weighted(items,u,weight=p=>p.share){const total=items.reduce((n,p)=>n+weight(p),0);let n=0;for(const p of items){n+=weight(p)/total;if(u<n)return p}return items.at(-1)}
function overlap(a,b){const m=new Map(a.map(x=>[x.population,x.share]));return b.reduce((n,x)=>n+Math.min(m.get(x.population)??0,x.share),0)}
export function sampleFamilyAncestry({profiles,seed,partnerSimilarity=0.72}){
 if(seed===undefined||seed===null||String(seed).length===0)throw Error("seed is required");
 const ps=normalizeProfiles(profiles),maternal=weighted(ps,unit(seed,"maternal"));
 // Assortment is a soft preference for ancestry overlap, never a command to clone the first lineage.
 const paternal=weighted(ps,unit(seed,"paternal"),p=>p.share*(1+Math.max(0,partnerSimilarity)*overlap(maternal.ancestry,p.ancestry)));
 return {maternal:{profileId:maternal.id,ancestry:maternal.ancestry},paternal:{profileId:paternal.id,ancestry:paternal.ancestry}};
}
