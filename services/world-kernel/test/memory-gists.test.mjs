import assert from "node:assert/strict";
import test from "node:test";
import { AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2 } from "../src/autobiographical-memory-domain.mjs";
import { GIST_LIMIT, writeMissingGists } from "../src/memory-gists.mjs";

test("a gist cut off at its bound is not kept, and that memory stays held in full", async () => {
  const memory = (memoryId) => ({ memoryId, recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2, status: "current",
    revision: 1, salience: 0.5, rememberedContent: "Kadir and I tested a claim by removing its examples.",
    rememberedMeaning: null });
  const recorded = [];
  const memoryStore = { listCurrentMemories: () => [memory("mem_whole"), memory("mem_cut")],
    recordMemory: (next) => { recorded.push(next); return next; } };
  const modelAdapter = { invoke: async () => ({ output: { gists: [
    { memoryId: "mem_whole", gist: "Kadir and I found the claim narrowed when its examples went." },
    { memoryId: "mem_cut", gist: "I remember ".padEnd(GIST_LIMIT, "and then ") },
  ] } }) };
  const written = await writeMissingGists({ thread: { threadId: "thr_gist" }, memoryStore, modelAdapter,
    now: () => "2026-11-08T19:00:00.000Z" });
  assert.deepEqual(written, ["mem_whole"], "a gist cut off mid-thought was kept as the memory's essence");
  assert.equal(recorded[0].revision, 2, "the gist did not become a new revision of the same memory");
});
