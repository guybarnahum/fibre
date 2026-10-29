import { sha256 } from "./state-codec.mjs";
import { sampleBirthplace } from "./birthplace-sampler.mjs";
import { FAMILY_PROFILES_SCHEMA, normalizeFamilyProfiles, sampleFamilyProfile, validateFamilyProfiles } from "../../../core/src/population-context/index.mjs";

// The CLI authoring schema and per-family selection remain unchanged in the first
// single-authority slice. A Place record replaces the laptop cache.
const WORLD_AUTHORING_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "timeZone",
    "homeDescription",
    "schoolDescription",
    "transitDescription",
    "learningDescription",
    "commerceDescription",
    "mobilityPattern",
    "schoolingOrCommunityContext",
    "culturalContext",
    "heritageContext",
    "familyProfiles",
    "availableInstitutions",
    "intellectualEnvironment",
  ],
  properties: {
    timeZone: { type: "string", minLength: 1 },
    homeDescription: { type: "string", minLength: 1 },
    schoolDescription: { type: "string", minLength: 1 },
    transitDescription: { type: "string", minLength: 1 },
    learningDescription: { type: "string", minLength: 1 },
    commerceDescription: { type: "string", minLength: 1 },
    mobilityPattern: { type: "string", minLength: 1 },
    schoolingOrCommunityContext: { type: "string", minLength: 1 },
    culturalContext: { type: "string", minLength: 1 },
    heritageContext: { type: "string", minLength: 1 },
    familyProfiles: FAMILY_PROFILES_SCHEMA,
    availableInstitutions: { type: "array", minItems: 3, items: { type: "string", minLength: 1 } },
    intellectualEnvironment: { type: "string", minLength: 1 },
  },
});

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function fold(value) {
  return nonEmpty("world selector part", value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function displayPart(value) {
  return nonEmpty("world selector part", value)
    .split(/[\s_-]+/u)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function normalizeGenesisWorldSelector(raw) {
  const value = nonEmpty("world selector", raw).replace(/^--/u, "");
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some((part) => part.trim() === "")) {
    throw new TypeError("place must be Country/City, for example --place=Israel/Jerusalem");
  }
  const country = displayPart(parts[0]);
  const city = displayPart(parts[1]);
  return Object.freeze({
    country,
    city,
    display: `${country}/${city}`,
    birthCity: `${city}, ${country}`,
    key: `${fold(country)}/${fold(city)}`,
    slug: `${fold(country)}_${fold(city)}`,
  });
}

export function selectDefaultBirthplace(requestId) {
  return normalizeGenesisWorldSelector(sampleBirthplace(nonEmpty("Genesis requestId", requestId)).place);
}

export function normalizeHeritage(raw) {
  const display = nonEmpty("heritage", raw).replace(/\s+/gu, " ");
  return Object.freeze({ display, key: fold(display), slug: fold(display) });
}

function normalizeSex(value) {
  if (value !== "female" && value !== "male") throw new TypeError("sex must be female or male");
  return value;
}

export function parseGenesisArgs(argv = []) {
  let sex = null;
  let world = null;
  let heritage = null;
  let forceNewWorld = false;
  let help = false;
  for (const argument of argv) {
    if (argument === "--female" || argument === "--male") {
      const next = normalizeSex(argument.slice(2));
      if (sex !== null && sex !== next) throw new TypeError("choose only one Genesis sex");
      sex = next;
      continue;
    }
    if (argument.startsWith("--sex=")) {
      const next = normalizeSex(argument.slice("--sex=".length));
      if (sex !== null && sex !== next) throw new TypeError("choose only one Genesis sex");
      sex = next;
      continue;
    }
    if (argument === "--new-world") {
      forceNewWorld = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument.startsWith("--heritage=")) {
      if (heritage !== null) throw new TypeError("choose only one Genesis heritage");
      heritage = normalizeHeritage(argument.slice("--heritage=".length));
      continue;
    }
    const explicitPlace = argument.startsWith("--place=") ? argument.slice("--place=".length) : null;
    const legacyWorld = argument.startsWith("--world=") ? argument.slice("--world=".length) : null;
    const shorthandPlace = argument.startsWith("--") && argument.includes("/") ? argument.slice(2) : null;
    if (explicitPlace !== null || legacyWorld !== null || shorthandPlace !== null) {
      if (world !== null) throw new TypeError("choose only one Genesis place");
      world = normalizeGenesisWorldSelector(explicitPlace ?? legacyWorld ?? shorthandPlace);
      continue;
    }
    throw new TypeError(`unsupported Genesis option ${argument}`);
  }
  if (heritage !== null && world === null) throw new TypeError("--heritage requires an explicit --place=Country/City");
  return Object.freeze({ sex, world, heritage, forceNewWorld, help });
}


function digest(value) {
  return sha256(JSON.stringify(value));
}

function assertTimeZone(value) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0)); }
  catch { throw new TypeError(`authored Genesis world returned invalid time zone ${String(value)}`); }
  return value;
}

