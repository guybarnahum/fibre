import {createHash} from "node:crypto";
import {expressPhysicalGenome} from "../human-phenotype/physical-genome.mjs";
import {referencePhysicalState} from "./reference-physical-state.mjs";

export const PHYSICAL_DEVELOPMENT_VERSION="physical-development-v0.1";

function unit(seed,key){
  const hex=createHash("sha256").update(`${seed}\0${key}`).digest("hex").slice(0,13);
  return Number.parseInt(hex,16)/0xfffffffffffff;
}
const signed=(seed,key)=>2*unit(seed,key)-1;
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
function progress(age,start,end){
  const x=clamp((age-start)/(end-start));
  return x*x*(3-2*x);
}
function bodyLabel(value){
  if(value<-.62)return "lean";
  if(value<-.22)return "light-average";
  if(value<.25)return "average";
  if(value<.70)return "fuller";
  return "heavy";
}
const bodyIndex={"lean":-.83,"light-average":-.42,"average":0,"fuller":.47,"heavy":.9};

/**
 * Stable, genome-influenced appearance hypothesis, never a record of lived
 * weight, nutrition, exercise, illness or actual hair loss.
 *
 * The canonical reference at 25 is the visual baseline. Different Threads
 * may gain, lose, regain or maintain weight, and may lose little or much hair.
 */
export function physicalDevelopmentAtAge({threadId,physicalGenome,sex,ageYears}={}){
  if(typeof threadId!=="string"||!threadId)throw new TypeError("development requires Thread identity");
  if(!Number.isSafeInteger(ageYears)||ageYears<3||ageYears>95){
    throw new TypeError("development requires an age from 3 to 95");
  }
  const inherited=expressPhysicalGenome(physicalGenome);
  if(typeof sex!=="string"||!sex)throw new TypeError("development requires sex");
  const reference=referencePhysicalState({
    physicalGenome,sex,stateSeed:`canonical-reference:${threadId}`,referenceAgeYears:25,
  });
  const seed=`development:${threadId}`;
  // Independent adult and later-life influences. Neither is a universal
  // direction, an invented body-weight history or a fixed age stereotype.
  const gain=(signed(seed,"adult-composition")*.98+inherited.adiposityTendency*.30);
  const lateChange=signed(seed,"later-composition")*.82;
  const muscleChange=signed(seed,"muscle-development")*.50;
  const isChild=ageYears<18;
  const bodyDelta=isChild?null
    :gain*progress(ageYears,25,52)+lateChange*progress(ageYears,56,85)
      -gain*.12*(1-progress(ageYears,18,25));
  const normalized=bodyDelta===null?null:clamp(bodyIndex[reference.bodyComposition]+bodyDelta,-1.3,1.6);
  const bodyComposition=normalized===null?null:bodyLabel(normalized);
  const relativeBody=bodyDelta===null?null:bodyDelta>.55?"substantially fuller"
    :bodyDelta>.23?"noticeably fuller":bodyDelta<-.55?"substantially leaner"
    :bodyDelta<-.23?"noticeably leaner":"similar in body composition";
  const propensity=clamp((inherited.hairlineLossTendency+1)/2);
  const male=sex.toLowerCase()==="male";
  const onset=(male?19:31)+(1-propensity)*(male?37:38)
    +signed(seed,"hair-onset")*8;
  const intensity=clamp((male?.25:.08)+propensity*(male?.65:.44)
    +signed(seed,"hair-intensity")*.24);
  const hairLossAt=age=>intensity*progress(age,onset,onset+32);
  // Preserve the canonical hairline at 25, even if its natural maturity
  // already reflects some early recession.
  const scalpChange=ageYears<25?0:hairLossAt(ageYears)-hairLossAt(25);
  const density=clamp((inherited.hairDensity+1)/2);
  const loss=clamp(scalpChange+(1-density)*scalpChange*.26);
  const scalpHair=ageYears<18?"childhood hair coverage"
    :loss>.74?"extensive scalp hair loss, with large bald regions"
    :loss>.51?"pronounced temple recession and crown thinning"
    :loss>.29?"visible hairline recession and thinning at the crown"
    :loss>.12?"mild hairline recession or reduced scalp density"
    :"hairline and scalp coverage close to the canonical portrait";
  const description=isChild
    ?`At age ${ageYears}, preserve child-appropriate body and facial proportions. Adult adiposity and hair-loss propensity must not be mistaken for childhood body weight or baldness.`
    :[
      `At age ${ageYears}, provisional body composition: ${bodyComposition}, ${relativeBody} than the canonical age-25 portrait.`,
      relativeBody==="substantially fuller"||relativeBody==="noticeably fuller"
        ?"Allow greater fullness of the cheeks, lower face, jawline and neck; do not automatically slim the subject."
        :relativeBody==="substantially leaner"||relativeBody==="noticeably leaner"
          ?"Allow naturally reduced facial and neck fullness; do not keep the canonical face's body mass fixed."
          :"Preserve the person's distinctive facial proportions while allowing ordinary age-related tissue changes.",
      `Scalp hair: ${scalpHair}. Preserve this individual's coverage rather than automatically keeping full hair or forcing baldness.`,
    ].join(" ");
  return Object.freeze({
    version:PHYSICAL_DEVELOPMENT_VERSION,
    kind:"provisional_nonhistorical_projection",
    ageYears,referenceAgeYears:25,
    bodyComposition,relativeBody,
    // The scalp descriptor describes current appearance, not genomic propensity.
    scalpHair,
    muscularDevelopment:ageYears<18?null:muscleChange*progress(ageYears,25,65),
    description,
  });
}
