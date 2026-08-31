const PLAN_VERSION = "fibre-genesis-development-plan-v1";

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function assertPlanShape(plan) {
  plain("Genesis development plan", plan);
  if (!Number.isSafeInteger(plan.slot) || plan.slot < 1) throw new TypeError("Genesis development plan slot must be a positive integer");
  nonEmpty("Genesis development plan threadId", plan.threadId);
  nonEmpty("Genesis development plan genesisId", plan.genesisId);
  nonEmpty("Genesis development plan originMode", plan.originMode);
  plain("Genesis development plan worldSpec", plan.worldSpec);
  plain("Genesis development plan genome", plan.genome);
  plain("Genesis development plan roster", plan.roster);
  if (!Array.isArray(plan.windows) || plan.windows.length !== 14) throw new TypeError("Genesis development plan requires fourteen windows");
  plain("Genesis development plan envelopePlan", plan.envelopePlan);
  if (!Array.isArray(plan.envelopePlan.envelopes) || plan.envelopePlan.envelopes.length !== 14) {
    throw new TypeError("Genesis development plan requires fourteen historical envelopes");
  }
  if (!(plan.offersByWindow instanceof Map) || plan.offersByWindow.size !== 14) {
    throw new TypeError("Genesis development plan requires fourteen EventStructure offer sets");
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

export function serializeGenesisDevelopmentPlan(plan) {
  assertPlanShape(plan);
  return Object.freeze({
    planVersion: PLAN_VERSION,
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
  if (!Array.isArray(candidate.offersByWindow) || candidate.offersByWindow.length !== 14) {
    throw new TypeError("serialized Genesis development plan requires fourteen offer-set entries");
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
