import assert from "node:assert/strict";
import test from "node:test";

import { createBirthCenterRuntime } from "../src/runtime.mjs";
import { startBirthCenterFromEnvironment } from "../../../infra/deployments/birth-center/local/server.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

function fakeAdapter(counter) {
  return Object.freeze({
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    configuration: Object.freeze({ transport: "test", temperature: 0 }),
    async invoke(args) {
      counter.calls += 1;
      return {
        output: { accepted: true, clientRequestId: args.clientRequestId },
        provenance: { provider: "openai", modelId: "gpt-5.1-2025-11-13", providerRequestId: "req_birth_center_test" },
      };
    },
  });
}

const invocation = Object.freeze({
  systemPrompt: "Birth Center durability test",
  input: { developmentalStep: 1 },
  responseSchema: {
    type: "object",
    additionalProperties: false,
    required: ["accepted", "clientRequestId"],
    properties: {
      accepted: { type: "boolean" },
      clientRequestId: { type: "string" },
    },
  },
  clientRequestId: "birth-center:test:001",
});

test("Birth Center owns durable development state but not authoritative Thread state", async (t) => {
  const state = tempBirthState(t);
  const runtime = createBirthCenterRuntime({ storage: state.storage() });
  const status = runtime.status();
  assert.equal(status.authoritativeThreadStateOwned, false);
  assert.equal(status.providerInvocationPersistenceOwned, true);
  assert.equal(status.provisionalDevelopmentStateOwned, true);
  assert.equal(status.worldPublicationConfigured, false);

  const counter = { calls: 0 };
  const first = runtime.durableAdapter(fakeAdapter(counter));
  const initial = await first.invoke(invocation);
  assert.equal(counter.calls, 1);

  runtime.close();
  const restarted = createBirthCenterRuntime({ storage: state.storage() });
  const replayCounter = { calls: 0 };
  const replay = await restarted.durableAdapter(fakeAdapter(replayCounter)).invoke(invocation);
  assert.equal(replayCounter.calls, 0);
  assert.deepEqual(replay, initial);

  await assert.rejects(restarted.submitBirth({}), /no World Kernel publication boundary configured/);
  restarted.close();
});

test("Birth Center runs as a distinct loopback runtime service", async (t) => {
  const state = tempBirthState(t);
  const service = await startBirthCenterFromEnvironment({
    FIBRE_BIRTH_CENTER_HOST: "127.0.0.1",
    FIBRE_BIRTH_CENTER_PORT: "0",
    FIBRE_BIRTH_CENTER_STATE: state.databasePath,
  });
  t.after(() => service.close());

  const response = await fetch(`http://127.0.0.1:${service.address.port}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, "fibre-birth-center");
  assert.equal(body.authoritativeThreadStateOwned, false);
  assert.equal(body.providerInvocationPersistenceOwned, true);
  assert.equal(body.worldPublicationConfigured, false);
});

test("Birth Center preserves the loopback-only bind contract without World Kernel internals", async () => {
  await assert.rejects(
    startBirthCenterFromEnvironment({
      FIBRE_BIRTH_CENTER_HOST: "0.0.0.0",
      FIBRE_BIRTH_CENTER_PORT: "0",
    }),
    new TypeError("The Birth Center server may bind only to a loopback host"),
  );
});
