import {expressPhysicalGenome} from "./physical-genome.mjs";

const clamp01=value=>Math.max(0,Math.min(1,(Number(value)+1)/2));
const band=(value,labels)=>labels[Math.min(labels.length-1,Math.floor(clamp01(value)*labels.length))];

export function phenotypeFromPhysicalGenome(genome){
  const x=expressPhysicalGenome(genome);
  return {
    version:"human-phenotype-v0.8",
    traits:{
      pigmentation:band(x.pigmentation,["very light","light","medium","deep","very deep"]),
      eyeColor:band(x.eyePigmentation,["blue/gray","green","hazel","brown","dark brown"]),
      hairColor:band(x.hairPigmentation,["very light","blond","light brown","brown","dark brown/black"]),
      frecklingTendency:band(x.frecklingTendency,["low","moderate","high"]),
      hairTexture:band(x.hairForm,["straight","wavy","curly","coily"]),
      hairDensity:band(x.hairDensity,["sparse","medium","dense"]),
      hairlineLossTendency:band(x.hairlineLossTendency,["low","moderate","high"]),
      facialHairTendency:band(x.facialHairTendency,["light","moderate","dense"]),
      faceWidth:band(x.faceBreadth,["narrow","medium","broad"]),
      faceLength:band(x.faceLength,["short","medium","long"]),
      midfaceProminence:band(x.midfaceProminence,["soft","medium","prominent"]),
      jawWidth:band(x.jawBreadth,["narrow","medium","broad"]),
      chinProjection:band(x.chinProjection,["soft","medium","prominent"]),
      eyeSpacing:band(x.eyeSpacing,["close","average","wide"]),
      eyeShape:band(x.eyeShape,["narrow","intermediate","open"]),
      foreheadProportion:band(x.foreheadProportion,["low","medium","high"]),
      browProminence:band(x.brow,["light","medium","strong"]),
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
