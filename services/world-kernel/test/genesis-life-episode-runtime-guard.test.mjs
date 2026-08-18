import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-life-runtime-guard-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

test("runtime command authority cannot mint a Genesis life episode", () =>
  withDatabase((databasePath) => {
    const world = openWorldStore(databasePath);
    const thread = structuredClone(fixture);
    thread.threadId = "thr_genesis_guard_001";
    thread.relationshipRefs = [];
    thread.memoryRefs = [];
    thread.provenance = {
      createdAt: "2026-08-18T20:00:00Z",
      createdBy: "fixture",
      lastEventId: "evt_provisional_runtime_guard",
    };
    const seeded = world.seedThread(thread).thread;

    assert.throws(
      () => world.applyCommand({
        commandId: "cmd_attempt_genesis_life_episode",
        threadId: seeded.threadId,
        expectedVersion: seeded.version,
        type: "THREAD_LIFE_EPISODE_RECORDED",
        payload: {},
        actor: {
          entityId: "human_attacker",
          kind: "human",
          displayName: "Attacker",
        },
        occurredAt: "2026-08-18T20:01:00Z",
      }),
      /unsupported command type: THREAD_LIFE_EPISODE_RECORDED/,
    );

    assert.deepEqual(
      world.listEvents(seeded.threadId).map((event) => event.eventType),
      ["THREAD_SEEDED"],
    );
    world.close();
  }));
