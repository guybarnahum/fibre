import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { ThreadIdentityUpdateStore } from "../src/thread-identity-update-store.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withWorld(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-thread-identity-update-"));
  const storage = localWorldStateStorage(join(directory, "world.sqlite"));
  const world = openWorldStore(storage);
  const identity = new ThreadIdentityUpdateStore(storage);
  try {
    return run({ world, identity });
  } finally {
    identity.close();
    world.close();
    rmSync(directory, { recursive:true, force:true });
  }
}

test("explicit Admin identity decisions are one replayable World event", () => {
  withWorld(({ world, identity }) => {
    const source = structuredClone(fixture);
    delete source.identity.sex;
    const seeded = world.seedThread(source).thread;
    const request = {
      name:"Maya Cohen",
      sex:"female",
      operationKey:"admin_identity_maya_1",
      changedAt:"2026-09-16T17:30:00.000Z",
    };

    const first = identity.update(seeded, request);
    assert.equal(first.changed, true);
    assert.deepEqual(first.changes, { name:"Maya Cohen", sex:"female" });

    const current = world.getThread(seeded.threadId);
    assert.equal(current.identity.name, "Maya Cohen");
    assert.equal(current.identity.sex, "female");
    assert.deepEqual(world.replayThread(seeded.threadId), current);

    const event = world.listEvents(seeded.threadId).at(-1);
    assert.equal(event.eventType, "THREAD_IDENTITY_UPDATED");
    assert.deepEqual(event.payload.changes, { name:"Maya Cohen", sex:"female" });
    assert.equal(event.provenance.source, "admin_operator");
    assert.equal(event.provenance.notThreadLifeEvent, true);

    const retry = identity.update(current, request);
    assert.equal(retry.reused, true);
    assert.equal(retry.eventId, first.eventId);
    assert.equal(world.listEvents(seeded.threadId).filter((entry) => entry.eventType === "THREAD_IDENTITY_UPDATED").length, 1);

    assert.throws(
      () => identity.update(current, { ...request, name:"Different Person" }),
      /operationKey .* different identity input/,
    );
  });
});
