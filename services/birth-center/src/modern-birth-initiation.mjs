import cohort from "../../../fixtures/genesis/pr39/development-cohort-v1.json" with { type:"json" };
import genome1 from "../../../fixtures/genesis/pr39/genomes/thread-01.json" with { type:"json" };
import genome2 from "../../../fixtures/genesis/pr39/genomes/thread-02.json" with { type:"json" };
import genome3 from "../../../fixtures/genesis/pr39/genomes/thread-03.json" with { type:"json" };
import genome4 from "../../../fixtures/genesis/pr39/genomes/thread-04.json" with { type:"json" };
import genome5 from "../../../fixtures/genesis/pr39/genomes/thread-05.json" with { type:"json" };

import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
} from "./genesis-development-plan.mjs";
import { sha256 } from "./genesis-development-contracts.mjs";
import { resolveLocalityGeography } from "#core/src/locality-geography.mjs";
import { genesisSexForThread, normalizeGenesisSex } from "./genesis-sex.mjs";
import { sampleModernBirthplace } from "./modern-birthplace-sampler.mjs";

const GENOMES = Object.freeze([genome1, genome2, genome3, genome4, genome5]);
const AUTHORING_VERSION = "fibre-modern-birth-authoring-v1";

const WORLD_SCHEMA = Object.freeze({
  type:"object",
  additionalProperties:false,
  required:[
    "timeZone",
    "femaleName",
    "maleName",
    "languages",
    "raisedLanguages",
    "homeDescription",
    "schoolDescription",
    "transitDescription",
    "learningDescription",
    "commerceDescription",
    "householdContext",
    "materialCircumstances",
    "mobilityPattern",
    "schoolingOrCommunityContext",
    "culturalContext",
    "availableInstitutions",
    "intellectualEnvironment",
  ],
  properties:{
    timeZone:{ type:"string", minLength:1 },
    femaleName:{ type:"string", minLength:1 },
    maleName:{ type:"string", minLength:1 },
    languages:{
      type:"array", minItems:1, maxItems:3, uniqueItems:true,
      items:{ type:"string", minLength:1 },
    },
    raisedLanguages:{
      type:"array", minItems:1, maxItems:3, uniqueItems:true,
      items:{ type:"string", minLength:1 },
    },
    homeDescription:{ type:"string", minLength:1 },
    schoolDescription:{ type:"string", minLength:1 },
    transitDescription:{ type:"string", minLength:1 },
    learningDescription:{ type:"string", minLength:1 },
    commerceDescription:{ type:"string", minLength:1 },
    householdContext:{ type:"string", minLength:1 },
    materialCircumstances:{ type:"string", minLength:1 },
    mobilityPattern:{ type:"string", minLength:1 },
    schoolingOrCommunityContext:{ type:"string", minLength:1 },
    culturalContext:{ type:"string", minLength:1 },
    availableInstitutions:{
      type:"array", minItems:3, maxItems:8, uniqueItems:true,
      items:{ type:"string", minLength:1 },
    },
    intellectualEnvironment:{ type:"string", minLength:1 },
  },
});

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function stringArray(name, value, { min = 1, max = 8 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new TypeError(`${name} must contain ${min} to ${max} values`);
  }
  const normalized = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (new Set(normalized.map((item) => item.toLocaleLowerCase("en-US"))).size !== normalized.length) {
    throw new TypeError(`${name} must not contain duplicates`);
  }
  return Object.freeze(normalized);
}

function validateTimeZone(value) {
  const timeZone = nonEmpty("authored timeZone", value);
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0)); }
  catch { throw new TypeError(`authored timeZone ${timeZone} is invalid`); }
  return timeZone;
}

function displayPart(value) {
  return nonEmpty("location part", value)
    .split(/[\s_-]+/u)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function normalizeLocation(raw) {
  const value = nonEmpty("location", raw);
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some((part) => part.trim() === "")) {
    throw new TypeError("location must be Country/City, for example Israel/Jerusalem");
  }
  const country = displayPart(parts[0]);
  const city = displayPart(parts[1]);
  const display = `${country}/${city}`;
  const geography = resolveLocalityGeography(display);
  if (geography === null) {
    throw new TypeError(`location ${display} has no Fibre birthplace coordinates`);
  }
  return Object.freeze({
    country,
    city,
    display,
    birthCity:`${city}, ${country}`,
    lat:geography.lat,
    long:geography.long,
  });
}

