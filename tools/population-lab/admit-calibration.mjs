import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {
  referencePopulationCalibration,
  referencePopulationPrior,
  referencePopulationVariation,
} from "../../core/src/human-appearance/index.mjs";
import {
  referencePopulationAdmissions,
} from "../../core/src/human-phenotype/reference-population-admissions.mjs";

const APPROVAL_CONTRACT="fibre-population-lab-calibration-approval-v0.1";
const SOURCE_PATH=fileURLToPath(new URL(
  "../../core/src/human-phenotype/reference-population-admissions.mjs",
  import.meta.url,
));

function arg(name){
  const prefix="--"+name+"=";
  const value=process.argv.slice(2).find(item=>item.startsWith(prefix));
  return value?value.slice(prefix.length):null;
}

function source(admissions){
  return [
    "// Source-controlled Human Appearance calibration admissions.",
    "// Entries are written only from reviewed Population Lab approval artifacts.",
    "// Runtime code reads this file as part of the canonical reference registry.",
    "export const referencePopulationAdmissions=Object.freeze("+JSON.stringify(admissions,null,2)+");",
    "",
  ].join("\n");
}

const approvalPath=arg("approval");
if(!approvalPath){
  throw new TypeError("Usage: node tools/population-lab/admit-calibration.mjs --approval=/path/to/approval.json");
}

const approval=JSON.parse(await readFile(resolve(approvalPath),"utf8"));
if(approval?.contract!==APPROVAL_CONTRACT)throw new TypeError("calibration approval artifact is invalid");

const admission=approval.admission;
if(!admission||typeof admission!=="object"||Array.isArray(admission)){
  throw new TypeError("calibration approval lacks source admission");
}
if(admission.id!==approval.referencePopulation){
  throw new TypeError("calibration approval admission target changed");
}

const current=referencePopulationCalibration(admission.id);
if(current.version!==approval.baseCalibration?.version){
  throw new TypeError("calibration approval base is no longer current");
}
if(admission.version!==current.version+1){
  throw new TypeError("calibration admission must advance exactly one local version");
}
if(referencePopulationAdmissions.some(entry=>entry.id===admission.id&&entry.version===admission.version)){
  throw new TypeError("calibration admission already exists");
}

const basePrior=approval.baseCalibration?.prior??referencePopulationPrior(admission.id);
const baseVariation=approval.baseCalibration?.variation??referencePopulationVariation(admission.id);
const resolvedPrior={...basePrior,...(admission.values??{})};
const resolvedVariation={...baseVariation,...(admission.variation??{})};

const next=[
  ...referencePopulationAdmissions,
  {
    id:admission.id,
    version:admission.version,
    values:{...(admission.values??{})},
    variation:{...(admission.variation??{})},
    basePrior,
    baseVariation,
    resolvedPrior,
    resolvedVariation,
    evidence:{
      ...(admission.evidence??{}),
      approvalExperimentId:approval.experimentId,
      approvedBy:approval.approvedBy,
      approvedAt:approval.approvedAt,
      candidateObjectRef:approval.candidate?.objectRef??null,
      candidateDigest:approval.candidate?.digest??null,
      reviewObjectRef:approval.review?.objectRef??null,
      reviewDigest:approval.review?.digest??null,
    },
  },
].sort((left,right)=>left.id.localeCompare(right.id)||left.version-right.version);

await writeFile(SOURCE_PATH,source(next),"utf8");
console.log(JSON.stringify({
  event:"calibration-admitted-to-source",
  referencePopulation:admission.id,
  fromVersion:current.version,
  toVersion:admission.version,
  affectedThreadsProjected:approval.impact?.threadCount??null,
  source:SOURCE_PATH,
},null,2));
