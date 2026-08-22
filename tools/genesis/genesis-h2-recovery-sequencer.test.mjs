import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createBirthCenterRuntime } from "../../services/birth-center/src/runtime.mjs";
import { executeH2RecoverySequence } from "./genesis-h2-recovery-sequencer.mjs";

const FIRST_PROVIDER_OPERATION = "pr39-h:slot-04:pass-a:episode-03:record-retry:2";
const SLOT5_FIRST_OPERATION = "pr39-h:slot-05:pass-a:episode-01:initial";

function testPlan() {
  return {
    firstProviderOperation: { clientRequestId: FIRST_PROVIDER_OPERATION },
    stages: [
      {
        stage: "reuse_completed_thread_generations",
        slots: [1, 2, 3].map((slot) => ({ slot, threadId: `thr_${slot}` })),
      },
      { stage: "continue_partial_slot_04_pass_a", slot: 4 },
      { stage: "complete_slot_04_memory_and_meaning", slot: 4 },
      { stage: "generate_unstarted_slot_05", slot: 5 },
      { stage: "publish_recovered_world", slots: [1, 2, 3, 4, 5] },
    ],
  };
}

function invocationArgs(clientRequestId) {
  return {
    systemPrompt: "deterministic recovery composition test prompt",
    input: { clientRequestId },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      properties: { value: { type: "string" } },
      required: ["value"],
    },
    clientRequestId,
  };
}

test("H-v2 recovery composition replays a successful first call after crash and preserves slot/publication order", async () => {
  const root = mkdtempSync(join(tmpdir(), "fibre-h2-recovery-sequencer-"));
  try {
    const baseCalls = [];
    const durableEvents = [];
    const baseAdapter = Object.freeze({
      provider: "deterministic-test-provider",
      modelId: "deterministic-test-model-v1",
      configuration: Object.freeze({ mode: "test" }),
      async invoke(args) {
        baseCalls.push(args.clientRequestId);
        return {
          output: { value: `result:${args.clientRequestId}` },
          provenance: { providerRequestId: `provider-${baseCalls.length}` },
        };
      },
    });
    const birthCenter = createBirthCenterRuntime({ stateRoot: join(root, "birth-center") });
    const adapter = birthCenter.durableAdapter(baseAdapter, {
      observer: (event) => durableEvents.push(structuredClone(event)),
    });

    const persisted = new Map();
    const published = new Map();
    const stageOrder = [];
    let crashAfterFirstSuccessfulCall = true;

    const dependencies = () => ({
      plan: testPlan(),
      async loadPreserved() {
        return [1, 2, 3].map((slot) => ({ slot, source: "preserved" }));
      },
      async recoverSlot4() {
        const result = await adapter.invoke(invocationArgs(FIRST_PROVIDER_OPERATION));
        if (crashAfterFirstSuccessfulCall) {
          crashAfterFirstSuccessfulCall = false;
          throw new Error("simulated crash after durable first recovery call");
        }
        return { slot: 4, result: result.output.value };
      },
      async persistSlot4(generation) {
        persisted.set(4, structuredClone(generation));
      },
      async generateSlot5() {
        const result = await adapter.invoke(invocationArgs(SLOT5_FIRST_OPERATION));
        return { slot: 5, result: result.output.value };
      },
      async persistSlot5(generation) {
        persisted.set(5, structuredClone(generation));
      },
      async publishCohort(generations) {
        return generations.map((generation) => {
          const prior = published.get(generation.slot) ?? null;
          if (prior === null) published.set(generation.slot, structuredClone(generation));
          return {
            slot: generation.slot,
            idempotentReplay: prior !== null,
          };
        });
      },
      onStage(event) {
        stageOrder.push(`${event.stage}:${event.status}`);
      },
    });

    await assert.rejects(
      () => executeH2RecoverySequence(dependencies()),
      /simulated crash after durable first recovery call/,
    );
    assert.deepEqual(baseCalls, [FIRST_PROVIDER_OPERATION]);
    assert.equal(persisted.has(4), false);
    assert.equal(published.size, 0);

    stageOrder.length = 0;
    const recovered = await executeH2RecoverySequence(dependencies());
    assert.deepEqual(baseCalls, [FIRST_PROVIDER_OPERATION, SLOT5_FIRST_OPERATION]);
    assert.deepEqual(recovered.generations.map((generation) => generation.slot), [1, 2, 3, 4, 5]);
    assert.deepEqual(recovered.publications.map((publication) => publication.slot), [1, 2, 3, 4, 5]);
    assert.ok(recovered.publications.every((publication) => publication.idempotentReplay === false));
    assert.deepEqual([...persisted.keys()], [4, 5]);
    assert.deepEqual(stageOrder, [
      "reuse_completed_thread_generations:started",
      "reuse_completed_thread_generations:complete",
      "continue_partial_slot_04_pass_a:started",
      "complete_slot_04_memory_and_meaning:complete",
      "generate_unstarted_slot_05:started",
      "generate_unstarted_slot_05:complete",
      "publish_recovered_world:started",
      "publish_recovered_world:complete",
    ]);

    stageOrder.length = 0;
    const replayed = await executeH2RecoverySequence(dependencies());
    assert.deepEqual(baseCalls, [FIRST_PROVIDER_OPERATION, SLOT5_FIRST_OPERATION]);
    assert.ok(replayed.publications.every((publication) => publication.idempotentReplay === true));
    assert.equal(published.size, 5);
    assert.deepEqual(
      durableEvents.map((event) => [event.type, event.clientRequestId]),
      [
        ["durable_model_commit", FIRST_PROVIDER_OPERATION],
        ["durable_model_replay", FIRST_PROVIDER_OPERATION],
        ["durable_model_commit", SLOT5_FIRST_OPERATION],
        ["durable_model_replay", FIRST_PROVIDER_OPERATION],
        ["durable_model_replay", SLOT5_FIRST_OPERATION],
      ],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
