import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";

export const MODERN_WORLD_CACHE_VERSION = "fibre-modern-world-cache-v4";
const DEFAULT_WORLD_MODEL = "gpt-5.1-2025-11-13";
const MODERN_BIRTHPLACE_ANCHORS = Object.freeze([
  "Canada/Vancouver",
  "United States/Chicago",
  "Mexico/Mexico City",
  "Guatemala/Guatemala City",
  "Colombia/Bogota",
  "Peru/Lima",
  "Brazil/Recife",
  "Argentina/Buenos Aires",
  "Chile/Santiago",
  "United Kingdom/Manchester",
  "Portugal/Lisbon",
  "Spain/Valencia",
  "France/Lyon",
  "Germany/Berlin",
  "Poland/Warsaw",
  "Romania/Cluj Napoca",
  "Morocco/Fes",
  "Ghana/Accra",
  "Nigeria/Lagos",
  "Kenya/Nairobi",
  "Tanzania/Dar Es Salaam",
  "South Africa/Cape Town",
  "Georgia/Tbilisi",
  "Israel/Jerusalem",
  "Turkey/Istanbul",
  "Egypt/Alexandria",
  "India/Mumbai",
  "Pakistan/Lahore",
  "Bangladesh/Dhaka",
  "Sri Lanka/Colombo",
  "Thailand/Chiang Mai",
  "Vietnam/Da Nang",
  "Taiwan/Kaohsiung",
  "Japan/Osaka",
  "South Korea/Busan",
  "Philippines/Cebu",
  "Indonesia/Makassar",
  "Australia/Hobart",
  "New Zealand/Auckland",
  "United States/Honolulu",
]);


const WORLD_AUTHORING_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "timeZone",
    "languages",
    "nameOrder",
    "femaleGivenNames",
    "maleGivenNames",
    "familyNames",
    "homeDescription",
    "schoolDescription",
    "transitDescription",
    "learningDescription",
    "commerceDescription",
    "mobilityPattern",
    "schoolingOrCommunityContext",
    "culturalContext",
    "heritageContext",
    "familyOriginContext",
    "appearanceContext",
    "availableInstitutions",
    "intellectualEnvironment",
  ],
  properties: {
    timeZone: { type: "string", minLength: 1 },
    languages: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
      description:"Languages this one subject plausibly uses across home, civic life, or schooling by the end of the Genesis chronology; never a list of languages present in the country or city.",
      items: { type: "string", minLength: 1 },
    },
    nameOrder: { type: "string", enum: ["given_family", "family_given"] },
    femaleGivenNames: { type: "array", minItems: 6, uniqueItems: true, items: { type: "string", minLength: 1 } },
    maleGivenNames: { type: "array", minItems: 6, uniqueItems: true, items: { type: "string", minLength: 1 } },
    familyNames: { type: "array", minItems: 6, uniqueItems: true, items: { type: "string", minLength: 1 } },
    homeDescription: { type: "string", minLength: 1 },
    schoolDescription: { type: "string", minLength: 1 },
    transitDescription: { type: "string", minLength: 1 },
    learningDescription: { type: "string", minLength: 1 },
    commerceDescription: { type: "string", minLength: 1 },
    mobilityPattern: { type: "string", minLength: 1 },
    schoolingOrCommunityContext: { type: "string", minLength: 1 },
    culturalContext: { type: "string", minLength: 1 },
    heritageContext: { type: "string", minLength: 1 },
    familyOriginContext: {
      type: "string",
      minLength: 1,
      description:"A concise causal account of this household's family origins and migration/mixed-ancestry history insofar as it matters to languages, family/community ties, appearance, and lived experience. This is subject-family context, not a demographic description of the city.",
    },
    appearanceContext: {
      type: "string",
      minLength: 1,
      description:"A broad physical-family appearance prior causally compatible with familyOriginContext. Do not invent ancestry that familyOriginContext does not support.",
    },
    availableInstitutions: { type: "array", minItems: 3, uniqueItems: true, items: { type: "string", minLength: 1 } },
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

