function suffix(experimentId){
  const compact=String(experimentId??"").replace(/^plexp_/u,"").replace(/[^A-Za-z0-9]/gu,"");
  return compact.slice(-4)||"run";
}

export function populationLabExperimentName(experiment={}){
  const referencePopulation=
    experiment.referencePopulation
    ??experiment.summary?.referencePopulation
    ??experiment.visual?.summary?.referencePopulation
    ??"Population Lab";
  const refinement=
    experiment.experimentKind==="refinement"
    ||experiment.summary?.shadow===true;
  return [
    referencePopulation,
    refinement?"refine":null,
    suffix(experiment.experimentId),
  ].filter(Boolean).join(" · ");
}
