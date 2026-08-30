import assert from "node:assert/strict";
import test from "node:test";

import { createGenesisPresentationDeliveryService } from "../src/genesis-presentation-delivery-service.mjs";

function fixture() {
  const entries = new Map([["gen_1", {
    genesisId: "gen_1",
    threadId: "thr_1",
    manifest: { genesisId: "gen_1", threadId: "thr_1", publication: { status: "published" } },
    publicationDigest: `sha256:${"a".repeat(64)}`,
    publishedAt: "2026-08-30T03:20:00Z",
    state: "pending",
    attemptCount: 0,
    lastAttemptAt: null,
    lastError: null,
    deliveredAt: null,
  }]]);
  const outbox = {
    listPending({ limit = 100 } = {}) {
      return [...entries.values()]
        .filter((entry) => entry.state === "pending")
        .slice(0, limit)
        .map((entry) => structuredClone(entry));
    },
    get(genesisId) {
      const entry = entries.get(genesisId);
      return entry === undefined ? null : structuredClone(entry);
    },
    recordFailure(genesisId, error, { attemptedAt }) {
      const entry = entries.get(genesisId);
      entry.attemptCount += 1;
      entry.lastAttemptAt = attemptedAt;
      entry.lastError = { name: error.constructor.name, code: error.code ?? null, message: error.message };
      return structuredClone(entry);
    },
    markDelivered(genesisId, { deliveredAt }) {
      const entry = entries.get(genesisId);
      if (entry.state === "delivered") return structuredClone(entry);
      entry.state = "delivered";
      entry.attemptCount += 1;
      entry.lastAttemptAt = deliveredAt;
      entry.lastError = null;
      entry.deliveredAt = deliveredAt;
      return structuredClone(entry);
    },
  };
  const calls = [];
  const publisher = {
    async publishGenesisPresentation(input) {
      calls.push(structuredClone(input));
      return { reused: false, presentationId: "presentation_gen_1" };
    },
  };
  return {
    entries,
    outbox,
    calls,
    publisher,
    worldReader: { getThread: (threadId) => ({ threadId, authority: "world" }) },
    civilRegistry: { getCivilRegistrationByThreadId: (threadId) => ({ threadId, authority: "civil" }) },
    projector: ({ thread, manifest, civilRegistration }) => ({ thread, manifest, civilRegistration, projected: true }),
  };
}

test("pending Genesis presentation delivery projects authoritative state then marks the outbox delivered", async () => {
  const current = fixture();
  const service = createGenesisPresentationDeliveryService({
    worldReader: current.worldReader,
    civilRegistry: current.civilRegistry,
    outbox: current.outbox,
    presentationPublisher: current.publisher,
    projector: current.projector,
    now: () => "2026-08-30T03:21:00Z",
  });

  const result = await service.deliverGenesis("gen_1");
  assert.equal(result.delivered, true);
  assert.equal(result.state, "delivered");
  assert.equal(current.calls.length, 1);
  assert.equal(current.calls[0].genesisId, "gen_1");
  assert.equal(current.calls[0].bundle.projected, true);
  assert.equal(current.entries.get("gen_1").state, "delivered");
  assert.equal(current.entries.get("gen_1").attemptCount, 1);
});

test("presentation failure is recorded durably and a later retry can deliver the same birth", async () => {
  const current = fixture();
  let failuresRemaining = 1;
  current.publisher.publishGenesisPresentation = async (input) => {
    current.calls.push(structuredClone(input));
    if (failuresRemaining > 0) {
      failuresRemaining -= 1;
      throw new Error("presentation unavailable");
    }
    return { reused: true, presentationId: "presentation_gen_1" };
  };
  let tick = 0;
  const service = createGenesisPresentationDeliveryService({
    worldReader: current.worldReader,
    civilRegistry: current.civilRegistry,
    outbox: current.outbox,
    presentationPublisher: current.publisher,
    projector: current.projector,
    now: () => `2026-08-30T03:21:0${tick++}Z`,
  });

  const failed = await service.deliverGenesis("gen_1");
  assert.equal(failed.delivered, false);
  assert.equal(current.entries.get("gen_1").state, "pending");
  assert.equal(current.entries.get("gen_1").attemptCount, 1);
  assert.equal(current.entries.get("gen_1").lastError.message, "presentation unavailable");

  const retried = await service.deliverPending();
  assert.equal(retried.attempted, 1);
  assert.equal(retried.delivered, 1);
  assert.equal(retried.failed, 0);
  assert.equal(current.entries.get("gen_1").state, "delivered");
  assert.equal(current.entries.get("gen_1").attemptCount, 2);
  assert.equal(current.calls.length, 2);
});

test("already delivered Genesis presentation is idempotent and does not republish", async () => {
  const current = fixture();
  const delivered = current.entries.get("gen_1");
  delivered.state = "delivered";
  delivered.attemptCount = 1;
  delivered.deliveredAt = "2026-08-30T03:21:00Z";
  const service = createGenesisPresentationDeliveryService({
    worldReader: current.worldReader,
    civilRegistry: current.civilRegistry,
    outbox: current.outbox,
    presentationPublisher: current.publisher,
    projector: current.projector,
  });

  const result = await service.deliverGenesis("gen_1");
  assert.equal(result.delivered, true);
  assert.equal(result.reused, true);
  assert.equal(current.calls.length, 0);
});