export function normalizeModernWorldSelector(raw) {
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

export function selectDefaultModernBirthplace(requestId) {
  const id = nonEmpty("Genesis requestId", requestId);
  const index = Number.parseInt(
    createHash("sha256").update(`fibre-modern-birthplace:${id}`).digest("hex").slice(0, 12),
    16,
  ) % MODERN_BIRTHPLACE_ANCHORS.length;
  return normalizeModernWorldSelector(MODERN_BIRTHPLACE_ANCHORS[index]);
}

export function normalizeModernHeritage(raw) {
  const display = nonEmpty("heritage", raw).replace(/\s+/gu, " ");
  return Object.freeze({ display, key: fold(display), slug: fold(display) });
}

function normalizeSex(value) {
  if (value !== "female" && value !== "male") throw new TypeError("sex must be female or male");
  return value;
}

export function parseModernGenesisArgs(argv = []) {
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
      heritage = normalizeModernHeritage(argument.slice("--heritage=".length));
      continue;
    }
    const explicitPlace = argument.startsWith("--place=") ? argument.slice("--place=".length) : null;
    const legacyWorld = argument.startsWith("--world=") ? argument.slice("--world=".length) : null;
    const shorthandPlace = argument.startsWith("--") && argument.includes("/") ? argument.slice(2) : null;
    if (explicitPlace !== null || legacyWorld !== null || shorthandPlace !== null) {
      if (world !== null) throw new TypeError("choose only one Genesis place");
      world = normalizeModernWorldSelector(explicitPlace ?? legacyWorld ?? shorthandPlace);
      continue;
    }
    throw new TypeError(`unsupported modern Genesis option ${argument}`);
  }
  if (heritage !== null && world === null) throw new TypeError("--heritage requires an explicit --place=Country/City");
  return Object.freeze({ sex, world, heritage, forceNewWorld, help });
}

function selectorFromBirthCity(value) {
  const pieces = String(value ?? "").split(",");
  if (pieces.length < 2) return null;
  const city = pieces.shift().trim();
  const country = pieces.join(",").trim();
  if (!city || !country) return null;
  return normalizeModernWorldSelector(`${country}/${city}`);
}

export function findFixtureWorld({ selector, cohort, materialFixture }) {
  for (const material of materialFixture.slots ?? []) {
    const candidate = selectorFromBirthCity(material.birthCity);
    if (candidate?.key !== selector.key) continue;
    const slot = (cohort.slots ?? []).find((item) => item.slot === material.slot);
    if (!slot) throw new Error(`modern Genesis material slot ${material.slot} lacks its cohort slot`);
    return Object.freeze({ slot, material, selector: candidate });
  }
  return null;
}

function cachePath(repoRoot, selector, heritage) {
  return resolve(
    repoRoot,
    ".fibre",
    "genesis",
    "worlds",
    `${selector.slug}__${heritage?.slug ?? "default"}.json`,
  );
}

