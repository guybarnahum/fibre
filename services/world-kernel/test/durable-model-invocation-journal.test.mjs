import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  DurableInvocationConflictError,
  DurableInvocationIntegrityError,
  createDurableModelAdapter,
  createFileModelInvocationJournal,
} from "../src/model-runtime/durable-invocation-journal.mjs";
import { GENESIS_PASS_A_RELIABILITY_POLICY_V3 } from "../src/genesis-pass-a-reliability-v3.mjs";
import { generateRichPassAEpisode } from "../src/genesis-rich-pass-a-runner.mjs";

const CALIBRATION_CORPUS = "artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-inputs-v1.json";
const TRIAL_175_RESULT = "artifacts/validation/m2-pr39/g/calibration/g4-v3-off-cohort-v1/trial-175-result-v1.json";
const BASE_CONFIGURATION = Object.freeze({ transport: "test", temperature: 0 });

function tempJournal(t) {
  const root = mkdtempSync(join(tmpdir(), "fibre-durable-model-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return createFileModelInvocationJournal(root);
}

function fakeAdapter(invoke) {
  return Object.freeze({
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    configuration: BASE_CONFIGURATION,
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

function calibrationTrial175() {
  const corpus = JSON.parse(readFileSync(resolve(CALIBRATION_CORPUS), "utf8"));
  const trial = corpus.trials.find((candidate) => candidate.trialOrdinal === 175);
  assert.ok(trial, "frozen calibration trial 175 must exist");
  const result = JSON.parse(readFileSync(resolve(TRIAL_175_RESULT), "utf8"));
  const responses = result.modelEvents.filter((event) => event.type === "model_response");
  assert.equal(responses.length, 2);
  return { trial, result, responses };
}

function resultFromCalibrationResponse(result, responses, clientRequestId) {
  const response = responses.find((event) => event.clientRequestId === clientRequestId);
  assert.ok(response, `missing frozen response ${clientRequestId}`);
  const callIndex = clientRequestId.endsWith(":initial") ? 0 : 1;
  return {
    output: structuredClone(response.modelOutput),
    provenance: structuredClone(result.calls[callIndex].provenance),
  };
}

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
  const replayed = await restarted.invoke(simpleArgs());
  assert.equal(restartedCalls, 0);
  assert.deepEqual(replayed, observed);
});

test("durable adapter refuses to reuse a client request id when prompt/input/schema/configuration drift", async (t) => {
  const journal = tempJournal(t);
  const adapter = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => successfulResult()),
    journal,
  });
  await adapter.invoke(simpleArgs());

  await assert.rejects(
    adapter.invoke(simpleArgs({ input: { value: 2 } })),
    DurableInvocationConflictError,
  );
  await assert.rejects(
    adapter.invoke(simpleArgs({ systemPrompt: "changed prompt" })),
    DurableInvocationConflictError,
  );
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

  const files = (await import("node:fs")).readdirSync(journal.rootPath);
  assert.equal(files.length, 1);
  const path = join(journal.rootPath, files[0]);
  const record = JSON.parse(readFileSync(path, "utf8"));
  record.result.output.answer = "forged";
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);

  await assert.rejects(adapter.invoke(simpleArgs()), DurableInvocationIntegrityError);
});

test("Pass-A restart replays the committed initial output and calls the provider only for the unfinished record retry", async (t) => {
  const { trial, result, responses } = calibrationTrial175();
  const journal = tempJournal(t);
  const initialId = `${trial.trialId}:initial`;
  const retryId = `${trial.trialId}:record-retry:1`;
  const firstProviderCalls = [];

  const interrupted = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async ({ clientRequestId }) => {
      firstProviderCalls.push(clientRequestId);
      if (clientRequestId === initialId) return resultFromCalibrationResponse(result, responses, initialId);
      if (clientRequestId === retryId) throw new Error("simulated process/provider interruption before retry response");
      throw new Error(`unexpected invocation ${clientRequestId}`);
    }),
    journal,
  });

  await assert.rejects(
    generateRichPassAEpisode({
      adapter: interrupted,
      repairAdapter: interrupted,
      input: trial.passAInput,
      clientRequestId: trial.trialId,
      generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
    }),
    /simulated process\/provider interruption/,
  );
  assert.deepEqual(firstProviderCalls, [initialId, retryId]);

  const resumedProviderCalls = [];
  const resumed = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async ({ clientRequestId }) => {
      resumedProviderCalls.push(clientRequestId);
      if (clientRequestId === retryId) return resultFromCalibrationResponse(result, responses, retryId);
      throw new Error(`already committed invocation reached provider: ${clientRequestId}`);
    }),
    journal,
  });

  const resumedEpisode = await generateRichPassAEpisode({
    adapter: resumed,
    repairAdapter: resumed,
    input: trial.passAInput,
    clientRequestId: trial.trialId,
    generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  });
  assert.deepEqual(resumedProviderCalls, [retryId]);
  assert.equal(resumedEpisode.episodeDigest, result.episodeDigest);
  assert.equal(resumedEpisode.recordRetries.length, 1);

  let providerCallsAfterCommit = 0;
  const afterCommit = createDurableModelAdapter({
    baseAdapter: fakeAdapter(async () => {
      providerCallsAfterCommit += 1;
      throw new Error("provider must not be called after both successful operations are committed");
    }),
    journal,
  });
  const replayedEpisode = await generateRichPassAEpisode({
    adapter: afterCommit,
    repairAdapter: afterCommit,
    input: trial.passAInput,
    clientRequestId: trial.trialId,
    generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  });
  assert.equal(providerCallsAfterCommit, 0);
  assert.equal(replayedEpisode.episodeDigest, result.episodeDigest);
  assert.deepEqual(replayedEpisode.episode, resumedEpisode.episode);
});
