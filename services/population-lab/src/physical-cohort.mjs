import {createHash} from "node:crypto";

import {
  expressInheritedAppearance,
  expressPhysicalGenome,
  recombinePhysicalGenomes,
  referencePhysicalState,
  referencePopulationPrior,
  referencePopulationVariation,
  sampleFounderPhysicalGenome,
} from "../../../core/src/human-appearance/index.mjs";
import {populationLabShadowCalibrationResolvers} from "./shadow-calibration.mjs";

export const PHYSICAL_CALIBRATION_LOCI=Object.freeze([
  "faceBreadth","faceLength","midfaceProminence","zygomaticProjection",
  "jawBreadth","chinProjection","eyeSpacing","eyeShape","epicanthicFold",
  "upperEyelidExposure","orbitalDepth","foreheadProportion","brow",
  "noseBreadth","noseProjection","nasalBridgeHeight","softTissue",
]);

const ancestry=referencePopulation=>[{
  population:`${referencePopulation} calibration lineage`,
  share:1,
  referencePopulation,
}];

function calibrationResolvers(shadowCalibration){
  if(shadowCalibration===null||shadowCalibration===undefined){
    return Object.freeze({
      shadow:null,
      priorFor:referencePopulationPrior,
      variationFor:referencePopulationVariation,
    });
  }
  return populationLabShadowCalibrationResolvers(shadowCalibration);
}

function founderGenome(referencePopulation,seed,{priorFor,variationFor}){
  const lineage=ancestry(referencePopulation);
  const maternal=sampleFounderPhysicalGenome({
    ancestry:lineage,
    seed:`${seed}:maternal:founder`,
    priorFor,
    variationFor,
  });
  const paternal=sampleFounderPhysicalGenome({
    ancestry:lineage,
    seed:`${seed}:paternal:founder`,
    priorFor,
    variationFor,
  });
  return recombinePhysicalGenomes({
    maternalGenome:maternal,
    paternalGenome:paternal,
    seed,
  });
}

const sexFor=value=>Number.parseInt(
  createHash("sha256").update(`${value}\0sex`).digest("hex").slice(0,12),
  16,
)%2===0?"female":"male";

const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const sd=values=>{
  const center=mean(values);
  return Math.sqrt(mean(values.map(value=>(value-center)**2)));
};
const quantile=(values,q)=>{
  const sorted=[...values].sort((a,b)=>a-b);
  const position=(sorted.length-1)*q;
  const lower=Math.floor(position),upper=Math.ceil(position);
  if(lower===upper)return sorted[lower];
  return sorted[lower]+(sorted[upper]-sorted[lower])*(position-lower);
};

const facialVector=genome=>{
  const expressed=expressPhysicalGenome(genome);
  return PHYSICAL_CALIBRATION_LOCI.map(locus=>expressed[locus]);
};

const distance=(left,right)=>Math.sqrt(
  left.reduce((sum,value,index)=>sum+(value-right[index])**2,0)/left.length,
);

const averageDistance=pairs=>mean(pairs.map(([left,right])=>distance(left,right)));

function familyResemblance(referencePopulation,seed,resolvers){
  const families=Array.from({length:12},(_,familyIndex)=>{
    const a=ancestry(referencePopulation);
    const maternal=sampleFounderPhysicalGenome({
      ancestry:a,
      seed:`${seed}:${referencePopulation}:family:${familyIndex}:mother`,
      priorFor:resolvers.priorFor,
      variationFor:resolvers.variationFor,
    });
    const paternal=sampleFounderPhysicalGenome({
      ancestry:a,
      seed:`${seed}:${referencePopulation}:family:${familyIndex}:father`,
      priorFor:resolvers.priorFor,
      variationFor:resolvers.variationFor,
    });
    const children=Array.from({length:4},(_,childIndex)=>recombinePhysicalGenomes({
      maternalGenome:maternal,
      paternalGenome:paternal,
      seed:`${seed}:${referencePopulation}:family:${familyIndex}:child:${childIndex}`,
    }));
    return {maternal,paternal,children};
  });

  const siblingPairs=[];
  const childMidparentPairs=[];
  const unrelatedPairs=[];
  for(let index=0;index<families.length;index++){
    const family=families[index];
    const childVectors=family.children.map(facialVector);
    for(let left=0;left<childVectors.length;left++){
      for(let right=left+1;right<childVectors.length;right++){
        siblingPairs.push([childVectors[left],childVectors[right]]);
      }
    }
    const mother=facialVector(family.maternal),father=facialVector(family.paternal);
    const midparent=mother.map((value,locus)=>(value+father[locus])/2);
    for(const child of childVectors)childMidparentPairs.push([child,midparent]);

    const next=families[(index+1)%families.length];
    unrelatedPairs.push([childVectors[0],facialVector(next.children[0])]);
  }

  const siblingDistance=averageDistance(siblingPairs);
  const childMidparentDistance=averageDistance(childMidparentPairs);
  const unrelatedDistance=averageDistance(unrelatedPairs);
  return Object.freeze({
    siblingDistance,
    childMidparentDistance,
    unrelatedDistance,
    siblingToUnrelatedRatio:siblingDistance/unrelatedDistance,
    childToUnrelatedRatio:childMidparentDistance/unrelatedDistance,
  });
}

