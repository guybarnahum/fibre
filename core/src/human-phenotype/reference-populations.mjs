import {physicalGenomeLoci} from "./physical-genome.mjs";

/*
 * Root priors are deliberately complete: every physical locus is named even
 * when its provisional mean is currently 0. Slice 2 replaces provisional
 * values with calibrated distributions; there is no missing-locus fallback.
 *
 * Child populations inherit only from their named geographic parent until
 * their own calibration supplies overrides.
 */
const DEFINITIONS=Object.freeze({
  afr_west:{parent:null,values:{pigmentation:.72,eyePigmentation:.72,hairPigmentation:.66,frecklingTendency:0,hairForm:.72,hairDensity:.18,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:.3,faceLength:-.06,midfaceProminence:.14,zygomaticProjection:.08,eyeSpacing:-.1,eyeShape:.12,epicanthicFold:-.55,upperEyelidExposure:.1,orbitalDepth:.04,foreheadProportion:0,brow:.02,noseBreadth:.42,noseProjection:-.04,nasalBridgeHeight:-.18,softTissue:.4,jawBreadth:.14,chinProjection:-.04,frame:.04,height:.02,bodyProportion:.06,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  afr_east:{parent:null,values:{pigmentation:.62,eyePigmentation:.68,hairPigmentation:.6,frecklingTendency:0,hairForm:.58,hairDensity:.14,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:-.02,faceLength:.18,midfaceProminence:.1,zygomaticProjection:.04,eyeSpacing:-.02,eyeShape:.08,epicanthicFold:-.52,upperEyelidExposure:.1,orbitalDepth:.05,foreheadProportion:.02,brow:.06,noseBreadth:.14,noseProjection:.12,nasalBridgeHeight:-.02,softTissue:.24,jawBreadth:.02,chinProjection:.08,frame:.02,height:.1,bodyProportion:.1,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  eur_north:{parent:null,values:{pigmentation:-.7,eyePigmentation:-.48,hairPigmentation:-.34,frecklingTendency:0,hairForm:-.34,hairDensity:0,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:-.12,faceLength:.1,midfaceProminence:-.04,zygomaticProjection:-.08,eyeSpacing:.04,eyeShape:0,epicanthicFold:-.68,upperEyelidExposure:.22,orbitalDepth:.18,foreheadProportion:.04,brow:.05,noseBreadth:-.22,noseProjection:.18,nasalBridgeHeight:.38,softTissue:-.14,jawBreadth:-.04,chinProjection:.1,frame:.08,height:.12,bodyProportion:.02,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  eur_south:{parent:null,values:{pigmentation:-.42,eyePigmentation:.08,hairPigmentation:-.06,frecklingTendency:0,hairForm:-.1,hairDensity:.02,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:-.06,faceLength:.08,midfaceProminence:.02,zygomaticProjection:-.02,eyeSpacing:.02,eyeShape:.02,epicanthicFold:-.62,upperEyelidExposure:.18,orbitalDepth:.14,foreheadProportion:.02,brow:.08,noseBreadth:-.1,noseProjection:.22,nasalBridgeHeight:.3,softTissue:-.02,jawBreadth:0,chinProjection:.1,frame:.02,height:0,bodyProportion:0,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  west_asia:{parent:null,values:{pigmentation:-.2,eyePigmentation:.34,hairPigmentation:.28,frecklingTendency:0,hairForm:-.06,hairDensity:.04,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:-.02,faceLength:.06,midfaceProminence:.04,zygomaticProjection:.02,eyeSpacing:.02,eyeShape:.02,epicanthicFold:-.58,upperEyelidExposure:.16,orbitalDepth:.12,foreheadProportion:.02,brow:.12,noseBreadth:-.04,noseProjection:.3,nasalBridgeHeight:.3,softTissue:.04,jawBreadth:0,chinProjection:.12,frame:.02,height:0,bodyProportion:0,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  south_asia:{parent:null,values:{pigmentation:.08,eyePigmentation:.58,hairPigmentation:.48,frecklingTendency:0,hairForm:-.12,hairDensity:.06,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:-.04,faceLength:.04,midfaceProminence:.04,zygomaticProjection:.04,eyeSpacing:.02,eyeShape:.04,epicanthicFold:-.42,upperEyelidExposure:.12,orbitalDepth:.08,foreheadProportion:.02,brow:.08,noseBreadth:.06,noseProjection:.14,nasalBridgeHeight:.16,softTissue:.1,jawBreadth:0,chinProjection:.06,frame:0,height:0,bodyProportion:0,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  east_asia:{parent:null,values:{pigmentation:-.28,eyePigmentation:.72,hairPigmentation:.68,frecklingTendency:0,hairForm:-.62,hairDensity:.1,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:.24,faceLength:-.12,midfaceProminence:.18,zygomaticProjection:.46,eyeSpacing:.12,eyeShape:-.34,epicanthicFold:.72,upperEyelidExposure:-.38,orbitalDepth:-.24,foreheadProportion:.04,brow:-.08,noseBreadth:.12,noseProjection:-.32,nasalBridgeHeight:-.42,softTissue:-.06,jawBreadth:.1,chinProjection:-.12,frame:-.02,height:-.02,bodyProportion:0,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  southeast_asia:{parent:null,values:{pigmentation:-.02,eyePigmentation:.7,hairPigmentation:.64,frecklingTendency:0,hairForm:-.48,hairDensity:.08,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:.2,faceLength:-.08,midfaceProminence:.16,zygomaticProjection:.34,eyeSpacing:.1,eyeShape:-.24,epicanthicFold:.48,upperEyelidExposure:-.26,orbitalDepth:-.14,foreheadProportion:.04,brow:-.04,noseBreadth:.18,noseProjection:-.24,nasalBridgeHeight:-.34,softTissue:.04,jawBreadth:.08,chinProjection:-.1,frame:-.04,height:-.04,bodyProportion:0,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  indigenous_america:{parent:null,values:{pigmentation:-.02,eyePigmentation:.66,hairPigmentation:.6,frecklingTendency:0,hairForm:-.5,hairDensity:.08,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:.2,faceLength:-.04,midfaceProminence:.16,zygomaticProjection:.32,eyeSpacing:.1,eyeShape:-.16,epicanthicFold:.24,upperEyelidExposure:-.14,orbitalDepth:-.08,foreheadProportion:.02,brow:0,noseBreadth:.12,noseProjection:-.18,nasalBridgeHeight:-.16,softTissue:.04,jawBreadth:.1,chinProjection:-.06,frame:-.02,height:-.02,bodyProportion:0,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  oceania:{parent:null,values:{pigmentation:.46,eyePigmentation:.68,hairPigmentation:.58,frecklingTendency:0,hairForm:.28,hairDensity:.12,hairlineLossTendency:0,facialHairTendency:0,faceBreadth:.24,faceLength:0,midfaceProminence:.1,zygomaticProjection:.18,eyeSpacing:0,eyeShape:.04,epicanthicFold:-.18,upperEyelidExposure:.04,orbitalDepth:0,foreheadProportion:0,brow:.04,noseBreadth:.28,noseProjection:.04,nasalBridgeHeight:-.06,softTissue:.18,jawBreadth:.12,chinProjection:.02,frame:.04,height:.02,bodyProportion:.02,adiposityTendency:0,muscularityTendency:0,shoulderHipProportion:0}},
  "east_asia.han_chinese":{parent:"east_asia",values:{}},
  "east_asia.han_chinese.northern":{parent:"east_asia.han_chinese",values:{}},
  "east_asia.han_chinese.central":{parent:"east_asia.han_chinese",values:{}},
  "east_asia.han_chinese.southern":{parent:"east_asia.han_chinese",values:{}},
  "east_asia.korean":{parent:"east_asia",values:{}},
  "east_asia.japanese":{parent:"east_asia",values:{}},
  "east_asia.mongolian":{parent:"east_asia",values:{}},
  "east_asia.tibetan":{parent:"east_asia",values:{}},
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
