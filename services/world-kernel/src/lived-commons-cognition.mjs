import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";
import { runInteriorCognition } from "./interior-cognition.mjs";
import { remainingPlanForCognition } from "./lived-plan-cognition.mjs";

const DECISIONS = Object.freeze(["enter", "stay_out"]);

const COMMONS_ENTRY_ADAPTER = Object.freeze({
  id:"commons-entry",
  prompt:"interior.commons-entry",
  resultSchema:{
    type:"object",
    additionalProperties:false,
    required:["decision","activity","purpose","reason"],
    properties:{
      decision:{ type:"string", enum:DECISIONS },
      activity:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
      purpose:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
      reason:{ type:"string", minLength:1, maxLength:500 },
    },
  },
});

export async function formCommonsEntryChoice({
  threadId,
  at,
  situation,
  plan,
  sourceStores,
  modelAdapter,
}) {
  assertId("Commons Thread threadId", threadId);
  assertPlainObject("Commons situation", situation);
  assertPlainObject("Commons plan", plan);

  const cognition = await runInteriorCognition({
    threadId,
    at,
    concern:{
      kind:"commons_entry",
      question:"Do I want Fibre Commons quietly present in the background right now?",
      externalContext:{
        currentSituation:structuredClone(situation),
        remainingFlightPlan:remainingPlanForCognition(plan),
        commons:{
          name:"Fibre Commons",
          description:"A quiet ambient mediated common space that can stay open in the background while ordinary life continues; presence does not imply conversation.",
        },
      },
    },
    adapter:COMMONS_ENTRY_ADAPTER,
    sourceStores,
    modelAdapter,
  });

  assertPlainObject("Commons entry output", cognition.result);
  assertExactKeys("Commons entry output", cognition.result, ["decision","activity","purpose","reason"]);
  if (!DECISIONS.includes(cognition.result.decision)) {
    throw new TypeError("Commons entry decision is invalid");
  }
  assertNonEmpty("Commons entry reason", cognition.result.reason);
  if (cognition.result.decision === "enter") {
    assertNonEmpty("Commons entry activity", cognition.result.activity);
    assertNonEmpty("Commons entry purpose", cognition.result.purpose);
  } else if (cognition.result.activity !== null || cognition.result.purpose !== null) {
    throw new TypeError("stay_out cannot author Commons plan content");
  }

  return Object.freeze({
    decision:cognition.result.decision,
    activity:cognition.result.activity,
    purpose:cognition.result.purpose,
    reason:cognition.result.reason,
    cognition:Object.freeze({
      provider:cognition.provenance.provider,
      modelId:cognition.provenance.modelId,
      providerRequestId:cognition.provenance.providerRequestId ?? null,
      implementationProfile:structuredClone(cognition.implementationProfile),
      sourceThreadVersion:cognition.provenance.sourceThreadVersion,
      selectedEvidenceRefs:Object.freeze([...cognition.provenance.selectedEvidenceRefs]),
      evidenceRefs:Object.freeze([...cognition.evidenceRefs]),
      contextDigest:cognition.provenance.contextDigest,
    }),
  });
}
