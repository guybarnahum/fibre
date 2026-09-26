import {expressPhysicalGenome} from "./physical-genome.mjs";

const clamp01=value=>Math.max(0,Math.min(1,(Number(value)+1)/2));
const band=(value,labels)=>labels[Math.min(labels.length-1,Math.floor(clamp01(value)*labels.length))];
const morphologyBand=(value,labels)=>{
  const x=Number(value);
  if(x<-.18)return labels[0];
  if(x>.18)return labels[2];
  return labels[1];
};

export function phenotypeFromPhysicalGenome(genome,{sex}={}){
  const x=expressPhysicalGenome(genome);
  const facialHairTendency=sex==="female"?"minimal":band(x.facialHairTendency,["light","moderate","dense"]);
  const hairlineLossTendency=sex==="female"?"low":band(x.hairlineLossTendency,["low","moderate","high"]);
  return {
    version:"human-phenotype-v0.10",
    traits:{
      pigmentation:band(x.pigmentation,["very light","light","medium","deep","very deep"]),
      eyeColor:band(x.eyePigmentation,["blue/gray","green","hazel","brown","dark brown"]),
      hairColor:band(x.hairPigmentation,["very light","blond","light brown","brown","dark brown/black"]),
      frecklingTendency:band(x.frecklingTendency,["low","moderate","high"]),
      hairTexture:band(x.hairForm,["straight","wavy","curly","coily"]),
      hairDensity:band(x.hairDensity,["sparse","medium","dense"]),
      hairlineLossTendency,
      facialHairTendency,
      faceWidth:band(x.faceBreadth,["narrow","medium","broad"]),
      faceLength:morphologyBand(x.faceLength,["short","medium","long"]),
      midfaceProminence:morphologyBand(x.midfaceProminence,["soft","medium","prominent"]),
      jawWidth:morphologyBand(x.jawBreadth,["narrow","medium","broad"]),
      chinProjection:morphologyBand(x.chinProjection,["soft","medium","prominent"]),
      eyeSpacing:morphologyBand(x.eyeSpacing,["close","average","wide"]),
      eyeShape:morphologyBand(x.eyeShape,["narrow","intermediate","open"]),
      foreheadProportion:morphologyBand(x.foreheadProportion,["low","medium","high"]),
      browProminence:morphologyBand(x.brow,["light","medium","strong"]),
      noseWidth:band(x.noseBreadth,["narrow","medium","broad"]),
      noseProjection:band(x.noseProjection,["low","medium","high"]),
      lipFullness:band(x.softTissue,["thin","medium","full"]),
      frame:band(x.frame,["slight","medium","broad"]),
      heightTendency:band(x.height,["shorter","middle","taller"]),
      bodyProportion:band(x.bodyProportion,["long torso","balanced","long limbs"]),
      adiposityTendency:band(x.adiposityTendency,["naturally lean","lean tendency","average tendency","fuller tendency","high adiposity tendency"]),
      muscularityTendency:band(x.muscularityTendency,["light","moderate","strong"]),
      shoulderHipProportion:band(x.shoulderHipProportion,["hip-weighted","balanced","shoulder-weighted"])
    },
    latent:x
  };
}
