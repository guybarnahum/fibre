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
  zygomaticProjection:"-1 softer cheekbones, +1 more projecting cheekbones",
  eyeSpacing:"-1 closer, +1 wider",
  eyeShape:"-1 narrower palpebral opening, +1 more open palpebral opening",
  epicanthicFold:"-1 absent, +1 more pronounced",
  upperEyelidExposure:"-1 lower visible upper-lid exposure, +1 higher",
  orbitalDepth:"-1 shallower-set eyes, +1 deeper-set eyes",
  foreheadProportion:"-1 lower, +1 higher",
  brow:"-1 softer, +1 stronger",
  noseBreadth:"-1 narrower, +1 broader",
  noseProjection:"-1 lower, +1 higher",
  nasalBridgeHeight:"-1 lower bridge, +1 higher bridge",
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

const pick=(source,names)=>Object.freeze(Object.fromEntries(names.map(name=>[name,source[name]])));

function anatomyFromTraits(traits){
  return Object.freeze({
    face:pick(traits,[
      "faceWidth","faceLength","midfaceProminence","zygomaticProjection",
      "jawWidth","chinProjection","foreheadProportion",
    ]),
    eyes:pick(traits,[
      "eyeSpacing","eyeShape","epicanthicFold","upperEyelidExposure",
      "orbitalDepth","browProminence",
    ]),
    noseMouth:pick(traits,["noseWidth","noseProjection","nasalBridgeHeight","lipFullness"]),
    pigmentationHair:pick(traits,[
      "pigmentation","eyeColor","hairColor","frecklingTendency",
      "hairTexture","hairDensity","hairlineLossTendency","facialHairTendency",
    ]),
    body:pick(traits,[
      "frame","heightTendency","bodyProportion","adiposityTendency",
      "muscularityTendency","shoulderHipProportion",
    ]),
  });
}

const join=(entries)=>Object.entries(entries).map(([name,value])=>`${name}: ${value}`).join("; ");

function continuousFace(latent){
  const names=[
    "faceBreadth","faceLength","midfaceProminence","zygomaticProjection",
    "jawBreadth","chinProjection","eyeSpacing","eyeShape","epicanthicFold",
    "upperEyelidExposure","orbitalDepth","foreheadProportion","brow",
    "noseBreadth","noseProjection","nasalBridgeHeight","softTissue",
  ];
  return names.map(name=>`${name}: ${Number(latent[name]).toFixed(2)} (${LATENT_MEANING[name]})`).join("; ");
}

function continuousOther(latent){
  const facial=new Set([
    "faceBreadth","faceLength","midfaceProminence","zygomaticProjection",
    "jawBreadth","chinProjection","eyeSpacing","eyeShape","epicanthicFold",
    "upperEyelidExposure","orbitalDepth","foreheadProportion","brow",
    "noseBreadth","noseProjection","nasalBridgeHeight","softTissue",
  ]);
  return Object.entries(latent)
    .filter(([name])=>!facial.has(name))
    .map(([name,value])=>`${name}: ${Number(value).toFixed(2)} (${LATENT_MEANING[name]})`)
    .join("; ");
}

export function physicalPhenotypeRenderingProjection(genome,{sex}={}){
  const phenotype=phenotypeFromPhysicalGenome(genome,{sex});
  const anatomy=anatomyFromTraits(phenotype.traits);
  const description=[
    `Identity-critical inherited facial geometry — face and midface: ${join(anatomy.face)}.`,
    `Eye and orbital anatomy: ${join(anatomy.eyes)}.`,
    `Nasal and perioral anatomy: ${join(anatomy.noseMouth)}.`,
    `Pigmentation and hair: ${join(anatomy.pigmentationHair)}.`,
    `Inherited body structure: ${join(anatomy.body)}.`,
    "Treat the facial relationships above as one coherent anatomy. Do not independently average them toward generic portrait defaults.",
    `Continuous facial coordinates are secondary precision and preserve this individual's proportions inside the semantic anatomy: ${continuousFace(phenotype.latent)}.`,
    `Other continuous inherited coordinates: ${continuousOther(phenotype.latent)}.`,
    "Facial-hair and hairline-loss coordinates are inherited carrier tendencies; visible expression follows the sex-conditioned phenotype above.",
  ].join(" ");
  return Object.freeze({
    version:"physical-rendering-projection-v0.3",
    phenotype,
    anatomy,
    description,
  });
}
