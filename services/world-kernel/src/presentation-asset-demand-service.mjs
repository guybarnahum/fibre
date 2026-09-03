import {
  createAssetGenerationService,
  fibreShortIdCandidates,
  fibreShortRef,
} from "#services/asset-generator/src/index.mjs";
import {
  InfraImmutableObjectConflictError,
  requireInfraCapabilities,
} from "#infra";
import {
  assertExactKeys,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  PRESENTATION_ASSET_DEMAND_VERSION,
  normalizePresentationAssetDemand,
  normalizePresentationAssetSlot,
  presentationAssetIdentityDigest,
  presentationAssetIdentityValue,
  reconcilePresentationAssets,
} from "./presentation-asset-demand.mjs";

export const PRESENTATION_ASSET_DEMAND_PROJECTION_VERSION = "presentation-asset-demand-projection-v0.1";
export const PRESENTATION_ASSET_DEMAND_SCOPE_KINDS = Object.freeze(["thread", "world", "experience"]);

function nullableText(name, value) {
  if (value === null) return null;
  assertNonEmpty(name, value);
  return value;
}

export function normalizePresentationAssetDemandScope(value) {
  const name = "presentation asset demand scope";
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["entityKind", "entityRef"]);
  if (!PRESENTATION_ASSET_DEMAND_SCOPE_KINDS.includes(value.entityKind)) throw new TypeError(`${name}.entityKind is unsupported`);
  assertNonEmpty(`${name}.entityRef`, value.entityRef);
  return Object.freeze({ entityKind: value.entityKind, entityRef: value.entityRef });
}

function normalizeDispatch(value) {
  if (value === null) return null;
  const name = "presentation asset demand dispatch";
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["workflowName", "instanceId", "workflowStatus", "duplicate", "observedAt"]);
  assertNonEmpty(`${name}.workflowName`, value.workflowName);
  assertNonEmpty(`${name}.instanceId`, value.instanceId);
  assertNonEmpty(`${name}.workflowStatus`, value.workflowStatus);
  if (typeof value.duplicate !== "boolean") throw new TypeError(`${name}.duplicate must be boolean`);
  assertIsoTimestamp(`${name}.observedAt`, value.observedAt);
  return Object.freeze({ ...value });
}

function normalizeDemandEntry(value) {
  const name = "presentation asset demand projection entry";
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["demand", "dispatch", "supersededByDemandId", "obsoleteReason"]);
  const demand = normalizePresentationAssetDemand(value.demand);
  const dispatch = normalizeDispatch(value.dispatch);
  const supersededByDemandId = nullableText(`${name}.supersededByDemandId`, value.supersededByDemandId);
  const obsoleteReason = nullableText(`${name}.obsoleteReason`, value.obsoleteReason);
  if (demand.state === "superseded" && supersededByDemandId === null) throw new TypeError(`${name} superseded demand requires supersededByDemandId`);
  if (demand.state !== "superseded" && supersededByDemandId !== null) throw new TypeError(`${name}.supersededByDemandId is only valid for superseded demand`);
  if (demand.state === "obsolete" && obsoleteReason === null) throw new TypeError(`${name} obsolete demand requires obsoleteReason`);
  if (demand.state !== "obsolete" && obsoleteReason !== null) throw new TypeError(`${name}.obsoleteReason is only valid for obsolete demand`);
  return Object.freeze({ demand, dispatch, supersededByDemandId, obsoleteReason });
}

export function presentationAssetDemandCatalogKey(scopeValue) {
  const scope = normalizePresentationAssetDemandScope(scopeValue);
  return `presentationassetdemand_${sha256(canonicalJson(scope))}`;
}

export function normalizePresentationAssetDemandProjection(value) {
  const name = "presentation asset demand projection";
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["projectionVersion", "scope", "providerProfile", "regenerationKey", "updatedAt", "demands"]);
  if (value.projectionVersion !== PRESENTATION_ASSET_DEMAND_PROJECTION_VERSION) throw new TypeError(`${name}.projectionVersion is unsupported`);
  const scope = normalizePresentationAssetDemandScope(value.scope);
  assertNonEmpty(`${name}.providerProfile`, value.providerProfile);
  const regenerationKey = nullableText(`${name}.regenerationKey`, value.regenerationKey);
  assertIsoTimestamp(`${name}.updatedAt`, value.updatedAt);
  if (!Array.isArray(value.demands)) throw new TypeError(`${name}.demands must be an array`);
  const demands = value.demands.map(normalizeDemandEntry);
  const demandIds = new Set();
  const currentSlots = new Set();
  for (const entry of demands) {
    const { demand } = entry;
    if (demandIds.has(demand.demandId)) throw new TypeError(`${name} contains duplicate demandId ${demand.demandId}`);
    demandIds.add(demand.demandId);
    if (demand.current) {
      if (currentSlots.has(demand.slotKey)) throw new TypeError(`${name} contains multiple current demands for ${demand.slotKey}`);
      currentSlots.add(demand.slotKey);
    }
  }
  return Object.freeze({
    projectionVersion: PRESENTATION_ASSET_DEMAND_PROJECTION_VERSION,
    scope,
    providerProfile: value.providerProfile,
    regenerationKey,
    updatedAt: value.updatedAt,
    demands: Object.freeze(demands),
  });
}

