import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";

export const MODERN_WORLD_CACHE_VERSION = "fibre-modern-world-cache-v1";
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
    "availableInstitutions",
    "intellectualEnvironment",
  ],
  properties: {
    timeZone: { type: "string", minLength: 1 },
    languages: { type: "array", minItems: 1, maxItems: 4, uniqueItems: true, items: { type: "string", minLength: 1 } },
    nameOrder: { type: "string", enum: ["given_family", "family_given"] },
    femaleGivenNames: { type: "array", minItems: 6, maxItems: 8, uniqueItems: true, items: { type: "string", minLength: 1 } },
    maleGivenNames: { type: "array", minItems: 6, maxItems: 8, uniqueItems: true, items: { type: "string", minLength: 1 } },
    familyNames: { type: "array", minItems: 6, maxItems: 8, uniqueItems: true, items: { type: "string", minLength: 1 } },
    homeDescription: { type: "string", minLength: 1 },
    schoolDescription: { type: "string", minLength: 1 },
    transitDescription: { type: "string", minLength: 1 },
    learningDescription: { type: "string", minLength: 1 },
    commerceDescription: { type: "string", minLength: 1 },
    mobilityPattern: { type: "string", minLength: 1 },
    schoolingOrCommunityContext: { type: "string", minLength: 1 },
    culturalContext: { type: "string", minLength: 1 },
    availableInstitutions: { type: "array", minItems: 3, maxItems: 10, uniqueItems: true, items: { type: "string", minLength: 1 } },
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
    throw new TypeError("world selector must be Country/City, for example --Israel/Jerusalem");
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

export function parseModernGenesisArgs(argv = []) {
  let sex = null;
  let world = null;
  let forceNewWorld = false;
  let help = false;
  for (const argument of argv) {
    if (argument === "--female" || argument === "--male") {
      const next = argument.slice(2);
      if (sex !== null && sex !== next) throw new TypeError("choose only one of --female or --male");
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
    const explicitWorld = argument.startsWith("--world=") ? argument.slice("--world=".length) : null;
    const shorthandWorld = argument.startsWith("--") && argument.includes("/") ? argument.slice(2) : null;
    if (explicitWorld !== null || shorthandWorld !== null) {
      if (world !== null) throw new TypeError("choose only one Genesis world selector");
      world = normalizeModernWorldSelector(explicitWorld ?? shorthandWorld);
      continue;
    }
    throw new TypeError(`unsupported modern Genesis option ${argument}`);
  }
  return Object.freeze({ sex, world, forceNewWorld, help });
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

function cachePath(repoRoot, selector) {
  return resolve(repoRoot, ".fibre", "genesis", "worlds", `${selector.slug}.json`);
}

function readCache(repoRoot, selector) {
  const path = cachePath(repoRoot, selector);
  if (!existsSync(path)) return null;
  const cached = JSON.parse(readFileSync(path, "utf8"));
  if (cached?.cacheVersion !== MODERN_WORLD_CACHE_VERSION || cached?.selector?.key !== selector.key) {
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

function buildAuthoredWorld({ selector, authored, bornAt, chronologyEndsAt, createdAt }) {
  const timeZone = assertTimeZone(nonEmpty("authored world timeZone", authored.timeZone));
  const sourceDigest = digest(authored).slice(0, 12);
  const worldSpecId = `world_modern_${selector.slug}_${sourceDigest}`;
  const place = (kind) => `place_${selector.slug}_${sourceDigest}_${kind}`;
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
    householdShape: "Two caregivers, the subject and one sibling share a household; other relatives may participate in ordinary visits and family logistics without being assumed to live there.",
    familyRelations: Object.freeze(["The sibling is two years older than the subject."]),
    languages: Object.freeze([...authored.languages]),
    materialCircumstances: "Housing, food, schooling and routine mobility are stable enough for ordinary daily life; household spending choices matter without assigning the family a fixed socioeconomic identity.",
    mobilityPattern: authored.mobilityPattern,
    schoolingOrCommunityContext: authored.schoolingOrCommunityContext,
    culturalContext: authored.culturalContext,
    availableInstitutions: Object.freeze([...authored.availableInstitutions]),
    intellectualEnvironment: authored.intellectualEnvironment,
    affordedRoles: Object.freeze(["caregiver", "sibling", "relative", "peer", "teacher", "neighbor", "vendor", "librarian", "coach", "mentor", "transit_worker"]),
    worldAuthorship: Object.freeze({
      authorId: "fibre_modern_world_authoring",
      sourcesConsulted: Object.freeze([]),
      abstractionMethod: `Operator selected ${selector.birthCity}. Fibre authored bounded ordinary-life affordances from general model knowledge before the Thread's life was generated. The World constrains places, institutions and language context without prescribing the subject's personality, religion, politics, ethnicity, profession or values.`,
      relocationWitness: `Relocating this World away from ${selector.birthCity} changes its language, civic, mobility and institutional affordances; the location is therefore part of the World rather than decorative scenery.`,
      familiarityProbe: null,
      createdAt,
    }),
    createdAt,
  });
  const material = Object.freeze({
    birthCity: selector.birthCity,
    nameOrder: authored.nameOrder,
    femaleGivenNames: Object.freeze([...authored.femaleGivenNames]),
    maleGivenNames: Object.freeze([...authored.maleGivenNames]),
    familyNames: Object.freeze([...authored.familyNames]),
  });
  const participants = Object.freeze([
    Object.freeze({ participantId:"caregiver_1", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([`Lives in the subject household in ${selector.city}.`]) }),
    Object.freeze({ participantId:"caregiver_2", factualRoles:Object.freeze(["caregiver"]), relationshipFacts:Object.freeze([`Lives in the subject household in ${selector.city}.`]) }),
    Object.freeze({ participantId:"sibling_1", factualRoles:Object.freeze(["sibling"]), relationshipFacts:Object.freeze(["Lives in the subject household and is two years older than the subject."]) }),
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

async function defaultAuthorWorld({ selector, modelId, requestId }) {
  const adapter = createOpenAIModelAdapter({
    modelId,
    temperature: 0,
    reasoningEffort: "low",
    maxOutputTokens: 5_000,
  });
  const result = await adapter.invoke({
    clientRequestId: `modern_world_${selector.slug}_${digest(requestId).slice(0, 12)}`,
    systemPrompt: [
      "Author bounded ordinary-life material for a Fibre Genesis World.",
      "The operator has explicitly chosen the country and city. Treat that location as input, not as a political or demographic inference.",
      "Return plausible public/civic language, mobility, school/community, learning and commerce affordances using general factual knowledge.",
      "Do not assign the future subject a religion, politics, ethnicity, class identity, profession, personality, competence, trauma or values.",
      "Names are reusable local naming material only, never pre-authored people. Supply at least six distinct female given names, six distinct male given names and six family names.",
      "Use an IANA time-zone identifier. Keep descriptions concrete enough to ground ordinary episodes, but avoid unsupported hyper-specific claims.",
    ].join("\n"),
    input: { country: selector.country, city: selector.city },
    responseSchema: WORLD_AUTHORING_SCHEMA,
  });
  return result.output;
}

export async function resolveModernWorldSelection({
  selector,
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
  if (selector === null) {
    const slot = cohort.slots[baseSlotOrdinal - 1];
    const material = materialFixture.slots.find((item) => item.slot === baseSlotOrdinal);
    if (!slot || !material) throw new Error(`modern Genesis slot ${baseSlotOrdinal} is unavailable`);
    return Object.freeze({
      mode: "fixture",
      selector: selectorFromBirthCity(material.birthCity),
      slotOrdinal: baseSlotOrdinal,
      genomePath: slot.genomePath,
      worldSpec: fixture(slot.worldSpecPath),
      material,
      timeZone: slot.timeZone,
      participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
      placeAffordances: slot.placeAffordances,
      cachePath: null,
    });
  }

  if (!forceNewWorld) {
    const existing = findFixtureWorld({ selector, cohort, materialFixture });
    if (existing) {
      return Object.freeze({
        mode: "fixture",
        selector,
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
    const cached = readCache(repoRoot, selector);
    if (cached) {
      const slot = cohort.slots[baseSlotOrdinal - 1];
      return Object.freeze({
        ...cached,
        slotOrdinal: baseSlotOrdinal,
        genomePath: slot.genomePath,
      });
    }
  }

  const authored = await authorWorld({ selector, modelId, requestId });
  const createdAt = now();
  const built = buildAuthoredWorld({
    selector,
    authored,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    createdAt,
  });
  const path = cachePath(repoRoot, selector);
  const record = {
    cacheVersion: MODERN_WORLD_CACHE_VERSION,
    selector,
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
