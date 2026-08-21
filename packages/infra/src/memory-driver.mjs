import { INFRA_DRIVER_VERSION, assertInfraDriver } from "./infra-driver.mjs";
import {
  assertInfraFiniteNumber,
  assertInfraId,
  assertInfraJsonValue,
  assertInfraNonEmpty,
  assertInfraPlainObject,
  infraCanonicalJson,
} from "./internal.mjs";

export class InfraSequenceConflictError extends Error {}
export class InfraIdempotencyConflictError extends Error {}
export class InfraImmutableObjectConflictError extends Error {}

function clone(value) { return structuredClone(value); }
function cloneBytes(value) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return value.slice();
  throw new TypeError("object bytes must be a string or Uint8Array");
}
function sameBytes(left, right) {
  if (typeof left === "string" || typeof right === "string") return left === right;
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

export function createMemoryInfraDriver() {
  const channels = new Map();
  const objects = new Map();
  const catalog = new Map();
  const listeners = new Map();

  function channel(channelId) {
    assertInfraId("channelId", channelId);
    if (!channels.has(channelId)) channels.set(channelId, { entries: [], idempotency: new Map(), snapshotPointer: null });
    return channels.get(channelId);
  }

  const streams = {
    async getHead(channelId) {
      const current = channel(channelId);
      return { sequence: current.entries.length, snapshotPointer: clone(current.snapshotPointer) };
    },
    async append(channelId, value, { idempotencyKey, expectedSequence } = {}) {
      assertInfraJsonValue("stream value", value);
      assertInfraId("idempotencyKey", idempotencyKey);
      const current = channel(channelId);
      const digest = infraCanonicalJson(value);
      const prior = current.idempotency.get(idempotencyKey);
      if (prior) {
        if (prior.digest !== digest) throw new InfraIdempotencyConflictError("idempotency key reused for different stream value");
        return { sequence: prior.sequence, value: clone(prior.value), duplicate: true };
      }
      if (expectedSequence !== undefined) {
        assertInfraFiniteNumber("expectedSequence", expectedSequence, { integer: true, minimum: 0 });
        if (expectedSequence !== current.entries.length) {
          throw new InfraSequenceConflictError(`expected sequence ${expectedSequence}, current ${current.entries.length}`);
        }
      }
      const sequence = current.entries.length + 1;
      const accepted = clone(value);
      current.entries.push({ sequence, value: accepted });
      current.idempotency.set(idempotencyKey, { sequence, digest, value: accepted });
      return { sequence, value: clone(accepted), duplicate: false };
    },
    async readAfter(channelId, sequence, limit = 100) {
      assertInfraFiniteNumber("sequence", sequence, { integer: true, minimum: 0 });
      assertInfraFiniteNumber("limit", limit, { integer: true, minimum: 1 });
      return channel(channelId).entries.filter((entry) => entry.sequence > sequence).slice(0, limit).map(clone);
    },
    async publishSnapshot(channelId, snapshotPointer, { expectedSequence } = {}) {
      assertInfraPlainObject("snapshotPointer", snapshotPointer);
      assertInfraJsonValue("snapshotPointer", snapshotPointer);
      const current = channel(channelId);
      if (expectedSequence !== undefined) {
        assertInfraFiniteNumber("expectedSequence", expectedSequence, { integer: true, minimum: 0 });
        if (expectedSequence !== current.entries.length) {
          throw new InfraSequenceConflictError(`snapshot expected sequence ${expectedSequence}, current ${current.entries.length}`);
        }
      }
      current.snapshotPointer = { ...clone(snapshotPointer), sequence: current.entries.length };
      return clone(current.snapshotPointer);
    },
    async getSnapshotPointer(channelId) {
      return clone(channel(channelId).snapshotPointer);
    },
  };

  const objectPort = {
    async putImmutable(objectRef, bytes, digest, metadata = {}) {
      assertInfraId("objectRef", objectRef);
      assertInfraNonEmpty("digest", digest);
      assertInfraPlainObject("metadata", metadata);
      assertInfraJsonValue("metadata", metadata);
      const copiedBytes = cloneBytes(bytes);
      const prior = objects.get(objectRef);
      if (prior) {
        if (prior.digest !== digest || !sameBytes(prior.bytes, copiedBytes) || infraCanonicalJson(prior.metadata) !== infraCanonicalJson(metadata)) {
          throw new InfraImmutableObjectConflictError(`immutable object ${objectRef} already exists with different content`);
        }
        return { objectRef, digest, duplicate: true };
      }
      objects.set(objectRef, { bytes: copiedBytes, digest, metadata: clone(metadata) });
      return { objectRef, digest, duplicate: false };
    },
    async get(objectRef) {
      assertInfraId("objectRef", objectRef);
      const value = objects.get(objectRef);
      return value ? { bytes: cloneBytes(value.bytes), digest: value.digest, metadata: clone(value.metadata) } : null;
    },
    async head(objectRef) {
      assertInfraId("objectRef", objectRef);
      const value = objects.get(objectRef);
      return value ? { objectRef, digest: value.digest, metadata: clone(value.metadata) } : null;
    },
  };

  const catalogPort = {
    async upsert(key, value) {
      assertInfraId("catalog key", key);
      assertInfraPlainObject("catalog value", value);
      assertInfraJsonValue("catalog value", value);
      catalog.set(key, clone(value));
      return clone(value);
    },
    async get(key) {
      assertInfraId("catalog key", key);
      return catalog.has(key) ? clone(catalog.get(key)) : null;
    },
    async remove(key) {
      assertInfraId("catalog key", key);
      return catalog.delete(key);
    },
  };

  const realtime = {
    async publish(channelId, value) {
      assertInfraId("channelId", channelId);
      assertInfraJsonValue("realtime value", value);
      for (const listener of listeners.get(channelId) ?? []) await listener(clone(value));
    },
    // Test/local extension. It is deliberately not required by the InfraDriver contract.
    async listen(channelId, listener) {
      assertInfraId("channelId", channelId);
      if (typeof listener !== "function") throw new TypeError("realtime listener must be a function");
      const group = listeners.get(channelId) ?? new Set();
      group.add(listener);
      listeners.set(channelId, group);
      return () => {
        group.delete(listener);
        if (group.size === 0) listeners.delete(channelId);
      };
    },
  };

  return assertInfraDriver({
    driverId: "memory-v1",
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: ["streams", "objects", "catalog", "realtime"],
    streams,
    objects: objectPort,
    catalog: catalogPort,
    realtime,
  });
}