function emptyProjection({ scope, providerProfile, regenerationKey, updatedAt }) {
  return normalizePresentationAssetDemandProjection({
    projectionVersion: PRESENTATION_ASSET_DEMAND_PROJECTION_VERSION,
    scope,
    providerProfile,
    regenerationKey,
    updatedAt,
    demands: [],
  });
}

function dispatchWitness(instance, observedAt) {
  return normalizeDispatch({
    workflowName: instance.workflowName,
    instanceId: instance.instanceId,
    workflowStatus: instance.status,
    duplicate: instance.duplicate === true,
    observedAt,
  });
}

function refreshWitness(status, prior, observedAt) {
  if (status === null) return prior;
  if (prior !== null
    && prior !== undefined
    && prior.workflowName === status.workflowName
    && prior.instanceId === status.instanceId
    && prior.workflowStatus === status.status) {
    return prior;
  }
  return normalizeDispatch({
    workflowName: status.workflowName,
    instanceId: status.instanceId,
    workflowStatus: status.status,
    duplicate: prior?.duplicate === true,
    observedAt,
  });
}

function transitionedDemand(demand, patch) {
  return normalizePresentationAssetDemand({ ...demand, state: patch.state, current: patch.current });
}

function projectionSemanticValue(value) {
  return {
    projectionVersion: value.projectionVersion,
    scope: value.scope,
    providerProfile: value.providerProfile,
    regenerationKey: value.regenerationKey,
    demands: value.demands,
  };
}

function projectionSemanticallyEqual(left, right) {
  return canonicalJson(projectionSemanticValue(left)) === canonicalJson(projectionSemanticValue(right));
}

function buildNextProjection({ priorProjection, reconciliation, dispatchByDemandId, observedAt, scope, providerProfile, regenerationKey }) {
  const superseded = new Map(reconciliation.supersededDemands.map((patch) => [patch.demandId, patch]));
  const obsolete = new Map(reconciliation.obsoleteDemands.map((patch) => [patch.demandId, patch]));
  const retainedIds = new Set(reconciliation.retainedDemands.map((demand) => demand.demandId));
  const entries = priorProjection.demands.map((entry) => {
    const supersededPatch = superseded.get(entry.demand.demandId);
    if (supersededPatch) {
      return normalizeDemandEntry({
        demand: transitionedDemand(entry.demand, supersededPatch),
        dispatch: entry.dispatch,
        supersededByDemandId: supersededPatch.supersededByDemandId,
        obsoleteReason: null,
      });
    }
    const obsoletePatch = obsolete.get(entry.demand.demandId);
    if (obsoletePatch) {
      return normalizeDemandEntry({
        demand: transitionedDemand(entry.demand, obsoletePatch),
        dispatch: entry.dispatch,
        supersededByDemandId: null,
        obsoleteReason: obsoletePatch.reason,
      });
    }
    if (retainedIds.has(entry.demand.demandId)) {
      return normalizeDemandEntry({ ...entry, dispatch: dispatchByDemandId.get(entry.demand.demandId) ?? entry.dispatch });
    }
    return entry;
  });
  for (const demand of reconciliation.createdDemands) {
    entries.push(normalizeDemandEntry({
      demand,
      dispatch: dispatchByDemandId.get(demand.demandId) ?? null,
      supersededByDemandId: null,
      obsoleteReason: null,
    }));
  }
  return normalizePresentationAssetDemandProjection({
    projectionVersion: PRESENTATION_ASSET_DEMAND_PROJECTION_VERSION,
    scope,
    providerProfile,
    regenerationKey,
    updatedAt: observedAt,
    demands: entries,
  });
}

async function reserveShortGenerationId({ infra, slot, providerProfile, regenerationKey }) {
  const identityValue = presentationAssetIdentityValue(slot, { providerProfile, regenerationKey });
  const serialized = canonicalJson(identityValue);
  const identityDigest = presentationAssetIdentityDigest(slot, { providerProfile, regenerationKey });
  for (const suffix of fibreShortIdCandidates(identityDigest)) {
    const objectRef = fibreShortRef("assetidentity_", suffix);
    try {
      await infra.objects.putImmutable(objectRef, serialized, identityDigest, {
        kind: "asset_generation_identity_reservation",
      });
      return suffix;
    } catch (error) {
      if (error instanceof InfraImmutableObjectConflictError) continue;
      throw error;
    }
  }
  throw new Error(`unable to reserve a collision-free 12-hex asset generation id for ${slot.slotKey}`);
}

