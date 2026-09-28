import {
  expressInheritedAppearance,
  referencePhysicalState,
} from "#core/src/human-appearance/index.mjs";
import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";

const encoder=new TextEncoder();

export const CANONICAL_VISUAL_APPEARANCE_LAYER_VERSION="canonical-visual-appearance-layers-v0.1";

const HEADERS=Object.freeze([
  "SEX",
  "STRUCTURAL MORPHOLOGY",
  "REFERENCE GEOMETRY STATE",
  "SURFACE PHENOTYPE",
  "REFERENCE SURFACE STATE",
]);

function nonEmpty(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(`${name} is required`);
  return value.trim();
}

function layeredDescription({sex,geometryDescription,geometryStateDescription,surfaceDescription,surfaceStateDescription}){
  return [
    `CANONICAL APPEARANCE LAYERS ${CANONICAL_VISUAL_APPEARANCE_LAYER_VERSION}`,
    "SEX",sex,
    "STRUCTURAL MORPHOLOGY",geometryDescription,
    "REFERENCE GEOMETRY STATE",geometryStateDescription,
    "SURFACE PHENOTYPE",surfaceDescription,
    "REFERENCE SURFACE STATE",surfaceStateDescription,
  ].join("\n");
}

export function canonicalVisualAppearanceLayers(subjectDescription){
  const value=nonEmpty("canonical visual subject description",subjectDescription);
  const prefix=`CANONICAL APPEARANCE LAYERS ${CANONICAL_VISUAL_APPEARANCE_LAYER_VERSION}\n`;
  if(!value.startsWith(prefix))return null;
  const lines=value.split("\n");
  if(lines.length!==11||lines[0]!==prefix.trim()){
    throw new TypeError("canonical visual appearance layers are malformed");
  }
  for(let index=0;index<HEADERS.length;index++){
    const lineIndex=1+index*2;
    if(lines[lineIndex]!==HEADERS[index]||!lines[lineIndex+1]?.trim()){
      throw new TypeError(`canonical visual appearance layer ${HEADERS[index]} is missing`);
    }
  }
  return Object.freeze({
    version:CANONICAL_VISUAL_APPEARANCE_LAYER_VERSION,
    sex:normalizeGenesisSex(lines[2]),
    geometryDescription:lines[4].trim(),
    geometryStateDescription:lines[6].trim(),
    surfaceDescription:lines[8].trim(),
    surfaceStateDescription:lines[10].trim(),
  });
}

export function canonicalVisualSpecificationFromPhysicalGenome({
  threadId,
  sex,
  physicalGenome,
}={}){
  const ownerId=nonEmpty("threadId",threadId);
  const normalizedSex=normalizeGenesisSex(sex);
  if(!physicalGenome)throw new TypeError("canonical visual identity requires the inherited physical genome");
  const inheritedAppearance=expressInheritedAppearance({
    physicalGenome,
    sex:normalizedSex,
  });
  const referenceState=referencePhysicalState({
    physicalGenome,
    sex:normalizedSex,
    stateSeed:`canonical-reference:${ownerId}`,
    referenceAgeYears:25,
  });
  const subjectDescription=layeredDescription({
    sex:normalizedSex,
    geometryDescription:inheritedAppearance.geometryDescription,
    geometryStateDescription:referenceState.geometryDescription,
    surfaceDescription:inheritedAppearance.surfaceDescription,
    surfaceStateDescription:referenceState.surfaceDescription,
  });
  if(encoder.encode(subjectDescription).byteLength<500)throw new Error("canonical visual phenotype is too thin for durable cross-age identity");
  return Object.freeze({
    subject:Object.freeze({partyId:ownerId,description:subjectDescription}),
    method:"layered canonical synthetic portrait specification derived from the Thread's inherited physical genome",
    description:"Instantiate structural morphology before surface appearance. The final canonical portrait must preserve the geometry anchor exactly while applying inherited pigmentation, hair, eye color and normalized surface state. Do not infer ancestry from appearance or let surface traits choose a different facial template. Preserve ordinary asymmetry and body state without beautification. The normalized reference state is rendering normalization, not evidence of the Thread's actual historical body at age 25. Do not infer culture, religion, nationality, heritage, personality, ability, class, behavior, or worth from appearance.",
    model:"replaceable-renderer",
  });
}
