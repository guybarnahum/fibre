import {
  physicalGenomeLoci,
  referencePopulationCalibration,
  referencePopulationPrior,
  referencePopulationVariation,
} from "../../../core/src/human-appearance/index.mjs";

export const POPULATION_LAB_CALIBRATION_CANDIDATE_VERSION="fibre-population-lab-calibration-candidate-v0.1";

const LOCI=new Set(physicalGenomeLoci);

function nonEmpty(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(name+" is required");
  return value.trim();
}

function artifactEvidence(experiment){
  const artifacts={};
  for(const key of ["manifest","population","result","report","visualReport","visualReview"]){
    const artifact=experiment.artifacts?.[key];
    if(artifact?.objectRef)artifacts[key]=Object.freeze({
      objectRef:artifact.objectRef,
      digest:artifact.digest??null,
    });
  }
  return Object.freeze(artifacts);
}

export function buildPopulationLabCalibrationCandidate({
  experiment,
  manifest,
  values={},
  variation={},
  rationale,
  createdAt=new Date().toISOString(),
}={}){
  if(!experiment||typeof experiment!=="object"||Array.isArray(experiment)){
    throw new TypeError("experiment is required");
  }
  if(experiment.status!=="completed")throw new TypeError("calibration candidate requires a completed experiment");
  if(["queued","running"].includes(experiment.visual?.status)){
    throw new TypeError("calibration candidate requires stable experiment evidence");
  }
  if(!manifest||typeof manifest!=="object"||Array.isArray(manifest)){
    throw new TypeError("experiment manifest is required");
  }

  const referencePopulation=nonEmpty("referencePopulation",manifest.referencePopulation);
  const snapshot=manifest.source?.calibration;
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot)){
    throw new TypeError("experiment calibration snapshot is required");
  }
  if(snapshot.id!==undefined&&snapshot.id!==referencePopulation){
    throw new TypeError("experiment calibration snapshot does not match reference population");
  }

  const calibration=referencePopulationCalibration(referencePopulation);
  if(Number(snapshot.version)!==calibration.version){
    throw new TypeError("experiment calibration is no longer current");
  }

  if(!values||typeof values!=="object"||Array.isArray(values)){
    throw new TypeError("candidate values must be an object");
  }
  if(!variation||typeof variation!=="object"||Array.isArray(variation)){
    throw new TypeError("candidate variation must be an object");
  }
  const prior=referencePopulationPrior(referencePopulation);
  const valueChanges=[];
  for(const [locus,rawValue] of Object.entries(values).sort(([left],[right])=>left.localeCompare(right))){
    if(!LOCI.has(locus))throw new TypeError(`unknown physical calibration locus: ${locus}`);
    const value=Number(rawValue);
    if(!Number.isFinite(value)||value < -1||value > 1){
      throw new TypeError(`${locus} calibration value must be from -1 through 1`);
    }
    if(value===prior[locus])continue;
    valueChanges.push(Object.freeze({locus,from:prior[locus],to:value}));
  }

  const currentVariation=referencePopulationVariation(referencePopulation);
  const variationChanges=[];
  for(const [parameter,rawValue] of Object.entries(variation).sort(([left],[right])=>left.localeCompare(right))){
    if(!(parameter in currentVariation))throw new TypeError(`unknown physical variation parameter: ${parameter}`);
    const value=Number(rawValue);
    if(!Number.isFinite(value)||value<=0){
      throw new TypeError(`${parameter} variation multiplier must be positive`);
    }
    if(value===currentVariation[parameter])continue;
    variationChanges.push(Object.freeze({parameter,from:currentVariation[parameter],to:value}));
  }
  if(valueChanges.length===0&&variationChanges.length===0){
    throw new TypeError("calibration candidate must change at least one calibration parameter");
  }

  return Object.freeze({
    contract:POPULATION_LAB_CALIBRATION_CANDIDATE_VERSION,
    experimentId:nonEmpty("experimentId",experiment.experimentId),
    referencePopulation,
    baseCalibration:Object.freeze({
      id:calibration.id,
      version:calibration.version,
      dependencyChain:calibration.dependencyChain,
      prior:Object.freeze({...prior}),
      variation:Object.freeze({...currentVariation}),
    }),
    proposedCalibration:Object.freeze({
      id:calibration.id,
      version:calibration.version+1,
      values:Object.freeze(valueChanges),
      variation:Object.freeze(variationChanges),
    }),
    rationale:nonEmpty("rationale",rationale),
    evidence:Object.freeze({
      artifacts:artifactEvidence(experiment),
      images:Object.freeze((experiment.images??[]).map(image=>Object.freeze({
        objectRef:image.objectRef,
        digest:image.digest??null,
        ordinal:image.ordinal,
        role:image.role,
      }))),
    }),
    createdAt:nonEmpty("createdAt",createdAt),
  });
}
