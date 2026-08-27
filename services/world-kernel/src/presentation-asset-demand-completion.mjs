import { requireInfraCapabilities } from "@fibre/infra";
import { normalizePresentationAssetDemand } from "./presentation-asset-demand.mjs";
import {
  normalizePresentationAssetDemandProjection,
  normalizePresentationAssetDemandScope,
  presentationAssetDemandCatalogKey,
} from "./presentation-asset-demand-service.mjs";
import { assertIsoTimestamp, assertNonEmpty } from "./persistence-common.mjs";

function readyDemand(demand) {
  return normalizePresentationAssetDemand({
    ...demand,
    state: "ready",
    current: true,
  });
}

export function createPresentationAssetDemandCompletionStore({ infra } = {}) {
  requireInfraCapabilities(infra, "catalog");

  return Object.freeze({
    async markReady({ scope: rawScope, demandId, jobId, observedAt }) {
      const scope = normalizePresentationAssetDemandScope(rawScope);
      assertNonEmpty("demandId", demandId);
      assertNonEmpty("jobId", jobId);
      assertIsoTimestamp("observedAt", observedAt);
      const key = presentationAssetDemandCatalogKey(scope);
      const stored = await infra.catalog.get(key);
      if (stored === null) throw new Error("presentation asset demand projection is not yet durable");
      const projection = normalizePresentationAssetDemandProjection(stored);
      const index = projection.demands.findIndex((entry) => entry.demand.demandId === demandId);
      if (index < 0) throw new Error("presentation asset demand is missing from its durable projection");
      const entry = projection.demands[index];
      if (entry.demand.job.jobId !== jobId) {
        throw new Error("presentation asset completion job does not match demand job");
      }

      if (entry.demand.state === "ready") {
        return Object.freeze({
          applied: false,
          duplicate: true,
          reason: "already_ready",
          projection,
          demand: entry.demand,
        });
      }
      if (!entry.demand.current || entry.demand.state !== "pending") {
        return Object.freeze({
          applied: false,
          duplicate: false,
          reason: "demand_no_longer_current_pending",
          projection,
          demand: entry.demand,
        });
      }

      const demands = projection.demands.map((candidate, candidateIndex) => (
        candidateIndex === index
          ? { ...candidate, demand: readyDemand(candidate.demand) }
          : candidate
      ));
      const next = normalizePresentationAssetDemandProjection({
        ...projection,
        updatedAt: observedAt,
        demands,
      });
      await infra.catalog.upsert(key, next);
      return Object.freeze({
        applied: true,
        duplicate: false,
        reason: null,
        projection: next,
        demand: next.demands[index].demand,
      });
    },
  });
}