function subjectLanguages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new TypeError("authored Genesis world must give this subject 1 to 3 personally plausible languages");
  }
  const languages = value.map((item) => nonEmpty("authored world language", item));
  const keys = languages.map((item) => item.toLocaleLowerCase("en-US"));
  if (new Set(keys).size !== keys.length) throw new TypeError("authored Genesis world returned duplicate subject languages");
  return Object.freeze(languages);
}

function buildAuthoredWorld({ selector, heritage, authored, requestId, bornAt, chronologyEndsAt, createdAt }) {
  const family = sampleFamilyProfile({ profiles:authored.familyProfiles, requestId });
  const timeZone = assertTimeZone(nonEmpty("authored world timeZone", authored.timeZone));
  const languages = subjectLanguages(family.languages);
  const raisedLanguages = subjectLanguages(family.raisedLanguages);
  const spokenKeys = new Set(languages.map((language) => language.toLocaleLowerCase("en-US")));
  if (raisedLanguages.some((language) => !spokenKeys.has(language.toLocaleLowerCase("en-US")))) {
    throw new TypeError("authored raised languages must be included in the subject's eventual spoken languages");
  }
  const sourceDigest = digest({ selector, heritage, authored, familyProfileId:family.id }).slice(0, 12);
  const worldSpecDigest = digest({selector,heritage,authored,familyProfileId:family.id,bornAt,chronologyEndsAt}).slice(0,12);
  const worldSpecId = `world_modern_${selector.slug}_${heritage?.slug ?? "default"}_${worldSpecDigest}`;
  const place = (kind) => `place_${selector.slug}_${sourceDigest}_${kind}`;
  const heritageLabel = heritage?.display ?? null;
  const familyOriginContext = nonEmpty("authored world familyOriginContext", family.familyOriginContext);
  const householdShape = heritageLabel === null
    ? "Two caregivers, the subject and one sibling share a household; other relatives may participate in ordinary visits and family logistics without being assumed to live there."
    : `Two caregivers, the subject and one sibling share a household in ${selector.city}. The household carries ${heritageLabel} heritage; other relatives or community ties may participate in ordinary visits, language, food, celebrations and family logistics without prescribing the subject's beliefs or personality.`;
  const culturalContext = [
    authored.culturalContext,
    ...(heritageLabel === null ? [] : [`Household heritage: ${heritageLabel}. ${authored.heritageContext}`]),
    "The sampled family profile constrains names, household/upbringing languages and physical inheritance. Its free-form family-origin explanation is provenance only and must not be treated as biography, occupation, class, religion, personality, values or lifestyle.",
  ].join("\n");
  const worldSpec = Object.freeze({
    worldSpecId,
    timeFrame: Object.freeze({ startAt: bornAt, endAt: chronologyEndsAt }),
    places: Object.freeze([
      Object.freeze({ placeId: place("home"), description: authored.homeDescription }),
      Object.freeze({ placeId: place("school"), description: authored.schoolDescription }),
      Object.freeze({ placeId: place("transit"), description: authored.transitDescription }),
      Object.freeze({ placeId: place("learning"), description: authored.learningDescription }),
      Object.freeze({ placeId: place("commerce"), description: authored.commerceDescription }),
    ]),
    householdShape,
    familyRelations: Object.freeze(["The sibling is two years older than the subject."]),
    languages,
    materialCircumstances: "Housing, food, schooling and routine mobility are stable enough for ordinary daily life; household spending choices matter without assigning the family a fixed socioeconomic identity.",
    mobilityPattern: authored.mobilityPattern,
    schoolingOrCommunityContext: authored.schoolingOrCommunityContext,
    culturalContext,
    availableInstitutions: Object.freeze([...authored.availableInstitutions]),
    intellectualEnvironment: authored.intellectualEnvironment,
    affordedRoles: Object.freeze(["caregiver", "sibling", "relative", "peer", "teacher", "neighbor", "vendor", "librarian", "coach", "mentor", "transit_worker"]),
    worldAuthorship: Object.freeze({
      authorId: "fibre_modern_world_authoring",
      sourcesConsulted: Object.freeze([]),
      abstractionMethod: `Operator selected ${selector.birthCity}${heritageLabel === null ? "" : ` with ${heritageLabel} household heritage`}. Fibre authored bounded ordinary-life affordances from general model knowledge before the Thread's life was generated. Place constrains civic surroundings; heritage constrains household/community cultural context. Neither prescribes personality, religion, politics, profession, competence or values.`,
      relocationWitness: `Relocating this World away from ${selector.birthCity} changes its civic, language, mobility and institutional affordances; changing the household heritage changes family/community cultural affordances. These are causal context rather than decorative scenery.`,
      familiarityProbe: null,
      createdAt,
    }),
    createdAt,
  });
  const material = Object.freeze({
    birthCity: selector.birthCity,
    place: Object.freeze({ country: selector.country, city: selector.city }),
    heritage: heritageLabel,
    familyProfileId: family.id,
    familyOriginContext,
    physicalAncestry: structuredClone(family.physicalAncestry),
    languages,
    raisedLanguages,
    nameOrder: family.nameOrder,
    femaleGivenNames: Object.freeze([...family.femaleGivenNames]),
    maleGivenNames: Object.freeze([...family.maleGivenNames]),
    familyNames: Object.freeze([...family.familyNames]),
  });
  const householdSuffix = heritageLabel === null ? "" : ` in a household with ${heritageLabel} heritage`;
  const participants = Object.freeze([
    Object.freeze({ participantId:"caregiver_1", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([
      `Lives with the subject in ${selector.city}${householdSuffix}.`,
    ]) }),
    Object.freeze({ participantId:"caregiver_2", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([
      `Lives with the subject in ${selector.city}${householdSuffix}.`,
    ]) }),
    Object.freeze({ participantId:"sibling_1", factualRoles:Object.freeze(["sibling"]), relationshipFacts:Object.freeze([
      `Lives with the subject${householdSuffix} and is two years older than the subject.`,
    ]) }),
  ]);
  const placeAffordances = Object.freeze([
    Object.freeze({ placeRef:place("home"), placeKind:"home", ordinaryCounterpartRoles:Object.freeze(["caregiver", "sibling", "relative", "peer", "neighbor"]) }),
    Object.freeze({ placeRef:place("school"), placeKind:"school", ordinaryCounterpartRoles:Object.freeze(["peer", "teacher", "coach", "mentor"]) }),
    Object.freeze({ placeRef:place("transit"), placeKind:"transit", ordinaryCounterpartRoles:Object.freeze(["peer", "neighbor", "caregiver", "sibling", "transit_worker"]) }),
    Object.freeze({ placeRef:place("learning"), placeKind:"library_or_learning", ordinaryCounterpartRoles:Object.freeze(["peer", "librarian", "teacher", "mentor", "caregiver"]) }),
    Object.freeze({ placeRef:place("commerce"), placeKind:"market_or_commerce", ordinaryCounterpartRoles:Object.freeze(["peer", "neighbor", "vendor", "caregiver", "sibling"]) }),
  ]);
  return Object.freeze({ worldSpec, material, timeZone, participants, placeAffordances });
}


