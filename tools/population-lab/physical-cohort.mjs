import {createHash} from "node:crypto";

import {
  expressPhysicalGenome,
  physicalPhenotypeRenderingProjection,
  recombinePhysicalGenomes,
  referencePopulationPrior,
  resolveBirthPhysicalInheritance,
  sampleFounderPhysicalGenome,
} from "../../core/src/human-phenotype/index.mjs";

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

function familyResemblance(referencePopulation,seed){
  const families=Array.from({length:12},(_,familyIndex)=>{
    const a=ancestry(referencePopulation);
    const maternal=sampleFounderPhysicalGenome({
      ancestry:a,
      seed:`${seed}:${referencePopulation}:family:${familyIndex}:mother`,
    });
    const paternal=sampleFounderPhysicalGenome({
      ancestry:a,
      seed:`${seed}:${referencePopulation}:family:${familyIndex}:father`,
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

function mixedParentDiagnostic(leftPopulation,rightPopulation,seed){
  const leftPrior=referencePopulationPrior(leftPopulation);
  const rightPrior=referencePopulationPrior(rightPopulation);
  const children=Array.from({length:96},(_,index)=>resolveBirthPhysicalInheritance({
    maternalAncestry:ancestry(leftPopulation),
    paternalAncestry:ancestry(rightPopulation),
    seed:`${seed}:mixed:${leftPopulation}:${rightPopulation}:${index}`,
  }).genome);
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
}={}){
  if(!Array.isArray(referencePopulations)||referencePopulations.length===0){
    throw new TypeError("physical calibration requires reference populations");
  }
  if(!Number.isInteger(count)||count<referencePopulations.length){
    throw new TypeError("physical calibration count must cover every reference population");
  }
  for(const referencePopulation of referencePopulations)referencePopulationPrior(referencePopulation);

  const people=[];
  for(let populationIndex=0;populationIndex<referencePopulations.length;populationIndex++){
    const referencePopulation=referencePopulations[populationIndex];
    const target=Math.floor(count/referencePopulations.length)+(populationIndex<count%referencePopulations.length?1:0);
    for(let index=0;index<target;index++){
      const requestId=`physical-calibration:${seed}:${referencePopulation}:${index}`;
      const sex=sexFor(requestId);
      const inheritance=resolveBirthPhysicalInheritance({
        maternalAncestry:ancestry(referencePopulation),
        paternalAncestry:ancestry(referencePopulation),
        seed:requestId,
      });
      const projection=physicalPhenotypeRenderingProjection(inheritance.genome,{sex});
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
        renderDescription:projection.description,
        projectionVersion:projection.version,
        inheritance:Object.freeze({genome:inheritance.genome,phenotype:projection.phenotype}),
      }));
    }
  }
  return Object.freeze(people);
}

export function physicalCalibrationDiagnostics({
  people,
  referencePopulations,
  seed="physical-calibration-v1",
}={}){
  if(!Array.isArray(people)||people.length===0)throw new TypeError("physical calibration people are required");
  const byPopulation={};
  const warnings=[];

  for(const referencePopulation of referencePopulations){
    const group=people.filter(person=>person.referencePopulation===referencePopulation);
    if(group.length===0)throw new Error(`physical calibration missing ${referencePopulation}`);
    const prior=referencePopulationPrior(referencePopulation);
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
    const minSd=Math.min(...Object.values(loci).map(value=>value.sd));
    const maxSd=Math.max(...Object.values(loci).map(value=>value.sd));
    const uniqueLatentSignatures=new Set(group.map(person=>
      PHYSICAL_CALIBRATION_LOCI.map(locus=>person.inheritance.phenotype.latent[locus].toFixed(3)).join("|")
    )).size;
    const resemblance=familyResemblance(referencePopulation,seed);

    if(maxCenterError>.08)warnings.push(`${referencePopulation} center drift >0.08`);
    if(minSd<.025)warnings.push(`${referencePopulation} facial variation collapsed`);
    if(maxSd>.18)warnings.push(`${referencePopulation} facial variation too broad`);
    if(uniqueLatentSignatures/group.length<.95)warnings.push(`${referencePopulation} individual variation collapsed`);
    if(resemblance.siblingToUnrelatedRatio>=.9)warnings.push(`${referencePopulation} siblings not meaningfully related`);
    if(resemblance.childToUnrelatedRatio>=.9)warnings.push(`${referencePopulation} children lost parent resemblance`);

    byPopulation[referencePopulation]=Object.freeze({
      count:group.length,
      uniqueLatentSignatures,
      uniqueShare:uniqueLatentSignatures/group.length,
      maxCenterError,
      minSd,
      maxSd,
      resemblance,
      loci:Object.freeze(loci),
    });
  }

  const mixed=referencePopulations.length>=2
    ? mixedParentDiagnostic(referencePopulations[0],referencePopulations[1],seed)
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