function selectedLocation(requestId, location) {
  if (location !== null && location !== undefined && String(location).trim() !== "") {
    return Object.freeze({ selector:normalizeLocation(location), source:"operator" });
  }
  const sampled = sampleModernBirthplace(requestId);
  return Object.freeze({ selector:normalizeLocation(sampled.place), source:sampled.kind, region:sampled.region });
}

function selectGenome(requestId) {
  const ordinal = Number.parseInt(sha256(`${requestId}:genome`).slice(0, 8), 16) % GENOMES.length;
  return GENOMES[ordinal];
}

function ids(requestId) {
  const digest = sha256(`${AUTHORING_VERSION}:${requestId}`).slice(0, 12);
  return Object.freeze({
    worldSpecId:`world_modern_${digest}`,
    home:`place_modern_${digest}_home`,
    school:`place_modern_${digest}_school`,
    transit:`place_modern_${digest}_transit`,
    learning:`place_modern_${digest}_learning`,
    commerce:`place_modern_${digest}_commerce`,
  });
}

function normalizeAuthoredContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("modern birth authoring returned invalid context");
  const femaleName = nonEmpty("authored femaleName", value.femaleName);
  const maleName = nonEmpty("authored maleName", value.maleName);
  if (femaleName === maleName) throw new TypeError("modern birth authoring requires distinct female and male names");
  const languages = stringArray("authored languages", value.languages, { min:1, max:3 });
  const raisedLanguages = stringArray("authored raisedLanguages", value.raisedLanguages, { min:1, max:3 });
  const spoken = new Set(languages.map((item) => item.toLocaleLowerCase("en-US")));
  if (raisedLanguages.some((item) => !spoken.has(item.toLocaleLowerCase("en-US")))) {
    throw new TypeError("raised languages must be included in eventual spoken languages");
  }
  return Object.freeze({
    timeZone:validateTimeZone(value.timeZone),
    femaleName,
    maleName,
    languages,
    raisedLanguages,
    homeDescription:nonEmpty("authored homeDescription", value.homeDescription),
    schoolDescription:nonEmpty("authored schoolDescription", value.schoolDescription),
    transitDescription:nonEmpty("authored transitDescription", value.transitDescription),
    learningDescription:nonEmpty("authored learningDescription", value.learningDescription),
    commerceDescription:nonEmpty("authored commerceDescription", value.commerceDescription),
    householdContext:nonEmpty("authored householdContext", value.householdContext),
    materialCircumstances:nonEmpty("authored materialCircumstances", value.materialCircumstances),
    mobilityPattern:nonEmpty("authored mobilityPattern", value.mobilityPattern),
    schoolingOrCommunityContext:nonEmpty("authored schoolingOrCommunityContext", value.schoolingOrCommunityContext),
    culturalContext:nonEmpty("authored culturalContext", value.culturalContext),
    availableInstitutions:stringArray("authored availableInstitutions", value.availableInstitutions, { min:3, max:8 }),
    intellectualEnvironment:nonEmpty("authored intellectualEnvironment", value.intellectualEnvironment),
  });
}

