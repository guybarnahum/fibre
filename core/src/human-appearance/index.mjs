import {
  PHYSICAL_GENOME_VERSION,
  createPhysicalGenome,
  expressPhysicalGenome,
  physicalGenomeLoci,
  recombinePhysicalGenomes,
} from "../human-phenotype/physical-genome.mjs";
import {phenotypeFromPhysicalGenome} from "../human-phenotype/phenotype.mjs";
import {physicalPhenotypeRenderingProjection} from "../human-phenotype/rendering-projection.mjs";
import {
  referencePopulationCalibration,
  referencePopulationCalibrations,
  referencePopulationDependencyChain,
  referencePopulationForPopulationId,
  referencePopulationIds,
  referencePopulationPrior,
  referencePopulationVariation,
} from "../human-phenotype/reference-populations.mjs";
import {sampleFounderPhysicalGenome} from "../human-phenotype/founder-genome.mjs";
import {resolveBirthPhysicalInheritance} from "../human-phenotype/birth-inheritance.mjs";
import {normalizeAncestry} from "../human-phenotype/ancestry.mjs";

export const HUMAN_APPEARANCE_MODEL_VERSION="human-appearance-v0.4";

function parentSource(role,value){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new TypeError(`${role} physical source is required`);
  }
  const hasGenome=value.physicalGenome!==undefined&&value.physicalGenome!==null;
  const hasLineage=value.physicalLineage!==undefined&&value.physicalLineage!==null;
  if(hasGenome===hasLineage){
    throw new TypeError(`${role} requires exactly one of physicalGenome or physicalLineage`);
  }
  return hasGenome
    ? {genome:value.physicalGenome,ancestry:null}
    : {genome:null,ancestry:value.physicalLineage};
}

/**
 * Stable Human Appearance inheritance boundary.
 *
 * Inputs are biological parent physical genomes when they exist, otherwise
 * explicit parental physical-lineage evidence. Geography, nationality, names,
 * language, culture and renderer labels do not enter this boundary.
 */
export function resolveHumanPhysicalInheritance({
  maternal,
  paternal,
  conceptionSeed,
}={}){
  if(conceptionSeed===undefined||conceptionSeed===null||String(conceptionSeed).length===0){
    throw new TypeError("conceptionSeed is required");
  }
  const mother=parentSource("maternal",maternal);
  const father=parentSource("paternal",paternal);
  const inheritance=resolveBirthPhysicalInheritance({
    maternalGenome:mother.genome,
    paternalGenome:father.genome,
    maternalAncestry:mother.ancestry,
    paternalAncestry:father.ancestry,
    seed:conceptionSeed,
  });
  return Object.freeze({
    version:HUMAN_APPEARANCE_MODEL_VERSION,
    inheritanceVersion:inheritance.version,
    parentSources:Object.freeze({
      maternal:inheritance.parents.maternal.source,
      paternal:inheritance.parents.paternal.source,
    }),
    physicalGenome:inheritance.genome,
  });
}

/**
 * Stable inherited-appearance projection boundary.
 *
 * The output contains concrete anatomy only. It intentionally carries no
 * population, ancestry, geography, nationality, culture, language or name.
 */
export function expressInheritedAppearance({physicalGenome,sex}={}){
  if(!physicalGenome)throw new TypeError("physicalGenome is required");
  const projection=physicalPhenotypeRenderingProjection(physicalGenome,{sex});
  return Object.freeze({
    version:HUMAN_APPEARANCE_MODEL_VERSION,
    projectionVersion:projection.version,
    phenotype:projection.phenotype,
    anatomy:projection.anatomy,
    geometryDescription:projection.geometryDescription,
    surfaceDescription:projection.surfaceDescription,
    renderDescription:projection.description,
  });
}

export const normalizePhysicalLineage=normalizeAncestry;

export {
  PHYSICAL_GENOME_VERSION,
  createPhysicalGenome,
  expressPhysicalGenome,
  physicalGenomeLoci,
  recombinePhysicalGenomes,
  phenotypeFromPhysicalGenome,
  referencePopulationCalibration,
  referencePopulationCalibrations,
  referencePopulationDependencyChain,
  referencePopulationForPopulationId,
  referencePopulationIds,
  referencePopulationPrior,
  referencePopulationVariation,
  sampleFounderPhysicalGenome,
};


export {
  REFERENCE_PHYSICAL_STATE_VERSION,
  referencePhysicalState,
} from "./reference-physical-state.mjs";
