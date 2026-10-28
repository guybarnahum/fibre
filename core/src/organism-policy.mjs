import {createHash} from "node:crypto";
import {URGE_FAMILIES,URGE_FAMILY_BY_NAME,SPECIES_STANDARD_ORIENTATION} from "./inherited-urges.mjs";

export const DEFAULT_ORGANISM_POLICY=Object.freeze({
  version:"1",inheritedSpread:1,plasticity:0,plasticityHalfLifeDays:30,
  enabledFamilies:Object.freeze(["social_contact","exploration","presence"]),
  characterFormation:Object.freeze({enabled:true,minSalientResponses:2}),
});

export function normalizeOrganismPolicy(value){
  const raw=typeof value==="string"?JSON.parse(value):value;
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new TypeError("organism policy must be an object");
  const expected=["version","inheritedSpread","plasticity","plasticityHalfLifeDays","enabledFamilies","characterFormation"];
  if(Object.keys(raw).sort().join("|")!==expected.sort().join("|"))throw new TypeError("organism policy fields invalid");
  if(raw.version!=="1")throw new TypeError("organism policy version unsupported");
  const bounded=(name,n,min,max)=>{if(typeof n!=="number"||!Number.isFinite(n)||n<min||n>max)throw new TypeError(name+" out of bounds");return n};
  bounded("inheritedSpread",raw.inheritedSpread,0,1);
  bounded("plasticity",raw.plasticity,0,1);
  bounded("plasticityHalfLifeDays",raw.plasticityHalfLifeDays,1,365);
  if(!Array.isArray(raw.enabledFamilies)||new Set(raw.enabledFamilies).size!==raw.enabledFamilies.length
    ||raw.enabledFamilies.some(family=>!URGE_FAMILY_BY_NAME.has(family)))
    throw new TypeError("organism policy enabledFamilies invalid");
  const character=raw.characterFormation;
  if(!character||typeof character!=="object"||Object.keys(character).sort().join("|")!=="enabled|minSalientResponses"
    ||typeof character.enabled!=="boolean"
    ||!Number.isSafeInteger(character.minSalientResponses)||character.minSalientResponses<1||character.minSalientResponses>100)
    throw new TypeError("organism policy characterFormation invalid");
  return Object.freeze({
    version:raw.version,
    inheritedSpread:raw.inheritedSpread,
    plasticity:raw.plasticity,
    plasticityHalfLifeDays:raw.plasticityHalfLifeDays,
    enabledFamilies:Object.freeze([...raw.enabledFamilies]),
    characterFormation:Object.freeze({...character}),
  });
}

export function organismPolicyDigest(policy){
  return "sha256:"+createHash("sha256").update(JSON.stringify(normalizeOrganismPolicy(policy))).digest("hex");
}

export function speciesOrientation(family){
  if(!URGE_FAMILY_BY_NAME.has(family))throw new TypeError("unknown urge family");
  return SPECIES_STANDARD_ORIENTATION[family];
}

// There is no inherited change to the historical genome: this only controls
// the contemporary Body's projection of that immutable legacy baseline.
export function legacySensitivity(s,inheritedSpread){
  if(!Number.isFinite(s)||s<0.85||s>1.15)throw new TypeError("legacy sensitivity out of envelope");
  return 1+(s-1)*inheritedSpread;
}
