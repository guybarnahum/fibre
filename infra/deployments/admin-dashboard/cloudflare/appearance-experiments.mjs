import {createCloudflareInfraDriver} from "#infra/providers/cloudflare";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "#services/population-lab/src/experiment-artifacts.mjs";
import {
  normalizePhysicalExperimentRequest,
  runPersistedPhysicalExperiment,
} from "#services/population-lab/src/physical-experiment.mjs";
import {
  POPULATION_LAB_VISUAL_SAMPLE_SIZE,
  buildPopulationLabVisualPlan,
  normalizeVisualExperimentRequest,
  renderPopulationLabVisualReport,
} from "#services/population-lab/src/visual-experiment.mjs";

const WORKFLOW_NAME="population_lab_experiment_v1";

function experimentInfra(env,{workflow=false,services=false,realtime=false}={}){
  return createCloudflareInfraDriver({
    objectBucket:env?.PRESENTATION_OBJECTS,
    catalogDatabase:env?.PRESENTATION_CATALOG,
    workflowBindings:workflow&&env?.POPULATION_LAB_EXPERIMENT
      ? {[WORKFLOW_NAME]:env.POPULATION_LAB_EXPERIMENT}
      : {},
    serviceBindings:services&&env?.ASSET_GENERATOR
      ? {asset_generator:env.ASSET_GENERATOR}
      : {},
    privateToken:services?env?.FIBRE_PRIVATE_TOKEN:null,
    realtimeChannels:realtime?env?.ADMIN_LIVE:null,
  });
}

function experimentStore(env){
  return createPopulationLabExperimentStore(experimentInfra(env));
}

async function publishExperimentHint(env,experimentId,aspect="progress"){
  try{
    const infra=experimentInfra(env,{realtime:true});
    if(!infra.realtime)return;
    await infra.realtime.publish("admin",{
      entity:"population_lab_experiment",
      id:experimentId,
      aspect,
    });
  }catch{}
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

export async function launchAdminPopulationLabVisualExperiment(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  const request=experiment.visual?.status==="failed"&&!experiment.visual?.startedAt
    ? normalizeVisualExperimentRequest(await store.retryQueuedVisual(experimentId))
    : normalizeVisualExperimentRequest({
        experimentId,
        requestedAt:new Date().toISOString(),
        sampleSize:POPULATION_LAB_VISUAL_SAMPLE_SIZE,
      });
  if(!experiment.visual)await store.queueVisual(experimentId,request);
  const infra=experimentInfra(env,{workflow:true});
  try{
    const workflow=await infra.workflows.start(
      WORKFLOW_NAME,
      experimentId+":visual",
      request,
    );
    return Object.freeze({
      experiment:await store.get(experimentId),
      workflow,
    });
  }catch(error){
    await store.failVisual(experimentId,error).catch(()=>{});
    throw error;
  }
}

export async function prepareAdminPopulationLabVisualExperiment(env,rawRequest){
  const request=normalizeVisualExperimentRequest(rawRequest);
  const store=experimentStore(env);
  await store.runningVisual(request.experimentId);
  await publishExperimentHint(env,request.experimentId,"running");
  const experiment=await store.get(request.experimentId);
  const populationRef=experiment?.artifacts?.population?.objectRef;
  if(typeof populationRef!=="string")throw new Error("experiment population artifact is missing");
  const population=await store.getArtifact(populationRef);
  if(population===null)throw new Error("experiment population bytes are missing");
  return buildPopulationLabVisualPlan({
    request,
    populationBytes:population.bytes,
  });
}

export async function reconcileAdminPopulationLabAsset(env,job){
  const infra=experimentInfra(env,{services:true});
  return infra.services.call("asset_generator","generation.reconcile",{job});
}

export async function recordAdminPopulationLabVisualAsset(env,{experimentId,sample,role,result}){
  if(result?.state!=="ready")throw new TypeError("visual asset must be ready before recording");
  const receipt=result?.proof?.receipt;
  const job=role==="geometry"?sample.geometryJob:sample.portraitJob;
  if(!receipt||receipt.objectRef!==job.outputObjectRef||receipt.jobId!==job.jobId){
    throw new Error("Asset Generator proof does not match Population Lab visual job");
  }
  const store=experimentStore(env);
  await store.adoptImage(experimentId,{
    ordinal:sample.ordinal,
    role,
    objectRef:receipt.objectRef,
    digest:receipt.sha256,
    mediaType:receipt.mediaType,
  });
  await store.adoptArtifact(experimentId,{
    key:`visualReceipt${String(sample.ordinal).padStart(3,"0")}${role==="geometry"?"Geometry":"Portrait"}`,
    objectRef:job.receiptObjectRef,
  });
  await publishExperimentHint(env,experimentId,role);
  return receipt;
}

export async function completeAdminPopulationLabVisualExperiment(env,plan){
  const store=experimentStore(env);
  await store.putVisualReport(plan.request.experimentId,renderPopulationLabVisualReport(plan));
  const completed=await store.completeVisual(plan.request.experimentId,{
    sampleSize:plan.samples.length,
    images:plan.samples.length*2,
    referencePopulation:plan.referencePopulation,
  });
  await publishExperimentHint(env,plan.request.experimentId,"completed");
  return completed;
}

export async function failAdminPopulationLabVisualExperiment(env,experimentId,error){
  const failed=await experimentStore(env).failVisual(experimentId,error);
  await publishExperimentHint(env,experimentId,"failed");
  return failed;
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
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)return null;
  const objectRef=experiment.artifacts?.visualReport?.objectRef
    ?? experiment.artifacts?.report?.objectRef
    ?? populationLabExperimentRef(experimentId,"report");
  return store.getArtifact(objectRef);
}

export async function readAdminPopulationLabImage(env,experimentId,ordinal,role){
  if(!/^\d{3}$/u.test(ordinal))throw new TypeError("image ordinal must be three digits");
  if(!["geometry","portrait"].includes(role))throw new TypeError("image role is invalid");
  return experimentStore(env).getArtifact(
    populationLabExperimentRef(experimentId,`image:${ordinal}:${role}`),
  );
}