async function authorContext({ adapter, requestId, selector }) {
  const result = await adapter.invoke({
    clientRequestId:`modern_birth_world_${sha256(`${AUTHORING_VERSION}:${requestId}`).slice(0, 24)}`,
    systemPrompt:[
      "Author one plausible ordinary-life Genesis context for a newly born Fibre Thread.",
      "The birthplace is operator-selected or randomly sampled. Treat it as fictional subject context, never as information about the operator.",
      "Keep the person specific rather than demographic: do not combine unrelated minority languages or cultural markers into one individual.",
      "raisedLanguages are only languages used in the household or early upbringing. languages may additionally include one language plausibly acquired through school or sustained later exposure.",
      "Choose two plausible full names, one female and one male, appropriate to one coherent household context. Do not make the two names identical.",
      "Describe ordinary home, school, transit, learning, commerce, mobility and institutions concretely enough to ground a life without over-specific unverifiable claims.",
      "Do not infer personality, ability, religion, politics, trauma or profession from location or ancestry.",
      "Return an IANA time zone.",
    ].join("\n"),
    input:{
      country:selector.country,
      city:selector.city,
      birthCity:selector.birthCity,
    },
    responseSchema:WORLD_SCHEMA,
  });
  return normalizeAuthoredContext(result.output);
}

function buildDevelopmentRequest({ requestId, requestedAt, selector, sex, authored }) {
  const place = ids(requestId);
  const genome = selectGenome(requestId);
  const worldSpec = Object.freeze({
    worldSpecId:place.worldSpecId,
    timeFrame:Object.freeze({
      startAt:cohort.entry.bornAt,
      endAt:cohort.entry.chronologyEndsAt,
    }),
    places:Object.freeze([
      Object.freeze({ placeId:place.home, description:authored.homeDescription }),
      Object.freeze({ placeId:place.school, description:authored.schoolDescription }),
      Object.freeze({ placeId:place.transit, description:authored.transitDescription }),
      Object.freeze({ placeId:place.learning, description:authored.learningDescription }),
      Object.freeze({ placeId:place.commerce, description:authored.commerceDescription }),
    ]),
    householdShape:authored.householdContext,
    familyRelations:Object.freeze(["The subject grows up with caregivers and at least one sibling or similarly close young relative."]),
    languages:authored.languages,
    materialCircumstances:authored.materialCircumstances,
    mobilityPattern:authored.mobilityPattern,
    schoolingOrCommunityContext:authored.schoolingOrCommunityContext,
    culturalContext:authored.culturalContext,
    availableInstitutions:authored.availableInstitutions,
    intellectualEnvironment:authored.intellectualEnvironment,
    affordedRoles:Object.freeze([
      "caregiver","sibling","relative","peer","teacher","neighbor","vendor","librarian","coach","mentor","transit_worker",
    ]),
    worldAuthorship:Object.freeze({
      authorId:"fibre_modern_birth_operator",
      sourcesConsulted:Object.freeze([]),
      abstractionMethod:`Fibre authored bounded ordinary-life affordances for an operator-initiated birth in ${selector.birthCity}. Location constrains surroundings without prescribing identity or personality.`,
      relocationWitness:`Relocating this World away from ${selector.birthCity} would change its civic, language, mobility and institutional affordances.`,
      familiarityProbe:null,
      createdAt:requestedAt,
    }),
    createdAt:requestedAt,
  });

  const participant = (role, ordinal, relation) => Object.freeze({
    participantId:`person_modern_${sha256(`${requestId}:${role}:${ordinal}`).slice(0, 24)}`,
    factualRoles:Object.freeze([role]),
    relationshipFacts:Object.freeze([relation]),
  });

  return Object.freeze({
    requestVersion:GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec,
    subjectIdentity:Object.freeze({
      femaleName:authored.femaleName,
      maleName:authored.maleName,
      birthCity:selector.birthCity,
      ...(sex === null ? {} : { sex }),
      place:Object.freeze({
        country:selector.country,
        city:selector.city,
        lat:selector.lat,
        long:selector.long,
      }),
      languages:authored.languages,
      raisedLanguages:authored.raisedLanguages,
    }),
    genomeValues:Object.freeze(genome.loci.map((locus) => locus.value)),
    participants:Object.freeze([
      participant("caregiver",1,`Lives with the subject in ${selector.city} and participates in ordinary household life.`),
      participant("caregiver",2,`Shares responsibility for the subject's household life in ${selector.city}.`),
      participant("sibling",1,"Shares the household and overlapping childhood routines with the subject."),
    ]),
    placeAffordances:Object.freeze([
      Object.freeze({ placeRef:place.home, placeKind:"home", ordinaryCounterpartRoles:Object.freeze(["caregiver","sibling","relative","peer","neighbor"]) }),
      Object.freeze({ placeRef:place.school, placeKind:"school", ordinaryCounterpartRoles:Object.freeze(["peer","teacher","coach","mentor"]) }),
      Object.freeze({ placeRef:place.transit, placeKind:"transit", ordinaryCounterpartRoles:Object.freeze(["peer","neighbor","caregiver","sibling","transit_worker"]) }),
      Object.freeze({ placeRef:place.learning, placeKind:"library_or_learning", ordinaryCounterpartRoles:Object.freeze(["peer","librarian","teacher","mentor","caregiver"]) }),
      Object.freeze({ placeRef:place.commerce, placeKind:"market_or_commerce", ordinaryCounterpartRoles:Object.freeze(["peer","neighbor","vendor","caregiver","sibling"]) }),
    ]),
    bornAt:cohort.entry.bornAt,
    chronologyEndsAt:cohort.entry.chronologyEndsAt,
    timeZone:authored.timeZone,
  });
}

