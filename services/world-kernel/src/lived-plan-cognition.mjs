import { projectDailyRhythm } from "./daily-rhythm.mjs";
import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertJsonValue,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
} from "./persistence-common.mjs";
import { runInteriorCognition } from "./interior-cognition.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
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
    "wakefulness",
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
    wakefulness: { type:"string", enum:["awake","asleep","unknown"] },
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
The concern's externalContext is primarily World-provided planning reality: the lived horizon, local civil time when known, the physical places currently available, and optionally the physical place where the Thread must begin. It may also include a bounded dailyRhythm projection from the Thread's inherited organismic baselines. Treat World facts as constraint/opportunity and dailyRhythm as a soft physiological tendency, never personality or destiny.
When localHorizon is supplied, plan ordinary life for that local civil time rather than treating UTC clock time as the Thread's local day.
When dailyRhythm is supplied, let sleep/wake timing usually reflect it while allowing developed habits, current life and real commitments to override it. Do not default every Thread to the same conventional bedtime, wake time or morning routine.
For each stop, state wakefulness separately from the natural-language activity: asleep only when the stop is actual sleep, awake for ordinary waking life, unknown only when the state cannot be established. This is a World-enacted feasibility fact, not the Thread\'s willingness to converse.
When interoception is supplied, it is bounded subsemantic organismic state grounded in recent lived evidence. Interpret what it means for this Thread alongside developed self/history and current commitments. Exploration pressure is not a command or proof of boredom. Social-contact pressure is not a diagnosis of loneliness or a demand to seek company. Interpret both through this person's life; meaningful contact, novelty, learning, play, solitude, staying put, or changing places may all be legitimate responses. Never invent a person, a shared venue, a meeting, or consent to satisfy a drive.
A Flight Plan is an ordered private intention about where/how this Thread wants or needs to be present, what she expects to do there, and why. It is intention, not World truth.
Public City Guide suggestions, when offered, are editorial *possibilities* in the Thread's grounded locality. A listing does not mean anyone is there or has invited the Thread, and makes no promise of satisfaction. This Thread may consider one, rely on familiar remembered places, or ignore the guide. Never treat a listing as a visit or a promise of contact.
Use offered physical-place refs for known destinations. For a new destination absent from the list, physicalPlaceRef may instead name it naturally, such as "Porto, Portugal" for a city or "A neighborhood café, Porto, Portugal" for a specific place. World will replace that temporary name with its place reference before admission. Unknown geography is allowed; do not invent exact addresses, shared venues or people present. Propose at most two new places per plan. Stops must be ordered, non-overlapping, and inside the supplied horizon. Gaps are allowed.
When startingPlaceRef is supplied, the first stop must remain at that physical place. When physicalPlaceRef changes, leave a positive time gap between the end of the previous stop and the start of the next, even for local places. That gap is the actual journey, not an instantaneous scene change. Allow longer travel for distant cities; World will reject impossible arrival times. Do not fabricate travel when staying in the same place.
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

function planningPlaceFromEpisode(reference, episode, privatelyKnownPlace = null) {
  const location = Object.fromEntries(
    Object.entries({
      countryCode:episode.place.countryCode,
      region:episode.place.region,
      locality:episode.place.locality,
    }).filter(([, value]) => value !== null),
  );
  return Object.freeze({
    ref:reference,
    displayName:episode.place.displayName,
    placeKind:episode.episodeKind,
    ...(Object.keys(location).length === 0 ? {} : { location:Object.freeze(location) }),
    // Cognition receives the Thread's own admitted physical knowledge.
    // This is never part of a public CurrentPresent projection.
    ...(privatelyKnownPlace === null ? {} : {
      privatelyKnownLocation:Object.freeze({
        specificPlace:privatelyKnownPlace.specificPlace,
        streetAddress:privatelyKnownPlace.streetAddress,
        locality:privatelyKnownPlace.locality,
        country:privatelyKnownPlace.country,
        timeZone:privatelyKnownPlace.timeZone,
      }),
    }),
  });
}

function planningPlaceFromWorld(reference, place) {
  return Object.freeze({
    ref:reference,
    displayName:place.displayName,
    placeKind:place.placeKind,
    description:place.displayName,
    ...(place.locality&&place.country?{
      location:{city:place.locality,country:place.country,
        ...(Number.isFinite(place.lat)&&Number.isFinite(place.long)
          ?{lat:place.lat,long:place.long}:{}),
      },
    }:{}),
  });
}

