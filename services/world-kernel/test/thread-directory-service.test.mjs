import assert from "node:assert/strict";
import test from "node:test";

import { createThreadDirectoryService } from "../src/thread-directory-service.mjs";

function fixture() {
  const threads = new Map([
    ["thr_mira", {
      threadId: "thr_mira",
      status: "alive",
      identity: {
        name: "Mira Vale",
        originOrientation: "original",
        selfDescription: "Builds patient machines and watches weather from the roof.",
        culture: ["coastal", "bilingual"],
      },
      genome: { textualTraits: { temperament: "patient; observant; dry humor" } },
      currentState: { privateThought: "not directory data" },
    }],
    ["thr_nilo", {
      threadId: "thr_nilo",
      status: "alive",
      identity: {
        name: "Nilo Serrat",
        originOrientation: "original",
        selfDescription: "Keeps notebooks about tide pools and old songs.",
        culture: ["Mediterranean"],
      },
      genome: { textualTraits: { temperament: "restless; generous; tactile" } },
      currentState: { privateThought: "also not directory data" },
    }],
  ]);
  const registrations = new Map([
    ["thr_mira", { threadId: "thr_mira", fibreIdentityNumber: "7K3M-2Q-8W5R" }],
    ["thr_nilo", { threadId: "thr_nilo", fibreIdentityNumber: "1ABC-2D-3EFG" }],
  ]);

  const directory = createThreadDirectoryService({
    worldReader: {
      getThread(threadId) { return threads.get(threadId) ?? null; },
    },
    civilRegistry: {
      getCivilRegistrationByThreadId(threadId) { return registrations.get(threadId) ?? null; },
      getCivilRegistrationByFin(fin) {
        return [...registrations.values()].find((record) => record.fibreIdentityNumber === fin) ?? null;
      },
    },
    directoryStore: {
      listThreadIds() { return [...threads.keys()].sort(); },
    },
  });
  return directory;
}

test("World Thread directory resolves FIN and bounded Thread-owned attributes", () => {
  const directory = fixture();

  const byFin = directory.search({ fin: "7K3M-2Q-8W5R" });
  assert.deepEqual(byFin.threads.map(({ threadId }) => threadId), ["thr_mira"]);
  assert.equal(byFin.threads[0].displayName, "Mira Vale");
  assert.equal(byFin.threads[0].fibreIdentityNumber, "7K3M-2Q-8W5R");

  const byTrait = directory.search({ query: "dry humor" });
  assert.deepEqual(byTrait.threads.map(({ threadId }) => threadId), ["thr_mira"]);

  const byLifeAttribute = directory.search({ query: "tide pools" });
  assert.deepEqual(byLifeAttribute.threads.map(({ threadId }) => threadId), ["thr_nilo"]);

  assert.equal("genome" in byFin.threads[0], false);
  assert.equal("currentState" in byFin.threads[0], false);
});
