import { openBirthStateDatabase } from "../birth-state-storage.mjs";
import {
  canonicalDigest,
  canonicalJson,
  rawTextDigest,
  sha256,
} from "../state-codec.mjs";

export const DURABLE_MODEL_INVOCATION_JOURNAL_VERSION = "fibre-durable-model-invocation-journal-v1";

export class DurableInvocationConflictError extends Error {}
export class DurableInvocationIntegrityError extends Error {}

function assertAdapter(adapter) {
  if (adapter === null || typeof adapter?.invoke !== "function") {
    throw new TypeError("durable model adapter requires a base adapter with invoke()");
  }
  if (typeof adapter.provider !== "string" || adapter.provider.trim() === "") {
    throw new TypeError("durable model adapter requires base provider");
  }
  if (typeof adapter.modelId !== "string" || adapter.modelId.trim() === "") {
    throw new TypeError("durable model adapter requires base modelId");
  }
  if (adapter.configuration === null || typeof adapter.configuration !== "object" || Array.isArray(adapter.configuration)) {
    throw new TypeError("durable model adapter requires base configuration");
  }
}

function assertInvocationArgs(args) {
  if (args === null || typeof args !== "object" || Array.isArray(args)) throw new TypeError("model invocation args must be an object");
  if (typeof args.clientRequestId !== "string" || args.clientRequestId.trim() === "") throw new TypeError("model clientRequestId is required");
  if (typeof args.systemPrompt !== "string" || args.systemPrompt.trim() === "") throw new TypeError("model systemPrompt is required");
  if (args.input === null || typeof args.input !== "object" || Array.isArray(args.input)) throw new TypeError("model input must be an object");
  if (args.responseSchema === null || typeof args.responseSchema !== "object" || Array.isArray(args.responseSchema)) throw new TypeError("model responseSchema must be an object");
}

export function durableInvocationRequestWitness(adapter, args) {
  assertAdapter(adapter);
  assertInvocationArgs(args);
  const witness = {
    clientRequestId: args.clientRequestId,
    provider: adapter.provider,
    modelId: adapter.modelId,
    configurationDigest: canonicalDigest(adapter.configuration),
    promptRawHash: rawTextDigest(args.systemPrompt),
    promptCanonicalJsonHash: canonicalDigest(args.systemPrompt),
    inputDigest: canonicalDigest(args.input),
    responseSchemaDigest: canonicalDigest(args.responseSchema),
  };
  return Object.freeze({ ...witness, requestDigest: canonicalDigest(witness) });
}

function normalizeStoredRecord(candidate) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new DurableInvocationIntegrityError("durable invocation journal record must be an object");
  }
  const { recordDigest, ...core } = candidate;
  if (candidate.recordVersion !== DURABLE_MODEL_INVOCATION_JOURNAL_VERSION) {
    throw new DurableInvocationIntegrityError("durable invocation journal version drift");
  }
  if (typeof recordDigest !== "string" || recordDigest !== canonicalDigest(core)) {
    throw new DurableInvocationIntegrityError("durable invocation journal record digest mismatch");
  }
  if (candidate.request === null || typeof candidate.request !== "object" || Array.isArray(candidate.request)) {
    throw new DurableInvocationIntegrityError("durable invocation journal request witness is invalid");
  }
  if (candidate.request.requestDigest !== canonicalDigest((({ requestDigest, ...rest }) => rest)(candidate.request))) {
    throw new DurableInvocationIntegrityError("durable invocation journal request digest mismatch");
  }
  if (candidate.result === null || typeof candidate.result !== "object" || Array.isArray(candidate.result)) {
    throw new DurableInvocationIntegrityError("durable invocation journal result is invalid");
  }
  if (candidate.resultDigest !== canonicalDigest(candidate.result)) {
    throw new DurableInvocationIntegrityError("durable invocation journal result digest mismatch");
  }
  return structuredClone(candidate);
}

function migrate(session) {
  session.exec(`
    CREATE TABLE IF NOT EXISTS birth_model_invocations (
      client_request_id TEXT PRIMARY KEY,
      request_digest TEXT NOT NULL,
      record_json TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS birth_model_invocations_request_digest_idx
      ON birth_model_invocations(request_digest);
  `);
}

