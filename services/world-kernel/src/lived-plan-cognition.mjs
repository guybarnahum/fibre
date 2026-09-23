import { dailyRhythmCue } from "#core/src/thread-daily-rhythm.mjs";
import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
} from "./persistence-common.mjs";
import { runInteriorCognition } from "./interior-cognition.mjs";
import {
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

const FLIGHT_PLAN_ADAPTER = Object.freeze({
  id:"lived-planning",
  instruction:`Form a modest personal Flight Plan for roughly the next half-day/day.
The concern's externalContext includes World-provided planning reality plus, when available, a bounded organismic dailyRhythm cue. World facts constrain what can happen; dailyRhythm is a soft physiological tendency, not personality and not a rigid schedule.
When localHorizon is supplied, plan ordinary life for that local civil time rather than treating UTC clock time as the Thread's local day.
When dailyRhythm is supplied, let sleep/wake timing usually reflect it while allowing developed habits, lived context and real commitments to override it. Do not force every Thread into the same conventional bedtime, wake time, or generic morning routine.
A Flight Plan is an ordered private intention about where/how this Thread wants or needs to be present, what she expects to do there, and why. It is intention, not World truth.
Use only offered physical-place refs. Stops must be ordered, non-overlapping, and inside the supplied horizon. Gaps are allowed.
When startingPlaceRef is supplied, the first stop must remain at that physical place; do not teleport the Thread to another place.
The first stop must begin exactly at the supplied horizon start and have an empty travelFromPrevious. The last stop must end exactly at the supplied horizon end. A later stop at a different physical place must briefly say how the Thread expects to get there; otherwise travelFromPrevious must be empty.
For physical presence, mediatedContext must be empty. For mediated presence, mediatedContext names the real remote setting, call, stream, site, or content being experienced while the Thread remains physically at the selected place.
requiredWorkCommitments, when present, are commitments this Thread already voluntarily accepted. Each must appear as one mediated stop with exactly the committed start/end and mediatedContext. Do not revisit whether the Thread should honor an accepted commitment; arrange the rest of the life around it naturally.
Return 1 to 8 stops. Prefer a few specific ordinary presences that follow naturally from the developed person and current possibilities; combine nearby activities rather than fragmenting the day into tiny steps. Do not optimize for drama or a future visitor.`,
  resultSchema:PERSONAL_PLAN_SCHEMA,
});

function localCivilMoment(at, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday:"long",
    year:"numeric",
    month:"2-digit",
    day:"2-digit",
    hour:"2-digit",
    minute:"2-digit",
    hourCycle:"h23",
  }).formatToParts(new Date(at))
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
  return Object.freeze({
    date:`${parts.year}-${parts.month}-${parts.day}`,
    time:`${parts.hour}:${parts.minute}`,
    weekday:parts.weekday,
  });
}

function normalizeTimeZone(value) {
  if (value === null) return null;
  assertNonEmpty("personal plan worldTimeZone", value);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone:value }).format(new Date(0));
  } catch {
    throw new TypeError("personal plan worldTimeZone must be an IANA time zone");
  }
  return value;
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

