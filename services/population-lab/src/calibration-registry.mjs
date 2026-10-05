import {requireInfraCapabilities} from "#infra";
import {
  createReferencePopulationModel,
  referencePopulationBaseCalibration,
} from "#core/src/human-appearance/index.mjs";

export const HUMAN_APPEARANCE_CALIBRATION_ADMISSION_VERSION="fibre-human-appearance-calibration-admission-v0.1";
const APPROVAL_VERSION="fibre-population-lab-calibration-approval-v0.1";
const PREFIX="human-appearance:calibration:";

function id(value){
  if(typeof value!=="string"||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)){
    throw new TypeError("reference population id must be a Fibre identifier");
  }
  return value;
}

function version(value){
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<1)throw new TypeError("calibration version must be a positive integer");
  return n;
}

function versionKey(referencePopulation,ordinal){
  return `${PREFIX}${id(referencePopulation)}:v${String(version(ordinal)).padStart(6,"0")}`;
}

function jsonBytes(value){
  return new TextEncoder().encode(JSON.stringify(value,null,2));
}

async function digest(bytes){
  const hashed=await crypto.subtle.digest("SHA-256",bytes);
  return `sha256:${Array.from(new Uint8Array(hashed),byte=>byte.toString(16).padStart(2,"0")).join("")}`;
}

function same(left,right){
  return JSON.stringify(left)===JSON.stringify(right);
}

async function listAll(catalog){
  const entries=[];
  let after=null;
  do{
    const page=await catalog.list({prefix:PREFIX,after,limit:1000});
    entries.push(...page.entries);
    after=page.nextCursor;
  }while(after!==null);
  return entries.map(entry=>entry.value);
}

function rawAdmission(record){
  return Object.freeze({
    id:record.id,
    version:record.version,
    values:Object.freeze({...record.values}),
    variation:Object.freeze({...record.variation}),
    basePrior:Object.freeze({...record.basePrior}),
    baseVariation:Object.freeze({...record.baseVariation}),
    resolvedPrior:Object.freeze({...record.resolvedPrior}),
    resolvedVariation:Object.freeze({...record.resolvedVariation}),
    evidence:Object.freeze({
      ...record.evidence,
      admissionObjectRef:record.objectRef??null,
      admissionDigest:record.digest??null,
    }),
  });
}

export function createHumanAppearanceCalibrationRegistry(infra){
  requireInfraCapabilities(infra,"catalog");

  const records=async()=>Object.freeze(
    (await listAll(infra.catalog))
      .filter(record=>record?.contract===HUMAN_APPEARANCE_CALIBRATION_ADMISSION_VERSION)
      .sort((left,right)=>left.id.localeCompare(right.id)||left.version-right.version),
  );

  const admissions=async()=>Object.freeze((await records()).map(rawAdmission));

  const model=async()=>createReferencePopulationModel(await admissions());

  return Object.freeze({
    records,
    admissions,
    model,

    async history(){
      const currentModel=await model();
      const ids=[...new Set(currentModel.admissions.map(entry=>entry.id))].sort();
      return Object.freeze(ids.map(referencePopulation=>Object.freeze({
        id:referencePopulation,
        currentVersion:currentModel.calibration(referencePopulation).version,
        versions:currentModel.history(referencePopulation),
      })));
    },

    async admit(approval){
      requireInfraCapabilities(infra,"objects","catalog");
      if(!approval||approval.contract!==APPROVAL_VERSION){
        throw new TypeError("calibration approval artifact is invalid");
      }
      const admission=approval.admission;
      if(!admission||typeof admission!=="object"||Array.isArray(admission)){
        throw new TypeError("calibration approval lacks admission");
      }
      const referencePopulation=id(admission.id);
      if(referencePopulation!==approval.referencePopulation){
        throw new TypeError("calibration approval admission target changed");
      }

      const existing=await admissions();
      const currentModel=createReferencePopulationModel(existing);
      const requestedVersion=version(admission.version);
      const key=versionKey(referencePopulation,requestedVersion);
      const priorRecord=await infra.catalog.get(key);
      if(priorRecord!==null){
        if(
          priorRecord?.contract===HUMAN_APPEARANCE_CALIBRATION_ADMISSION_VERSION
          &&priorRecord?.evidence?.approvalExperimentId===approval.experimentId
        ){
          return Object.freeze({
            admission:Object.freeze(priorRecord),
            current:currentModel.calibration(referencePopulation),
            duplicate:true,
          });
        }
        throw new TypeError("calibration admission already exists");
      }

      const current=currentModel.calibration(referencePopulation);
      if(current.version!==Number(approval.baseCalibration?.version)){
        throw new TypeError("calibration approval base is no longer current");
      }
      if(
        Array.isArray(approval.baseCalibration?.dependencyChain)
        &&!same(approval.baseCalibration.dependencyChain,current.dependencyChain)
      ){
        throw new TypeError("calibration approval dependency chain is no longer current");
      }
      if(requestedVersion!==current.version+1){
        throw new TypeError("calibration admission must advance exactly one local version");
      }

      const evidence=Object.freeze({
        ...(admission.evidence??{}),
        approvalExperimentId:approval.experimentId,
        approvedBy:approval.approvedBy,
        approvedAt:approval.approvedAt,
        candidateObjectRef:approval.candidate?.objectRef??null,
        candidateDigest:approval.candidate?.digest??null,
        reviewObjectRef:approval.review?.objectRef??null,
        reviewDigest:approval.review?.digest??null,
      });
      const candidate=Object.freeze({
        id:referencePopulation,
        version:admission.version,
        values:Object.freeze({...admission.values}),
        variation:Object.freeze({...admission.variation}),
        basePrior:current.prior,
        baseVariation:current.variation,
        evidence,
      });
      const nextModel=createReferencePopulationModel([...existing,candidate]);
      const next=nextModel.calibration(referencePopulation);
      const recordWithoutStorage=Object.freeze({
        contract:HUMAN_APPEARANCE_CALIBRATION_ADMISSION_VERSION,
        id:referencePopulation,
        version:next.version,
        values:candidate.values,
        variation:candidate.variation,
        baseCalibration:Object.freeze({
          id:current.id,
          version:current.version,
          dependencyChain:current.dependencyChain,
        }),
        basePrior:current.prior,
        baseVariation:current.variation,
        resolvedPrior:next.prior,
        resolvedVariation:next.variation,
        evidence,
      });
      const bytes=jsonBytes(recordWithoutStorage);
      const objectDigest=await digest(bytes);
      const write=await infra.objects.putImmutable(key,bytes,objectDigest,{
        kind:"human_appearance_calibration_admission",
        referencePopulation,
        version:next.version,
        mediaType:"application/json",
      });
      const record=Object.freeze({
        ...recordWithoutStorage,
        objectRef:key,
        digest:objectDigest,
      });
      await infra.catalog.upsert(key,record);
      return Object.freeze({
        admission:record,
        current:next,
        duplicate:write?.duplicate===true,
      });
    },

    base(referencePopulation){
      return referencePopulationBaseCalibration(referencePopulation);
    },
  });
}
