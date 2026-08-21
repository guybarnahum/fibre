import {
  InfraIdempotencyConflictError,
  InfraSequenceConflictError,
} from "./infra-driver.mjs";
import {
  assertInfraFiniteNumber,
  assertInfraId,
  assertInfraJsonValue,
  assertInfraPlainObject,
  infraCanonicalJson,
} from "./internal.mjs";

function assertChannelNamespace(namespace) {
  if (!namespace || typeof namespace.getByName !== "function") {
    throw new TypeError("Cloudflare presentation channel namespace must provide getByName");
  }
  return namespace;
}

function channelStub(namespace, channelId) {
  assertInfraId("channelId", channelId);
  return namespace.getByName(channelId);
}

function parseJson(name, value) {
  if (typeof value !== "string") throw new TypeError(`${name} must be JSON text`);
  let parsed;
  try { parsed = JSON.parse(value); }
  catch { throw new Error(`${name} is invalid JSON`); }
  assertInfraJsonValue(name, parsed);
  return parsed;
}

function translateStreamFailure(result) {
  if (!result || result.ok !== false) return;
  if (result.error === "sequence_conflict") {
    throw new InfraSequenceConflictError(`expected sequence ${result.expectedSequence}, current ${result.currentSequence}`);
  }
  if (result.error === "idempotency_conflict") {
    throw new InfraIdempotencyConflictError("idempotency key reused for different stream value");
  }
  throw new Error(`Cloudflare presentation channel failed: ${result.error ?? "unknown"}`);
}

export function createCloudflareStreamPort(channelNamespace) {
  const namespace = assertChannelNamespace(channelNamespace);
  return Object.freeze({
    async getHead(channelId) {
      const result = await channelStub(namespace, channelId).getHead();
      assertInfraFiniteNumber("stream head sequence", result.sequence, { integer: true, minimum: 0 });
      return {
        sequence: result.sequence,
        snapshotPointer: result.snapshotPointer === null ? null : structuredClone(result.snapshotPointer),
      };
    },

    async append(channelId, value, { idempotencyKey, expectedSequence } = {}) {
      assertInfraJsonValue("stream value", value);
      assertInfraId("idempotencyKey", idempotencyKey);
      if (expectedSequence !== undefined) {
        assertInfraFiniteNumber("expectedSequence", expectedSequence, { integer: true, minimum: 0 });
      }
      const result = await channelStub(namespace, channelId).append({
        valueJson: infraCanonicalJson(value),
        idempotencyKey,
        expectedSequence: expectedSequence ?? null,
      });
      translateStreamFailure(result);
      assertInfraFiniteNumber("accepted stream sequence", result.sequence, { integer: true, minimum: 1 });
      return {
        sequence: result.sequence,
        value: parseJson("accepted stream value", result.valueJson),
        duplicate: result.duplicate === true,
      };
    },

    async readAfter(channelId, sequence, limit = 100) {
      assertInfraFiniteNumber("sequence", sequence, { integer: true, minimum: 0 });
      assertInfraFiniteNumber("limit", limit, { integer: true, minimum: 1 });
      const rows = await channelStub(namespace, channelId).readAfter({ sequence, limit });
      if (!Array.isArray(rows)) throw new TypeError("Cloudflare presentation channel replay must be an array");
      return rows.map((row, index) => {
        assertInfraFiniteNumber(`replay[${index}].sequence`, row.sequence, { integer: true, minimum: 1 });
        return {
          sequence: row.sequence,
          value: parseJson(`replay[${index}].valueJson`, row.valueJson),
        };
      });
    },

    async publishSnapshot(channelId, snapshotPointer, { expectedSequence } = {}) {
      assertInfraPlainObject("snapshotPointer", snapshotPointer);
      assertInfraJsonValue("snapshotPointer", snapshotPointer);
      if (expectedSequence !== undefined) {
        assertInfraFiniteNumber("expectedSequence", expectedSequence, { integer: true, minimum: 0 });
      }
      const result = await channelStub(namespace, channelId).publishSnapshot({
        snapshotPointerJson: infraCanonicalJson(snapshotPointer),
        expectedSequence: expectedSequence ?? null,
      });
      translateStreamFailure(result);
      assertInfraFiniteNumber("snapshot sequence", result.sequence, { integer: true, minimum: 0 });
      return {
        ...parseJson("snapshot pointer", result.snapshotPointerJson),
        sequence: result.sequence,
      };
    },

    async getSnapshotPointer(channelId) {
      const result = await channelStub(namespace, channelId).getSnapshotPointer();
      if (result === null) return null;
      assertInfraFiniteNumber("snapshot sequence", result.sequence, { integer: true, minimum: 0 });
      return {
        ...parseJson("snapshot pointer", result.snapshotPointerJson),
        sequence: result.sequence,
      };
    },
  });
}

export function createCloudflareRealtimePort(channelNamespace) {
  const namespace = assertChannelNamespace(channelNamespace);
  return Object.freeze({
    async publish(channelId, value) {
      assertInfraJsonValue("realtime value", value);
      const result = await channelStub(namespace, channelId).publish({
        valueJson: infraCanonicalJson(value),
      });
      return { delivered: Number.isSafeInteger(result?.delivered) ? result.delivered : null };
    },
  });
}

function assertD1Database(database) {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("Cloudflare D1 catalog binding must provide prepare");
  }
  return database;
}

function d1Changes(result) {
  const changes = result?.meta?.changes;
  return Number.isSafeInteger(changes) ? changes : 0;
}

export function createCloudflareCatalogPort(databaseBinding) {
  const database = assertD1Database(databaseBinding);
  return Object.freeze({
    async upsert(key, value) {
      assertInfraId("catalog key", key);
      assertInfraPlainObject("catalog value", value);
      assertInfraJsonValue("catalog value", value);
      const valueJson = infraCanonicalJson(value);
      await database.prepare(`
        INSERT INTO fibre_catalog (catalog_key, value_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(catalog_key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key, valueJson).run();
      return structuredClone(value);
    },

    async get(key) {
      assertInfraId("catalog key", key);
      const row = await database.prepare(
        "SELECT value_json FROM fibre_catalog WHERE catalog_key = ? LIMIT 1",
      ).bind(key).first();
      if (row === null) return null;
      return parseJson("catalog value", row.value_json);
    },

    async remove(key) {
      assertInfraId("catalog key", key);
      const result = await database.prepare(
        "DELETE FROM fibre_catalog WHERE catalog_key = ?",
      ).bind(key).run();
      return d1Changes(result) > 0;
    },
  });
}
