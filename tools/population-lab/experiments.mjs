import {resolve} from "node:path";
import {createLocalArtifactInfraDriver} from "#infra/providers/local";
import {createPopulationLabExperimentStore} from "../../services/population-lab/src/experiment-artifacts.mjs";

const arg=(name,fallback=null)=>process.argv.find(value=>value.startsWith("--"+name+"="))?.slice(name.length+3)??fallback;

async function main(){
  const root=resolve(arg("output",resolve(".fibre","population-lab")));
  const store=createPopulationLabExperimentStore(createLocalArtifactInfraDriver({root}));
  const show=arg("show");
  const remove=arg("delete");

  if(show&&remove)throw new Error("choose --show or --delete");
  if(show){
    const experiment=await store.get(show);
    if(experiment===null)throw new Error("experiment not found");
    console.log(JSON.stringify(experiment,null,2));
    return;
  }
  if(remove){
    console.log(JSON.stringify(await store.delete(remove),null,2));
    return;
  }

  const page=await store.list({limit:1000});
  console.log(JSON.stringify({
    experiments:page.experiments.map(experiment=>({
      experimentId:experiment.experimentId,
      status:experiment.status,
      startedAt:experiment.startedAt??null,
      completedAt:experiment.completedAt??null,
      summary:experiment.summary??null,
      error:experiment.error??null,
    })),
    nextCursor:page.nextCursor,
  },null,2));
}

main().catch(error=>{console.error("population-lab experiments failed:",error.message);process.exitCode=1});
