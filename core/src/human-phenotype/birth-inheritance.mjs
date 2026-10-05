import {sampleFounderPhysicalGenome} from "./founder-genome.mjs";
import {recombinePhysicalGenomes} from "./physical-genome.mjs";

function parentGenome({genome,ancestry,seed,role,priorFor,variationFor}) {
  if(genome) return {source:"parent",genome};
  if(!ancestry) throw Error(`${role} parent requires genome or ancestry`);
  return {source:"founder",genome:sampleFounderPhysicalGenome({
    ancestry,
    seed:`${seed}:${role}:founder`,
    ...(priorFor===undefined?{}:{priorFor}),
    ...(variationFor===undefined?{}:{variationFor}),
  })};
}

export function resolveBirthPhysicalInheritance({
  maternalGenome,
  paternalGenome,
  maternalAncestry,
  paternalAncestry,
  seed,
  priorFor,
  variationFor,
}) {
  if(seed===undefined||seed===null||String(seed).length===0) throw Error("conception seed is required");

  const maternal=parentGenome({genome:maternalGenome,ancestry:maternalAncestry,seed,role:"maternal",priorFor,variationFor});
  const paternal=parentGenome({genome:paternalGenome,ancestry:paternalAncestry,seed,role:"paternal",priorFor,variationFor});
  const genome=recombinePhysicalGenomes({
    maternalGenome:maternal.genome,
    paternalGenome:paternal.genome,
    seed
  });

  return {
    version:"birth-physical-inheritance-v0.1",
    parents:{maternal,paternal},
    genome
  };
}
