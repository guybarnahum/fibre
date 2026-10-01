import {WorkflowEntrypoint} from "cloudflare:workers";

import adminWorker from "./admin-worker.mjs";
import {runAdminPopulationLabExperimentWorkflow} from "./appearance-experiments.mjs";

export {FibreAdminInfraMonitor} from "./admin-worker.mjs";

export class PopulationLabExperimentWorkflow extends WorkflowEntrypoint {
  async run(event,step){
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
