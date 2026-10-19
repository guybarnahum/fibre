import {normalizeVisualAgeAnchorAdmission} from "./visual-age-anchors.mjs";

export const VISUAL_AGE_ANCHOR_ADMISSION_CATALOG_PREFIX="visual-age-anchor:admission:";

/** Read only admitted, immutable age portraits for one Thread; never candidates. */
export async function readVisualAgeAnchorAdmissions(catalog,threadId){
  if(!catalog||typeof catalog.list!=="function")throw new TypeError("age anchor catalog reader is required");
  if(typeof threadId!=="string"||!/^thr_[A-Za-z0-9._:-]+$/.test(threadId)){
    throw new TypeError("age anchor threadId is invalid");
  }
  const prefix=VISUAL_AGE_ANCHOR_ADMISSION_CATALOG_PREFIX+threadId+":";
  const anchors=[];
  let after=null;
  do{
    const page=await catalog.list({prefix,after,limit:100});
    anchors.push(...page.entries.map(entry=>normalizeVisualAgeAnchorAdmission(entry.value)));
    after=page.nextCursor;
  }while(after!==null);
  return anchors;
}
