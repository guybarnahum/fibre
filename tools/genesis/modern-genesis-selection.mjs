import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";

export const MODERN_WORLD_CACHE_VERSION = "fibre-modern-world-cache-v2";
const DEFAULT_WORLD_MODEL = "gpt-5.1-2025-11-13";

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
    "appearanceContext",
    "availableInstitutions",
    "intellectualEnvironment",
  ],
  properties: {
    timeZone: { type: "string", minLength: 1 },
    languages: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } },
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
    appearanceContext: { type: "string", minLength: 1 },
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

function assertTimeZone(value) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0)); }
  catch { throw new TypeError(`authored Genesis world returned invalid time zone ${String(value)}`); }
  return value;
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
  const sourceDigest = digest({ selector, heritage, authored }).slice(0, 12);
  const worldSpecId = `world_modern_${selector.slug}_${heritage?.slug ?? "default"}_${sourceDigest}`;
  const place = (kind) => `place_${selector.slug}_${sourceDigest}_${kind}`;
  const heritageLabel = heritage?.display ?? null;
  const householdShape = heritageLabel === null
    ? "Two caregivers, the subject and one sibling share a household; other relatives may participate in ordinary visits and family logistics without being assumed to live there."
    : `Two caregivers, the subject and one sibling share a household in ${selector.city}. The household carries ${heritageLabel} heritage; other relatives or community ties may participate in ordinary visits, language, food, celebrations and family logistics without prescribing the subject's beliefs or personality.`;
  const culturalContext = heritageLabel === null
    ? authored.culturalContext
    : `${authored.culturalContext}\nHousehold heritage: ${heritageLabel}. ${authored.heritageContext}`;
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
    languages: Object.freeze([...authored.languages]),
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
    appearanceContext: appearancePrior({ selector, heritage, value: authored.appearanceContext }),
    nameOrder: authored.nameOrder,
    femaleGivenNames: Object.freeze([...authored.femaleGivenNames]),
    maleGivenNames: Object.freeze([...authored.maleGivenNames]),
    familyNames: Object.freeze([...authored.familyNames]),
  });
  const householdSuffix = heritageLabel === null ? "" : ` in a household with ${heritageLabel} heritage`;
  const participants = Object.freeze([
    Object.freeze({ participantId:"caregiver_1", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([`Lives with the subject in ${selector.city}${householdSuffix}.`]) }),
    Object.freeze({ participantId:"caregiver_2", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([`Lives with the subject in ${selector.city}${householdSuffix}.`]) }),
    Object.freeze({ participantId:"sibling_1", factualRoles:Object.freeze(["sibling"]), relationshipFacts:Object.freeze([`Lives with the subject${householdSuffix} and is two years older than the subject.`]) }),
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
      "When heritage is supplied, make naming material, plausible household/community languages, family/community practices, food, celebrations, migration/diaspora context and community affordances compatible with that heritage and place.",
      "Do not infer the future subject's religion, religious observance, politics, ethnicity, personality, class identity, profession, competence, trauma or values. A heritage label may name a religious or ethnocultural tradition without making the subject personally observant or believing.",
      "Return appearanceContext as a broad family-appearance prior only. It must not repeat the heritage label, country, city, religion, nationality or community name; describe only a broad plausible physical range. If heritage is culturally broad, mixed, diasporic, or does not imply one ancestry, preserve broad physical variation rather than inventing a single stereotyped phenotype. Never connect appearance to personality or worth.",
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
  worldSlotOrdinal = baseSlotOrdinal,
  modelId = process.env.FIBRE_GENESIS_WORLD_MODEL?.trim() || DEFAULT_WORLD_MODEL,
  now = () => new Date().toISOString(),
  authorWorld = defaultAuthorWorld,
} = {}) {
  if (selector === null) {
    if (heritage !== null) throw new TypeError("Genesis heritage requires an explicit place");
    const genomeSlot = cohort.slots[baseSlotOrdinal - 1];
    const worldSlot = cohort.slots[worldSlotOrdinal - 1];
    const material = materialFixture.slots.find((item) => item.slot === worldSlotOrdinal);
    if (!genomeSlot) throw new Error(`modern Genesis genome slot ${baseSlotOrdinal} is unavailable`);
    if (!worldSlot || !material) throw new Error(`modern Genesis World slot ${worldSlotOrdinal} is unavailable`);
    return Object.freeze({
      mode: "fixture",
      selector: selectorFromBirthCity(material.birthCity),
      heritage: null,
      slotOrdinal: baseSlotOrdinal,
      worldSlotOrdinal,
      genomePath: genomeSlot.genomePath,
      worldSpec: fixture(worldSlot.worldSpecPath),
      material,
      timeZone: worldSlot.timeZone,
      participants: worldSlot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
      placeAffordances: worldSlot.placeAffordances,
      cachePath: null,
    });
  }

  if (!forceNewWorld && heritage === null) {
    const existing = findFixtureWorld({ selector, cohort, materialFixture });
    if (existing) {
      return Object.freeze({
        mode: "fixture",
        selector,
        heritage: null,
        slotOrdinal: existing.slot.slot,
        genomePath: existing.slot.genomePath,
        worldSpec: fixture(existing.slot.worldSpecPath),
        material: existing.material,
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
