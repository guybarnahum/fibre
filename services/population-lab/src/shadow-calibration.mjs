import {
  physicalGenomeLoci,
  referencePopulationCalibration,
  referencePopulationPrior,
  referencePopulationVariation,
} from "../../../core/src/human-appearance/index.mjs";

export const POPULATION_LAB_SHADOW_CALIBRATION_VERSION="fibre-population-lab-shadow-calibration-v0.1";

const LOCI=new Set(physicalGenomeLoci);

function nonEmpty(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(name+" is required");
  return value.trim();
}

function object(name,value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError(name+" must be an object");
  return value;
}

function sources(value){
  if(!Array.isArray(value)||value.length===0)throw new TypeError("shadow calibration requires research evidence");
  return Object.freeze(value.map((item,index)=>{
    if(typeof item==="string"){
      return Object.freeze({source:nonEmpty("evidence source",item),note:null});
    }
    object("evidence item",item);
    return Object.freeze({
      source:nonEmpty("evidence source",item.source),
      note:item.note===undefined||item.note===null||String(item.note).trim()===""
        ?null
        :String(item.note).trim(),
    });
  }));
}

export function normalizePopulationLabShadowCalibration(raw={}){
  object("shadow calibration",raw);
  const referencePopulation=nonEmpty("referencePopulation",raw.referencePopulation);
  const calibration=referencePopulationCalibration(referencePopulation);
  const base=object("baseCalibration",raw.baseCalibration);
  if(base.id!==referencePopulation)throw new TypeError("shadow calibration base does not match reference population");
  if(Number(base.version)!==calibration.version)throw new TypeError("shadow calibration base is no longer current");

  const currentPrior=referencePopulationPrior(referencePopulation);
  const currentVariation=referencePopulationVariation(referencePopulation);
  const rawValues=raw.values??{};
  const rawVariation=raw.variation??{};
  object("shadow calibration values",rawValues);
  object("shadow calibration variation",rawVariation);

  const values={};
  for(const [locus,rawValue] of Object.entries(rawValues).sort(([a],[b])=>a.localeCompare(b))){
    if(!LOCI.has(locus))throw new TypeError("unknown physical calibration locus: "+locus);
    const value=Number(rawValue);
    if(!Number.isFinite(value)||value < -1||value > 1){
      throw new TypeError(locus+" calibration value must be from -1 through 1");
    }
    if(value!==currentPrior[locus])values[locus]=value;
  }

  const variation={};
  for(const [parameter,rawValue] of Object.entries(rawVariation).sort(([a],[b])=>a.localeCompare(b))){
    if(!(parameter in currentVariation))throw new TypeError("unknown physical variation parameter: "+parameter);
    const value=Number(rawValue);
    if(!Number.isFinite(value)||value<=0)throw new TypeError(parameter+" variation multiplier must be positive");
    if(value!==currentVariation[parameter])variation[parameter]=value;
  }

  if(Object.keys(values).length===0&&Object.keys(variation).length===0){
    throw new TypeError("shadow calibration must change at least one calibration parameter");
  }

  return Object.freeze({
    contract:POPULATION_LAB_SHADOW_CALIBRATION_VERSION,
    referencePopulation,
    baseCalibration:Object.freeze({
      id:calibration.id,
      version:calibration.version,
      dependencyChain:calibration.dependencyChain,
      prior:Object.freeze({...currentPrior}),
      variation:Object.freeze({...currentVariation}),
    }),
    values:Object.freeze(values),
    variation:Object.freeze(variation),
    rationale:nonEmpty("rationale",raw.rationale),
    evidence:sources(raw.evidence),
  });
}

export function populationLabShadowCalibrationResolvers(rawShadow){
  const shadow=normalizePopulationLabShadowCalibration(rawShadow);
  const target=shadow.referencePopulation;
  const targetPrior=Object.freeze({...referencePopulationPrior(target),...shadow.values});
  const targetVariation=Object.freeze({...referencePopulationVariation(target),...shadow.variation});
  return Object.freeze({
    shadow,
    priorFor:id=>id===target?targetPrior:referencePopulationPrior(id),
    variationFor:id=>id===target?targetVariation:referencePopulationVariation(id),
  });
}
