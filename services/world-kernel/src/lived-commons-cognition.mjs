import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const DECISIONS = Object.freeze(["enter", "stay_out"]);

function requestId(input) {
  return `commons-entry_${sha256(canonicalJson(input))}`;
}

export async function formCommonsEntryChoice({
  thread,
  situation,
  plan,
  modelAdapter,
}) {
  assertPlainObject("Commons Thread", thread);
  assertId("Commons Thread.threadId", thread.threadId);
  assertPlainObject("Commons situation", situation);
  assertPlainObject("Commons plan", plan);
  if (!modelAdapter || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("Commons entry requires modelAdapter.invoke");
  }

  const input = {
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name ?? null,
      selfDescription:thread.identity?.selfDescription ?? "",
      selfModel:thread.currentState?.selfModel ?? "",
      stableTendencies:structuredClone(thread.genome?.textualTraits ?? {}),
      needs:[...(thread.currentState?.needs ?? [])],
      feelings:[...(thread.currentState?.feelings ?? [])],
      unresolvedIntentions:[...(thread.currentState?.unresolvedIntentions ?? [])],
    },
    currentSituation:structuredClone(situation),
    remainingFlightPlan:structuredClone(plan),
    commons:{
      name:"Fibre Commons",
      description:"A quiet ambient mediated common space that can stay open in the background while a Thread continues ordinary life; presence does not imply conversation.",
    },
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt:`You are one persistent Fibre Thread deciding whether to keep Fibre Commons open in the background for a short while from the life already underway.
Fibre Commons is an optional ambient mediated common space. Entering it does not move the Thread physically, does not require focused attention, and does not commit the Thread to speak, meet anyone, or abandon the current activity. Think of being quietly present in a shared café-like digital space while continuing what you were already doing.
Decide naturally from this particular Thread's current activity, needs, feelings, intentions, stable tendencies and remaining Flight Plan. Do not require an explicit pre-existing intention to socialize: low-cost curiosity, ordinary sociability, comfort with ambient company, or willingness to be reachable may make background presence fit. Equally, privacy, concentration, fatigue, discomfort or simple preference may make stay_out the natural choice.
If entering, preserve the life already underway. activity should describe the existing activity continuing with Commons present in the background; purpose should explain why this Thread is comfortable being ambiently present, not manufacture a desire to meet someone.
If staying out, activity and purpose must be null.
Do not invent relationships, change physical location, expose private records, or assume that being in Commons means wanting an encounter.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["decision","activity","purpose"],
      properties:{
        decision:{ type:"string", enum:DECISIONS },
        activity:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
        purpose:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
      },
    },
    clientRequestId:requestId(input),
  });

  assertPlainObject("Commons entry output", invocation.output);
  assertExactKeys("Commons entry output", invocation.output, ["decision","activity","purpose"]);
  if (!DECISIONS.includes(invocation.output.decision)) {
    throw new TypeError("Commons entry decision is invalid");
  }
  if (invocation.output.decision === "enter") {
    assertNonEmpty("Commons entry activity", invocation.output.activity);
    assertNonEmpty("Commons entry purpose", invocation.output.purpose);
  } else if (invocation.output.activity !== null || invocation.output.purpose !== null) {
    throw new TypeError("stay_out cannot author Commons plan content");
  }

  return Object.freeze({
    decision:invocation.output.decision,
    activity:invocation.output.activity,
    purpose:invocation.output.purpose,
    cognition:Object.freeze({
      provider:invocation.provenance.provider,
      modelId:invocation.provenance.modelId,
      providerRequestId:invocation.provenance.providerRequestId ?? null,
    }),
  });
}
