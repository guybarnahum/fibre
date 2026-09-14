import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GenesisSexMigrationStore } from "../src/genesis-sex-migration-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const evidence = Object.freeze({
  sex:"female",
  genesisId:"genesis_mina_birth",
  source:"genesis_birth_publication",
  resultDigest:`sha256:${"a".repeat(64)}`,
});

function withWorld(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-sex-migration-"));
  const databasePath = join(directory, "world.sqlite");
  const storage = localWorldStateStorage(databasePath);
  const world = openWorldStore(storage);
  const migration = new GenesisSexMigrationStore(storage);
  try {
    return run({ world, migration });
  } finally {
    migration.close();
    world.close();
    rmSync(directory, { recursive:true, force:true });
  }
}

test("R6 Genesis sex restoration is evidence-backed, append-only, replayable, and not a life event", () => {
  withWorld(({ world, migration }) => {
    const source = structuredClone(fixture);
    delete source.identity.sex;
    const seeded = world.seedThread(source).thread;

    const result = migration.migrate(seeded, { evidence, migratedAt:"2026-09-14T20:45:00.000Z" });
    assert.equal(result.migrated, true);
    assert.equal(result.sex, "female");

    const migrated = world.getThread(seeded.threadId);
    assert.equal(migrated.identity.sex, "female");
    assert.equal(migrated.version, seeded.version + 1);

    const event = world.listEvents(seeded.threadId).at(-1);
    assert.equal(event.eventType, "GENESIS_SEX_MIGRATED");
    assert.deepEqual(event.payload, {
      sex:"female",
      genesisId:"genesis_mina_birth",
      resultDigest:evidence.resultDigest,
    });
    assert.equal(event.provenance.source, "genesis_birth_publication");
    assert.equal(event.provenance.notThreadLifeEvent, true);

    const command = {
      commandId:"cmd_mina_after_genesis_migration",
      threadId:seeded.threadId,
      expectedVersion:migrated.version,
      type:"UPDATE_SELF_MODEL",
      payload:{
        selfModel:"I remain the same Thread after software migration.",
        summary:"Replay continues after restoring a missing Genesis fact.",
      },
      actor:{ entityId:"human_guy", kind:"human", displayName:"Guy Bar-Nahum" },
      occurredAt:"2026-09-14T20:46:00.000Z",
    };
    const applied = world.applyCommand(command);
    assert.equal(applied.thread.identity.sex, "female");
    const replayed = world.applyCommand(command);
    assert.equal(replayed.idempotent, true);
    assert.equal(replayed.thread.identity.sex, "female");
  });
});

test("R6 refuses to create sex without preserved Genesis evidence", () => {
  withWorld(({ world, migration }) => {
    const source = structuredClone(fixture);
    delete source.identity.sex;
    const seeded = world.seedThread(source).thread;
    assert.throws(() => migration.migrate(seeded), /requires authoritative birth evidence/);
    assert.equal(world.getThread(seeded.threadId).identity.sex, undefined);
  });
});

test("R6 Genesis sex restoration is idempotent once the evidenced fact exists", () => {
  withWorld(({ world, migration }) => {
    const source = structuredClone(fixture);
    delete source.identity.sex;
    const seeded = world.seedThread(source).thread;
    const first = migration.migrate(seeded, { evidence, migratedAt:"2026-09-14T20:45:00.000Z" });
    const current = world.getThread(seeded.threadId);
    const second = migration.migrate(current, { evidence, migratedAt:"2026-09-14T20:47:00.000Z" });

    assert.equal(first.migrated, true);
    assert.equal(second.migrated, false);
    assert.equal(second.reused, true);
    assert.equal(second.sex, first.sex);
    assert.equal(world.listEvents(seeded.threadId).filter((event) => event.eventType === "GENESIS_SEX_MIGRATED").length, 1);
  });
});