function readCache(repoRoot, selector, heritage) {
  const path = cachePath(repoRoot, selector, heritage);
  if (!existsSync(path)) return null;
  const cached = JSON.parse(readFileSync(path, "utf8"));
  if (
    cached?.cacheVersion !== MODERN_WORLD_CACHE_VERSION
    || cached?.selector?.key !== selector.key
    || (cached?.heritage?.key ?? null) !== (heritage?.key ?? null)
  ) {
    throw new Error(`invalid modern Genesis world cache ${path}`);
  }
  return Object.freeze({ ...cached, cachePath: path, mode: "cached" });
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fixtureWorldWithFamilyContext(worldSpec, material) {
  const familyOriginContext = typeof material?.familyOriginContext === "string" ? material.familyOriginContext.trim() : "";
  const appearanceContext = typeof material?.appearanceContext === "string" ? material.appearanceContext.trim() : "";
  if (familyOriginContext === "" || appearanceContext === "") return Object.freeze({ worldSpec, material });

  const suffix = `family_${digest({
    worldSpecId:worldSpec.worldSpecId,
    familyOriginContext,
    appearanceContext,
  }).slice(0, 12)}`;
  const nextWorld = Object.freeze({
    ...worldSpec,
    worldSpecId:`${worldSpec.worldSpecId}_${suffix}`,
    householdShape:`${worldSpec.householdShape} Family origin context: ${familyOriginContext}`,
    culturalContext:[
      worldSpec.culturalContext,
      `Family origin context: ${familyOriginContext}`,
      "Family origin may shape ordinary experiences of belonging, language, peer perception, family stories, travel, community ties, or identity questions when context makes those effects plausible. Do not force every episode to concern ancestry or visible difference, and do not infer personality, ability, values, trauma, or social outcome from ancestry or appearance.",
    ].join("\n"),
  });
  return Object.freeze({
    worldSpec:nextWorld,
    material:Object.freeze({ ...material, familyOriginContext, appearanceContext }),
  });
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function appearancePrior({ selector, heritage, value }) {
  let text = nonEmpty("authored world appearanceContext", value);
  for (const label of [heritage?.display, selector.city, selector.country]) {
    if (typeof label !== "string" || label.trim() === "") continue;
    text = text.replace(new RegExp(escapeRegExp(label.trim()), "giu"), "the family");
  }
  return text.replace(/\s+/gu, " ").trim();
}

function buildAuthoredWorld({ selector, heritage, authored, bornAt, chronologyEndsAt, createdAt }) {
  const timeZone = assertTimeZone(nonEmpty("authored world timeZone", authored.timeZone));
  const languages = subjectLanguages(authored.languages);
  const sourceDigest = digest({ selector, heritage, authored }).slice(0, 12);
  const worldSpecId = `world_modern_${selector.slug}_${heritage?.slug ?? "default"}_${sourceDigest}`;
  const place = (kind) => `place_${selector.slug}_${sourceDigest}_${kind}`;
  const heritageLabel = heritage?.display ?? null;
  const familyOriginContext = nonEmpty("authored world familyOriginContext", authored.familyOriginContext);
  const householdShapeBase = heritageLabel === null
    ? "Two caregivers, the subject and one sibling share a household; other relatives may participate in ordinary visits and family logistics without being assumed to live there."
    : `Two caregivers, the subject and one sibling share a household in ${selector.city}. The household carries ${heritageLabel} heritage; other relatives or community ties may participate in ordinary visits, language, food, celebrations and family logistics without prescribing the subject's beliefs or personality.`;
  const householdShape = `${householdShapeBase} Family origin context: ${familyOriginContext}`;
  const culturalContext = [
    authored.culturalContext,
    ...(heritageLabel === null ? [] : [`Household heritage: ${heritageLabel}. ${authored.heritageContext}`]),
    `Family origin context: ${familyOriginContext}`,
    "Family origin may shape ordinary experiences of belonging, language, peer perception, family stories, travel, community ties, or identity questions when context makes those effects plausible. Do not force every episode to concern ancestry or visible difference, and do not infer personality, ability, values, trauma, or social outcome from ancestry or appearance.",
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
    familyOriginContext,
    appearanceContext: appearancePrior({ selector, heritage, value: authored.appearanceContext }),
    nameOrder: authored.nameOrder,
    femaleGivenNames: Object.freeze([...authored.femaleGivenNames]),
    maleGivenNames: Object.freeze([...authored.maleGivenNames]),
    familyNames: Object.freeze([...authored.familyNames]),
  });
  const householdSuffix = heritageLabel === null ? "" : ` in a household with ${heritageLabel} heritage`;
  const participants = Object.freeze([
    Object.freeze({ participantId:"caregiver_1", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([
      `Lives with the subject in ${selector.city}${householdSuffix}.`,
      `Household family-origin context: ${familyOriginContext}`,
    ]) }),
    Object.freeze({ participantId:"caregiver_2", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([
      `Lives with the subject in ${selector.city}${householdSuffix}.`,
      `Household family-origin context: ${familyOriginContext}`,
    ]) }),
    Object.freeze({ participantId:"sibling_1", factualRoles:Object.freeze(["sibling"]), relationshipFacts:Object.freeze([
      `Lives with the subject${householdSuffix} and is two years older than the subject.`,
      `Shares the household family-origin context: ${familyOriginContext}`,
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

export function createWorldAuthoringFetch(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new TypeError("World authoring fetch must be a function");
  return async (url, options = {}) => {
    if (typeof options.body !== "string") return fetchImpl(url, options);
    const body = JSON.parse(options.body);
    delete body.temperature;
    delete body.top_p;
    return fetchImpl(url, { ...options, body: JSON.stringify(body) });
  };
}

async function defaultAuthorWorld({ selector, heritage, modelId, requestId }) {
  const adapter = createOpenAIModelAdapter({
    modelId,
    fetchImpl: createWorldAuthoringFetch(),
    reasoningEffort: "low",
    maxOutputTokens: 5_000,
  });
  const result = await adapter.invoke({
    clientRequestId: `modern_world_${selector.slug}_${heritage?.slug ?? "default"}_${digest(requestId).slice(0, 12)}`,
    systemPrompt: [
      "Author bounded ordinary-life material for a Fibre Genesis World.",
      "The operator explicitly supplies place and may supply household heritage. Treat both as input, never as an inference about the operator.",
      "Keep two causal layers distinct: place defines the surrounding civic/physical world; heritage defines inherited household/community cultural context inside that place.",
      "The languages field is personal, not demographic: list only languages this one subject plausibly uses by the end of the Genesis chronology. Never return a city's or country's language inventory.",
      "Choose a coherent household language path. A minority or ancestry language belongs in languages only when this household plausibly uses it; unrelated minority languages must not be combined merely because their communities exist in the same country.",
      "Use at most three personal languages. A typical path is the household/civic language, optionally one heritage/home language, and optionally one language learned through school or sustained public exposure. Do not imply equal fluency.",
      "Keep language domains realistic: heritage/ancestry languages are ordinarily home/family/community languages unless the local civic context independently uses them; school languages may become usable without becoming home languages. Put broader regional multilingualism in culturalContext, not in the subject's languages.",
      "Author familyOriginContext before appearanceContext. familyOriginContext is a concise causal household history: local family roots, mixed ancestry, migration, diaspora, adoption, or other family-origin facts only when plausibly warranted.",
      "When no heritage is supplied, choose a plausible family-origin path for this place weighted toward ordinary local household histories rather than uniform global diversity. Less common diaspora or mixed-origin households are valid, but if chosen the familyOriginContext must explicitly explain the migration or family connection that makes them part of this place.",
      "When heritage is supplied, make familyOriginContext, naming material, the household language path, family/community practices, food, celebrations, migration/diaspora context and community affordances compatible with that heritage and place.",
      "familyOriginContext is causal World material. It may shape ordinary life through language at home, relatives, family stories, visits, community ties, being visibly unusual or ordinary in the local environment, peer perception, belonging, or identity questions when appropriate. Do not make every episode about ancestry or visible difference, and do not assume discrimination, trauma, personality, ability, values, or social outcomes.",
      "Do not infer the future subject's religion, religious observance, politics, personality, class identity, profession, competence, trauma or values from ancestry, appearance, place, or heritage. A heritage label may name a religious or ethnocultural tradition without making the subject personally observant or believing.",
      "Return appearanceContext as a broad family-appearance prior causally supported by familyOriginContext. If the appearance range would be uncommon in the selected place, familyOriginContext must contain the corresponding migration, mixed-ancestry, adoption, or diaspora history rather than leaving the appearance unexplained. Do not repeat the heritage label, country, city, religion, nationality or community name in appearanceContext; describe only a broad plausible physical range. Preserve substantial within-family variation and never connect appearance to personality or worth.",
      "Names are reusable local/heritage naming material only, never pre-authored people. Supply at least six distinct female given names, six distinct male given names and six family names.",
      "Use an IANA time-zone identifier. Keep civic descriptions concrete enough to ground ordinary episodes, but avoid unsupported hyper-specific claims.",
    ].join("\n"),
    input: {
      country: selector.country,
      city: selector.city,
      heritage: heritage?.display ?? null,
    },
    responseSchema: WORLD_AUTHORING_SCHEMA,
  });
  return result.output;
}

export async function resolveModernWorldSelection({
  selector,
  heritage = null,
  forceNewWorld = false,
  cohort,
  materialFixture,
  fixture,
  repoRoot,
  requestId,
  baseSlotOrdinal,
  modelId = process.env.FIBRE_GENESIS_WORLD_MODEL?.trim() || DEFAULT_WORLD_MODEL,
  now = () => new Date().toISOString(),
  authorWorld = defaultAuthorWorld,
} = {}) {
  if (selector === null) throw new TypeError("modern Genesis requires a birthplace selector");

  if (!forceNewWorld && heritage === null) {
    const existing = findFixtureWorld({ selector, cohort, materialFixture });
    if (existing) {
      const genomeSlot = cohort.slots[baseSlotOrdinal - 1];
      if (!genomeSlot) throw new Error(`modern Genesis genome slot ${baseSlotOrdinal} is unavailable`);
      const family = fixtureWorldWithFamilyContext(fixture(existing.slot.worldSpecPath), existing.material);
      return Object.freeze({
        mode: "fixture",
        selector,
        heritage: null,
        slotOrdinal: baseSlotOrdinal,
        worldSlotOrdinal: existing.slot.slot,
        genomePath: genomeSlot.genomePath,
        worldSpec: family.worldSpec,
        material: family.material,
        timeZone: existing.slot.timeZone,
        participants: existing.slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
        placeAffordances: existing.slot.placeAffordances,
        cachePath: null,
      });
    }
  }

  if (!forceNewWorld) {
    const cached = readCache(repoRoot, selector, heritage);
    if (cached) {
      const slot = cohort.slots[baseSlotOrdinal - 1];
      return Object.freeze({
        ...cached,
        slotOrdinal: baseSlotOrdinal,
        genomePath: slot.genomePath,
      });
    }
  }

  const authored = await authorWorld({ selector, heritage, modelId, requestId });
  const createdAt = now();
  const built = buildAuthoredWorld({
    selector,
    heritage,
    authored,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    createdAt,
  });
  const path = cachePath(repoRoot, selector, heritage);
  const record = {
    cacheVersion: MODERN_WORLD_CACHE_VERSION,
    selector,
    heritage,
    createdAt,
    worldSpec: built.worldSpec,
    material: built.material,
    timeZone: built.timeZone,
    participants: built.participants,
    placeAffordances: built.placeAffordances,
  };
  mkdirSync(dirname(path), { recursive:true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  const slot = cohort.slots[baseSlotOrdinal - 1];
  return Object.freeze({
    ...record,
    mode: "created",
    cachePath: path,
    slotOrdinal: baseSlotOrdinal,
    genomePath: slot.genomePath,
  });
}
