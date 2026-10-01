import {createCloudflareInfraDriver} from "#infra/providers/cloudflare";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "#services/population-lab/src/experiment-artifacts.mjs";

function experimentStore(env){
  return createPopulationLabExperimentStore(createCloudflareInfraDriver({
    objectBucket:env?.PRESENTATION_OBJECTS,
    catalogDatabase:env?.PRESENTATION_CATALOG,
  }));
}

export async function listAdminPopulationLabExperiments(env){
  return experimentStore(env).list({limit:200});
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
