import { infraCanonicalJson } from "../../internal.mjs";
import {
  ActivityTelemetryIdempotencyConflictError,
  TELEMETRY_VERSION,
  normalizeActivityQuery,
  normalizeActivityRecord,
} from "../../telemetry.mjs";

function clone(value) {
  return structuredClone(value);
}

function matches(record, query) {
  for (const [key, value] of Object.entries(query)) {
    if (record[key] !== value) return false;
  }
  return true;
}

export function createLocalActivityTelemetryPort() {
  const byId = new Map();
  const order = [];

  async function record(candidate) {
    const normalized = normalizeActivityRecord(candidate);
    const canonical = infraCanonicalJson(normalized);
    const existing = byId.get(normalized.activityId);
    if (existing !== undefined) {
      if (existing.canonical !== canonical) {
        throw new ActivityTelemetryIdempotencyConflictError(
          `activity ${normalized.activityId} was already recorded with different content`,
        );
      }
      return clone(existing.record);
    }

    const stored = clone(normalized);
    byId.set(normalized.activityId, { record: stored, canonical, ordinal: order.length });
    order.push(normalized.activityId);
    return clone(stored);
  }

  async function query(candidate = {}) {
    const normalizedQuery = normalizeActivityQuery(candidate);
    const selected = order
      .map((activityId) => byId.get(activityId))
      .filter((entry) => matches(entry.record, normalizedQuery))
      .sort((left, right) => {
        const occurred = left.record.occurredAt.localeCompare(right.record.occurredAt);
        if (occurred !== 0) return occurred;
        const recorded = left.record.recordedAt.localeCompare(right.record.recordedAt);
        if (recorded !== 0) return recorded;
        return left.ordinal - right.ordinal;
      })
      .map((entry) => clone(entry.record));
    return Object.freeze(selected);
  }

  return Object.freeze({
    telemetryVersion: TELEMETRY_VERSION,
    record,
    query,
  });
}
