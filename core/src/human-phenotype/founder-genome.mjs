import {createHash} from "node:crypto";
import {normalizeAncestry} from "./ancestry.mjs";
import {createPhysicalGenome,physicalGenomeLoci} from "./physical-genome.mjs";
import {referencePopulationPrior} from "./reference-populations.mjs";

const CORRELATED_SYSTEMS=Object.freeze({
  face:["faceBreadth","faceLength","midfaceProminence","zygomaticProjection","jawBreadth","chinProjection"],
  eyes:["eyeSpacing","eyeShape","epicanthicFold","upperEyelidExposure","orbitalDepth","foreheadProportion","brow"],
  noseMouth:["noseBreadth","noseProjection","nasalBridgeHeight","softTissue"],
  body:["frame","height","bodyProportion"]
});
const FACIAL_STRUCTURE_LOCI=new Set([
  "eyeShape","epicanthicFold","upperEyelidExposure","orbitalDepth",
  "zygomaticProjection","noseProjection","nasalBridgeHeight",
]);
const SYSTEM_BY_LOCUS=Object.fromEntries(Object.entries(CORRELATED_SYSTEMS).flatMap(([system,loci])=>loci.map(locus=>[locus,system])));

function unit(seed,key){
  const hex=createHash("sha256").update(`${seed}\0${key}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}
const centered=(seed,key)=>unit(seed,key)*2-1;
const clamp=value=>Math.max(-1,Math.min(1,value));

function chooseComponent(ancestry,seed,key){
  for(const item of ancestry){
    if(!item.referencePopulation)throw Error("founder ancestry requires referencePopulation");
    referencePopulationPrior(item.referencePopulation);
  }
  const total=ancestry.reduce((n,x)=>n+x.share,0),pick=unit(seed,key)*total;
  let cursor=0;
  for(const item of ancestry){cursor+=item.share;if(pick<=cursor)return item}
  return ancestry.at(-1);
}

export function sampleFounderPhysicalGenome({ancestry,seed}){
  if(seed===undefined||seed===null||String(seed).length===0)throw Error("founder seed is required");
  const normalized=normalizeAncestry(ancestry);
  const loci={};

  for(const locus of physicalGenomeLoci){
    loci[locus]=[0,1].map(copy=>{
      const component=chooseComponent(normalized,seed,`${locus}:${copy}:ancestry`);
      const mean=referencePopulationPrior(component.referencePopulation)[locus];
      const system=SYSTEM_BY_LOCUS[locus];
      const structural=FACIAL_STRUCTURE_LOCI.has(locus);
      const shared=system?centered(seed,`${system}:${copy}:variation`)*(structural?.14:.22):0;
      const individual=centered(seed,`${locus}:${copy}:variation`)*(structural?.24:(system?.36:.58));
      return {value:clamp(mean+shared+individual)};
    });
  }
  return createPhysicalGenome(loci);
}
