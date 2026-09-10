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

const STOP_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "startAt",
    "endAt",
    "physicalPlaceRef",
    "presenceMode",
    "mediatedContext",
    "activity",
    "purpose",
    "travelFromPrevious",
  ],
  properties: {
    startAt: { type: "string" },
    endAt: { type: "string" },
    physicalPlaceRef: { type: "string" },
    presenceMode: { type: "string", enum: ["physical", "mediated"] },
    mediatedContext: { type: "string" },
    activity: { type: "string", minLength: 1, maxLength: 500 },
    purpose: { type: "string", minLength: 1, maxLength: 500 },
    travelFromPrevious: { type: "string" },
  },
});

const PERSONAL_PLAN_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["stops"],
  properties: {
    stops: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: STOP_SCHEMA,
    },
  },
});

const SYSTEM_PROMPT = `You are temporary cognition for one persistent Fibre Thread.
Form a modest personal flight plan for roughly the next half-day/day from the Thread's own context.
A flight plan is an ordered mental itinerary of where/how the Thread wants or needs to be present, what it expects to do there, and why. It is intention, not World truth.
Use only offered physical-place refs. Stops must be ordered, non-overlapping, and inside the supplied horizon. Gaps are allowed.
The first stop must have an empty travelFromPrevious. A later stop at a different physical place must briefly say how the Thread expects to get there; otherwise travelFromPrevious must be empty.
For physical presence, mediatedContext must be empty. For mediated presence, mediatedContext names the real remote setting, call, stream, site, or content being experienced while the Thread remains physically at the selected place.
Prefer a few specific ordinary presences that follow naturally from age, self-understanding, needs, unresolved intentions, and current possibilities. Do not optimize for drama or a future visitor.`;

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

function normalizeCognitiveStop(output, index, places, horizonStart, horizonEnd) {
  assertPlainObject(`personal plan cognition stops[${index}]`, output);
  assertIsoTimestamp(`personal plan cognition stops[${index}].startAt`, output.startAt);
  assertIsoTimestamp(`personal plan cognition stops[${index}].endAt`, output.endAt);
  if (Date.parse(output.startAt) < Date.parse(horizonStart) || Date.parse(output.endAt) > Date.parse(horizonEnd)) {
    throw new TypeError(`personal plan cognition stops[${index}] falls outside the offered horizon`);
  }
  if (Date.parse(output.endAt) <= Date.parse(output.startAt)) {
    throw new TypeError(`personal plan cognition stops[${index}] must end after it starts`);
  }
  const offered = new Set(places.map((place) => place.ref));
  if (!offered.has(output.physicalPlaceRef)) {
    throw new TypeError("personal plan cognition selected a place outside its offered World context");
  }
  if (output.presenceMode === "physical" && output.mediatedContext !== "") {
    throw new TypeError("physical personal plan cognition must leave mediatedContext empty");
  }
  if (output.presenceMode === "mediated") {
    assertNonEmpty(`personal plan cognition stops[${index}].mediatedContext`, output.mediatedContext);
  }
  assertNonEmpty(`personal plan cognition stops[${index}].activity`, output.activity);
  assertNonEmpty(`personal plan cognition stops[${index}].purpose`, output.purpose);
  if (typeof output.travelFromPrevious !== "string") {
    throw new TypeError(`personal plan cognition stops[${index}].travelFromPrevious must be a string`);
  }
  return {
    startAt: output.startAt,
    endAt: output.endAt,
    physicalPlaceRef: output.physicalPlaceRef,
    mediatedContext: output.presenceMode === "physical" ? null : output.mediatedContext,
    activity: output.activity,
    purpose: output.purpose,
    companionRefs: [],
    travelFromPrevious: output.travelFromPrevious.trim() === "" ? null : output.travelFromPrevious.trim(),
  };
}

export async function formPersonalLivedPlan({
  thread,
  authoredAt,
  horizonEnd,
  availablePlaces,
  sourceReferences,
  modelAdapter,
}) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  assertIsoTimestamp("personal plan authoredAt", authoredAt);
  assertIsoTimestamp("personal plan horizonEnd", horizonEnd);
  if (Date.parse(horizonEnd) <= Date.parse(authoredAt)) {
    throw new TypeError("personal plan horizonEnd must follow authoredAt");
  }
  const places = normalizePlaces(availablePlaces);
  assertStringArray("personal plan sourceReferences", sourceReferences);
  if (sourceReferences.length === 0) throw new TypeError("personal plan sourceReferences must not be empty");
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("personal plan cognition requires a model adapter");
  }

  const context = developmentalContextForThread(thread, authoredAt);
  const input = {
    developmentalContext: context,
    horizon: { startAt: authoredAt, endAt: horizonEnd },
    availablePlaces: places,
  };
  const invocation = await modelAdapter.invoke({
    systemPrompt: SYSTEM_PROMPT,
    input,
    responseSchema: PERSONAL_PLAN_SCHEMA,
    clientRequestId: requestId({ threadId: thread.threadId, authoredAt, horizonEnd, places, sourceReferences }),
  });
  assertPlainObject("personal plan cognition result", invocation);
  assertPlainObject("personal plan cognition output", invocation.output);
  assertPlainObject("personal plan cognition provenance", invocation.provenance);
  if (!Array.isArray(invocation.output.stops) || invocation.output.stops.length === 0) {
    throw new TypeError("personal plan cognition must return at least one stop");
  }
  if (invocation.output.stops.length > 8) {
    throw new TypeError("personal plan cognition may return at most eight stops");
  }
  assertNonEmpty("personal plan cognition provenance.provider", invocation.provenance.provider);
  assertNonEmpty("personal plan cognition provenance.modelId", invocation.provenance.modelId);

  const stops = invocation.output.stops.map((stop, index) =>
    normalizeCognitiveStop(stop, index, places, authoredAt, horizonEnd));
  const selectedPlaces = stops.map((stop) => stop.physicalPlaceRef);
  const plan = {
    planId: livedPlanId({
      threadId: thread.threadId,
      kind: "personal",
      authoredAt,
      horizonEnd,
      stops,
      provider: invocation.provenance.provider,
      modelId: invocation.provenance.modelId,
    }),
    kind: "personal",
    subjectThreadId: thread.threadId,
    owner: { partyId: thread.threadId, kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd,
    stops,
    sourceReferences: [...new Set([...sourceReferences, ...selectedPlaces])],
    cognition: {
      provider: invocation.provenance.provider,
      modelId: invocation.provenance.modelId,
      providerRequestId: invocation.provenance.providerRequestId ?? null,
    },
  };

  return normalizeLivedPlan(plan);
}
