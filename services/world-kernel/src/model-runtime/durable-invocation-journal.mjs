import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { canonicalJson, sha256 } from "../persistence-common.mjs";

export const DURABLE_MODEL_INVOCATION_JOURNAL_VERSION = "fibre-durable-model-invocation-journal-v1";

export class DurableInvocationConflictError extends Error {}
export class DurableInvocationIntegrityError extends Error {}

function canonicalDigest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function rawTextDigest(value) {
  return `sha256:${sha256(value)}`;
}

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

function recordFileName(clientRequestId) {
  return `invocation-${sha256(canonicalJson(clientRequestId))}.json`;
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

export function createFileModelInvocationJournal(rootPath) {
  if (typeof rootPath !== "string" || rootPath.trim() === "") throw new TypeError("durable invocation journal rootPath is required");
  const root = resolve(rootPath);

  function pathFor(clientRequestId) {
    return resolve(root, recordFileName(clientRequestId));
  }

  function load(request) {
    const path = pathFor(request.clientRequestId);
    if (!existsSync(path)) return null;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new DurableInvocationIntegrityError(`cannot read durable invocation journal record ${request.clientRequestId}: ${error.message}`);
    }
    const record = normalizeStoredRecord(parsed);
    if (record.request.requestDigest !== request.requestDigest) {
      throw new DurableInvocationConflictError(
        `durable invocation ${request.clientRequestId} exists for a different request witness`,
      );
    }
    return record;
  }

  function commit(request, result) {
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

    mkdirSync(root, { recursive: true });
    const core = {
      recordVersion: DURABLE_MODEL_INVOCATION_JOURNAL_VERSION,
      request: structuredClone(request),
      result: structuredClone(result),
      resultDigest: canonicalDigest(result),
      recordedAt: new Date().toISOString(),
    };
    const record = { ...core, recordDigest: canonicalDigest(core) };
    const path = pathFor(request.clientRequestId);
    try {
      writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const raced = load(request);
      if (raced.resultDigest !== record.resultDigest) {
        throw new DurableInvocationConflictError(
          `durable invocation ${request.clientRequestId} raced with a different successful result`,
        );
      }
      return raced;
    }
    return normalizeStoredRecord(record);
  }

  return Object.freeze({ rootPath: root, load, commit });
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
