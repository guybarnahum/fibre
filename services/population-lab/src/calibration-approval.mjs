import {referencePopulationCalibration} from "../../../core/src/human-appearance/index.mjs";
import {POPULATION_LAB_CALIBRATION_CANDIDATE_VERSION} from "./calibration-candidate.mjs";

export const POPULATION_LAB_CALIBRATION_APPROVAL_VERSION="fibre-population-lab-calibration-approval-v0.1";

function text(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(name+" is required");
  return value.trim();
}

function artifact(name,value){
  if(!value||typeof value!=="object"||Array.isArray(value)||typeof value.objectRef!=="string"){
    throw new TypeError(name+" artifact is required");
  }
  return Object.freeze({objectRef:value.objectRef,digest:value.digest??null});
}

function candidateAdmission(candidate){
  return Object.freeze({
    id:candidate.referencePopulation,
    version:candidate.proposedCalibration.version,
    values:Object.freeze(Object.fromEntries(
      candidate.proposedCalibration.values.map(change=>[change.locus,change.to]),
    )),
    variation:Object.freeze(Object.fromEntries(
      candidate.proposedCalibration.variation.map(change=>[change.parameter,change.to]),
    )),
    evidence:Object.freeze({
      experimentId:candidate.experimentId,
      candidateCreatedAt:candidate.createdAt,
    }),
  });
}

export function projectCalibrationCandidateImpact({candidate,coverage}={}){
  if(!candidate||candidate.contract!==POPULATION_LAB_CALIBRATION_CANDIDATE_VERSION){
    throw new TypeError("calibration candidate is required");
  }
  if(!coverage||coverage.contract!=="fibre-appearance-coverage-v0.1"||!Array.isArray(coverage.lineages)){
    throw new TypeError("appearance coverage is required");
  }
  const target=candidate.referencePopulation;
  const baseVersion=candidate.baseCalibration.version;
  const threadIds=new Set();
  let lineageCount=0;
  for(const lineage of coverage.lineages){
    const chain=lineage?.calibration?.dependencyChain;
    if(!Array.isArray(chain))continue;
    if(!chain.some(entry=>entry?.id===target&&Number(entry.version)===baseVersion))continue;
    lineageCount+=1;
    if(typeof lineage.threadId==="string"&&lineage.threadId!=="")threadIds.add(lineage.threadId);
  }
  return Object.freeze({
    referencePopulation:target,
    fromVersion:baseVersion,
    toVersion:candidate.proposedCalibration.version,
    threadIds:Object.freeze([...threadIds].sort()),
    threadCount:threadIds.size,
    lineageCount,
  });
}

export function buildPopulationLabCalibrationApproval({
  experiment,
  candidate,
  candidateArtifact,
  reviewArtifact,
  approvedBy,
  impact,
  approvedAt=new Date().toISOString(),
}={}){
  if(!experiment||typeof experiment!=="object"||Array.isArray(experiment)){
    throw new TypeError("experiment is required");
  }
  if(experiment.review?.decision!=="supports_candidate"){
    throw new TypeError("calibration approval requires a supporting visual review");
  }
  if(!candidate||candidate.contract!==POPULATION_LAB_CALIBRATION_CANDIDATE_VERSION){
    throw new TypeError("calibration candidate is required");
  }
  if(candidate.experimentId!==experiment.experimentId){
    throw new TypeError("calibration candidate does not belong to experiment");
  }
  const current=referencePopulationCalibration(candidate.referencePopulation);
  if(current.version!==candidate.baseCalibration.version){
    throw new TypeError("calibration candidate base is no longer current");
  }
  if(candidate.proposedCalibration.version!==current.version+1){
    throw new TypeError("calibration candidate does not advance one local version");
  }
  if(!impact||impact.referencePopulation!==candidate.referencePopulation){
    throw new TypeError("calibration impact preview is required");
  }
  if(Number(impact.fromVersion)!==current.version||Number(impact.toVersion)!==candidate.proposedCalibration.version){
    throw new TypeError("calibration impact preview version changed");
  }

  return Object.freeze({
    contract:POPULATION_LAB_CALIBRATION_APPROVAL_VERSION,
    experimentId:experiment.experimentId,
    referencePopulation:candidate.referencePopulation,
    candidate:artifact("candidate",candidateArtifact),
    review:artifact("visual review",reviewArtifact),
    baseCalibration:candidate.baseCalibration,
    proposedCalibration:candidate.proposedCalibration,
    rationale:candidate.rationale,
    impact:Object.freeze({
      referencePopulation:impact.referencePopulation,
      fromVersion:Number(impact.fromVersion),
      toVersion:Number(impact.toVersion),
      threadIds:Object.freeze([...(impact.threadIds??[])]),
      threadCount:Number(impact.threadCount??0),
      lineageCount:Number(impact.lineageCount??0),
    }),
    admission:candidateAdmission(candidate),
    approvedBy:text("approvedBy",approvedBy),
    approvedAt:text("approvedAt",approvedAt),
  });
}
