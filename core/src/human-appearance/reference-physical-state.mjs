import {createHash} from "node:crypto";

import {expressPhysicalGenome} from "../human-phenotype/physical-genome.mjs";

export const REFERENCE_PHYSICAL_STATE_VERSION="reference-physical-state-v0.2";

function unit(seed,key){
  const hex=createHash("sha256").update(`${seed}\0${key}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}

const centered=(seed,key)=>unit(seed,key)*2-1;
const bell=(seed,key)=>(centered(seed,`${key}:a`)+centered(seed,`${key}:b`))/2;
const clamp=value=>Math.max(-1,Math.min(1,value));

function band(value,cuts,labels){
  for(let index=0;index<cuts.length;index++)if(value<cuts[index])return labels[index];
  return labels.at(-1);
}

/**
 * Non-historical normalized state used only to keep a canonical reference
 * portrait from collapsing into renderer beauty/default-body priors.
 *
 * It is not a claim about the Thread's actual body at any lived moment.
 */
export function referencePhysicalState({
  physicalGenome,
  sex,
  stateSeed,
  referenceAgeYears=25,
}={}){
  if(!physicalGenome)throw new TypeError("physicalGenome is required");
  if(typeof sex!=="string"||sex.trim()==="")throw new TypeError("sex is required");
  if(stateSeed===undefined||stateSeed===null||String(stateSeed).length===0){
    throw new TypeError("stateSeed is required");
  }
  if(!Number.isFinite(referenceAgeYears)||referenceAgeYears<18){
    throw new TypeError("referenceAgeYears must be an adult age");
  }

  const inherited=expressPhysicalGenome(physicalGenome);
  const body=clamp(inherited.adiposityTendency*.48+bell(stateSeed,"body-composition")*.82);
  const muscle=clamp(inherited.muscularityTendency*.55+bell(stateSeed,"muscular-development")*.62);
  const facialFullness=clamp(body*.68+bell(stateSeed,"facial-fullness")*.30);
  const asymmetryMagnitude=.12+unit(stateSeed,"asymmetry-strength")*.26;
  const dominantSide=unit(stateSeed,"asymmetry-side")<.5?"left":"right";

  const bodyComposition=band(
    body,
    [-.55,-.18,.22,.58],
    ["lean","light-average","average","fuller","heavy"],
  );
  const muscularDevelopment=band(
    muscle,
    [-.35,.38],
    ["light","moderate","strong"],
  );
  const facialSoftTissue=band(
    facialFullness,
    [-.42,.30],
    ["lean facial soft tissue","moderate facial soft tissue","full facial soft tissue"],
  );

  const texture=unit(stateSeed,"skin-texture");
  const skinTexture=texture<.33
    ?"natural fine skin texture with visible pores"
    : texture<.72
      ?"ordinary visible pores and mild surface texture"
      :"noticeable ordinary pores and mild uneven skin texture";
  const variation=unit(stateSeed,"skin-variation");
  const skinVariation=variation<.36
    ?"low but visible natural tonal variation"
    : variation<.78
      ?"moderate natural tonal variation"
      :"noticeable ordinary tonal variation";

  const normalizedSex=sex.trim().toLowerCase();
  const facialHairPick=unit(stateSeed,"facial-hair-presentation");
  const facialHairGrowth=clamp((inherited.facialHairTendency+1)/2);
  const cleanShavenCut=.58-.16*facialHairGrowth;
  const facialHairPresentation=normalizedSex!=="male"
    ?"none"
    : facialHairPick<cleanShavenCut
      ?"clean-shaven"
      : facialHairPick<cleanShavenCut+.24
        ?"light natural stubble"
        : facialHairPick<cleanShavenCut+.40
          ?"short trimmed beard"
          :"moustache with otherwise clean-shaven face";

  const hairline=clamp(inherited.hairlineLossTendency*.55+bell(stateSeed,"hairline-presentation")*.45);
  const hairlinePresentation=hairline>.34
    ?"slightly mature hairline"
    : hairline<-.34
      ?"full low hairline"
      :"full natural hairline";

  const hairLengthPick=unit(stateSeed,"head-hair-length");
  const hairLength=hairLengthPick<.18
    ?"cropped"
    : hairLengthPick<.46
      ?"short"
      : hairLengthPick<.76
        ?"medium-length"
        :"long";
  const hairArrangement=inherited.hairForm>.18
    ?"natural texture without a deliberate part"
    : ["center part","left part","right part","no deliberate part"][
      Math.min(3,Math.floor(unit(stateSeed,"head-hair-arrangement")*4))
    ];
  const headHairPresentation=`${hairLength}, simply groomed, ${hairArrangement}`;

  const eyeOffset=(bell(stateSeed,"eye-asymmetry")*asymmetryMagnitude).toFixed(2);
  const browOffset=(bell(stateSeed,"brow-asymmetry")*asymmetryMagnitude).toFixed(2);
  const mouthOffset=(bell(stateSeed,"mouth-asymmetry")*asymmetryMagnitude).toFixed(2);

  const description=[
    `Normalized reference physical state at age ${referenceAgeYears}; this is rendering normalization, not historical evidence.`,
    `Body composition: ${bodyComposition}; muscular development: ${muscularDevelopment}; facial fullness: ${facialSoftTissue}.`,
    `Skin: ${skinTexture}; ${skinVariation}; no cosmetic skin smoothing.`,
    `Reference grooming: facial hair: ${facialHairPresentation}; hairline: ${hairlinePresentation}; head hair: ${headHairPresentation}. If facial hair is clean-shaven or none, show no beard, moustache, or stubble.`,
    `Ordinary facial asymmetry: mild ${dominantSide}-side dominance; eye-opening offset ${eyeOffset}, brow-height offset ${browOffset}, mouth-corner offset ${mouthOffset} on a -1..+1 descriptive scale.`,
    "Preserve these ordinary imperfections. Do not slim, symmetrize, retouch, beautify, or fashion-model the person.",
  ].join(" ");

  return Object.freeze({
    version:REFERENCE_PHYSICAL_STATE_VERSION,
    referenceAgeYears,
    bodyComposition,
    muscularDevelopment,
    facialSoftTissue,
    skinTexture,
    skinVariation,
    facialHairPresentation,
    hairlinePresentation,
    headHairPresentation,
    asymmetry:Object.freeze({
      dominantSide,
      eyeOpeningOffset:Number(eyeOffset),
      browHeightOffset:Number(browOffset),
      mouthCornerOffset:Number(mouthOffset),
    }),
    description,
  });
}
