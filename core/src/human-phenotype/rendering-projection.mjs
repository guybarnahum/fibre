import { phenotypeFromPhysicalGenome } from "./phenotype.mjs";

const LATENT_MEANING=Object.freeze({
  pigmentation:"-1 lighter, +1 deeper",
  eyePigmentation:"-1 lighter, +1 darker",
  hairPigmentation:"-1 lighter, +1 darker",
  frecklingTendency:"-1 lower, +1 higher",
  hairForm:"-1 straighter, +1 curlier/coiler",
  hairDensity:"-1 sparser, +1 denser",
  hairlineLossTendency:"-1 lower, +1 higher",
  facialHairTendency:"-1 lighter, +1 denser",
  faceBreadth:"-1 narrower, +1 broader",
  faceLength:"-1 shorter, +1 longer",
  midfaceProminence:"-1 softer, +1 more prominent",
  eyeSpacing:"-1 closer, +1 wider",
  eyeShape:"-1 narrower, +1 more open",
  foreheadProportion:"-1 lower, +1 higher",
  brow:"-1 softer, +1 stronger",
  noseBreadth:"-1 narrower, +1 broader",
  noseProjection:"-1 lower, +1 higher",
  softTissue:"-1 thinner, +1 fuller",
  jawBreadth:"-1 narrower, +1 broader",
  chinProjection:"-1 softer, +1 stronger",
  frame:"-1 lighter, +1 broader",
  height:"-1 shorter tendency, +1 taller tendency",
  bodyProportion:"-1 longer torso, +1 longer limbs",
  adiposityTendency:"-1 leaner tendency, +1 higher adiposity tendency",
  muscularityTendency:"-1 lower, +1 stronger",
  shoulderHipProportion:"-1 hip-weighted, +1 shoulder-weighted"
});

export function physicalPhenotypeRenderingProjection(genome,{sex}={}){
  const phenotype=phenotypeFromPhysicalGenome(genome,{sex});
  const semantic=Object.entries(phenotype.traits).map(([name,value])=>`${name}: ${value}`).join("; ");
  const continuous=Object.entries(phenotype.latent)
    .map(([name,value])=>`${name}: ${Number(value).toFixed(2)} (${LATENT_MEANING[name]})`)
    .join("; ");
  return Object.freeze({
    version:"physical-rendering-projection-v0.1",
    phenotype,
    description:`Concrete inherited phenotype: ${semantic}. Continuous inherited expression refines those categories and preserves individual differences inside them: ${continuous}. Facial-hair and hairline-loss coordinates are inherited carrier tendencies; visible expression follows the sex-conditioned phenotype above.`
  });
}
