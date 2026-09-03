import {
  InfraIdempotencyConflictError,
  InfraSequenceConflictError,
} from "../../infra-driver.mjs";
import {
  assertInfraFiniteNumber,
  assertInfraId,
  assertInfraJsonValue,
  assertInfraPlainObject,
  infraCanonicalJson,
} from "../../internal.mjs";

const D1_WRITE_QUOTA_BACKOFF_MS = 300_000;
const d1WriteCircuitByDatabase = new WeakMap();

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
      if (expectedSequence !== undefined) assertInfraFiniteNumber("expectedSequence", expectedSequence, { integer: true, minimum: 0 });
      const result = await channelStub(namespace, channelId).append({
        valueJson: infraCanonicalJson(value),
        idempotencyKey,
        expectedSequence: expectedSequence ?? null,
      });
      translateStreamFailure(result);
      assertInfraFiniteNumber("accepted stream sequence", result.sequence, { integer: true, minimum: 1 });
      return { sequence: result.sequence, value: parseJson("accepted stream value", result.valueJson), duplicate: result.duplicate === true };
    },
    async readAfter(channelId, sequence, limit = 100) {
      assertInfraFiniteNumber("sequence", sequence, { integer: true, minimum: 0 });
      assertInfraFiniteNumber("limit", limit, { integer: true, minimum: 1 });
      const rows = await channelStub(namespace, channelId).readAfter({ sequence, limit });
      if (!Array.isArray(rows)) throw new TypeError("Cloudflare presentation channel replay must be an array");
      return rows.map((row, index) => {
        assertInfraFiniteNumber(`replay[${index}].sequence`, row.sequence, { integer: true, minimum: 1 });
        const valueJson = typeof row.valueJson === "string" ? row.valueJson : row.value_json;
        return { sequence: row.sequence, value: parseJson(`replay[${index}].valueJson`, valueJson) };
      });
    },
    async publishSnapshot(channelId, snapshotPointer, { expectedSequence } = {}) {
      assertInfraPlainObject("snapshotPointer", snapshotPointer);
      assertInfraJsonValue("snapshotPointer", snapshotPointer);
      if (expectedSequence !== undefined) assertInfraFiniteNumber("expectedSequence", expectedSequence, { integer: true, minimum: 0 });
      const result = await channelStub(namespace, channelId).publishSnapshot({
        snapshotPointerJson: infraCanonicalJson(snapshotPointer),
        expectedSequence: expectedSequence ?? null,
      });
      translateStreamFailure(result);
      assertInfraFiniteNumber("snapshot sequence", result.sequence, { integer: true, minimum: 0 });
      return { ...parseJson("snapshot pointer", result.snapshotPointerJson), sequence: result.sequence };
    },
    async getSnapshotPointer(channelId) {
      const result = await channelStub(namespace, channelId).getSnapshotPointer();
      if (result === null) return null;
      assertInfraFiniteNumber("snapshot sequence", result.sequence, { integer: true, minimum: 0 });
      return { ...parseJson("snapshot pointer", result.snapshotPointerJson), sequence: result.sequence };
    },
  });
}

export function createCloudflareRealtimePort(channelNamespace) {
  const namespace = assertChannelNamespace(channelNamespace);
  return Object.freeze({
    async publish(channelId, value) {
      assertInfraJsonValue("realtime value", value);
      const result = await channelStub(namespace, channelId).publish({ valueJson: infraCanonicalJson(value) });
      return { delivered: Number.isSafeInteger(result?.delivered) ? result.delivered : null };
    },
  });
}

function assertD1Database(database) {
  if (!database || typeof database.prepare !== "function") throw new TypeError("Cloudflare D1 catalog binding must provide prepare");
  return database;
}

function d1Changes(result) {
  const changes = result?.meta?.changes;
  return Number.isSafeInteger(changes) ? changes : 0;
}

