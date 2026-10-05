import { normalizeAncestry } from "../human-phenotype/ancestry.mjs";
import {
  referencePopulationDependencyChain,
  referencePopulationForPopulationId,
} from "../human-appearance/index.mjs";

function normalizeSide(side, ancestry, calibrationModel=null) {
  const populationForPopulationId=calibrationModel?.populationForPopulationId??referencePopulationForPopulationId;
  const dependencyChain=calibrationModel?.dependencyChain??referencePopulationDependencyChain;
  return normalizeAncestry(ancestry, `${side} physical ancestry`).map((item) => {
    const resolved = populationForPopulationId(
      item.populationId ?? null,
      item.referencePopulation ?? null,
    );
    if (resolved === null) {
      throw new TypeError(`${side} physical ancestry requires a reference population`);
    }
    return Object.freeze({
      side,
      populationId:item.populationId ?? null,
      population:item.population,
      share:item.share,
      requestedReferencePopulation:item.referencePopulation ?? null,
      resolvedReferencePopulation:resolved,
      dependencyChain:dependencyChain(resolved),
    });
  });
}

export function appearanceCalibrationDependencies(physicalAncestry,{calibrationModel=null}={}) {
  if (!physicalAncestry || typeof physicalAncestry !== "object" || Array.isArray(physicalAncestry)) {
    throw new TypeError("physicalAncestry is required");
  }
  return Object.freeze([
    ...normalizeSide("maternal", physicalAncestry.maternal,calibrationModel),
    ...normalizeSide("paternal", physicalAncestry.paternal,calibrationModel),
  ]);
}

function dependencyIdentity(entry) {
  return [
    entry.side,
    entry.populationId ?? "",
    entry.population,
    Number(entry.share).toFixed(12),
  ].join("|");
}

function chainKey(chain) {
  return chain.map(({ id, version }) => `${id}@${version}`).join(">");
}

export function planAppearanceCalibrationMigration({
  storedDependencies = null,
  currentDependencies,
} = {}) {
  if (!Array.isArray(currentDependencies)) {
    throw new TypeError("currentDependencies are required");
  }
  if (storedDependencies === null) {
    return Object.freeze({
      migrationRequired:true,
      reason:"dependency_snapshot_missing",
      changes:Object.freeze(currentDependencies.map((current) => Object.freeze({
        identity:dependencyIdentity(current),
        from:null,
        to:Object.freeze({
          resolvedReferencePopulation:current.resolvedReferencePopulation,
          dependencyChain:current.dependencyChain,
        }),
      }))),
    });
  }
  if (!Array.isArray(storedDependencies)) throw new TypeError("storedDependencies must be an array or null");

  const before = new Map(storedDependencies.map((entry) => [dependencyIdentity(entry), entry]));
  const after = new Map(currentDependencies.map((entry) => [dependencyIdentity(entry), entry]));
  const identities = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes = [];

  for (const identity of identities) {
    const previous = before.get(identity) ?? null;
    const current = after.get(identity) ?? null;
    if (
      previous !== null
      && current !== null
      && previous.resolvedReferencePopulation === current.resolvedReferencePopulation
      && chainKey(previous.dependencyChain ?? []) === chainKey(current.dependencyChain ?? [])
    ) continue;

    changes.push(Object.freeze({
      identity,
      from:previous === null ? null : Object.freeze({
        resolvedReferencePopulation:previous.resolvedReferencePopulation,
        dependencyChain:Object.freeze([...(previous.dependencyChain ?? [])]),
      }),
      to:current === null ? null : Object.freeze({
        resolvedReferencePopulation:current.resolvedReferencePopulation,
        dependencyChain:Object.freeze([...(current.dependencyChain ?? [])]),
      }),
    }));
  }

  return Object.freeze({
    migrationRequired:changes.length > 0,
    reason:changes.length > 0 ? "calibration_dependencies_changed" : "current",
    changes:Object.freeze(changes),
  });
}
