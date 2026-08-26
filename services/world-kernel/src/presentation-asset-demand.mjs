import {
  ASSET_KINDS,
  createAssetGenerationJobFromIdentity,
  fibreShortIdCandidates,
  fibreShortIdSuffix,
  fibreShortRef,
  fibreShortRefSuffix,
  normalizeAssetGenerationBrief,
  normalizeAssetGenerationJob,
} from "#services/asset-generator/src/index.mjs";
import {
  assertJsonValue,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const PRESENTATION_ASSET_DEMAND_VERSION = "presentation-asset-demand-v0.1";
export const PRESENTATION_ASSET_RECONCILIATION_VERSION = "presentation-asset-reconciliation-v0.1";

export const PRESENTATION_ASSET_ENTITY_KINDS = Object.freeze([
  "thread", "world", "experience", "place", "memory",
]);
export const PRESENTATION_ASSET_SLOT_STATUSES = Object.freeze([
  "missing", "ready", "unavailable", "deferred",
]);

const DEMAND_STATES = new Set(["pending", "ready", "unavailable", "superseded", "obsolete"]);
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

function uniqueStrings(name, value, { required = false } = {}) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const result = value.map((item, index) => {
    assertNonEmpty(`${name}[${index}]`, item);
    return item;
  });
  if (required && result.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(result).size !== result.length) throw new TypeError(`${name} must be unique`);
  return result;
}

function nullableNonEmpty(name, value) {
  if (value === null) return null;
  assertNonEmpty(name, value);
  return value;
}

function digest(name, value) {
  assertNonEmpty(name, value);
  if (!SHA256_DIGEST.test(value)) throw new TypeError(`${name} must be sha256:<64 lowercase hex>`);
  return value;
}

function normalizeBriefOrNull(value) {
  return value === null ? null : normalizeAssetGenerationBrief(value);
}

export function presentationAssetSourceDigest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

export function normalizePresentationAssetSlot(value) {
  const name = "presentation asset slot";
  assertPlainObject(name, value);
  if (!PRESENTATION_ASSET_ENTITY_KINDS.includes(value.entityKind)) throw new TypeError(`${name}.entityKind is unsupported`);
  if (!ASSET_KINDS.includes(value.assetKind)) throw new TypeError(`${name}.assetKind is unsupported`);
  if (!PRESENTATION_ASSET_SLOT_STATUSES.includes(value.status)) throw new TypeError(`${name}.status is unsupported`);
  assertNonEmpty(`${name}.slotKey`, value.slotKey);
  assertNonEmpty(`${name}.entityRef`, value.entityRef);
  assertNonEmpty(`${name}.mediaId`, value.mediaId);
  assertNonEmpty(`${name}.role`, value.role);
  assertNonEmpty(`${name}.variant`, value.variant);
  const brief = normalizeBriefOrNull(value.brief);
  const deferredReason = nullableNonEmpty(`${name}.deferredReason`, value.deferredReason ?? null);
  const provenanceRef = nullableNonEmpty(`${name}.provenanceRef`, value.provenanceRef ?? null);
  const inputReferences = uniqueStrings(`${name}.inputReferences`, value.inputReferences, { required: true });
  const referenceObjectRefs = uniqueStrings(`${name}.referenceObjectRefs`, value.referenceObjectRefs ?? []);
  const sourceDigest = digest(`${name}.sourceDigest`, value.sourceDigest);
  assertPlainObject(`${name}.context`, value.context);
  assertJsonValue(`${name}.context`, value.context);
  if (value.status === "missing" && brief === null) throw new TypeError(`${name} missing slot requires a generation brief`);
  if (value.status === "deferred" && deferredReason === null) throw new TypeError(`${name} deferred slot requires deferredReason`);
  if (value.status !== "deferred" && deferredReason !== null) throw new TypeError(`${name}.deferredReason is only valid for deferred slots`);
  return Object.freeze({
    slotKey: value.slotKey,
    entityKind: value.entityKind,
    entityRef: value.entityRef,
    mediaId: value.mediaId,
    assetKind: value.assetKind,
    role: value.role,
    variant: value.variant,
    status: value.status,
    brief,
    inputReferences,
    referenceObjectRefs,
    sourceDigest,
    provenanceRef,
    deferredReason,
    context: structuredClone(value.context),
  });
}

