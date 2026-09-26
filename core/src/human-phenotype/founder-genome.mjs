import {createHash} from "node:crypto";
import {normalizeAncestry} from "./ancestry.mjs";
import {createPhysicalGenome,physicalGenomeLoci} from "./physical-genome.mjs";

const REFERENCE_POPULATIONS=Object.freeze({
  afr_west:{pigmentation:.72,hairForm:.72,hairDensity:.18,faceBreadth:.18,faceLength:0,eyeSpacing:-.08,brow:.02,noseBreadth:.24,noseProjection:.02,softTissue:.28,jawBreadth:.12,chinProjection:.02,frame:.04,height:.02},
  afr_east:{pigmentation:.62,hairForm:.58,hairDensity:.14,faceBreadth:.02,faceLength:.10,eyeSpacing:-.02,brow:.06,noseBreadth:.10,noseProjection:.12,softTissue:.20,jawBreadth:.02,chinProjection:.08,frame:.02,height:.08},
  eur_north:{pigmentation:-.70,hairForm:-.34,hairDensity:0,faceBreadth:-.08,faceLength:.06,eyeSpacing:.04,brow:.05,noseBreadth:-.12,noseProjection:.10,softTissue:-.08,jawBreadth:-.02,chinProjection:.08,frame:.08,height:.12},
  eur_south:{pigmentation:-.42,hairForm:-.10,hairDensity:.02,faceBreadth:-.04,faceLength:.04,eyeSpacing:.02,brow:.08,noseBreadth:-.06,noseProjection:.16,softTissue:.02,jawBreadth:0,chinProjection:.10,frame:.02,height:0},
  west_asia:{pigmentation:-.20,hairForm:-.06,hairDensity:.04,faceBreadth:-.02,faceLength:.04,eyeSpacing:.02,brow:.10,noseBreadth:-.02,noseProjection:.22,softTissue:.04,jawBreadth:0,chinProjection:.12,frame:.02,height:0},
  south_asia:{pigmentation:.08,hairForm:-.12,hairDensity:.06,faceBreadth:-.02,faceLength:.02,eyeSpacing:.02,brow:.06,noseBreadth:.02,noseProjection:.10,softTissue:.08,jawBreadth:0,chinProjection:.06,frame:0,height:0},
  east_asia:{pigmentation:-.28,hairForm:-.62,hairDensity:.10,faceBreadth:.14,faceLength:-.06,eyeSpacing:.10,brow:-.04,noseBreadth:.08,noseProjection:-.24,softTissue:-.08,jawBreadth:.08,chinProjection:-.10,frame:-.02,height:-.02},
  southeast_asia:{pigmentation:-.02,hairForm:-.48,hairDensity:.08,faceBreadth:.12,faceLength:-.04,eyeSpacing:.08,brow:-.02,noseBreadth:.10,noseProjection:-.18,softTissue:.02,jawBreadth:.06,chinProjection:-.08,frame:-.04,height:-.04},
  indigenous_america:{pigmentation:-.02,hairForm:-.50,hairDensity:.08,faceBreadth:.12,faceLength:-.02,eyeSpacing:.08,brow:0,noseBreadth:.06,noseProjection:-.14,softTissue:.02,jawBreadth:.08,chinProjection:-.04,frame:-.02,height:-.02},
  oceania:{pigmentation:.46,hairForm:.28,hairDensity:.12,faceBreadth:.14,faceLength:0,eyeSpacing:0,brow:.04,noseBreadth:.16,noseProjection:.04,softTissue:.12,jawBreadth:.08,chinProjection:.02,frame:.04,height:.02}
});

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
      const mean=component?REFERENCE_POPULATIONS[component.referencePopulation][locus]:0;
      return {
        value:clamp(mean+centered(seed,`${locus}:${copy}:variation`)*.58),
        dominance:centered(seed,`${locus}:${copy}:dominance`)*.35
      };
    });
  }
  return createPhysicalGenome(loci);
}
