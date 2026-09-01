import assert from "node:assert/strict";
import test from "node:test";

import { createThreadInspectionApi } from "../src/thread-inspection-api.mjs";

const TOKEN = "thread-inspection-private-token-123";

function fixture() {
  const threads = {
    thr_a: {
      threadId: "thr_a",
      version: 7,
      status: "frozen",
      identity: { name: "Amina Vale", originOrientation: "original", selfDescription: "I keep careful promises." },
      currentState: { selfModel: "I notice what changed and what did not." },
      provenance: { lastEventId: "evt_a_7" },
    },
    thr_b: {
      threadId: "thr_b",
      version: 2,
      status: "active",
      identity: { name: "Basil Rowan", originOrientation: "homage", selfDescription: "I study before I imitate." },
      currentState: { selfModel: "I am still forming my own position." },
      provenance: { lastEventId: "evt_b_2" },
    },
  };
  return createThreadInspectionApi({
    privateToken: TOKEN,
    threadDirectory: {
      listThreadIds() { return ["thr_b", "thr_a", "thr_b"]; },
    },
    worldReader: {
      getThread(threadId) { return threads[threadId] ?? null; },
      listEvents(threadId) {
        return threadId === "thr_a"
          ? [{ eventId: "evt_a_1", eventType: "THREAD_SEEDED" }, { eventId: "evt_a_7", eventType: "THREAD_FROZEN" }]
          : [];
      },
      verifyThreadIntegrity(threadId) {
        return { threadId, ok: true, stateHash: `sha256:${threadId}` };
      },
    },
    identityReader: {
      getPassport(threadId) { return { threadId, canonicalName: threads[threadId]?.identity?.name ?? null }; },
      getCurrentIdentityView(threadId) { return { threadId, claims: [{ domain: "self_authored_identity", text: "I prefer precise language." }] }; },
      verifyThreadIdentityIntegrity(threadId) { return { threadId, ok: true, assertionCount: 3 }; },
      listMemoryVisualCompanions(threadId) { return [{ threadId, memoryRef: "mem_a", status: "ready" }]; },
    },
    memoryReader: {
      listCurrentMemories(threadId) { return [{ memoryId: "mem_a", threadId, rememberedMeaning: "A promise survived inconvenience." }]; },
    },
    situatedLifeReader: {
      listCurrentLifeRelations(threadId) { return [{ relationId: "rel_a", threadId, relationKind: "friend" }]; },
      listCurrentPlaceEpisodes(threadId) { return [{ episodeId: "place_a", threadId, episodeKind: "residence" }]; },
    },
    genomeReader: {
      listThreadGenomes(threadId) { return [{ header: { genomeId: "genome_a", threadId }, loci: [{ value: "patient;observant" }] }]; },
    },
    civilRegistry: {
      getCivilRegistrationByThreadId(threadId) {
        return threadId === "thr_a"
          ? { registrationId: "reg_a", threadId, fibreIdentityNumber: "1234-56-7890", birthEventRef: "evt_a_1" }
          : null;
      },
    },
    embodimentReader: {
      listCurrent(threadId) { return [{ embodimentId: "emb_a", threadId, revision: 1, visibility: "public" }]; },
    },
  });
}

function request(path, { token = TOKEN, method = "GET" } = {}) {
  return new Request(`https://world.internal${path}`, {
    method,
    headers: token === null ? {} : { "x-fibre-private-token": token },
  });
}

test("Thread inspection lists existing Threads through World authority readers", async () => {
  const response = await fixture().fetch(request("/internal/threads"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.threadCount, 2);
  assert.deepEqual(body.threads.map((item) => item.threadId), ["thr_a", "thr_b"]);
  assert.deepEqual(body.threads[0], {
    threadId: "thr_a",
    authoritativeThreadExists: true,
    name: "Amina Vale",
    originOrientation: "original",
    status: "frozen",
    version: 7,
    fibreIdentityNumber: "1234-56-7890",
  });
});

test("Thread inspection returns modern identity, memory, situated life, genome, embodiment, civil, history, and integrity data", async () => {
  const response = await fixture().fetch(request("/internal/threads/thr_a/inspection"));
  assert.equal(response.status, 200);
  const { inspection } = await response.json();
  assert.equal(inspection.thread.threadId, "thr_a");
  assert.equal(inspection.events.at(-1).eventId, "evt_a_7");
  assert.equal(inspection.integrity.world.ok, true);
  assert.equal(inspection.integrity.identity.assertionCount, 3);
  assert.equal(inspection.civilRegistration.fibreIdentityNumber, "1234-56-7890");
  assert.equal(inspection.identity.passport.canonicalName, "Amina Vale");
  assert.equal(inspection.identity.current.claims[0].domain, "self_authored_identity");
  assert.equal(inspection.autobiographicalMemories[0].memoryId, "mem_a");
  assert.equal(inspection.situatedLife.relations[0].relationId, "rel_a");
  assert.equal(inspection.situatedLife.places[0].episodeId, "place_a");
  assert.equal(inspection.symbolicGenomes[0].header.genomeId, "genome_a");
  assert.equal(inspection.embodiment.current[0].embodimentId, "emb_a");
});

test("Thread inspection is private, read-only, and returns stable absence", async () => {
  const api = fixture();
  assert.equal((await api.fetch(request("/internal/threads", { token: null }))).status, 403);
  assert.equal((await api.fetch(request("/internal/threads", { method: "POST" }))).status, 405);
  assert.equal((await api.fetch(request("/internal/threads/thr_missing/inspection"))).status, 404);
  assert.equal(await api.fetch(request("/not-an-inspection-route")), null);
});
