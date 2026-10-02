export const POPULATION_LAB_VISUAL_REVIEW_VERSION="fibre-population-lab-visual-review-v0.1";

const DECISIONS=new Set(["supports_candidate","reject","inconclusive"]);
const SCORE_FIELDS=["geometryFidelity","identityContinuity","surfaceRealism"];

function text(name,value,{required=false}={}){
  if(value===null||value===undefined||value===""){
    if(required)throw new TypeError(name+" is required");
    return null;
  }
  if(typeof value!=="string")throw new TypeError(name+" must be text");
  const clean=value.trim();
  if(required&&clean==="")throw new TypeError(name+" is required");
  return clean===""?null:clean;
}

function score(name,value){
  const number=Number(value);
  if(!Number.isInteger(number)||number<1||number>5){
    throw new TypeError(name+" must be an integer from 1 through 5");
  }
  return number;
}

function average(values){
  return Math.round((values.reduce((sum,value)=>sum+value,0)/values.length)*100)/100;
}

export function buildPopulationLabVisualReview({experiment,input,reviewedAt=new Date().toISOString()}={}){
  if(!experiment||typeof experiment!=="object"||Array.isArray(experiment)){
    throw new TypeError("experiment is required");
  }
  if(experiment.visual?.status!=="completed"){
    throw new TypeError("visual review requires a completed visual experiment");
  }
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new TypeError("visual review is required");
  }
  const expected=Number.isInteger(experiment.visual?.sampleSize)&&experiment.visual.sampleSize>0
    ?experiment.visual.sampleSize
    :Number.isInteger(experiment.visual?.summary?.sampleSize)&&experiment.visual.summary.sampleSize>0
      ?experiment.visual.summary.sampleSize
      :null;
  if(expected===null)throw new TypeError("visual experiment sample size is missing");

  if(!Array.isArray(input.samples)||input.samples.length!==expected){
    throw new TypeError("visual review must score every sample");
  }
  const seen=new Set();
  const samples=input.samples
    .map(raw=>{
      if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new TypeError("visual review sample is invalid");
      const ordinal=Number(raw.ordinal);
      if(!Number.isInteger(ordinal)||ordinal<1||ordinal>expected)throw new TypeError("visual review sample ordinal is invalid");
      if(seen.has(ordinal))throw new TypeError("visual review sample ordinal is duplicated");
      seen.add(ordinal);
      return Object.freeze({
        ordinal,
        geometryFidelity:score("geometryFidelity",raw.geometryFidelity),
        identityContinuity:score("identityContinuity",raw.identityContinuity),
        surfaceRealism:score("surfaceRealism",raw.surfaceRealism),
        note:text("sample note",raw.note),
      });
    })
    .sort((left,right)=>left.ordinal-right.ordinal);
  if(samples.some((sample,index)=>sample.ordinal!==index+1)){
    throw new TypeError("visual review must score every sample ordinal");
  }

  const decision=text("decision",input.decision,{required:true});
  if(!DECISIONS.has(decision))throw new TypeError("visual review decision is invalid");
  const summary=Object.freeze(Object.fromEntries(SCORE_FIELDS.map(field=>[
    field,
    average(samples.map(sample=>sample[field])),
  ])));

  return Object.freeze({
    contract:POPULATION_LAB_VISUAL_REVIEW_VERSION,
    experimentId:text("experimentId",experiment.experimentId,{required:true}),
    referencePopulation:text(
      "referencePopulation",
      experiment.visual?.summary?.referencePopulation??experiment.summary?.referencePopulation,
      {required:true},
    ),
    decision,
    scores:summary,
    samples:Object.freeze(samples),
    note:text("review note",input.note),
    evidence:Object.freeze({
      images:Object.freeze((experiment.images??[])
        .filter(image=>["geometry","portrait"].includes(image?.role))
        .map(image=>Object.freeze({
          ordinal:image.ordinal,
          role:image.role,
          objectRef:image.objectRef,
          digest:image.digest??null,
        }))),
    }),
    reviewedAt:text("reviewedAt",reviewedAt,{required:true}),
  });
}
