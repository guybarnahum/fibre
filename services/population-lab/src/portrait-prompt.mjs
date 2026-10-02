function required(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(`${name} is required`);
  return value.trim();
}

export function populationGeometryAnchorPrompt({
  sex,
  geometryDescription,
  physicalGeometryDescription,
}={}){
  const normalizedSex=required("portrait sex",sex);
  return [
    "Create a neutral monochrome geometry anchor for one fictional adult age 25.",
    `Sex: ${normalizedSex}.`,
    required("portrait geometry description",geometryDescription),
    required("portrait physical geometry description",physicalGeometryDescription),
    "Lock facial structure, facial proportions, eye/orbit placement and opening, nose geometry, jaw/chin, facial fullness, body structure, and ordinary asymmetry.",
    "Render medium-neutral grayscale skin, brows, eyes, and simple close-to-head hair as temporary scaffolding only.",
    "Do not infer ancestry, race, ethnicity, nationality, or a demographic face template.",
    "Do not introduce distinctive pigmentation, hair color, hair texture, cosmetics, facial hair, or styling.",
    "Neutral expression, mostly frontal head-and-shoulders framing, even natural lighting, ordinary lens perspective, no glamour or stylization.",
    "NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.",
  ].join(" ");
}

export function populationSurfacePortraitPrompt({
  sex,
  surfaceDescription,
  physicalSurfaceDescription,
}={}){
  const normalizedSex=required("portrait sex",sex);
  return [
    "Edit the supplied geometry anchor into the final realistic neutral documentary head-and-shoulders portrait of the same fictional adult age 25.",
    `Sex: ${normalizedSex}.`,
    required("portrait surface description",surfaceDescription),
    required("portrait physical surface description",physicalSurfaceDescription),
    "Preserve the reference image's facial geometry, proportions, eye placement/opening, nose, jaw/chin, facial fullness, and asymmetry. Do not redesign the face.",
    "Apply only the specified pigmentation, eye color, hair color/texture/density, skin texture, hairline, hairstyle, and facial-hair presentation.",
    "Never use pigmentation, hair, eye color, or grooming as permission to replace the reference with a racial, ethnic, national, beauty, or stock-face template.",
    "Do not beautify, homogenize, slim, symmetrize, glamourize, or retouch skin.",
    "Keep the same neutral expression, mostly frontal framing, ordinary perspective, and even daylight-balanced illumination.",
    "NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.",
  ].join(" ");
}

export function populationPortraitPrompt({sex,renderDescription,physicalStateDescription=null}){
  if(typeof sex!=="string"||sex.trim()==="")throw new TypeError("portrait sex is required");
  if(typeof renderDescription!=="string"||renderDescription.trim()==="")throw new TypeError("portrait render description is required");
  if(physicalStateDescription!==null&&(typeof physicalStateDescription!=="string"||physicalStateDescription.trim()==="")){
    throw new TypeError("portrait physical state description must be non-empty when supplied");
  }
  const state=physicalStateDescription===null?"":` ${physicalStateDescription}`;
  return `Edge-to-edge realistic neutral documentary head-and-shoulders portrait photograph of one fictional adult age 25. Sex: ${sex}. ${renderDescription}${state} Render exactly this concrete inherited phenotype and ordinary reference physical state. Preserve facial geometry, pigmentation, hair, eyes, build cues, body-composition cues, skin texture and ordinary asymmetry. Do not exaggerate continuous coordinates into caricature; nearby values should produce subtle nearby physical differences. Do not beautify, homogenize, slim, symmetrize, glamourize, retouch skin, or substitute a generic attractive face. Do not infer or add ancestry, race, ethnicity, nationality, culture, personality, class, religion or behavior. Neutral expression, simple dark top, plain photographic background. NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.`;
}
