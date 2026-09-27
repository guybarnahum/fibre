import {physicalGenomeLoci} from "./physical-genome.mjs";

const GLOBAL=Object.freeze({
  pigmentation:0,
  eyePigmentation:0,
  hairPigmentation:0,
  frecklingTendency:0,
  hairForm:0,
  hairDensity:0,
  hairlineLossTendency:0,
  facialHairTendency:0,
  faceBreadth:0,
  faceLength:0,
  midfaceProminence:0,
  zygomaticProjection:0,
  eyeSpacing:0,
  eyeShape:0,
  epicanthicFold:0,
  upperEyelidExposure:0,
  orbitalDepth:0,
  foreheadProportion:0,
  brow:0,
  noseBreadth:0,
  noseProjection:0,
  nasalBridgeHeight:0,
  softTissue:0,
  jawBreadth:0,
  chinProjection:0,
  frame:0,
  height:0,
  bodyProportion:0,
  adiposityTendency:0,
  muscularityTendency:0,
  shoulderHipProportion:0,
});

const DEFINITIONS=Object.freeze({
  afr_west:{parent:null,values:{...GLOBAL,pigmentation:.72,eyePigmentation:.72,hairPigmentation:.66,hairForm:.72,hairDensity:.18,faceBreadth:.30,faceLength:-.06,midfaceProminence:.14,zygomaticProjection:.08,eyeSpacing:-.10,eyeShape:.12,epicanthicFold:-.55,upperEyelidExposure:.10,orbitalDepth:.04,foreheadProportion:0,brow:.02,noseBreadth:.42,noseProjection:-.04,nasalBridgeHeight:-.18,softTissue:.40,jawBreadth:.14,chinProjection:-.04,frame:.04,height:.02,bodyProportion:.06}},
  afr_east:{parent:null,values:{...GLOBAL,pigmentation:.62,eyePigmentation:.68,hairPigmentation:.60,hairForm:.58,hairDensity:.14,faceBreadth:-.02,faceLength:.18,midfaceProminence:.10,zygomaticProjection:.04,eyeSpacing:-.02,eyeShape:.08,epicanthicFold:-.52,upperEyelidExposure:.10,orbitalDepth:.05,foreheadProportion:.02,brow:.06,noseBreadth:.14,noseProjection:.12,nasalBridgeHeight:-.02,softTissue:.24,jawBreadth:.02,chinProjection:.08,frame:.02,height:.10,bodyProportion:.10}},
  eur_north:{parent:null,values:{...GLOBAL,pigmentation:-.70,eyePigmentation:-.48,hairPigmentation:-.34,hairForm:-.34,hairDensity:0,faceBreadth:-.12,faceLength:.10,midfaceProminence:-.04,zygomaticProjection:-.08,eyeSpacing:.04,eyeShape:0,epicanthicFold:-.68,upperEyelidExposure:.22,orbitalDepth:.18,foreheadProportion:.04,brow:.05,noseBreadth:-.22,noseProjection:.18,nasalBridgeHeight:.38,softTissue:-.14,jawBreadth:-.04,chinProjection:.10,frame:.08,height:.12,bodyProportion:.02}},
  eur_south:{parent:null,values:{...GLOBAL,pigmentation:-.42,eyePigmentation:.08,hairPigmentation:-.06,hairForm:-.10,hairDensity:.02,faceBreadth:-.06,faceLength:.08,midfaceProminence:.02,zygomaticProjection:-.02,eyeSpacing:.02,eyeShape:.02,epicanthicFold:-.62,upperEyelidExposure:.18,orbitalDepth:.14,foreheadProportion:.02,brow:.08,noseBreadth:-.10,noseProjection:.22,nasalBridgeHeight:.30,softTissue:-.02,jawBreadth:0,chinProjection:.10,frame:.02,height:0,bodyProportion:0}},
  west_asia:{parent:null,values:{...GLOBAL,pigmentation:-.20,eyePigmentation:.34,hairPigmentation:.28,hairForm:-.06,hairDensity:.04,faceBreadth:-.02,faceLength:.06,midfaceProminence:.04,zygomaticProjection:.02,eyeSpacing:.02,eyeShape:.02,epicanthicFold:-.58,upperEyelidExposure:.16,orbitalDepth:.12,foreheadProportion:.02,brow:.12,noseBreadth:-.04,noseProjection:.30,nasalBridgeHeight:.30,softTissue:.04,jawBreadth:0,chinProjection:.12,frame:.02,height:0,bodyProportion:0}},
  south_asia:{parent:null,values:{...GLOBAL,pigmentation:.08,eyePigmentation:.58,hairPigmentation:.48,hairForm:-.12,hairDensity:.06,faceBreadth:-.04,faceLength:.04,midfaceProminence:.04,zygomaticProjection:.04,eyeSpacing:.02,eyeShape:.04,epicanthicFold:-.42,upperEyelidExposure:.12,orbitalDepth:.08,foreheadProportion:.02,brow:.08,noseBreadth:.06,noseProjection:.14,nasalBridgeHeight:.16,softTissue:.10,jawBreadth:0,chinProjection:.06,frame:0,height:0,bodyProportion:0}},
  east_asia:{parent:null,values:{...GLOBAL,pigmentation:-.28,eyePigmentation:.72,hairPigmentation:.68,hairForm:-.62,hairDensity:.10,faceBreadth:.24,faceLength:-.12,midfaceProminence:.18,zygomaticProjection:.46,eyeSpacing:.12,eyeShape:-.34,epicanthicFold:.72,upperEyelidExposure:-.38,orbitalDepth:-.24,foreheadProportion:.04,brow:-.08,noseBreadth:.12,noseProjection:-.32,nasalBridgeHeight:-.42,softTissue:-.06,jawBreadth:.10,chinProjection:-.12,frame:-.02,height:-.02,bodyProportion:0}},
  "east_asia.han_chinese":{parent:"east_asia",values:{}},
  "east_asia.han_chinese.northern":{parent:"east_asia.han_chinese",values:{}},
  "east_asia.han_chinese.central":{parent:"east_asia.han_chinese",values:{}},
  "east_asia.han_chinese.southern":{parent:"east_asia.han_chinese",values:{}},
  "east_asia.korean":{parent:"east_asia",values:{}},
  "east_asia.japanese":{parent:"east_asia",values:{}},
  "east_asia.mongolian":{parent:"east_asia",values:{}},
  "east_asia.tibetan":{parent:"east_asia",values:{}},
  southeast_asia:{parent:null,values:{...GLOBAL,pigmentation:-.02,eyePigmentation:.70,hairPigmentation:.64,hairForm:-.48,hairDensity:.08,faceBreadth:.20,faceLength:-.08,midfaceProminence:.16,zygomaticProjection:.34,eyeSpacing:.10,eyeShape:-.24,epicanthicFold:.48,upperEyelidExposure:-.26,orbitalDepth:-.14,foreheadProportion:.04,brow:-.04,noseBreadth:.18,noseProjection:-.24,nasalBridgeHeight:-.34,softTissue:.04,jawBreadth:.08,chinProjection:-.10,frame:-.04,height:-.04,bodyProportion:0}},
  indigenous_america:{parent:null,values:{...GLOBAL,pigmentation:-.02,eyePigmentation:.66,hairPigmentation:.60,hairForm:-.50,hairDensity:.08,faceBreadth:.20,faceLength:-.04,midfaceProminence:.16,zygomaticProjection:.32,eyeSpacing:.10,eyeShape:-.16,epicanthicFold:.24,upperEyelidExposure:-.14,orbitalDepth:-.08,foreheadProportion:.02,brow:0,noseBreadth:.12,noseProjection:-.18,nasalBridgeHeight:-.16,softTissue:.04,jawBreadth:.10,chinProjection:-.06,frame:-.02,height:-.02,bodyProportion:0}},
  oceania:{parent:null,values:{...GLOBAL,pigmentation:.46,eyePigmentation:.68,hairPigmentation:.58,hairForm:.28,hairDensity:.12,faceBreadth:.24,faceLength:0,midfaceProminence:.10,zygomaticProjection:.18,eyeSpacing:0,eyeShape:.04,epicanthicFold:-.18,upperEyelidExposure:.04,orbitalDepth:0,foreheadProportion:0,brow:.04,noseBreadth:.28,noseProjection:.04,nasalBridgeHeight:-.06,softTissue:.18,jawBreadth:.12,chinProjection:.02,frame:.04,height:.02,bodyProportion:.02}},
});

export const referencePopulationIds=Object.freeze(Object.keys(DEFINITIONS));

export function referencePopulationPrior(id){
  const key=String(id??"").trim();
  const definition=DEFINITIONS[key];
  if(!definition)throw Error(`unknown physical reference population: ${key||"<empty>"}`);
  const inherited=definition.parent===null?{}:referencePopulationPrior(definition.parent);
  const prior={...inherited,...definition.values};
  for(const locus of physicalGenomeLoci){
    if(!Number.isFinite(prior[locus]))throw Error(`${key} has no physical prior for ${locus}`);
  }
  return Object.freeze(Object.fromEntries(physicalGenomeLoci.map(locus=>[locus,prior[locus]])));
}
