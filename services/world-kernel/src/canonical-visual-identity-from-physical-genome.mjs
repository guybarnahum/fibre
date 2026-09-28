import {
  expressInheritedAppearance,
  referencePhysicalState,
} from "#core/src/human-appearance/index.mjs";
import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";

const encoder=new TextEncoder();

function nonEmpty(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(`${name} is required`);
  return value.trim();
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
  }).renderDescription;
  const referenceState=referencePhysicalState({
    physicalGenome,
    sex:normalizedSex,
    stateSeed:`canonical-reference:${ownerId}`,
    referenceAgeYears:25,
  });
  const subjectDescription=`adult ${normalizedSex} person; ${inheritedAppearance} ${referenceState.description}`;
  if(encoder.encode(subjectDescription).byteLength<500)throw new Error("canonical visual phenotype is too thin for durable cross-age identity");
  return Object.freeze({
    subject:Object.freeze({partyId:ownerId,description:subjectDescription}),
    method:"canonical synthetic portrait specification derived from the Thread's inherited physical genome",
    description:"Render the inherited phenotype and normalized reference physical state exactly as stated. Do not choose phenotype again, infer ancestry from appearance, or substitute generic/default facial geometry, pigmentation, hair, eyes, body structure, sex traits, body shape, skin finish, or symmetry. Preserve the person's inherited morphology and proportions across age transformations. The reference physical state is deliberately non-historical rendering normalization; do not treat it as evidence of the Thread's actual weight, grooming, skin, injury, or lived body at age 25. Do not infer culture, religion, nationality, heritage, personality, ability, class, behavior, or worth from appearance. Render a neutral head-and-shoulders reference at normalized age 25, mostly frontal, hairline visible, even daylight-balanced illumination, ordinary perspective, no cosmetic enhancement, and no glamour or stylization drift.",
    model:"replaceable-renderer",
  });
}
