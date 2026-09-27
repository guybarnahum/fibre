import { physicalPhenotypeRenderingProjection } from "#core/src/human-phenotype/index.mjs";
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
  const inheritedAppearance=physicalPhenotypeRenderingProjection(physicalGenome,{sex:normalizedSex}).description;
  const subjectDescription=`adult ${normalizedSex} person; ${inheritedAppearance}`;
  if(encoder.encode(subjectDescription).byteLength<500)throw new Error("canonical visual phenotype is too thin for durable cross-age identity");
  return Object.freeze({
    subject:Object.freeze({partyId:ownerId,description:subjectDescription}),
    method:"canonical synthetic portrait specification derived from the Thread's inherited physical genome",
    description:"Render the inherited phenotype exactly as stated. Do not choose phenotype again, infer ancestry from appearance, or substitute generic/default facial geometry, pigmentation, hair, eyes, body structure, or sex traits. Preserve the person's inherited morphology and proportions across age transformations. Treat current body composition, muscularity, hairline expression, grooming, hairstyle, clothing, expression, injury, and aging as lived or time-local appearance rather than replacements for inherited identity. Do not infer culture, religion, nationality, heritage, personality, ability, class, behavior, or worth from appearance. Render a neutral head-and-shoulders reference at normalized age 25, mostly frontal, hairline visible, ordinary skin texture, even daylight-balanced illumination, ordinary perspective, and no glamour or stylization drift.",
    model:"replaceable-renderer",
  });
}
