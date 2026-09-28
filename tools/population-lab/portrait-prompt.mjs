export function populationPortraitPrompt({sex,renderDescription,physicalStateDescription=null}){
  if(typeof sex!=="string"||sex.trim()==="")throw new TypeError("portrait sex is required");
  if(typeof renderDescription!=="string"||renderDescription.trim()==="")throw new TypeError("portrait render description is required");
  if(physicalStateDescription!==null&&(typeof physicalStateDescription!=="string"||physicalStateDescription.trim()==="")){
    throw new TypeError("portrait physical state description must be non-empty when supplied");
  }
  const state=physicalStateDescription===null?"":` ${physicalStateDescription}`;
  return `Edge-to-edge realistic neutral documentary head-and-shoulders portrait photograph of one fictional adult age 25. Sex: ${sex}. ${renderDescription}${state} Render exactly this concrete inherited phenotype and ordinary reference physical state. Preserve facial geometry, pigmentation, hair, eyes, build cues, body-composition cues, skin texture and ordinary asymmetry. Do not exaggerate continuous coordinates into caricature; nearby values should produce subtle nearby physical differences. Do not beautify, homogenize, slim, symmetrize, glamourize, retouch skin, or substitute a generic attractive face. Do not infer or add ancestry, race, ethnicity, nationality, culture, personality, class, religion or behavior. Neutral expression, simple dark top, plain photographic background. NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.`;
}