export function createModernBirthInitiationService({
  developmentService,
  creativeAdapter,
  birthRuntime,
  activityRecorder = null,
  onProgress = null,
} = {}) {
  if (!developmentService || typeof developmentService.develop !== "function") {
    throw new TypeError("modern birth initiation requires developmentService.develop()");
  }
  if (!creativeAdapter || typeof creativeAdapter.invoke !== "function") {
    throw new TypeError("modern birth initiation requires a creative model adapter");
  }
  if (!birthRuntime || typeof birthRuntime.durableAdapter !== "function") {
    throw new TypeError("modern birth initiation requires Birth Center durable model support");
  }
  if (onProgress !== null && typeof onProgress !== "function") {
    throw new TypeError("modern birth initiation onProgress must be a function or null");
  }
  const progress = onProgress ?? (() => {});
  const authorAdapter = birthRuntime.durableAdapter(creativeAdapter);
  const runStage = activityRecorder?.runStage
    ? (metadata, operation) => activityRecorder.runStage(metadata, operation)
    : (_metadata, operation) => operation();

  return Object.freeze({
    async initiate({ requestId, requestedAt, location = null, sex = null } = {}) {
      const id = nonEmpty("modern birth requestId", requestId);
      const at = nonEmpty("modern birth requestedAt", requestedAt);
      if (Number.isNaN(Date.parse(at))) throw new TypeError("modern birth requestedAt must be an ISO timestamp");
      const requestedSex = sex === null ? null : normalizeGenesisSex(sex);
      const selection = selectedLocation(id, location);
      await progress({
        requestId:id,
        status:"authoring",
        location:selection.selector.display,
        locationSource:selection.source,
        sex:null,
      });
      const authored = await runStage({
        requestId:id,
        stage:"birth.world.author",
      }, () => authorContext({ adapter:authorAdapter, requestId:id, selector:selection.selector }));

      const request = buildDevelopmentRequest({
        requestId:id,
        requestedAt:at,
        selector:selection.selector,
        sex:requestedSex,
        authored,
      });
      const plan = buildGenesisDevelopmentPlan(request);
      const selectedSex = requestedSex ?? genesisSexForThread({ threadId:plan.threadId });
      await progress({
        requestId:id,
        status:"developing",
        location:selection.selector.display,
        locationSource:selection.source,
        sex:selectedSex,
        threadId:plan.threadId,
        genesisId:plan.genesisId,
      });
      const development = await developmentService.develop(request);
      await progress({
        requestId:id,
        status:development.status === "published" ? "published" : "publishing",
        location:selection.selector.display,
        locationSource:selection.source,
        sex:selectedSex,
        threadId:plan.threadId,
        genesisId:plan.genesisId,
      });
      return Object.freeze({
        requestId:id,
        threadId:plan.threadId,
        genesisId:plan.genesisId,
        location:selection.selector.display,
        locationSource:selection.source,
        sex:selectedSex,
        development,
      });
    },
  });
}