export function createStateModelInvocationJournal(storage, {
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof now !== "function") throw new TypeError("durable invocation journal now must be a function");
  const session = openBirthStateDatabase(storage, { storeName: "Birth Center durable invocation journal" });
  migrate(session);

  const selectRecord = session.prepare(`
    SELECT record_json
    FROM birth_model_invocations
    WHERE client_request_id = ?
  `);
  const selectByPrefix = session.prepare(`
    SELECT record_json
    FROM birth_model_invocations
    WHERE substr(client_request_id, 1, ?) = ?
    ORDER BY recorded_at, client_request_id
  `);
  const insertRecord = session.prepare(`
    INSERT INTO birth_model_invocations (
      client_request_id,
      request_digest,
      record_json,
      recorded_at
    ) VALUES (?, ?, ?, ?)
  `);

  function load(request) {
    const row = selectRecord.get(request.clientRequestId);
    if (row === undefined) return null;
    let parsed;
    try {
      parsed = JSON.parse(row.record_json);
    } catch (error) {
      throw new DurableInvocationIntegrityError(
        `cannot read durable invocation journal record ${request.clientRequestId}: ${error.message}`,
      );
    }
    const record = normalizeStoredRecord(parsed);
    if (record.request.requestDigest !== request.requestDigest) {
      throw new DurableInvocationConflictError(
        `durable invocation ${request.clientRequestId} exists for a different request witness`,
      );
    }
    return record;
  }

  function listByPrefix(prefix) {
    if (typeof prefix !== "string" || prefix.trim() === "") {
      throw new TypeError("durable invocation prefix is required");
    }
    return selectByPrefix.all(prefix.length, prefix).map((row) => {
      let parsed;
      try {
        parsed = JSON.parse(row.record_json);
      } catch (error) {
        throw new DurableInvocationIntegrityError(
          `cannot read durable invocation journal record for ${prefix}: ${error.message}`,
        );
      }
      return normalizeStoredRecord(parsed);
    });
  }

  function commit(request, result) {
    return session.transaction(() => {
      const existing = load(request);
      if (existing !== null) {
        const incomingDigest = canonicalDigest(result);
        if (existing.resultDigest !== incomingDigest) {
          throw new DurableInvocationConflictError(
            `durable invocation ${request.clientRequestId} already has a different successful result`,
          );
        }
        return existing;
      }

      const core = {
        recordVersion: DURABLE_MODEL_INVOCATION_JOURNAL_VERSION,
        request: structuredClone(request),
        result: structuredClone(result),
        resultDigest: canonicalDigest(result),
        recordedAt: now(),
      };
      const record = { ...core, recordDigest: canonicalDigest(core) };
      insertRecord.run(
        request.clientRequestId,
        request.requestDigest,
        canonicalJson(record),
        record.recordedAt,
      );
      return normalizeStoredRecord(record);
    });
  }

  return Object.freeze({
    stateScopeId: session.scopeId,
    load,
    listByPrefix,
    commit,
    close() { session.close(); },
  });
}

function notify(observer, event) {
  if (typeof observer !== "function") return;
  observer(structuredClone(event));
}

export function createDurableModelAdapter({ baseAdapter, journal, observer = null }) {
  assertAdapter(baseAdapter);
  if (journal === null || typeof journal?.load !== "function" || typeof journal?.commit !== "function") {
    throw new TypeError("durable model adapter requires a journal with load() and commit()");
  }

  return Object.freeze({
    provider: baseAdapter.provider,
    modelId: baseAdapter.modelId,
    configuration: structuredClone(baseAdapter.configuration),
    async invoke(args) {
      const request = durableInvocationRequestWitness(baseAdapter, args);
      const existing = journal.load(request);
      if (existing !== null) {
        notify(observer, {
          type: "durable_model_replay",
          clientRequestId: request.clientRequestId,
          requestDigest: request.requestDigest,
          resultDigest: existing.resultDigest,
        });
        return structuredClone(existing.result);
      }

      const result = await baseAdapter.invoke(args);
      const committed = journal.commit(request, result);
      notify(observer, {
        type: "durable_model_commit",
        clientRequestId: request.clientRequestId,
        requestDigest: request.requestDigest,
        resultDigest: committed.resultDigest,
      });
      return structuredClone(committed.result);
    },
  });
}

export function durableInvocationRecordKey(clientRequestId) {
  return `invocation-${sha256(canonicalJson(clientRequestId))}`;
}