function normalizeRequiredWorkCommitments(value, threadId, horizonStart, horizonEnd) {
  if (!Array.isArray(value)) throw new TypeError("personal plan requiredWorkCommitments must be an array");
  return value.map((item, index) => {
    assertPlainObject(`requiredWorkCommitments[${index}]`, item);
    assertExactKeys(`requiredWorkCommitments[${index}]`, item, [
      "commitmentId",
      "kind",
      "offerId",
      "threadId",
      "acceptedAt",
      "startAt",
      "endAt",
      "mediatedContext",
      "purpose",
      "compensation",
      "cognition",
    ]);
    assertId(`requiredWorkCommitments[${index}].commitmentId`, item.commitmentId);
    assertId(`requiredWorkCommitments[${index}].threadId`, item.threadId);
    if (item.threadId !== threadId) {
      throw new TypeError("personal plan work commitment must belong to its Thread");
    }
    assertIsoTimestamp(`requiredWorkCommitments[${index}].startAt`, item.startAt);
    assertIsoTimestamp(`requiredWorkCommitments[${index}].endAt`, item.endAt);
    if (
      Date.parse(item.startAt) < Date.parse(horizonStart)
      || Date.parse(item.endAt) > Date.parse(horizonEnd)
    ) {
      throw new TypeError("personal plan work commitment must fit inside the planning horizon");
    }
    assertNonEmpty(`requiredWorkCommitments[${index}].mediatedContext`, item.mediatedContext);
    assertNonEmpty(`requiredWorkCommitments[${index}].purpose`, item.purpose);
    assertPlainObject(`requiredWorkCommitments[${index}].compensation`, item.compensation);
    assertExactKeys(`requiredWorkCommitments[${index}].compensation`, item.compensation, ["fibreCredits"]);
    if (!Number.isSafeInteger(item.compensation.fibreCredits) || item.compensation.fibreCredits < 1) {
      throw new TypeError("personal plan work commitment compensation must be positive Fibre Credits");
    }
    return Object.freeze({
      commitmentId:item.commitmentId,
      startAt:item.startAt,
      endAt:item.endAt,
      mediatedContext:item.mediatedContext,
      purpose:item.purpose,
      compensation:Object.freeze({ fibreCredits:item.compensation.fibreCredits }),
    });
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
  threadId,
  authoredAt,
  horizonEnd,
  availablePlaces,
  sourceReferences,
  sourceStores,
  modelAdapter,
  materializedAt = null,
  startingPlaceRef = null,
  worldTimeZone = null,
  requiredWorkCommitments = [],
}) {
  assertId("personal plan threadId", threadId);
  assertIsoTimestamp("personal plan authoredAt", authoredAt);
  assertIsoTimestamp("personal plan horizonEnd", horizonEnd);
  if (Date.parse(horizonEnd) <= Date.parse(authoredAt)) {
    throw new TypeError("personal plan horizonEnd must follow authoredAt");
  }
  if (materializedAt !== null) {
    assertIsoTimestamp("personal plan materializedAt", materializedAt);
    if (Date.parse(materializedAt) < Date.parse(horizonEnd)) {
      throw new TypeError("retrospective personal plan materializedAt cannot precede its lived horizon");
    }
  }
  const places = normalizePlaces(availablePlaces);
  if (startingPlaceRef !== null) {
    assertId("personal plan startingPlaceRef", startingPlaceRef);
    if (!places.some((place) => place.ref === startingPlaceRef)) {
      throw new TypeError("personal plan startingPlaceRef must be one of the available places");
    }
  }
  assertStringArray("personal plan sourceReferences", sourceReferences);
  if (sourceReferences.length === 0) throw new TypeError("personal plan sourceReferences must not be empty");
  const workCommitments = normalizeRequiredWorkCommitments(
    requiredWorkCommitments,
    threadId,
    authoredAt,
    horizonEnd,
  );
  const timeZone = normalizeTimeZone(worldTimeZone);
  const localHorizon = timeZone === null
    ? null
    : Object.freeze({
        timeZone,
        start:localCivilMoment(authoredAt, timeZone),
        end:localCivilMoment(horizonEnd, timeZone),
      });
  const worldStore = sourceStores?.worldStore;
  if (!worldStore || typeof worldStore.getThread !== "function") {
    throw new TypeError("personal plan sourceStores.worldStore must expose getThread()");
  }
  const thread = worldStore.getThread(threadId);
  const rhythm = timeZone === null
    ? null
    : dailyRhythmCue({
        threadId,
        runtimeBaselines:thread?.genome?.runtimeBaselines ?? {},
      });
  const cognition = await runInteriorCognition({
    threadId,
    at:authoredAt,
    concern:{
      kind:"lived_planning",
      question:"How do I want to spend this lived horizon?",
      externalContext:{
        horizon:{ startAt:authoredAt, endAt:horizonEnd },
        ...(localHorizon === null ? {} : { localHorizon }),
        ...(rhythm === null ? {} : { dailyRhythm:structuredClone(rhythm) }),
        availablePlaces:places,
        ...(startingPlaceRef === null ? {} : { startingPlaceRef }),
        ...(workCommitments.length === 0 ? {} : {
          requiredWorkCommitments:workCommitments.map((item) => structuredClone(item)),
        }),
      },
    },
    adapter:FLIGHT_PLAN_ADAPTER,
    sourceStores,
    modelAdapter,
  });
  assertPlainObject("personal plan cognition result", cognition.result);
  if (!Array.isArray(cognition.result.stops) || cognition.result.stops.length === 0) {
    throw new TypeError("personal plan cognition must return at least one stop");
  }
  if (cognition.result.stops.length > 8) {
    throw new TypeError("personal plan cognition may return at most eight stops");
  }
  assertNonEmpty("personal plan cognition provenance.provider", cognition.provenance.provider);
  assertNonEmpty("personal plan cognition provenance.modelId", cognition.provenance.modelId);

  const stops = cognition.result.stops.map((stop, index) =>
    normalizeCognitiveStop(stop, index, places, authoredAt, horizonEnd));
  if (stops[0].startAt !== authoredAt) {
    throw new TypeError("personal plan cognition must cover the horizon start");
  }
  if (startingPlaceRef !== null && stops[0].physicalPlaceRef !== startingPlaceRef) {
    throw new TypeError("personal plan cognition must continue from the supplied starting place");
  }
  if (stops.at(-1).endAt !== horizonEnd) {
    throw new TypeError("personal plan cognition must cover the horizon end");
  }
  for (const commitment of workCommitments) {
    const matches = stops.filter((stop) =>
      stop.startAt === commitment.startAt
      && stop.endAt === commitment.endAt
      && stop.mediatedContext === commitment.mediatedContext);
    if (matches.length !== 1) {
      throw new TypeError("personal Flight Plan must honor each accepted work commitment");
    }
  }
  const selectedPlaces = stops.map((stop) => stop.physicalPlaceRef);
  const materialization = materializedAt === null
    ? undefined
    : { mode: "retrospective", materializedAt };
  const plan = {
    planId: livedPlanId({
      threadId,
      kind: "personal",
      authoredAt,
      horizonEnd,
      stops,
      provider:cognition.provenance.provider,
      modelId:cognition.provenance.modelId,
      contextDigest:cognition.provenance.contextDigest,
      ...(materialization === undefined ? {} : { materialization }),
    }),
    kind: "personal",
    subjectThreadId: threadId,
    owner: { partyId: threadId, kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd,
    stops,
    sourceReferences:[...new Set([
      ...sourceReferences,
      ...selectedPlaces,
      ...workCommitments.map((item) => item.commitmentId),
    ])],
    cognition:{
      provider:cognition.provenance.provider,
      modelId:cognition.provenance.modelId,
      providerRequestId:cognition.provenance.providerRequestId ?? null,
      implementationProfile:structuredClone(cognition.implementationProfile),
      sourceThreadVersion:cognition.provenance.sourceThreadVersion,
      selectedEvidenceRefs:[...cognition.provenance.selectedEvidenceRefs],
      evidenceRefs:[...cognition.evidenceRefs],
      contextDigest:cognition.provenance.contextDigest,
    },
    ...(materialization === undefined ? {} : { materialization }),
  };

  return normalizeLivedPlan(plan);
}
