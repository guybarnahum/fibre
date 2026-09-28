import {createHash} from "node:crypto";
import {normalizeAncestry} from "./ancestry.mjs";
import {createPhysicalGenome,physicalGenomeLoci} from "./physical-genome.mjs";
import {referencePopulationPrior} from "./reference-populations.mjs";

/*
 * Small zero-mean factor model for within-population variation.
 *
 * A founder gets one factor value per anatomical system. That value is shared
 * across both allele copies, so the founder has coherent family morphology
 * which descendants can inherit. Each allele then receives a smaller
 * locus-specific residual. Population priors remain the distribution center.
 *
 * This is deliberately not a runtime covariance matrix.
 */
const FACTOR_LOADINGS=Object.freeze({
  face:Object.freeze({
    faceBreadth:.70,
    faceLength:-.35,
    midfaceProminence:.40,
    zygomaticProjection:.70,
    jawBreadth:.50,
    chinProjection:.20,
  }),
  eyes:Object.freeze({
    eyeSpacing:.30,
    eyeShape:-.40,
    epicanthicFold:.55,
    upperEyelidExposure:-.50,
    orbitalDepth:-.30,
    brow:-.10,
  }),
  nose:Object.freeze({
    noseBreadth:-.15,
    noseProjection:.55,
    nasalBridgeHeight:.65,
    softTissue:.15,
  }),
  body:Object.freeze({
    frame:.65,
    height:.45,
    bodyProportion:.25,
    muscularityTendency:.25,
    shoulderHipProportion:.20,
  }),
});

const STRUCTURAL_LOCI=new Set([
  "faceBreadth","faceLength","midfaceProminence","zygomaticProjection",
  "jawBreadth","chinProjection","eyeSpacing","eyeShape","epicanthicFold",
  "upperEyelidExposure","orbitalDepth","foreheadProportion","brow",
  "noseBreadth","noseProjection","nasalBridgeHeight","softTissue",
]);

const FAMILY_FACTOR_SCALE=.34;
const STRUCTURAL_RESIDUAL_SCALE=.18;
const GENERAL_RESIDUAL_SCALE=.20;

function unit(seed,key){
  const hex=createHash("sha256").update(`${seed}\0${key}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}

const centered=(seed,key)=>unit(seed,key)*2-1;
const bell=(seed,key)=>(centered(seed,`${key}:a`)+centered(seed,`${key}:b`))/2;
const clamp=value=>Math.max(-1,Math.min(1,value));

const FACTORS_BY_LOCUS=Object.freeze(Object.fromEntries(
  physicalGenomeLoci.map(locus=>[
    locus,
    Object.entries(FACTOR_LOADINGS)
      .filter(([,loadings])=>loadings[locus]!==undefined)
      .map(([factor,loadings])=>Object.freeze({factor,loading:loadings[locus]})),
  ]),
));

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
  const familyFactors=Object.fromEntries(
    Object.keys(FACTOR_LOADINGS).map(factor=>[
      factor,
      bell(seed,`family:${factor}`)*FAMILY_FACTOR_SCALE,
    ]),
  );
  const loci={};

  for(const locus of physicalGenomeLoci){
    const correlated=FACTORS_BY_LOCUS[locus]
      .reduce((sum,{factor,loading})=>sum+familyFactors[factor]*loading,0);
    const residualScale=STRUCTURAL_LOCI.has(locus)
      ? STRUCTURAL_RESIDUAL_SCALE
      : GENERAL_RESIDUAL_SCALE;

    loci[locus]=[0,1].map(copy=>{
      const component=chooseComponent(normalized,seed,`${locus}:${copy}:ancestry`);
      const mean=referencePopulationPrior(component.referencePopulation)[locus];
      const residual=bell(seed,`${locus}:${copy}:residual`)*residualScale;
      return {value:clamp(mean+correlated+residual)};
    });
  }
  return createPhysicalGenome(loci);
}
