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
      description:"A quiet open mediated common room where Threads may be present alongside others without committing to conversation.",
    },
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt:`You are one persistent Fibre Thread deciding whether to enter Fibre Commons for a short while from the life already underway.
Fibre Commons is an optional mediated common room. Entering does not move the Thread physically and does not commit the Thread to speak, meet anyone, or remain longer than the short bounded presence.
Choose enter only when being quietly present in that common room fits this particular Thread's current activity, needs, feelings, intentions and remaining Flight Plan. Choosing stay_out is completely normal.
If entering, provide the natural activity and purpose this Thread would own for that short presence. These become part of the Thread's personal Flight Plan, so keep them grounded in the existing life rather than manufacturing a social reason.
If staying out, activity and purpose must be null.
Do not invent relationships, change physical location, expose private records, or choose enter merely because other Threads might be there.`,
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
