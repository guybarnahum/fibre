import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createPresentationReadApi, channelIdForThread } from "../../src/http/read-api.mjs";

async function directoryApi() {
  const infra = createMemoryInfraDriver();
  const snapshots = new Map();
  const records = [
    {
      threadId: "thr_mira",
      displayName: "Mira Vale",
      fin: "7K3M-2Q-8W5R",
      languages: ["English", "Hebrew"],
      summary: "Builds patient machines and watches weather from the roof.",
      visualDescription: "Dark wavy hair and warm brown eyes.",
    },
    {
      threadId: "thr_nilo",
      displayName: "Nilo Serrat",
      fin: "1ABC-2D-3EFG",
      languages: ["Spanish"],
      summary: "Keeps notebooks about tide pools and old songs.",
      visualDescription: "Short silver hair and a narrow face.",
    },
    {
      threadId: "thr_hidden",
      displayName: "Hidden Thread",
      fin: "9ZZZ-9Z-9ZZZ",
      languages: ["English"],
      summary: "Must not be discoverable.",
      publiclyVisible: false,
    },
    {
      threadId: "thr_private_card",
      displayName: "Private Card",
      fin: "8YYY-8Y-8YYY",
      languages: ["English"],
      summary: "Identity credential is private.",
      identityVisibility: "private",
    },
  ];

  for (const record of records) {
    const channelId = channelIdForThread(record.threadId);
    await infra.catalog.upsert(channelId, {
      channelId,
      threadId: record.threadId,
      lifecycleStatus: "alive",
      publiclyVisible: record.publiclyVisible ?? true,
    });
    snapshots.set(channelId, {
      pointer: {
        threadId: record.threadId,
        snapshotVersion: "directory-v1",
        snapshotDigest: `sha256:${record.threadId}`,
      },
      snapshot: {
        presentation: {
          manifest: { threadId: record.threadId, lifecycleStatus: "alive" },
          subject: {
            displayName: record.displayName,
            birthDate: null,
            languages: record.languages,
            homePlaceRef: null,
          },
          introduction: { headline: record.displayName, summary: record.summary },
          civilIdentity: { fibreIdentityNumber: record.fin },
          visualIdentity: { subjectDescription: record.visualDescription },
          identityCard: { visibility: record.identityVisibility ?? "public" },
        },
      },
    });
  }

  const presentationServer = {
    async getSnapshot(channelId) { return snapshots.get(channelId) ?? null; },
    async readEvents() { return []; },
    async getHead() { return { sequence: 0 }; },
  };
  return createPresentationReadApi({
    infra,
    presentationServer,
    async openStream() { return new Response(null, { status: 426 }); },
  });
}

test("Thread directory searches only admitted public presentation attributes", async () => {
  const api = await directoryApi();

  const byNameAndAttribute = await api.fetch(new Request("https://api.insidefibre.com/api/threads/search?q=mira%20patient"));
  assert.equal(byNameAndAttribute.status, 200);
  const nameBody = await byNameAndAttribute.json();
  assert.deepEqual(nameBody.threads.map(({ threadId }) => threadId), ["thr_mira"]);
  assert.equal(nameBody.threads[0].displayName, "Mira Vale");
  assert.equal(nameBody.threads[0].fibreIdentityNumber, "7K3M-2Q-8W5R");

  const byFin = await api.fetch(new Request("https://api.insidefibre.com/api/threads/search?fin=7K3M-2Q-8W5R"));
  assert.deepEqual((await byFin.json()).threads.map(({ threadId }) => threadId), ["thr_mira"]);

  const byAttribute = await api.fetch(new Request("https://api.insidefibre.com/api/threads/search?q=tide%20pools&language=Spanish"));
  assert.deepEqual((await byAttribute.json()).threads.map(({ threadId }) => threadId), ["thr_nilo"]);

  const hidden = await api.fetch(new Request("https://api.insidefibre.com/api/threads/search?q=must%20not%20be%20discoverable"));
  assert.deepEqual(await hidden.json(), { threads: [] });
});

test("Meet a Thread is seeded, filterable, and returns a compact selection receipt", async () => {
  const api = await directoryApi();
  const url = "https://api.insidefibre.com/api/threads/meet?seed=experience-42";
  const first = await (await api.fetch(new Request(url))).json();
  const second = await (await api.fetch(new Request(url))).json();
  assert.equal(first.thread.threadId, second.thread.threadId);
  assert.deepEqual(first.selection, {
    policyVersion: "thread-meet-v0.1",
    seed: "experience-42",
    eligibleCount: 2,
  });

  const filtered = await (await api.fetch(new Request(
    "https://api.insidefibre.com/api/threads/meet?seed=experience-42&q=weather",
  ))).json();
  assert.equal(filtered.thread.threadId, "thr_mira");
  assert.equal(filtered.selection.eligibleCount, 1);

  const excluded = await (await api.fetch(new Request(
    "https://api.insidefibre.com/api/threads/meet?seed=experience-42&exclude=thr_mira",
  ))).json();
  assert.equal(excluded.thread.threadId, "thr_nilo");
  assert.equal(excluded.selection.eligibleCount, 1);
});
