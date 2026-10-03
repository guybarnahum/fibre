import {physicalGenomeLoci} from "./physical-genome.mjs";

const LOCI=new Set(physicalGenomeLoci);
const VARIATION=new Set([
  "familyFactorMultiplier",
  "structuralResidualMultiplier",
  "generalResidualMultiplier",
]);

function admissionObject(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new TypeError("reference population admission must be an object");
  const id=typeof raw.id==="string"?raw.id.trim():"";
  if(id==="")throw new TypeError("reference population admission id is required");
  const version=Number(raw.version);
  if(!Number.isSafeInteger(version)||version<1)throw new TypeError("reference population admission version is invalid");
  const values=raw.values??{};
  const variation=raw.variation??{};
  if(!values||typeof values!=="object"||Array.isArray(values))throw new TypeError("reference population admission values must be an object");
  if(!variation||typeof variation!=="object"||Array.isArray(variation))throw new TypeError("reference population admission variation must be an object");

  const normalizedValues={};
  for(const [locus,rawValue] of Object.entries(values)){
    if(!LOCI.has(locus))throw new TypeError("unknown physical calibration locus: "+locus);
    const value=Number(rawValue);
    if(!Number.isFinite(value)||value < -1||value > 1)throw new TypeError(locus+" calibration value must be from -1 through 1");
    normalizedValues[locus]=value;
  }

  const normalizedVariation={};
  for(const [parameter,rawValue] of Object.entries(variation)){
    if(!VARIATION.has(parameter))throw new TypeError("unknown physical variation parameter: "+parameter);
    const value=Number(rawValue);
    if(!Number.isFinite(value)||value<=0)throw new TypeError(parameter+" variation multiplier must be positive");
    normalizedVariation[parameter]=value;
  }

  if(Object.keys(normalizedValues).length===0&&Object.keys(normalizedVariation).length===0){
    throw new TypeError("reference population admission must change calibration");
  }

  return Object.freeze({
    id,
    version,
    values:Object.freeze(normalizedValues),
    variation:Object.freeze(normalizedVariation),
    evidence:raw.evidence&&typeof raw.evidence==="object"&&!Array.isArray(raw.evidence)
      ?Object.freeze({...raw.evidence})
      :Object.freeze({}),
  });
}

export function applyReferencePopulationAdmissions(baseDefinitions,rawAdmissions=[]){
  if(!baseDefinitions||typeof baseDefinitions!=="object"||Array.isArray(baseDefinitions)){
    throw new TypeError("reference population definitions are required");
  }
  if(!Array.isArray(rawAdmissions))throw new TypeError("reference population admissions must be an array");

  const definitions=Object.fromEntries(Object.entries(baseDefinitions).map(([id,definition])=>[
    id,
    {
      ...definition,
      values:{...(definition.values??{})},
      variation:definition.variation===undefined?undefined:{...definition.variation},
      populationIds:definition.populationIds===undefined?undefined:[...definition.populationIds],
    },
  ]));

  for(const raw of rawAdmissions){
    const admission=admissionObject(raw);
    const current=definitions[admission.id];
    if(!current)throw new TypeError("reference population admission target does not exist: "+admission.id);
    const currentVersion=Number(current.version);
    if(admission.version!==currentVersion+1){
      throw new TypeError(admission.id+" admission must advance exactly one local version");
    }
    definitions[admission.id]={
      ...current,
      version:admission.version,
      values:{...(current.values??{}),...admission.values},
      variation:{...(current.variation??{}),...admission.variation},
      admissionEvidence:admission.evidence,
    };
  }

  return Object.freeze(Object.fromEntries(Object.entries(definitions).map(([id,definition])=>[
    id,
    Object.freeze({
      ...definition,
      values:Object.freeze({...definition.values}),
      variation:definition.variation===undefined?undefined:Object.freeze({...definition.variation}),
      populationIds:definition.populationIds===undefined?undefined:Object.freeze([...definition.populationIds]),
    }),
  ])));
}
