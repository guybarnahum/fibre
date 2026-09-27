import {createHash} from "node:crypto";

export const PHYSICAL_GENOME_VERSION="physical-genome-v0.2";

const LOCI = Object.freeze([
  "pigmentation","eyePigmentation","hairPigmentation","frecklingTendency","hairForm","hairDensity","hairlineLossTendency","facialHairTendency",
  "faceBreadth","faceLength","midfaceProminence","zygomaticProjection",
  "eyeSpacing","eyeShape","epicanthicFold","upperEyelidExposure","orbitalDepth","foreheadProportion","brow",
  "noseBreadth","noseProjection","nasalBridgeHeight","softTissue",
  "jawBreadth","chinProjection","frame","height","bodyProportion","adiposityTendency","muscularityTendency","shoulderHipProportion"
]);

function unit(seed, locus) {
  const hex=createHash("sha256").update(`${seed}\0${locus}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}

const clamp=value=>Math.max(-1,Math.min(1,Number(value)));

function allele(value) {
  if(!Number.isFinite(Number(value))) throw Error("physical allele value is required");
  return {value:clamp(value)};
}

export function createPhysicalGenome(loci) {
  const genome={version:PHYSICAL_GENOME_VERSION,loci:{}};
  for(const name of LOCI) {
    const pair=loci?.[name];
    if(!Array.isArray(pair)||pair.length!==2) throw Error(`${name} requires two inherited alleles`);
    genome.loci[name]=pair.map(x=>allele(x.value));
  }
  return genome;
}

export function recombinePhysicalGenomes({maternalGenome,paternalGenome,seed}) {
  if(seed===undefined||seed===null||String(seed).length===0) throw Error("conception seed is required");
  const child={};
  for(const name of LOCI) {
    const maternal=maternalGenome?.loci?.[name],paternal=paternalGenome?.loci?.[name];
    if(!maternal||!paternal) throw Error(`${name} missing from parent genome`);
    child[name]=[
      maternal[unit(seed,`maternal:${name}`)<0.5?0:1],
      paternal[unit(seed,`paternal:${name}`)<0.5?0:1]
    ];
  }
  return createPhysicalGenome(child);
}

export function expressPhysicalGenome(genome) {
  const expressed={};
  for(const name of LOCI) {
    const [a,b]=genome?.loci?.[name]??[];
    if(!a||!b) throw Error(`${name} missing from physical genome`);
    expressed[name]=clamp((Number(a.value)+Number(b.value))/2);
  }
  return expressed;
}

export const physicalGenomeLoci=LOCI;