function resolvePlaces(threadId, references, sourceStores) {
  assertStringArray("personal plan availablePlaceRefs", references);
  if (references.length === 0) {
    throw new TypeError("personal plan cognition requires at least one available place");
  }
  if (new Set(references).size !== references.length) {
    throw new TypeError("personal plan availablePlaceRefs must be unique");
  }
  references.forEach((reference, index) =>
    assertId(`personal plan availablePlaceRefs[${index}]`, reference));

  const situatedLifeStore = sourceStores?.situatedLifeStore;
  if (!situatedLifeStore || typeof situatedLifeStore.listCurrentPlaceEpisodes !== "function") {
    throw new TypeError("personal plan sourceStores.situatedLifeStore must expose listCurrentPlaceEpisodes()");
  }
  const livedNowStore = sourceStores?.livedNowStore;
  if (!livedNowStore || typeof livedNowStore.getWorldPlace !== "function") {
    throw new TypeError("personal plan sourceStores.livedNowStore must expose getWorldPlace()");
  }

  const situated = new Map(
    situatedLifeStore.listCurrentPlaceEpisodes(threadId)
      .map((episode) => [placeEpisodeRevisionRef(episode), episode]),
  );

  return references.map((reference) => {
    const episode = situated.get(reference);
    if (episode !== undefined) return planningPlaceFromEpisode(
      reference,episode,livedNowStore.getPrivatePlace?.(threadId,reference)??null,
    );
    const worldPlace = livedNowStore.getWorldPlace(threadId, reference, { required:false });
    if (worldPlace !== null) return planningPlaceFromWorld(reference, worldPlace);
    throw new TypeError(`personal plan available place ${reference} lacks World/situated authority`);
  });
}

function normalizePlanningInteroception(value) {
  if (value === null) return null;
  assertPlainObject("personal plan interoception", value);
  assertIsoTimestamp("personal plan interoception.asOf", value.asOf);
  if (!Array.isArray(value.drives)) {
    throw new TypeError("personal plan interoception.drives must be an array");
  }
  assertPlainObject("personal plan interoception.affect", value.affect);
  assertStringArray("personal plan interoception.evidenceRefs", value.evidenceRefs);
  assertJsonValue("personal plan interoception", value);
  return structuredClone(value);
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
  if(!["awake","asleep","unknown"].includes(output.wakefulness)){
    throw new TypeError("personal Flight Plan must declare wakefulness");
  }
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
    wakefulness:output.wakefulness,
    purpose: output.purpose,
    companionRefs: [],
    travelFromPrevious: output.travelFromPrevious.trim() === "" ? null : output.travelFromPrevious.trim(),
  };
}

// A place name is a fleeting Thread-authored proposal, never durable
// World authority. Every admitted Flight Plan still cites physical place refs.
function proposedPlace(value){
  const parts=typeof value==="string"?value.split(",").map(s=>s.trim()).filter(Boolean):[];
  if(parts.length<2||parts.some(s=>s.length>120)
    ||value.startsWith("wpl_")||value.startsWith("per:")){
    throw new TypeError("new destination needs a place and country");
  }
  const country=parts.at(-1),city=parts.at(-2);
  return {
    name:parts.length===2?city:parts.slice(0,-2).join(", "),
    kind:parts.length===2?"city":"place",city,country,
  };
}