function mixedParentDiagnostic(leftPopulation,rightPopulation,seed,resolvers){
  const leftPrior=resolvers.priorFor(leftPopulation);
  const rightPrior=resolvers.priorFor(rightPopulation);
  const children=Array.from({length:96},(_,index)=>{
    const childSeed=`${seed}:mixed:${leftPopulation}:${rightPopulation}:${index}`;
    const maternal=sampleFounderPhysicalGenome({
      ancestry:ancestry(leftPopulation),
      seed:`${childSeed}:maternal:founder`,
      priorFor:resolvers.priorFor,
      variationFor:resolvers.variationFor,
    });
    const paternal=sampleFounderPhysicalGenome({
      ancestry:ancestry(rightPopulation),
      seed:`${childSeed}:paternal:founder`,
      priorFor:resolvers.priorFor,
      variationFor:resolvers.variationFor,
    });
    return recombinePhysicalGenomes({maternalGenome:maternal,paternalGenome:paternal,seed:childSeed});
  });
  const means=Object.fromEntries(PHYSICAL_CALIBRATION_LOCI.map(locus=>[
    locus,
    mean(children.map(genome=>expressPhysicalGenome(genome)[locus])),
  ]));
  const errors=Object.fromEntries(PHYSICAL_CALIBRATION_LOCI.map(locus=>{
    const midpoint=(leftPrior[locus]+rightPrior[locus])/2;
    return [locus,{midpoint,mean:means[locus],error:means[locus]-midpoint}];
  }));
  return Object.freeze({
    populations:[leftPopulation,rightPopulation],
    maxAbsoluteMidpointError:Math.max(...Object.values(errors).map(value=>Math.abs(value.error))),
    loci:Object.freeze(errors),
  });
}

export function generatePhysicalCalibrationCohort({
  referencePopulations,
  count,
  seed="physical-calibration-v1",
  shadowCalibration=null,
}={}){
  if(!Array.isArray(referencePopulations)||referencePopulations.length===0){
    throw new TypeError("physical calibration requires reference populations");
  }
  if(!Number.isInteger(count)||count<referencePopulations.length){
    throw new TypeError("physical calibration count must cover every reference population");
  }
  const resolvers=calibrationResolvers(shadowCalibration);
  for(const referencePopulation of referencePopulations)resolvers.priorFor(referencePopulation);

  const people=[];
  for(let populationIndex=0;populationIndex<referencePopulations.length;populationIndex++){
    const referencePopulation=referencePopulations[populationIndex];
    const target=Math.floor(count/referencePopulations.length)+(populationIndex<count%referencePopulations.length?1:0);
    for(let index=0;index<target;index++){
      const requestId=`physical-calibration:${seed}:${referencePopulation}:${index}`;
      const sex=sexFor(requestId);
      const physicalGenome=founderGenome(referencePopulation,requestId,resolvers);
      const projection=expressInheritedAppearance({physicalGenome,sex});
      const physicalState=referencePhysicalState({
        physicalGenome,
        sex,
        stateSeed:`physical-calibration:${requestId}`,
      });
      const ordinal=String(index+1).padStart(2,"0");
      people.push(Object.freeze({
        name:`${referencePopulation} ${ordinal}`,
        givenName:`${referencePopulation}-${ordinal}`,
        familyName:`calibration-${populationIndex}-${ordinal}`,
        nameOrder:"given-family",
        sex,
        birthplace:"controlled physical cohort",
        populationPlace:referencePopulation,
        familyProfileId:referencePopulation,
        familyProfileShare:1,
        familyOrigin:`Reference population: ${referencePopulation}`,
        raisedLanguages:[],
        spokenLanguages:[],
        referencePopulation,
        renderDescription:projection.renderDescription,
        geometryDescription:projection.geometryDescription,
        surfaceDescription:projection.surfaceDescription,
        projectionVersion:projection.projectionVersion,
        physicalState,
        inheritance:Object.freeze({genome:physicalGenome,phenotype:projection.phenotype}),
      }));
    }
  }
  return Object.freeze(people);
}

