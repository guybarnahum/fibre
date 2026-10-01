import {createCloudflareInfraDriver} from "#infra/providers/cloudflare";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "#services/population-lab/src/experiment-artifacts.mjs";
import {
  normalizePhysicalExperimentRequest,
  runPersistedPhysicalExperiment,
} from "#services/population-lab/src/physical-experiment.mjs";

const WORKFLOW_NAME="population_lab_experiment_v1";

function experimentInfra(env,{workflow=false}={}){
  return createCloudflareInfraDriver({
    objectBucket:env?.PRESENTATION_OBJECTS,
    catalogDatabase:env?.PRESENTATION_CATALOG,
    workflowBindings:workflow&&env?.POPULATION_LAB_EXPERIMENT
      ? {[WORKFLOW_NAME]:env.POPULATION_LAB_EXPERIMENT}
      : {},
  });
}

function experimentStore(env){
  return createPopulationLabExperimentStore(experimentInfra(env));
}

function physicalExperimentSeed(spec){
  const version=spec?.calibration?.version??"current";
  return `appearance:${spec.coverageKey}:${spec.referencePopulation}:${version}`;
}

function newExperimentId(){
  return "plexp_"+crypto.randomUUID().replaceAll("-","").slice(0,24);
}

export function adminPopulationLabExperimentRequest(spec,{
  experimentId=newExperimentId(),
  requestedAt=new Date().toISOString(),
}={}){
  if(!spec||typeof spec!=="object"||Array.isArray(spec))throw new TypeError("experiment specification must be an object");
  if(spec.action!=="experiment")throw new TypeError("experiment action is required");
  if(typeof spec.referencePopulation!=="string"||spec.referencePopulation.trim()===""){
    throw new TypeError("coverage hole must have a reference population before an experiment can run");
  }
  return normalizePhysicalExperimentRequest({
    experimentId,
    referencePopulation:spec.referencePopulation,
    count:Number.isInteger(spec.count)?spec.count:24,
    seed:physicalExperimentSeed(spec),
    requestedAt,
    source:{
      coverageKey:spec.coverageKey??null,
      coverage:spec.coverage??null,
      populations:Array.isArray(spec.populations)?spec.populations:[],
      threadIds:Array.isArray(spec.threadIds)?spec.threadIds:[],
      places:Array.isArray(spec.places)?spec.places:[],
      calibration:spec.calibration??null,
    },
  });
}

export async function launchAdminPopulationLabExperiment(env,spec){
  const request=adminPopulationLabExperimentRequest(spec);
  const store=experimentStore(env);
  await store.queue(request.experimentId,request);
  const infra=experimentInfra(env,{workflow:true});
  try{
    const workflow=await infra.workflows.start(WORKFLOW_NAME,request.experimentId,request);
    return Object.freeze({
      experiment:await store.get(request.experimentId),
      workflow,
    });
  }catch(error){
    await store.fail(request.experimentId,error).catch(()=>{});
    throw error;
  }
}

export async function runAdminPopulationLabExperimentWorkflow(env,rawRequest){
  const request=normalizePhysicalExperimentRequest(rawRequest);
  return runPersistedPhysicalExperiment({
    request,
    artifacts:experimentStore(env),
  });
}

export async function listAdminPopulationLabExperiments(env){
  const page=await experimentStore(env).list({limit:200});
  return{
    ...page,
    experiments:[...page.experiments].sort((left,right)=>{
      const a=left.requestedAt??left.startedAt??"";
      const b=right.requestedAt??right.startedAt??"";
      return b.localeCompare(a);
    }),
  };
}

export async function readAdminPopulationLabExperiment(env,experimentId){
  return experimentStore(env).get(experimentId);
}

export async function deleteAdminPopulationLabExperiment(env,experimentId){
  return experimentStore(env).delete(experimentId);
}

export async function readAdminPopulationLabReport(env,experimentId){
  return experimentStore(env).getArtifact(populationLabExperimentRef(experimentId,"report"));
}

export async function readAdminPopulationLabImage(env,experimentId,ordinal,role){
  if(!/^\d{3}$/u.test(ordinal))throw new TypeError("image ordinal must be three digits");
  if(!["geometry","portrait"].includes(role))throw new TypeError("image role is invalid");
  return experimentStore(env).getArtifact(
    populationLabExperimentRef(experimentId,`image:${ordinal}:${role}`),
  );
}
