import {WorkflowEntrypoint} from "cloudflare:workers";
import {NonRetryableError} from "cloudflare:workflows";

import {POPULATION_LAB_VISUAL_EXPERIMENT_VERSION} from "#services/population-lab/src/visual-experiment.mjs";
import adminWorker from "./admin-worker.mjs";
import {
  completeAdminPopulationLabVisualExperiment,
  failAdminPopulationLabVisualExperiment,
  prepareAdminPopulationLabVisualExperiment,
  reconcileAdminPopulationLabAsset,
  recordAdminPopulationLabVisualAsset,
  runAdminPopulationLabExperimentWorkflow,
} from "./appearance-experiments.mjs";

export {FibreAdminInfraMonitor} from "./admin-worker.mjs";

const ASSET_RETRY=Object.freeze({
  limit:7,
  delay:"5 seconds",
  backoff:"exponential",
});

async function readyAsset(step,env,job,label){
  return step.do(
    label,
    {
      timeout:"1 minute",
      retries:ASSET_RETRY,
    },
    async()=>{
      try{
        const result=await reconcileAdminPopulationLabAsset(env,job);
        if(result?.state==="ready")return result;
        if(result?.state==="pending"){
          throw new Error(`asset ${job.jobId} is still pending`);
        }
        throw new Error(`asset ${job.jobId} returned unsupported state ${String(result?.state)}`);
      }catch(error){
        if(error?.retryable===false){
          throw new NonRetryableError(error.message,"PopulationLabVisualAssetError");
        }
        throw error;
      }
    },
  );
}

async function runVisualWorkflow(workflow,event,step){
  const experimentId=event.payload?.experimentId;
  try{
    const plan=await step.do(
      "prepare visual fidelity sample",
      ()=>prepareAdminPopulationLabVisualExperiment(workflow.env,event.payload),
    );

    for(const sample of plan.samples){
      const ordinal=String(sample.ordinal).padStart(3,"0");
      const geometry=await readyAsset(
        step,
        workflow.env,
        sample.geometryJob,
        `generate geometry ${ordinal}`,
      );
      await step.do(
        `record geometry ${ordinal}`,
        ()=>recordAdminPopulationLabVisualAsset(workflow.env,{
          experimentId,
          sample,
          role:"geometry",
          result:geometry,
        }),
      );

      const portrait=await readyAsset(
        step,
        workflow.env,
        sample.portraitJob,
        `generate portrait ${ordinal}`,
      );
      await step.do(
        `record portrait ${ordinal}`,
        ()=>recordAdminPopulationLabVisualAsset(workflow.env,{
          experimentId,
          sample,
          role:"portrait",
          result:portrait,
        }),
      );
    }

    return await step.do(
      "complete visual fidelity report",
      ()=>completeAdminPopulationLabVisualExperiment(workflow.env,plan),
    );
  }catch(error){
    if(typeof experimentId==="string"){
      await step.do(
        "record visual experiment failure",
        ()=>failAdminPopulationLabVisualExperiment(workflow.env,experimentId,error),
      ).catch(()=>{});
    }
    throw error;
  }
}

export class PopulationLabExperimentWorkflow extends WorkflowEntrypoint {
  async run(event,step){
    if(event.payload?.contract===POPULATION_LAB_VISUAL_EXPERIMENT_VERSION){
      return runVisualWorkflow(this,event,step);
    }
    const request=event.payload;
    return step.do(
      "run controlled physical cohort",
      {
        timeout:"2 minutes",
        retries:{limit:2,delay:"2 seconds",backoff:"exponential"},
      },
      ()=>runAdminPopulationLabExperimentWorkflow(this.env,request),
    );
  }
}

export default adminWorker;