async function resolveNewPlaces({
  threadId,stops,startingPlaceRef,materializedAt,sourceStores,
  resolveDestinationGeography,availablePlaces,
}){
  const offered=new Set(availablePlaces.map(place=>place.ref));
  const requests=[...new Set(stops.map(s=>s.physicalPlaceRef).filter(ref=>!offered.has(ref)))];
  if(requests.length===0)return {stops,places:[]};
  if(materializedAt!==null)throw new TypeError("retrospective life cannot discover present-day places");
  if(startingPlaceRef===null||stops[0].physicalPlaceRef!==startingPlaceRef){
    throw new TypeError("new place cannot replace the starting location");
  }
  if(requests.length>2)throw new TypeError("Flight Plan may discover at most two new places");
  const store=sourceStores?.livedNowStore;
  if(typeof store?.resolvePlace!=="function")
    throw new TypeError("World place resolution is required");
  const choices=[],resolved=new Map();
  for(const request of requests){
    const place=proposedPlace(request);
    for(let index=1;index<stops.length;index++){
      const stop=stops[index];
      if(stop.physicalPlaceRef!==request)continue;
      const previous=stops[index-1];
      if(previous.physicalPlaceRef!==request
        &&(Date.parse(stop.startAt)<=Date.parse(previous.endAt)
          ||!stop.travelFromPrevious?.trim())){
        throw new TypeError("new place requires elapsed travel time");
      }
    }
    let result=store.resolvePlace({threadId,...place});
    // Geography enriches the entity, not the Thread's permission to know it.
    if((result.status==="unlocated"||result.place.timeZone===null)
      &&typeof resolveDestinationGeography==="function"){
      try{
        const geography=await resolveDestinationGeography({city:place.city,country:place.country});
        if(geography!==null)result=store.resolvePlace({threadId,...place,geography});
      }catch{
        // Preserve the place with unknown geography if the provider fails.
      }
    }
    resolved.set(request,result.place.ref);
    choices.push({
      ref:result.place.ref,displayName:result.place.displayName,
      placeKind:result.place.placeKind,
    });
  }
  return {places:choices,stops:stops.map(stop=>({
    ...stop,physicalPlaceRef:resolved.get(stop.physicalPlaceRef)??stop.physicalPlaceRef,
  }))};
}

export async function formPersonalLivedPlan({
  threadId,
  authoredAt,
  horizonEnd,
  availablePlaceRefs,
  sourceReferences,
  sourceStores,
  modelAdapter,
  materializedAt = null,
  startingPlaceRef = null,
  worldTimeZone = null,
  requiredWorkCommitments = [],
  interoception = null,
  startingSituationId = null,
  cityGuidePlaces = [],
  resolveDestinationGeography = null,
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
  const places = resolvePlaces(threadId, availablePlaceRefs, sourceStores);
  if(!Array.isArray(cityGuidePlaces)||cityGuidePlaces.length>6
    ||cityGuidePlaces.some(place=>!places.some(available=>available.ref===place.ref))){
    throw new TypeError("City Guide may suggest only bounded available World places");
  }
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
  const planningInteroception = normalizePlanningInteroception(interoception);
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
  const dailyRhythm = timeZone === null
    ? null
    : projectDailyRhythm(thread?.genome?.runtimeBaselines ?? {});
  const cognition = await runInteriorCognition({
    threadId,
    at:authoredAt,
    concern:{
      kind:"lived_planning",
      question:"How do I want to spend this lived horizon?",
      externalContext:{
        horizon:{ startAt:authoredAt, endAt:horizonEnd },
        ...(localHorizon === null ? {} : { localHorizon }),
        ...(dailyRhythm === null ? {} : { dailyRhythm:structuredClone(dailyRhythm) }),
        ...(planningInteroception === null ? {} : { interoception:planningInteroception }),
        availablePlaces:places,
        ...(cityGuidePlaces.length===0?{}:{
          cityGuide:cityGuidePlaces.map(place=>({
            placeRef:place.ref,description:place.description,
            activities:[...place.activities],source:{...place.source},
            lastRecommendedAt:place.lastRecommendedAt,
          })),
        }),
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

  const discovery=await resolveNewPlaces({
    threadId,stops:cognition.result.stops,startingPlaceRef,materializedAt,
    sourceStores,resolveDestinationGeography,availablePlaces:places,
  });
  const available=[...places,...discovery.places];
  const stops = discovery.stops.map((stop, index) =>
    normalizeCognitiveStop(stop, index, available, authoredAt, horizonEnd));
  // A new physical place is a journey, not an instantaneous scene switch.
  // The positive gap is enacted as World transit by the existing scheduler.
  for(let i=1;i<stops.length;i++){
    const previous=stops[i-1],next=stops[i];
    if(previous.physicalPlaceRef!==next.physicalPlaceRef
      &&Date.parse(next.startAt)<=Date.parse(previous.endAt)){
      throw new TypeError("personal Flight Plan place change requires transit time");
    }
  }
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
    // Plan authority cites World facts; private Body evidence stays in
    // the planning concern, where it can affect choice without becoming authority.
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
      decisionContext:{
        startingSituationId,
        offeredPlaceRefs:places.map(place=>place.ref),
        cityGuidePlaceRefs:cityGuidePlaces.map(place=>place.ref),
        interoception:planningInteroception,
      },
    },
    ...(materialization === undefined ? {} : { materialization }),
  };

  return normalizeLivedPlan(plan);
}