export function presentationAssetIdentityValue(slotValue, {
  providerProfile,
  regenerationKey = null,
} = {}) {
  const slot = normalizePresentationAssetSlot(slotValue);
  if (slot.status !== "missing") throw new TypeError("only a missing presentation asset slot has generation identity");
  assertNonEmpty("providerProfile", providerProfile);
  if (regenerationKey !== null) assertNonEmpty("regenerationKey", regenerationKey);
  return Object.freeze({
    slotKey: slot.slotKey,
    entityKind: slot.entityKind,
    entityRef: slot.entityRef,
    mediaId: slot.mediaId,
    assetKind: slot.assetKind,
    role: slot.role,
    variant: slot.variant,
    sourceDigest: slot.sourceDigest,
    brief: slot.brief,
    referenceObjectRefs: slot.referenceObjectRefs,
    providerProfile,
    regenerationKey,
  });
}

export function presentationAssetIdentityDigest(slotValue, options = {}) {
  return presentationAssetSourceDigest(presentationAssetIdentityValue(slotValue, options));
}

function generatedJobSuffix(job, name) {
  const suffix = fibreShortRefSuffix(`${name}.jobId`, job.jobId, "assetjob_");
  if (job.outputObjectRef !== fibreShortRef("asset_", suffix)) throw new TypeError(`${name}.job outputObjectRef does not match jobId`);
  if (job.receiptObjectRef !== fibreShortRef("assetreceipt_", suffix)) throw new TypeError(`${name}.job receiptObjectRef does not match jobId`);
  return suffix;
}

export function normalizePresentationAssetDemand(value) {
  const name = "presentation asset demand";
  assertPlainObject(name, value);
  if (value.demandVersion !== PRESENTATION_ASSET_DEMAND_VERSION) throw new TypeError(`${name}.demandVersion is unsupported`);
  assertNonEmpty(`${name}.demandId`, value.demandId);
  assertNonEmpty(`${name}.slotKey`, value.slotKey);
  const sourceDigest = digest(`${name}.sourceDigest`, value.sourceDigest);
  assertNonEmpty(`${name}.providerProfile`, value.providerProfile);
  if (!DEMAND_STATES.has(value.state)) throw new TypeError(`${name}.state is unsupported`);
  if (typeof value.current !== "boolean") throw new TypeError(`${name}.current must be boolean`);
  const supersedesDemandId = nullableNonEmpty(`${name}.supersedesDemandId`, value.supersedesDemandId ?? null);
  const job = normalizeAssetGenerationJob(value.job);
  const suffix = generatedJobSuffix(job, name);
  if (value.demandId !== fibreShortRef("presassetdemand_", suffix)) throw new TypeError(`${name}.demandId does not match jobId`);
  if (job.providerProfile !== value.providerProfile) throw new TypeError(`${name}.job provider profile does not match demand`);
  return Object.freeze({
    demandVersion: PRESENTATION_ASSET_DEMAND_VERSION,
    demandId: value.demandId,
    slotKey: value.slotKey,
    sourceDigest,
    providerProfile: value.providerProfile,
    state: value.state,
    current: value.current,
    supersedesDemandId,
    job,
  });
}

function currentDemandBySlot(existingDemands) {
  const bySlot = new Map();
  for (const raw of existingDemands) {
    const demand = normalizePresentationAssetDemand(raw);
    if (!demand.current) continue;
    if (bySlot.has(demand.slotKey)) throw new TypeError(`multiple current presentation asset demands for slot ${demand.slotKey}`);
    bySlot.set(demand.slotKey, demand);
  }
  return bySlot;
}

function demandPatch(demand, state, extra = {}) {
  return Object.freeze({ demandId: demand.demandId, slotKey: demand.slotKey, fromState: demand.state, state, current: false, ...extra });
}

function resolveIdentitySuffix(slot, identityDigest, identitySuffixBySlot) {
  const configured = identitySuffixBySlot?.get(slot.slotKey) ?? fibreShortIdSuffix(identityDigest);
  if (!fibreShortIdCandidates(identityDigest).includes(configured)) {
    throw new TypeError(`identity suffix for ${slot.slotKey} is not derived from its semantic identity`);
  }
  return configured;
}

