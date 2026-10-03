export function populationLabExperimentParentId(experiment){
  return experiment?.baselineExperimentId
    ??experiment?.summary?.shadowOfExperimentId
    ??null;
}

function activityAt(experiment){
  return experiment?.requestedAt??experiment?.startedAt??"";
}

export function populationLabExperimentRows(experiments=[]){
  const list=Array.isArray(experiments)?experiments:[];
  const byId=new Map(list.map(experiment=>[experiment.experimentId,experiment]));
  const children=new Map();
  for(const experiment of list){
    const parent=populationLabExperimentParentId(experiment);
    if(!parent||!byId.has(parent))continue;
    const siblings=children.get(parent)??[];
    siblings.push(experiment);
    children.set(parent,siblings);
  }

  const roots=list.filter(experiment=>{
    const parent=populationLabExperimentParentId(experiment);
    return !parent||!byId.has(parent);
  });
  const familyActivity=experiment=>{
    const members=[experiment,...(children.get(experiment.experimentId)??[])];
    return members.map(activityAt).sort().at(-1)??"";
  };
  roots.sort((a,b)=>familyActivity(b).localeCompare(familyActivity(a)));

  const rows=[];
  for(const root of roots){
    rows.push(Object.freeze({experiment:root,depth:0}));
    const branches=[...(children.get(root.experimentId)??[])]
      .sort((a,b)=>activityAt(b).localeCompare(activityAt(a)));
    for(const branch of branches)rows.push(Object.freeze({experiment:branch,depth:1}));
  }
  return Object.freeze(rows);
}
