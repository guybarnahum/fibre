import assert from "node:assert/strict";
import test from "node:test";

import {
  DURABLE_MODEL_INVOCATION_JOURNAL_VERSION,
  DurableInvocationConflictError,
  DurableInvocationIntegrityError,
  createDurableModelAdapter,
  createStateModelInvocationJournal,
  durableInvocationRequestWitness,
} from "../src/model-runtime/durable-invocation-journal.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

const BASE_CONFIGURATION = Object.freeze({ transport: "test", temperature: 0 });
const journalStates = new WeakMap();

function tempJournal(t) {
  const state = tempBirthState(t);
  const journal = createStateModelInvocationJournal(state.storage());
  journalStates.set(journal, state);
  t.after(() => journal.close());
  return journal;
}

function journalRecord(journal, clientRequestId = "durable-test:001") {
  const state = journalStates.get(journal);
  const storage = state.storage();
  const session = storage.infraDriver.state.open(storage.stateScopeId);
  try {
    const row = session.prepare("SELECT record_json FROM birth_model_invocations WHERE client_request_id = ?").get(clientRequestId);
    return row === undefined ? null : JSON.parse(row.record_json);
  } finally {
    session.close();
  }
}

function replaceJournalRecord(journal, clientRequestId, record) {
  const state = journalStates.get(journal);
  const storage = state.storage();
  const session = storage.infraDriver.state.open(storage.stateScopeId);
  try {
    session.prepare("UPDATE birth_model_invocations SET record_json = ? WHERE client_request_id = ?")
      .run(JSON.stringify(record), clientRequestId);
  } finally {
    session.close();
  }
}

function fakeAdapter(invoke, configuration = BASE_CONFIGURATION) {
  return Object.freeze({
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    configuration,
    invoke,
  });
}

function simpleArgs(overrides = {}) {
  return {
    systemPrompt: "durable test prompt",
    input: { value: 1 },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["answer"],
      properties: { answer: { type: "string" } },
    },
    clientRequestId: "durable-test:001",
    ...overrides,
  };
}

function successfulResult(answer = "alpha") {
  return {
    output: { answer },
    provenance: {
      provider: "openai",
      modelId: "gpt-5.1-2025-11-13",
      providerRequestId: `req_${answer}`,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    },
  };
}

test("Birth Center journal preserves the durable invocation witness and record format in InfraDriver.state", async (t) => {
  const adapter = fakeAdapter(async () => successfulResult());
  const args = simpleArgs();
  assert.equal(DURABLE_MODEL_INVOCATION_JOURNAL_VERSION, "fibre-durable-model-invocation-journal-v1");
  assert.deepEqual(durableInvocationRequestWitness(adapter, args), {
    clientRequestId: "durable-test:001",
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    configurationDigest: "sha256:addfc6c069f7fe6d50ccbf3fedf40e86ec478c22707c83da83f10a00bb33379f",
    promptRawHash: "sha256:4bf2025db7943552d5ce22e1c160b5b449db3ef20e249547661977ead64960bd",
    promptCanonicalJsonHash: "sha256:7cdc21b0487fff6d2a455744fcada7f18c75359c192ac78ec11aed0378d92f23",
    inputDigest: "sha256:48208f9428d64634bd8e28ff345bf0eab60d53c18fa2fbdb0b9bc1e84df2b5f6",
    responseSchemaDigest: "sha256:d7f69ea25824f613d0b60198abe050adc66a3bf45d9f2045d1997214a55498e5",
    requestDigest: "sha256:fcc3019196c39250c29148b163a0df05610210503afe6b016ffb84cfce136e45",
  });

  const journal = tempJournal(t);
  await createDurableModelAdapter({ baseAdapter: adapter, journal }).invoke(args);
  const record = journalRecord(journal);
  assert.ok(record);
  assert.deepEqual(Object.keys(record), [
    "recordDigest",
    "recordVersion",
    "recordedAt",
    "request",
    "result",
    "resultDigest",
  ]);
  assert.equal(record.resultDigest, "sha256:a842341c5ae49c731d398949da42bc643be3fb6ee7103e77222a1d4365f27960");
  assert.deepEqual(record.request, durableInvocationRequestWitness(adapter, args));
});

test("durable adapter commits a successful invocation and replays it after restart without another provider call", async (t) => {
  const journal = tempJournal(t);
  let firstCalls = 0;
  const first = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => {
      firstCalls += 1;
      return successfulResult();
    }),
    journal,
  });
  const observed = await first.invoke(simpleArgs());
  assert.equal(firstCalls, 1);
  assert.deepEqual(observed, successfulResult());

  let restartedCalls = 0;
  const restarted = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => {
      restartedCalls += 1;
      throw new Error("provider must not be called for committed invocation");
    }),
    journal,
  });
  assert.deepEqual(await restarted.invoke(simpleArgs()), observed);
  assert.equal(restartedCalls, 0);
});

