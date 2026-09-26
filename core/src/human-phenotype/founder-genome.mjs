import {createHash} from "node:crypto";
import {normalizeAncestry} from "./ancestry.mjs";
import {createPhysicalGenome,physicalGenomeLoci} from "./physical-genome.mjs";

const REFERENCE_POPULATIONS=Object.freeze({
  afr_west:{pigmentation:.72,eyePigmentation:.72,hairPigmentation:.66,hairForm:.72,hairDensity:.18,faceBreadth:.30,faceLength:-.06,midfaceProminence:.14,eyeSpacing:-.10,eyeShape:.12,foreheadProportion:0,brow:.02,noseBreadth:.42,noseProjection:-.04,softTissue:.40,jawBreadth:.14,chinProjection:-.04,frame:.04,height:.02,bodyProportion:.06},
  afr_east:{pigmentation:.62,eyePigmentation:.68,hairPigmentation:.60,hairForm:.58,hairDensity:.14,faceBreadth:-.02,faceLength:.18,midfaceProminence:.10,eyeSpacing:-.02,eyeShape:.08,foreheadProportion:.02,brow:.06,noseBreadth:.14,noseProjection:.12,softTissue:.24,jawBreadth:.02,chinProjection:.08,frame:.02,height:.10,bodyProportion:.10},
  eur_north:{pigmentation:-.70,eyePigmentation:-.48,hairPigmentation:-.34,hairForm:-.34,hairDensity:0,faceBreadth:-.12,faceLength:.10,midfaceProminence:-.04,eyeSpacing:.04,eyeShape:0,foreheadProportion:.04,brow:.05,noseBreadth:-.22,noseProjection:.18,softTissue:-.14,jawBreadth:-.04,chinProjection:.10,frame:.08,height:.12,bodyProportion:.02},
  eur_south:{pigmentation:-.42,eyePigmentation:.08,hairPigmentation:-.06,hairForm:-.10,hairDensity:.02,faceBreadth:-.06,faceLength:.08,midfaceProminence:.02,eyeSpacing:.02,eyeShape:.02,foreheadProportion:.02,brow:.08,noseBreadth:-.10,noseProjection:.22,softTissue:-.02,jawBreadth:0,chinProjection:.10,frame:.02,height:0,bodyProportion:0},
  west_asia:{pigmentation:-.20,eyePigmentation:.34,hairPigmentation:.28,hairForm:-.06,hairDensity:.04,faceBreadth:-.02,faceLength:.06,midfaceProminence:.04,eyeSpacing:.02,eyeShape:.02,foreheadProportion:.02,brow:.12,noseBreadth:-.04,noseProjection:.30,softTissue:.04,jawBreadth:0,chinProjection:.12,frame:.02,height:0,bodyProportion:0},
  south_asia:{pigmentation:.08,eyePigmentation:.58,hairPigmentation:.48,hairForm:-.12,hairDensity:.06,faceBreadth:-.04,faceLength:.04,midfaceProminence:.04,eyeSpacing:.02,eyeShape:.04,foreheadProportion:.02,brow:.08,noseBreadth:.06,noseProjection:.14,softTissue:.10,jawBreadth:0,chinProjection:.06,frame:0,height:0,bodyProportion:0},
  east_asia:{pigmentation:-.28,eyePigmentation:.72,hairPigmentation:.68,hairForm:-.62,hairDensity:.10,faceBreadth:.24,faceLength:-.12,midfaceProminence:.24,eyeSpacing:.12,eyeShape:-.34,foreheadProportion:.04,brow:-.08,noseBreadth:.12,noseProjection:-.32,softTissue:-.06,jawBreadth:.10,chinProjection:-.12,frame:-.02,height:-.02,bodyProportion:0},
  southeast_asia:{pigmentation:-.02,eyePigmentation:.70,hairPigmentation:.64,hairForm:-.48,hairDensity:.08,faceBreadth:.20,faceLength:-.08,midfaceProminence:.18,eyeSpacing:.10,eyeShape:-.24,foreheadProportion:.04,brow:-.04,noseBreadth:.18,noseProjection:-.24,softTissue:.04,jawBreadth:.08,chinProjection:-.10,frame:-.04,height:-.04,bodyProportion:0},
  indigenous_america:{pigmentation:-.02,eyePigmentation:.66,hairPigmentation:.60,hairForm:-.50,hairDensity:.08,faceBreadth:.20,faceLength:-.04,midfaceProminence:.16,eyeSpacing:.10,eyeShape:-.16,foreheadProportion:.02,brow:0,noseBreadth:.12,noseProjection:-.18,softTissue:.04,jawBreadth:.10,chinProjection:-.06,frame:-.02,height:-.02,bodyProportion:0},
  oceania:{pigmentation:.46,eyePigmentation:.68,hairPigmentation:.58,hairForm:.28,hairDensity:.12,faceBreadth:.24,faceLength:0,midfaceProminence:.10,eyeSpacing:0,eyeShape:.04,foreheadProportion:0,brow:.04,noseBreadth:.28,noseProjection:.04,softTissue:.18,jawBreadth:.12,chinProjection:.02,frame:.04,height:.02,bodyProportion:.02}
});

const CORRELATED_SYSTEMS=Object.freeze({
  face:["faceBreadth","faceLength","midfaceProminence","jawBreadth","chinProjection"],
  eyes:["eyeSpacing","eyeShape","foreheadProportion","brow"],
  noseMouth:["noseBreadth","noseProjection","softTissue"],
  body:["frame","height","bodyProportion"]
});
const SYSTEM_BY_LOCUS=Object.fromEntries(Object.entries(CORRELATED_SYSTEMS).flatMap(([system,loci])=>loci.map(locus=>[locus,system])));

function unit(seed,key){
  const hex=createHash("sha256").update(`${seed}\0${key}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}
const centered=(seed,key)=>unit(seed,key)*2-1;
const clamp=value=>Math.max(-1,Math.min(1,value));

function chooseComponent(ancestry,seed,key){
  const supported=ancestry.filter(x=>x.referencePopulation&&REFERENCE_POPULATIONS[x.referencePopulation]);
  if(!supported.length)return null;
  const total=supported.reduce((n,x)=>n+x.share,0),pick=unit(seed,key)*total;
  let cursor=0;
  for(const item of supported){cursor+=item.share;if(pick<=cursor)return item}
  return supported.at(-1);
}

export function sampleFounderPhysicalGenome({ancestry,seed}){
  if(seed===undefined||seed===null||String(seed).length===0)throw Error("founder seed is required");
  const normalized=normalizeAncestry(ancestry);
  const loci={};

  for(const locus of physicalGenomeLoci){
    loci[locus]=[0,1].map(copy=>{
      const component=chooseComponent(normalized,seed,`${locus}:${copy}:ancestry`);
      const mean=component?(REFERENCE_POPULATIONS[component.referencePopulation][locus]??0):0;
      const system=SYSTEM_BY_LOCUS[locus];
      const shared=system?centered(seed,`${system}:${copy}:variation`)*.22:0;
      const individual=centered(seed,`${locus}:${copy}:variation`)*(system?.36:.58);
      return {
        value:clamp(mean+shared+individual),
        dominance:centered(seed,`${locus}:${copy}:dominance`)*.35
      };
    });
  }
  return createPhysicalGenome(loci);
}