function normalizeCatalogListOptions({ prefix = "", after = null, limit = 100 } = {}) {
  if (typeof prefix !== "string") throw new TypeError("catalog list prefix must be a string");
  if (after !== null) assertInfraId("catalog list after", after);
  assertInfraFiniteNumber("catalog list limit", limit, { integer: true, minimum: 1 });
  if (limit > 1000) throw new TypeError("catalog list limit must be <= 1000");
  return { prefix, after, limit };
}

function likePrefix(prefix) {
  return `${prefix.replace(/[\\%_]/g, (value) => `\\${value}`)}%`;
}

function isD1WriteQuotaError(error) {
  const message = error?.message ?? String(error);
  return Number(error?.code) === 7500
    || message.includes("exceeded D1's free tier daily row write limit");
}

function quotaCircuitError(openUntilMs) {
  const error = new Error(`Cloudflare D1 catalog write circuit is open until ${new Date(openUntilMs).toISOString()}`);
  error.name = "CloudflareD1CatalogWriteCircuitOpenError";
  error.code = "D1_WRITE_QUOTA_CIRCUIT_OPEN";
  error.retryable = true;
  error.suppressActivity = true;
  error.retryAfterAt = new Date(openUntilMs).toISOString();
  return error;
}

function assertD1WriteCircuitClosed(database) {
  const openUntilMs = d1WriteCircuitByDatabase.get(database) ?? null;
  if (openUntilMs === null) return;
  if (Date.now() >= openUntilMs) {
    d1WriteCircuitByDatabase.delete(database);
    return;
  }
  throw quotaCircuitError(openUntilMs);
}

function classifyD1WriteFailure(database, error) {
  if (!isD1WriteQuotaError(error)) throw error;
  const openUntilMs = Date.now() + D1_WRITE_QUOTA_BACKOFF_MS;
  d1WriteCircuitByDatabase.set(database, openUntilMs);
  error.code = "D1_WRITE_QUOTA_EXHAUSTED";
  error.retryable = true;
  error.retryAfterAt = new Date(openUntilMs).toISOString();
  throw error;
}

async function runD1Write(database, operation) {
  assertD1WriteCircuitClosed(database);
  try {
    const result = await operation();
    d1WriteCircuitByDatabase.delete(database);
    return result;
  } catch (error) {
    return classifyD1WriteFailure(database, error);
  }
}

export function createCloudflareCatalogPort(databaseBinding) {
  const database = assertD1Database(databaseBinding);
  return Object.freeze({
    async upsert(key, value) {
      assertInfraId("catalog key", key);
      assertInfraPlainObject("catalog value", value);
      assertInfraJsonValue("catalog value", value);
      const valueJson = infraCanonicalJson(value);
      await runD1Write(database, () => database.prepare(`
        INSERT INTO fibre_catalog (catalog_key, value_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(catalog_key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key, valueJson).run());
      return structuredClone(value);
    },
    async get(key) {
      assertInfraId("catalog key", key);
      const row = await database.prepare("SELECT value_json FROM fibre_catalog WHERE catalog_key = ? LIMIT 1").bind(key).first();
      if (row === null) return null;
      return parseJson("catalog value", row.value_json);
    },
    async remove(key) {
      assertInfraId("catalog key", key);
      const result = await runD1Write(database, () => database.prepare("DELETE FROM fibre_catalog WHERE catalog_key = ?").bind(key).run());
      return d1Changes(result) > 0;
    },
    async list(options = {}) {
      const { prefix, after, limit } = normalizeCatalogListOptions(options);
      const result = await database.prepare(`
        SELECT catalog_key, value_json
        FROM fibre_catalog
        WHERE catalog_key LIKE ? ESCAPE '\\'
          AND catalog_key > ?
        ORDER BY catalog_key ASC
        LIMIT ?
      `).bind(likePrefix(prefix), after ?? "", limit + 1).all();
      const rows = Array.isArray(result?.results) ? result.results : [];
      const selected = rows.slice(0, limit);
      return {
        entries: selected.map((row, index) => ({
          key: row.catalog_key,
          value: parseJson(`catalog list[${index}].value_json`, row.value_json),
        })),
        nextCursor: rows.length > limit ? selected.at(-1).catalog_key : null,
      };
    },
  });
}