export function composeGenesisWorldSelection({selector,heritage=null,authored,requestId,bornAt,chronologyEndsAt,createdAt}) {
  const composed=buildAuthoredWorld({selector,heritage,authored,requestId,bornAt,chronologyEndsAt,createdAt});
  return Object.freeze({...composed,selector,heritage});
}

export async function authorGenesisPlace({adapter,selector,heritage=null,placeKey,version,repair=null}) {
  if (!adapter || typeof adapter.invoke!=="function") throw new TypeError("Birth Place author needs a model adapter");
  const basePrompt = [
    "Author bounded ordinary-life material for a Fibre Genesis World.",
    "Keep the final JSON concise. Aim for roughly 6,000–8,000 output tokens when feasible, not as a quota: never pad to reach it and never omit required evidence to meet it. Use one or two concrete sentences per descriptive field, without repeating background across fields. Prefer four distinct, coherent family profiles where they suffice; add more only for materially different household origins. Supply exactly 24 distinct plausible names in each femaleGivenNames, maleGivenNames and familyNames list per profile; longer lists add no value. Preserve all required schema fields, familial plausibility, separate parental ancestry and valid language paths. The hard token budget is only a ceiling.",
    "The operator explicitly supplies place and may supply household heritage. Treat both as input, never as an inference about the operator.",
    "Keep two causal layers distinct: place defines the surrounding civic/physical world; heritage defines inherited household/community cultural context inside that place.",
    "For each homeDescription, schoolDescription, transitDescription, learningDescription and commerceDescription, use one or two concrete sentences (roughly 30–70 words when useful) about the setting and its ordinary physical/social possibilities. Do not narrate an entire city, school system, culture or family history in a single setting description; broader evidence belongs in the World context fields. Preserve specificity; never pad.",
    "Each family profile owns its personal language path. raisedLanguages is the language or languages actually used in that household or early upbringing; languages is the set the subject plausibly uses by the end of the Genesis chronology.",
    "Within every family profile, every raised language must also appear in languages. A school-acquired language may appear in languages without appearing in raisedLanguages. Neither field is a city or country language inventory.",
    "Use at most three eventual personal languages per family profile. Every language value must be one bare language name, never a list, explanation, slash-combination or several languages packed into one string. Heritage/ancestry languages belong in raisedLanguages only when that household plausibly uses them; school languages may become usable later without becoming upbringing languages. Put broader regional multilingualism in culturalContext.",
    "Within each family profile, familyOriginContext is a concise provenance explanation for why the profile's explicit names, languages and maternal/paternal physical ancestry fit together. It is inspectable authoring rationale, not a pre-authored biography.",
    "Also return familyProfiles: three to eight weighted plausible family-origin profiles for this place and era; prefer four or five when they represent its major household paths coherently. Together they are a small local distribution, not a diversity checklist. Weight ordinary locally common family histories more heavily while preserving plausible minority, diaspora and mixed-family paths. Each profile carries its own familyOriginContext, household/raised and eventual language path, naming order, naming material, and separate maternal/paternal physicalAncestry. Fibre will deterministically sample one profile per birth without another model call.",
    "A family profile is one concrete hypothetical family path, not a demographic umbrella and not a whole-person stereotype. Write it as though it describes one actual family: choose one specific roots/migration/kin path rather than alternatives such as Pakistani or Bangladeshi, Nigerian or Ghanaian, or Tamil/Kannada/Telugu/Kerala bundled together. A mixed family is valid only when the profile explicitly gives the concrete maternal and paternal paths that are mixed. Do not assign a profile a class, occupation, migration job/reason, politics, diet, hobbies, personality, values or lifestyle. Keep religion and observance out of familyOriginContext; naming material may reflect a family naming tradition without asserting the subject's belief.",
    "Naming belongs to the sampled family, not directly to birthplace or physical ancestry. Give every family profile at least twenty-four distinct female given names, twenty-four male given names and twenty-four family names that are plausible for that family history and era. Preserve ordinary common names; do not optimize for exotic variety. Mixed families may draw from either side when causally plausible. Names are candidates, not pre-authored people.",
    "Each family profile is one coherent household-origin path. Never merge mutually exclusive population alternatives merely to cover more of the city. If two roots would produce different household languages, naming traditions or physical ancestry, they belong in separate profiles unless this one family is explicitly mixed across those exact parental lines. Coverage is less important than causal coherence.",
    "When no heritage is supplied, the family-profile distribution should be weighted toward ordinary local household histories rather than uniform global diversity. Less common diaspora or mixed-origin profiles are valid, but their familyOriginContext must explicitly explain the migration or family connection that makes them part of this place.",
    "When heritage is supplied, condition the family-profile distribution on that heritage: familyOriginContext, naming material, household language path and family/community context must remain compatible with both heritage and place.",
    "Do not inject familyOriginContext itself into the subject's life story. The profile becomes causal only through its explicit selected outputs: naming material, raised/eventual languages and maternal/paternal physical ancestry. Rich relatives, family stories, migration consequences, religion, class and lifestyle belong to later authored life only when independently warranted.",
    "Do not infer the future subject's religion, religious observance, politics, personality, class identity, profession, competence, trauma or values from ancestry, appearance, place, or heritage. A heritage label may name a religious or ethnocultural tradition without making the subject personally observant or believing.",
    "Inside every family profile, physicalAncestry has separate maternal and paternal ancestry mixtures for this one hypothetical family, causally supported by familyOriginContext. Each population entry names one concrete lineage source, not an alternative list or a demographic blend. Multiple entries on one parent are allowed only when that parent is explicitly mixed across those exact sources. Never add ancestry merely to explain a religion, naming tradition, city diversity or uncertainty. Use referencePopulation only as Fibre's shared hierarchical physical founder prior; population is a concise human-readable family-origin label. Use the most specific supported reference code only when the family lineage explicitly supports it, otherwise use its broader parent region. East Asian codes include east_asia, east_asia.han_chinese with northern/central/southern children, east_asia.korean, east_asia.japanese, east_asia.mongolian and east_asia.tibetan. Middle-East evidence codes include middle_east with egypt, levant, arabia, mesopotamia, iran and anatolia children. Other root codes remain afr_north, afr_west, afr_east, afr_south, eur_north, eur_south, west_asia, south_asia, southeast_asia and indigenous_america. Oceania codes include oceania, oceania.polynesia with native_hawaiian, samoan, tongan, maori and other children, plus oceania.micronesia and oceania.melanesia. Birthplace or a name never justify a finer physical lineage by themselves. Shares on each parent should sum to 1. Do not use these fields for culture, personality, ability, class, religion, behavior or values.",
    "Use an IANA time-zone identifier. Keep civic descriptions concrete enough to ground ordinary episodes, but avoid unsupported hyper-specific claims.",
  ].join("\n");

  const result=await adapter.invoke({
    clientRequestId:"birth_place_"+sha256(placeKey+":"+version).slice(0,24)+(repair===null?"_author":"_repair"),
    systemPrompt:repair===null?basePrompt:basePrompt+"\nThe previous authored material failed validation: "+repair+". Regenerate the complete valid response.",
    input:{country:selector.country,city:selector.city,heritage:heritage?.display??null},
    responseSchema:WORLD_AUTHORING_SCHEMA,
  });
  const authored=result.output;
  const familyProfiles=normalizeFamilyProfiles(authored.familyProfiles);
  validateFamilyProfiles(familyProfiles);
  return Object.freeze({...authored,familyProfiles});
}
