import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  developmentalContextForThread,
  livedPlanId,
  normalizeLivedPlan,
} from "./lived-now.mjs";

const PERSONAL_PLAN_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["physicalPlaceRef", "presenceMode", "mediatedContext", "activity", "purpose"],
  properties: {
    physicalPlaceRef: { type: "string" },
    presenceMode: { type: "string", enum: ["physical", "mediated"] },
    mediatedContext: { type: "string" },
    activity: { type: "string", minLength: 1, maxLength: 500 },
    purpose: { type: "string", minLength: 1, maxLength: 500 },
  },
});

const SYSTEM_PROMPT = `You are temporary cognition for one persistent Fibre Thread.
Form one modest near-term personal intention from the Thread's own context.
Choose only an offered physical place. The plan is the Thread's intention, not World truth.
For physical presence, mediatedContext must be an empty string.
For mediated presence, mediatedContext must name the real place, site, stream, or content being experienced remotely.
Prefer a specific, ordinary action that follows naturally from the person's needs, unresolved intentions, age, self-understanding, and current possibilities. Do not optimize for drama or for a future visitor.`;

function requestId(seed) {
  return `lplan-cognition_${sha256(canonicalJson(seed))}`;
}

function normalizePlaces(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("personal plan cognition requires at least one available place");
  }
  return value.map((item, index) => {
    assertPlainObject(`availablePlaces[${index}]`, item);
    assertId(`availablePlaces[${index}].ref`, item.ref);
    assertNonEmpty(`availablePlaces[${index}].displayName`, item.displayName);
    return { ref: item.ref, displayName: item.displayName };
  });
}

export async function formPersonalLivedPlan({
  thread,
  authoredAt,
  validUntil,
  availablePlaces,
  sourceReferences,
  modelAdapter,
}) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  assertIsoTimestamp("personal plan authoredAt", authoredAt);
  assertIsoTimestamp("personal plan validUntil", validUntil);
  if (Date.parse(validUntil) <= Date.parse(authoredAt)) {
    throw new TypeError("personal plan validUntil must follow authoredAt");
  }
  const places = normalizePlaces(availablePlaces);
  assertStringArray("personal plan sourceReferences", sourceReferences);
  if (sourceReferences.length === 0) throw new TypeError("personal plan sourceReferences must not be empty");
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("personal plan cognition requires a model adapter");
  }

  const context = developmentalContextForThread(thread, authoredAt);
  const invocation = await modelAdapter.invoke({
    systemPrompt: SYSTEM_PROMPT,
    input: {
      developmentalContext: context,
      availablePlaces: places,
    },
    responseSchema: PERSONAL_PLAN_SCHEMA,
    clientRequestId: requestId({ threadId: thread.threadId, authoredAt, validUntil, places, sourceReferences }),
  });
  assertPlainObject("personal plan cognition result", invocation);
  assertPlainObject("personal plan cognition output", invocation.output);
  assertPlainObject("personal plan cognition provenance", invocation.provenance);

  const output = invocation.output;
  const offered = new Set(places.map((place) => place.ref));
  if (!offered.has(output.physicalPlaceRef)) {
    throw new TypeError("personal plan cognition selected a place outside its offered World context");
  }
  if (output.presenceMode === "physical" && output.mediatedContext !== "") {
    throw new TypeError("physical personal plan cognition must leave mediatedContext empty");
  }
  if (output.presenceMode === "mediated") assertNonEmpty("personal plan cognition mediatedContext", output.mediatedContext);
  assertNonEmpty("personal plan cognition activity", output.activity);
  assertNonEmpty("personal plan cognition purpose", output.purpose);
  assertNonEmpty("personal plan cognition provenance.provider", invocation.provenance.provider);
  assertNonEmpty("personal plan cognition provenance.modelId", invocation.provenance.modelId);

  const stop = {
    startAt: authoredAt,
    endAt: validUntil,
    physicalPlaceRef: output.physicalPlaceRef,
    mediatedContext: output.presenceMode === "physical" ? null : output.mediatedContext,
    activity: output.activity,
    purpose: output.purpose,
    companionRefs: [],
    travelFromPrevious: null,
  };
  const plan = {
    planId: livedPlanId({
      threadId: thread.threadId,
      kind: "personal",
      authoredAt,
      horizonEnd: validUntil,
      stop,
      provider: invocation.provenance.provider,
      modelId: invocation.provenance.modelId,
    }),
    kind: "personal",
    subjectThreadId: thread.threadId,
    owner: { partyId: thread.threadId, kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: validUntil,
    stops: [stop],
    sourceReferences: [...new Set([...sourceReferences, output.physicalPlaceRef])],
    cognition: {
      provider: invocation.provenance.provider,
      modelId: invocation.provenance.modelId,
      providerRequestId: invocation.provenance.providerRequestId ?? null,
    },
  };

  return normalizeLivedPlan(plan);
}
