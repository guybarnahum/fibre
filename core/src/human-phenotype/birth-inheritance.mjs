import {sampleFounderPhysicalGenome} from "./founder-genome.mjs";
import {recombinePhysicalGenomes} from "./physical-genome.mjs";

function parentGenome({genome,ancestry,seed,role}) {
  if(genome) return {source:"parent",genome};
  if(!ancestry) throw Error(`${role} parent requires genome or ancestry`);
  return {source:"founder",genome:sampleFounderPhysicalGenome({ancestry,seed:`${seed}:${role}:founder`})};
}

export function resolveBirthPhysicalInheritance({
  maternalGenome,
  paternalGenome,
  maternalAncestry,
  paternalAncestry,
  seed
}) {
  if(seed===undefined||seed===null||String(seed).length===0) throw Error("conception seed is required");

  const maternal=parentGenome({genome:maternalGenome,ancestry:maternalAncestry,seed,role:"maternal"});
  const paternal=parentGenome({genome:paternalGenome,ancestry:paternalAncestry,seed,role:"paternal"});
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