export function createPresentationAssetDemandService({ infra, workflowName = "asset_generation_v1" } = {}) {
  requireInfraCapabilities(infra, "catalog", "objects", "workflows");
  assertNonEmpty("workflowName", workflowName);
  const assetGeneration = createAssetGenerationService({ infra, workflowName });

  return Object.freeze({
    async get(scopeValue) {
      const scope = normalizePresentationAssetDemandScope(scopeValue);
      const stored = await infra.catalog.get(presentationAssetDemandCatalogKey(scope));
      return stored === null ? null : normalizePresentationAssetDemandProjection(stored);
    },

    async reconcile({ scope: rawScope, slots, requestedAt, providerProfile = "presentation-image-default-v1", regenerationKey = null }) {
      const scope = normalizePresentationAssetDemandScope(rawScope);
      assertIsoTimestamp("requestedAt", requestedAt);
      assertNonEmpty("providerProfile", providerProfile);
      if (regenerationKey !== null) assertNonEmpty("regenerationKey", regenerationKey);
      const catalogKey = presentationAssetDemandCatalogKey(scope);
      const stored = await infra.catalog.get(catalogKey);
      const priorProjection = stored === null
        ? emptyProjection({ scope, providerProfile, regenerationKey, updatedAt: requestedAt })
        : normalizePresentationAssetDemandProjection(stored);
      if (canonicalJson(priorProjection.scope) !== canonicalJson(scope)) throw new Error("presentation asset demand catalog key resolved to a different scope");

      // A non-null regeneration key is an explicit generation-epoch advance.
      // Ordinary reconciliation passes null and must inherit the currently persisted
      // epoch; otherwise the next World sweep would supersede a recovered demand
      // back to the pre-recovery null identity and churn forever.
      const effectiveRegenerationKey = regenerationKey ?? priorProjection.regenerationKey;

      const normalizedSlots = slots.map(normalizePresentationAssetSlot);
      const identitySuffixBySlot = new Map();
      for (const slot of normalizedSlots) {
        if (slot.status !== "missing") continue;
        identitySuffixBySlot.set(slot.slotKey, await reserveShortGenerationId({
          infra,
          slot,
          providerProfile,
          regenerationKey: effectiveRegenerationKey,
        }));
      }

      const reconciliation = reconcilePresentationAssets({
        slots: normalizedSlots,
        existingDemands: priorProjection.demands.map((entry) => entry.demand),
        requestedAt,
        providerProfile,
        regenerationKey: effectiveRegenerationKey,
        identitySuffixBySlot,
      });
      const dispatchByDemandId = new Map();

      for (const demand of reconciliation.createdDemands) {
        const scheduled = await assetGeneration.request(demand.job);
        dispatchByDemandId.set(demand.demandId, dispatchWitness(scheduled.instance, requestedAt));
      }

      for (const demand of reconciliation.retainedDemands) {
        if (demand.state !== "pending") continue;
        const priorEntry = priorProjection.demands.find((entry) => entry.demand.demandId === demand.demandId);
        const status = await assetGeneration.status(demand.job.jobId);
        if (status === null) {
          const scheduled = await assetGeneration.request(demand.job);
          dispatchByDemandId.set(demand.demandId, dispatchWitness(scheduled.instance, requestedAt));
        } else {
          const witness = refreshWitness(status, priorEntry?.dispatch ?? null, requestedAt);
          if (witness !== null) dispatchByDemandId.set(demand.demandId, witness);
        }
      }

      const candidateProjection = buildNextProjection({
        priorProjection,
        reconciliation,
        dispatchByDemandId,
        observedAt: requestedAt,
        scope,
        providerProfile,
        regenerationKey: effectiveRegenerationKey,
      });
      const changed = stored === null || !projectionSemanticallyEqual(priorProjection, candidateProjection);
      const projection = changed ? candidateProjection : priorProjection;
      if (changed) await infra.catalog.upsert(catalogKey, projection);
      return Object.freeze({
        projection,
        catalogKey,
        changed,
        reconciliation,
        dispatches: Object.freeze([...dispatchByDemandId.entries()].map(([demandId, dispatch]) => ({ demandId, dispatch }))),
      });
    },
  });
}

export function assertPresentationAssetDemandProjectionUsesCurrentVersion(value) {
  const projection = normalizePresentationAssetDemandProjection(value);
  for (const entry of projection.demands) {
    if (entry.demand.demandVersion !== PRESENTATION_ASSET_DEMAND_VERSION) {
      throw new TypeError("presentation asset demand projection contains unsupported demand version");
    }
  }
  return projection;
}
