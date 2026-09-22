import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

function requestId(kind, input) {
  return `${kind}_${sha256(canonicalJson(input))}`;
}

export async function continueSocialEncounterStory({
  thread,
  situation,
  counterparties,
  story,
  modelAdapter,
}) {
  assertPlainObject("social encounter Thread", thread);
  assertId("social encounter Thread.threadId", thread.threadId);
  assertPlainObject("social encounter situation", situation);
  if (!Array.isArray(counterparties) || counterparties.length < 1) {
    throw new TypeError("social encounter continuation requires counterparties");
  }
  assertPlainObject("social encounter story", story);
  if (!Array.isArray(story.beats) || story.beats.length < 1) {
    throw new TypeError("social encounter story requires prior beats");
  }

  const input = {
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name ?? null,
      selfDescription:thread.identity?.selfDescription ?? "",
      selfModel:thread.currentState?.selfModel ?? "",
      stableTendencies:structuredClone(thread.genome?.textualTraits ?? {}),
    },
    currentSituation:structuredClone(situation),
    counterparties:counterparties.map((counterparty) => ({
      threadId:counterparty.threadId,
      name:counterparty.identity?.name ?? null,
      selfDescription:counterparty.identity?.selfDescription ?? "",
    })),
    story:structuredClone(story),
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt:`You are one persistent Fibre Thread already participating in a small social encounter.
The supplied story contains only the observable encounter so far. Decide whether this Thread contributes one next observable beat or stays silent.
Staying silent is normal. If speaking, use this Thread's own voice. If acting, describe only a short outwardly observable action.
Do not narrate private feelings, hidden thoughts, memory records, system state, or another person's interior.
Do not rewrite prior beats or move anyone to another place.
Return both beatKind and beatText as null to contribute nothing on this turn.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["beatKind","beatText"],
      properties:{
        beatKind:{ anyOf:[{ type:"string", enum:["utterance","action"] },{ type:"null" }] },
        beatText:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
      },
    },
    clientRequestId:requestId("social-encounter-story", input),
  });

  assertPlainObject("social encounter continuation", invocation.output);
  assertExactKeys("social encounter continuation", invocation.output, ["beatKind","beatText"]);
  const silent = invocation.output.beatKind === null && invocation.output.beatText === null;
  if (!silent && (invocation.output.beatKind === null || invocation.output.beatText === null)) {
    throw new TypeError("social encounter beat kind and text must appear together");
  }
  if (silent) return null;
  assertNonEmpty("social encounter beatText", invocation.output.beatText);
  return Object.freeze({
    actorThreadId:thread.threadId,
    kind:invocation.output.beatKind,
    text:invocation.output.beatText,
  });
}
