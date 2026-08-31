import {
  GENESIS_EVENT_STRUCTURE_POOL_V3,
  buildDeNovoSymbolicGenome,
  buildHistoricalEnvelopePlan,
  canonicalJson,
  normalizeGenesisWorldSpec,
  sampleEventStructuresV3,
  sha256,
} from "fibre/world-kernel/genesis-development-contracts";

export const GENESIS_DEVELOPMENT_REQUEST_VERSION = "fibre-genesis-development-request-v1";
const PLAN_VERSION = "fibre-genesis-development-plan-v2";
const WINDOW_COUNT = 14;
const STRUCTURES_PER_WINDOW = 9;
const HISTORY_START_AGE = 6;
const ENTRY_AGE = 22;

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function exactKeys(name, value, allowed) {
  plain(name, value);
  const keys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) throw new TypeError(`${name}.${key} is not allowed`);
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} is required`);
  }
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function iso(name, value) {
  const normalized = nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(normalized))) throw new TypeError(`${name} must be an ISO timestamp`);
  return normalized;
}

function stringArray(name, value, { minimum = 0 } = {}) {
  if (!Array.isArray(value) || value.length < minimum) throw new TypeError(`${name} must contain at least ${minimum} values`);
  return value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
}

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function validateTimeZone(value) {
  const timeZone = nonEmpty("Genesis development request timeZone", value);
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0)); }
  catch { throw new TypeError(`Genesis development request timeZone ${timeZone} is invalid`); }
  return timeZone;
}

function normalizeParticipant(candidate, index) {
  exactKeys(`Genesis development request participants[${index}]`, candidate, [
    "participantId",
    "factualRoles",
    "relationshipFacts",
  ]);
  const participantId = nonEmpty(`Genesis development request participants[${index}].participantId`, candidate.participantId);
  const factualRoles = stringArray(`Genesis development request participants[${index}].factualRoles`, candidate.factualRoles, { minimum: 1 });
  if (factualRoles.includes("subject")) {
    throw new TypeError("Genesis development request participants must not author the subject participant");
  }
  return Object.freeze({
    participantId,
    factualRoles: Object.freeze(factualRoles),
    relationshipFacts: Object.freeze(stringArray(
      `Genesis development request participants[${index}].relationshipFacts`,
      candidate.relationshipFacts,
      { minimum: 1 },
    )),
  });
}

function normalizePlaceAffordance(candidate, index) {
  exactKeys(`Genesis development request placeAffordances[${index}]`, candidate, [
    "placeRef",
    "placeKind",
    "ordinaryCounterpartRoles",
  ]);
  return Object.freeze({
    placeRef: nonEmpty(`Genesis development request placeAffordances[${index}].placeRef`, candidate.placeRef),
    placeKind: nonEmpty(`Genesis development request placeAffordances[${index}].placeKind`, candidate.placeKind),
    ordinaryCounterpartRoles: Object.freeze(stringArray(
      `Genesis development request placeAffordances[${index}].ordinaryCounterpartRoles`,
      candidate.ordinaryCounterpartRoles,
    )),
  });
}

function assertYoungAdultChronology(bornAt, chronologyEndsAt) {
  const expected = new Date(bornAt);
  expected.setUTCFullYear(expected.getUTCFullYear() + ENTRY_AGE);
  if (expected.toISOString() !== new Date(chronologyEndsAt).toISOString()) {
    throw new TypeError("Genesis development request chronology must end on the subject's 22nd UTC-calendar birthday");
  }
}

export function normalizeGenesisDevelopmentRequest(candidate) {
  exactKeys("Genesis development request", candidate, [
    "requestVersion",
    "requestId",
    "requestedAt",
    "worldSpec",
    "genomeValues",
    "participants",
    "placeAffordances",
    "bornAt",
    "chronologyEndsAt",
    "timeZone",
  ]);
  if (candidate.requestVersion !== GENESIS_DEVELOPMENT_REQUEST_VERSION) {
    throw new TypeError(`unsupported Genesis development request version ${String(candidate.requestVersion)}`);
  }
  const requestId = nonEmpty("Genesis development request requestId", candidate.requestId);
  const requestedAt = iso("Genesis development request requestedAt", candidate.requestedAt);
  const bornAt = iso("Genesis development request bornAt", candidate.bornAt);
  const chronologyEndsAt = iso("Genesis development request chronologyEndsAt", candidate.chronologyEndsAt);
  assertYoungAdultChronology(bornAt, chronologyEndsAt);
  if (Date.parse(requestedAt) < Date.parse(chronologyEndsAt)) {
    throw new TypeError("Genesis development request requestedAt must not precede the generated chronology");
  }
  const worldSpec = normalizeGenesisWorldSpec(candidate.worldSpec);
  if (new Date(worldSpec.timeFrame.startAt).toISOString() !== new Date(bornAt).toISOString()) {
    throw new TypeError("Genesis development request WorldSpec must begin at bornAt");
  }
  if (new Date(worldSpec.timeFrame.endAt).toISOString() !== new Date(chronologyEndsAt).toISOString()) {
    throw new TypeError("Genesis development request WorldSpec must end at chronologyEndsAt");
  }
  const genomeValues = stringArray("Genesis development request genomeValues", candidate.genomeValues, { minimum: 2 });
  if (!Array.isArray(candidate.participants) || candidate.participants.length === 0) {
    throw new TypeError("Genesis development request participants must be a non-empty array");
  }
  if (!Array.isArray(candidate.placeAffordances) || candidate.placeAffordances.length !== worldSpec.places.length) {
    throw new TypeError("Genesis development request placeAffordances must cover every WorldSpec place exactly once");
  }
  const participants = candidate.participants.map(normalizeParticipant);
  if (new Set(participants.map((item) => item.participantId)).size !== participants.length) {
    throw new TypeError("Genesis development request participant IDs must be unique");
  }
  const placeAffordances = candidate.placeAffordances.map(normalizePlaceAffordance);
  if (new Set(placeAffordances.map((item) => item.placeRef)).size !== placeAffordances.length) {
    throw new TypeError("Genesis development request placeAffordances must not repeat a place");
  }
  return Object.freeze({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec,
    genomeValues: Object.freeze(genomeValues),
    participants: Object.freeze(participants),
    placeAffordances: Object.freeze(placeAffordances),
    bornAt,
    chronologyEndsAt,
    timeZone: validateTimeZone(candidate.timeZone),
  });
}

function identities(request) {
  const threadHash = sha256(canonicalJson({
    policy: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    kind: "thread",
    requestId: request.requestId,
  }));
  const genesisHash = sha256(canonicalJson({
    policy: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    kind: "genesis",
    requestId: request.requestId,
  }));
  return Object.freeze({
    threadId: `thr_${threadHash.slice(0, 40)}`,
    genesisId: `genesis_${genesisHash.slice(0, 40)}`,
  });
}

function historyStartAt(bornAt) {
  const start = new Date(bornAt);
  start.setUTCFullYear(start.getUTCFullYear() + HISTORY_START_AGE);
  return start.getTime();
}

function developmentalWindows({ bornAt, chronologyEndsAt }) {
  const startMs = historyStartAt(bornAt);
  const endMs = Date.parse(chronologyEndsAt) - 1;
  if (endMs <= startMs) throw new TypeError("Genesis development chronology does not contain the required prior-life span");
  const span = endMs - startMs + 1;
  return Object.freeze(Array.from({ length: WINDOW_COUNT }, (_, index) => {
    const startAtMs = startMs + Math.floor((span * index) / WINDOW_COUNT);
    const nextStartMs = index === WINDOW_COUNT - 1
      ? endMs + 1
      : startMs + Math.floor((span * (index + 1)) / WINDOW_COUNT);
    const minAge = index === 0
      ? HISTORY_START_AGE
      : Number((HISTORY_START_AGE + (index * (ENTRY_AGE - HISTORY_START_AGE)) / WINDOW_COUNT).toFixed(4));
    const maxAge = index === WINDOW_COUNT - 1
      ? ENTRY_AGE - 0.0001
      : Number((HISTORY_START_AGE + ((index + 1) * (ENTRY_AGE - HISTORY_START_AGE)) / WINDOW_COUNT - 0.0001).toFixed(4));
    return Object.freeze({
      ordinal: index + 1,
      windowId: `life_${String(index + 1).padStart(2, "0")}`,
      startAt: new Date(startAtMs).toISOString(),
      endAt: new Date(nextStartMs - 1).toISOString(),
      minAge,
      maxAge,
    });
  }));
}

function buildOffers(windows, seedDomain) {
  const offersByWindow = new Map();
  for (const window of windows) {
    offersByWindow.set(window.windowId, sampleEventStructuresV3(
      GENESIS_EVENT_STRUCTURE_POOL_V3,
      window,
      { seed: `${seedDomain}:structures:${window.windowId}`, count: STRUCTURES_PER_WINDOW },
    ));
  }
  return offersByWindow;
}

function assertPlanShape(plan) {
  plain("Genesis development plan", plan);
  nonEmpty("Genesis development plan requestId", plan.requestId);
  nonEmpty("Genesis development plan requestDigest", plan.requestDigest);
  if (!Number.isSafeInteger(plan.slot) || plan.slot < 1) throw new TypeError("Genesis development plan slot must be a positive integer");
  nonEmpty("Genesis development plan threadId", plan.threadId);
  nonEmpty("Genesis development plan genesisId", plan.genesisId);
  nonEmpty("Genesis development plan originMode", plan.originMode);
  plain("Genesis development plan worldSpec", plan.worldSpec);
  plain("Genesis development plan genome", plan.genome);
  plain("Genesis development plan roster", plan.roster);
  if (!Array.isArray(plan.windows) || plan.windows.length !== WINDOW_COUNT) throw new TypeError(`Genesis development plan requires ${WINDOW_COUNT} windows`);
  plain("Genesis development plan envelopePlan", plan.envelopePlan);
  if (!Array.isArray(plan.envelopePlan.envelopes) || plan.envelopePlan.envelopes.length !== WINDOW_COUNT) {
    throw new TypeError(`Genesis development plan requires ${WINDOW_COUNT} historical envelopes`);
  }
  if (!(plan.offersByWindow instanceof Map) || plan.offersByWindow.size !== WINDOW_COUNT) {
    throw new TypeError(`Genesis development plan requires ${WINDOW_COUNT} EventStructure offer sets`);
  }
  for (const window of plan.windows) {
    nonEmpty("Genesis development windowId", window?.windowId);
    const offers = plan.offersByWindow.get(window.windowId);
    if (!Array.isArray(offers) || offers.length < 8) {
      throw new TypeError(`Genesis development window ${window.windowId} requires at least eight offers`);
    }
  }
  nonEmpty("Genesis development plan freshModelRequestDomain", plan.freshModelRequestDomain);
  nonEmpty("Genesis development plan bornAt", plan.bornAt);
  nonEmpty("Genesis development plan chronologyEndsAt", plan.chronologyEndsAt);
  return plan;
}

export function buildGenesisDevelopmentPlan(candidate) {
  const request = normalizeGenesisDevelopmentRequest(candidate);
  const requestDigest = digest(request);
  const { threadId, genesisId } = identities(request);
  const worldSpec = request.worldSpec;
  const worldSpecDigest = digest(worldSpec);
  const genome = buildDeNovoSymbolicGenome({
    threadId,
    genesisId,
    values: request.genomeValues,
    createdAt: request.requestedAt,
  });
  const roster = Object.freeze({
    slot: 1,
    worldSpecId: worldSpec.worldSpecId,
    threadId,
    participants: Object.freeze([
      Object.freeze({
        participantId: threadId,
        factualRoles: Object.freeze(["subject"]),
        relationshipFacts: Object.freeze(["This is the provisional Thread whose prior life Fibre is generating."]),
      }),
      ...request.participants.map((participant) => structuredClone(participant)),
    ]),
  });
  const windows = developmentalWindows(request);
  const seedDomain = `genesis-development:${sha256(canonicalJson({ requestId: request.requestId, requestDigest }))}`;
  const offersByWindow = buildOffers(windows, seedDomain);
  const envelopePlan = buildHistoricalEnvelopePlan({
    subject: { provisionalThreadId: threadId, bornAt: request.bornAt },
    worldSpec,
    windows,
    offersByWindow,
    initialRoster: roster.participants,
    placeAffordances: request.placeAffordances,
    timeZone: request.timeZone,
    seedDomain: `${seedDomain}:historical-envelopes`,
  });
  return Object.freeze(assertPlanShape({
    requestId: request.requestId,
    requestDigest,
    slot: 1,
    threadId,
    genesisId,
    originMode: "de_novo",
    worldSpec,
    worldSpecDigest,
    genome,
    genomeDigest: genome.genomeDigest,
    parentGenomes: Object.freeze([]),
    roster,
    windows,
    offersByWindow,
    envelopePlan,
    freshModelRequestDomain: `${seedDomain}:model`,
    bornAt: request.bornAt,
    chronologyEndsAt: request.chronologyEndsAt,
    timeZone: request.timeZone,
  }));
}

export function serializeGenesisDevelopmentPlan(plan) {
  assertPlanShape(plan);
  return Object.freeze({
    planVersion: PLAN_VERSION,
    requestId: plan.requestId,
    requestDigest: plan.requestDigest,
    slot: plan.slot,
    threadId: plan.threadId,
    genesisId: plan.genesisId,
    originMode: plan.originMode,
    worldSpec: structuredClone(plan.worldSpec),
    worldSpecDigest: plan.worldSpecDigest,
    genome: structuredClone(plan.genome),
    genomeDigest: plan.genomeDigest,
    parentGenomes: structuredClone(plan.parentGenomes ?? []),
    roster: structuredClone(plan.roster),
    windows: structuredClone(plan.windows),
    offersByWindow: Object.freeze([...plan.offersByWindow.entries()].map(([windowId, offers]) => Object.freeze([
      windowId,
      structuredClone(offers),
    ]))),
    envelopePlan: structuredClone(plan.envelopePlan),
    freshModelRequestDomain: plan.freshModelRequestDomain,
    bornAt: plan.bornAt,
    chronologyEndsAt: plan.chronologyEndsAt,
    timeZone: plan.timeZone ?? null,
  });
}

export function hydrateGenesisDevelopmentPlan(candidate) {
  plain("serialized Genesis development plan", candidate);
  if (candidate.planVersion !== PLAN_VERSION) {
    throw new TypeError(`unsupported Genesis development plan version ${String(candidate.planVersion)}`);
  }
  if (!Array.isArray(candidate.offersByWindow) || candidate.offersByWindow.length !== WINDOW_COUNT) {
    throw new TypeError(`serialized Genesis development plan requires ${WINDOW_COUNT} offer-set entries`);
  }
  const offersByWindow = new Map();
  for (const entry of candidate.offersByWindow) {
    if (!Array.isArray(entry) || entry.length !== 2) throw new TypeError("serialized offer-set entry must be [windowId, offers]");
    const [windowId, offers] = entry;
    nonEmpty("serialized Genesis development offer windowId", windowId);
    if (offersByWindow.has(windowId)) throw new TypeError(`duplicate Genesis development offer window ${windowId}`);
    if (!Array.isArray(offers)) throw new TypeError(`Genesis development offers for ${windowId} must be an array`);
    offersByWindow.set(windowId, structuredClone(offers));
  }
  const plan = {
    requestId: candidate.requestId,
    requestDigest: candidate.requestDigest,
    slot: candidate.slot,
    threadId: candidate.threadId,
    genesisId: candidate.genesisId,
    originMode: candidate.originMode,
    worldSpec: structuredClone(candidate.worldSpec),
    worldSpecDigest: candidate.worldSpecDigest,
    genome: structuredClone(candidate.genome),
    genomeDigest: candidate.genomeDigest,
    parentGenomes: structuredClone(candidate.parentGenomes ?? []),
    roster: structuredClone(candidate.roster),
    windows: structuredClone(candidate.windows),
    offersByWindow,
    envelopePlan: structuredClone(candidate.envelopePlan),
    freshModelRequestDomain: candidate.freshModelRequestDomain,
    bornAt: candidate.bornAt,
    chronologyEndsAt: candidate.chronologyEndsAt,
    timeZone: candidate.timeZone ?? null,
  };
  return Object.freeze(assertPlanShape(plan));
}

export { PLAN_VERSION as GENESIS_DEVELOPMENT_PLAN_VERSION };