export function physicalCalibrationDiagnostics({
  people,
  referencePopulations,
  seed="physical-calibration-v1",
  shadowCalibration=null,
}={}){
  if(!Array.isArray(people)||people.length===0)throw new TypeError("physical calibration people are required");
  const byPopulation={};
  const warnings=[];
  const resolvers=calibrationResolvers(shadowCalibration);

  for(const referencePopulation of referencePopulations){
    const group=people.filter(person=>person.referencePopulation===referencePopulation);
    if(group.length===0)throw new Error(`physical calibration missing ${referencePopulation}`);
    const prior=resolvers.priorFor(referencePopulation);
    const loci=Object.fromEntries(PHYSICAL_CALIBRATION_LOCI.map(locus=>{
      const values=group.map(person=>person.inheritance.phenotype.latent[locus]);
      const average=mean(values);
      return [locus,Object.freeze({
        prior:prior[locus],
        mean:average,
        centerError:average-prior[locus],
        sd:sd(values),
        p05:quantile(values,.05),
        p95:quantile(values,.95),
      })];
    }));
    const maxCenterError=Math.max(...Object.values(loci).map(value=>Math.abs(value.centerError)));
    const spread=Object.values(loci).map(value=>value.sd).sort((a,b)=>a-b);
    const minSd=spread[0];
    const medianSd=quantile(spread,.5);
    const maxSd=spread.at(-1);
    const uniqueLatentSignatures=new Set(group.map(person=>
      PHYSICAL_CALIBRATION_LOCI.map(locus=>person.inheritance.phenotype.latent[locus].toFixed(3)).join("|")
    )).size;
    const resemblance=familyResemblance(referencePopulation,seed,resolvers);

    const statisticalSample=group.length>=24;
    if(statisticalSample&&maxCenterError>.08)warnings.push(`${referencePopulation} center drift >0.08`);
    if(group.length>=12&&medianSd<.05)warnings.push(`${referencePopulation} facial variation too narrow`);
    if(statisticalSample&&minSd<.025)warnings.push(`${referencePopulation} facial locus collapsed`);
    if(statisticalSample&&maxSd>.18)warnings.push(`${referencePopulation} facial variation too broad`);
    if(statisticalSample&&uniqueLatentSignatures/group.length<.95)warnings.push(`${referencePopulation} individual variation collapsed`);
    if(resemblance.siblingToUnrelatedRatio>=.9)warnings.push(`${referencePopulation} siblings not meaningfully related`);
    if(resemblance.childToUnrelatedRatio>=.9)warnings.push(`${referencePopulation} children lost parent resemblance`);

    byPopulation[referencePopulation]=Object.freeze({
      count:group.length,
      statisticalSample,
      uniqueLatentSignatures,
      uniqueShare:uniqueLatentSignatures/group.length,
      maxCenterError,
      minSd,
      medianSd,
      maxSd,
      resemblance,
      loci:Object.freeze(loci),
    });
  }

  const mixed=referencePopulations.length>=2
    ? mixedParentDiagnostic(referencePopulations[0],referencePopulations[1],seed,resolvers)
    : null;
  if(mixed?.maxAbsoluteMidpointError>.08)warnings.push("mixed-parent cohort drifted from parental midpoint");

  return Object.freeze({
    version:"physical-calibration-diagnostics-v0.1",
    count:people.length,
    populations:Object.freeze(byPopulation),
    mixed,
    warnings:Object.freeze(warnings),
  });
}