export function reconcilePresentationAssets({
  slots,
  existingDemands = [],
  requestedAt,
  providerProfile = "presentation-image-default-v1",
  regenerationKey = null,
  identitySuffixBySlot = null,
}) {
  if (!Array.isArray(slots)) throw new TypeError("slots must be an array");
  if (identitySuffixBySlot !== null && !(identitySuffixBySlot instanceof Map)) throw new TypeError("identitySuffixBySlot must be a Map or null");
  assertNonEmpty("requestedAt", requestedAt);
  if (!Number.isFinite(Date.parse(requestedAt))) throw new TypeError("requestedAt must be an ISO timestamp");
  assertNonEmpty("providerProfile", providerProfile);
  if (regenerationKey !== null) assertNonEmpty("regenerationKey", regenerationKey);
  const normalizedSlots = slots.map(normalizePresentationAssetSlot);
  const slotKeys = new Set();
  for (const slot of normalizedSlots) {
    if (slotKeys.has(slot.slotKey)) throw new TypeError(`duplicate presentation asset slot ${slot.slotKey}`);
    slotKeys.add(slot.slotKey);
  }
  const currentBySlot = currentDemandBySlot(existingDemands);
  const readySlots = normalizedSlots.filter((slot) => slot.status === "ready");
  const unavailableSlots = normalizedSlots.filter((slot) => slot.status === "unavailable");
  const deferredSlots = normalizedSlots.filter((slot) => slot.status === "deferred");
  const missingSlots = normalizedSlots.filter((slot) => slot.status === "missing");
  const retainedDemands = [];
  const createdDemands = [];
  const supersededDemands = [];
  const obsoleteDemands = [];
  const jobs = [];

  for (const slot of normalizedSlots) {
    const current = currentBySlot.get(slot.slotKey) ?? null;
    if (slot.status !== "missing") {
      if (slot.status === "deferred" && current !== null) obsoleteDemands.push(demandPatch(current, "obsolete", { reason: "slot_no_longer_eligible" }));
      continue;
    }
    const identityDigest = presentationAssetIdentityDigest(slot, { providerProfile, regenerationKey });
    const suffix = resolveIdentitySuffix(slot, identityDigest, identitySuffixBySlot);
    const expectedJobId = fibreShortRef("assetjob_", suffix);
    if (current !== null && current.job.jobId === expectedJobId) {
      retainedDemands.push(current);
      continue;
    }
    const supersedesDemandId = current?.demandId ?? null;
    const job = createAssetGenerationJobFromIdentity({
      identityDigest,
      idSuffix: suffix,
      assetKind: slot.assetKind,
      role: slot.role,
      variant: slot.variant,
      brief: slot.brief,
      inputReferences: slot.inputReferences,
      referenceObjectRefs: slot.referenceObjectRefs,
      requestedAt,
      providerProfile,
      context: slot.context,
    });
    const demand = normalizePresentationAssetDemand({
      demandVersion: PRESENTATION_ASSET_DEMAND_VERSION,
      demandId: fibreShortRef("presassetdemand_", suffix),
      slotKey: slot.slotKey,
      sourceDigest: slot.sourceDigest,
      providerProfile,
      state: "pending",
      current: true,
      supersedesDemandId,
      job,
    });
    createdDemands.push(demand);
    jobs.push(job);
    if (current !== null) supersededDemands.push(demandPatch(current, "superseded", { supersededByDemandId: demand.demandId }));
  }

  for (const [slotKey, current] of currentBySlot) {
    if (!slotKeys.has(slotKey)) obsoleteDemands.push(demandPatch(current, "obsolete", { reason: "slot_removed_from_projection" }));
  }

  return Object.freeze({
    reconciliationVersion: PRESENTATION_ASSET_RECONCILIATION_VERSION,
    requestedAt,
    providerProfile,
    regenerationKey,
    desiredSlots: normalizedSlots,
    readySlots,
    unavailableSlots,
    deferredSlots,
    missingSlots,
    retainedDemands,
    createdDemands,
    supersededDemands,
    obsoleteDemands,
    jobs,
  });
}