test("durable adapter fails closed when a committed client request id drifts in prompt, input, schema, or runtime configuration", async (t) => {
  const journal = tempJournal(t);
  const adapter = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => successfulResult()),
    journal,
  });
  await adapter.invoke(simpleArgs());

  await assert.rejects(adapter.invoke(simpleArgs({ input: { value: 2 } })), DurableInvocationConflictError);
  await assert.rejects(adapter.invoke(simpleArgs({ systemPrompt: "changed prompt" })), DurableInvocationConflictError);
  await assert.rejects(
    adapter.invoke(simpleArgs({
      responseSchema: {
        type: "object",
        additionalProperties: false,
        required: ["answer", "other"],
        properties: { answer: { type: "string" }, other: { type: "string" } },
      },
    })),
    DurableInvocationConflictError,
  );

  const changedRuntime = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => successfulResult(), { transport: "test", temperature: 0.5 }),
    journal,
  });
  await assert.rejects(changedRuntime.invoke(simpleArgs()), DurableInvocationConflictError);
});

test("failed provider invocation is not committed and the exact operation can be attempted later", async (t) => {
  const journal = tempJournal(t);
  let failedCalls = 0;
  const failing = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => {
      failedCalls += 1;
      throw new Error("simulated transport failure");
    }),
    journal,
  });
  await assert.rejects(failing.invoke(simpleArgs()), /simulated transport failure/);
  assert.equal(failedCalls, 1);

  let recoveryCalls = 0;
  const recovery = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => {
      recoveryCalls += 1;
      return successfulResult("recovered");
    }),
    journal,
  });
  assert.deepEqual(await recovery.invoke(simpleArgs()), successfulResult("recovered"));
  assert.equal(recoveryCalls, 1);
});

test("journal corruption is detected rather than regenerated over", async (t) => {
  const journal = tempJournal(t);
  const adapter = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => successfulResult()),
    journal,
  });
  await adapter.invoke(simpleArgs());

  const record = journalRecord(journal);
  assert.ok(record);
  record.result.output.answer = "forged";
  replaceJournalRecord(journal, "durable-test:001", record);
  await assert.rejects(adapter.invoke(simpleArgs()), DurableInvocationIntegrityError);
});

test("restart replays committed model work and invokes the provider only for the unfinished next operation", async (t) => {
  const journal = tempJournal(t);
  const initialArgs = simpleArgs({ clientRequestId: "durable-sequence:initial", input: { step: "initial" } });
  const retryArgs = simpleArgs({ clientRequestId: "durable-sequence:retry", input: { step: "retry" } });
  const firstProviderCalls = [];
  const interrupted = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async ({ clientRequestId }) => {
      firstProviderCalls.push(clientRequestId);
      if (clientRequestId === initialArgs.clientRequestId) return successfulResult("initial");
      throw new Error("simulated process/provider interruption before retry response");
    }),
    journal,
  });

  assert.deepEqual(await interrupted.invoke(initialArgs), successfulResult("initial"));
  await assert.rejects(interrupted.invoke(retryArgs), /simulated process\/provider interruption/);
  assert.deepEqual(firstProviderCalls, [initialArgs.clientRequestId, retryArgs.clientRequestId]);

  const resumedProviderCalls = [];
  const resumed = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async ({ clientRequestId }) => {
      resumedProviderCalls.push(clientRequestId);
      if (clientRequestId === retryArgs.clientRequestId) return successfulResult("retry");
      throw new Error(`already committed invocation reached provider: ${clientRequestId}`);
    }),
    journal,
  });
  assert.deepEqual(await resumed.invoke(initialArgs), successfulResult("initial"));
  assert.deepEqual(await resumed.invoke(retryArgs), successfulResult("retry"));
  assert.deepEqual(resumedProviderCalls, [retryArgs.clientRequestId]);

  let providerCallsAfterCommit = 0;
  const afterCommit = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => {
      providerCallsAfterCommit += 1;
      throw new Error("provider must not be called after both operations are committed");
    }),
    journal,
  });
  assert.deepEqual(await afterCommit.invoke(initialArgs), successfulResult("initial"));
  assert.deepEqual(await afterCommit.invoke(retryArgs), successfulResult("retry"));
  assert.equal(providerCallsAfterCommit, 0);
});
