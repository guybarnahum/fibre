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

test("birth date accepts paste-friendly forms and stores canonical ISO", () => {
  const cases = [
    ["08202004", "2004-08-20"],
    ["08/20/2004", "2004-08-20"],
    ["8/20/2004", "2004-08-20"],
    ["20040820", "2004-08-20"],
    ["2004/08/20", "2004-08-20"],
    ["2004-08-20", "2004-08-20"],
  ];

  for (const [input, expected] of cases) {
    withWorld(({ world, identity }) => {
      const seeded = world.seedThread(structuredClone(fixture)).thread;
      const result = identity.update(seeded, {
        birthDate:input,
        operationKey:`admin_birth_${input.replace(/\D/gu, "_")}`,
        changedAt:"2026-09-16T17:30:00.000Z",
      });
      assert.equal(result.thread.identity.birthDate, expected);
      assert.equal(world.replayThread(seeded.threadId).identity.birthDate, expected);
    });
  }
});

test("explicit Admin identity decisions are one replayable World event", () => {
  withWorld(({ world, identity }) => {
    const source = structuredClone(fixture);
    delete source.identity.sex;
    const seeded = world.seedThread(source).thread;
    const request = {
      name:"Maya Cohen",
      sex:"female",
      birthDate:"2004-08-20",
      operationKey:"admin_identity_maya_1",
      changedAt:"2026-09-16T17:30:00.000Z",
    };

    const first = identity.update(seeded, request);
    assert.equal(first.changed, true);
    assert.deepEqual(first.changes, { name:"Maya Cohen", sex:"female", birthDate:"2004-08-20" });

    const current = world.getThread(seeded.threadId);
    assert.equal(current.identity.name, "Maya Cohen");
    assert.equal(current.identity.sex, "female");
    assert.equal(current.identity.birthDate, "2004-08-20");
    assert.deepEqual(world.replayThread(seeded.threadId), current);

    const event = world.listEvents(seeded.threadId).at(-1);
    assert.equal(event.eventType, "THREAD_IDENTITY_UPDATED");
    assert.deepEqual(event.payload.changes, { name:"Maya Cohen", sex:"female", birthDate:"2004-08-20" });
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
    assert.throws(
      () => identity.update(current, {
        birthDate:"2004-02-30",
        operationKey:"admin_identity_invalid_birth_date",
      }),
      /birth date is invalid/,
    );
  });
});


test("birth geography repair is one replayable World identity event", () => {
  withWorld(({ world, identity }) => {
    const source = structuredClone(fixture);
    source.identity.birthCity = "Hilo Hawaii, USA";
    delete source.identity.birthPlace;
    const seeded = world.seedThread(source).thread;
    const birthPlace = {
      displayName:"Hilo, Hawaii, United States",
      country:"United States",
      city:"Hilo, Hawaii",
      lat:19.70737,
      long:-155.08158,
    };

    const result = identity.update(seeded, {
      birthPlace,
      operationKey:"admin_birth_geography_hilo_1",
      changedAt:"2026-09-25T23:00:00.000Z",
    });

    assert.equal(result.thread.identity.birthCity, birthPlace.displayName);
    assert.deepEqual(result.thread.identity.birthPlace, birthPlace);
    assert.deepEqual(world.replayThread(seeded.threadId), world.getThread(seeded.threadId),
      "birth geography repair did not survive World replay");
    const event = world.listEvents(seeded.threadId).at(-1);
    assert.deepEqual(event.payload.changes, {
      birthCity:birthPlace.displayName,
      birthPlace,
    });
  });
});

test("renaming keeps neutral self identity coherent without overwriting developed self-understanding", () => {
  withWorld(({ world, identity }) => {
    const source = structuredClone(fixture);
    source.identity.name = "Luka Beridze";
    source.currentState.selfModel = "I am Luka Beridze.";
    const seeded = world.seedThread(source).thread;

    const renamed = identity.update(seeded, {
      name:"Luka Mzechabuki",
      operationKey:"admin_name_luka_mzechabuki",
      changedAt:"2026-09-22T15:55:00.000Z",
    });

    assert.equal(renamed.thread.identity.name, "Luka Mzechabuki");
    assert.equal(renamed.thread.currentState.selfModel, "I am Luka Mzechabuki.",
      "neutral self identity should follow an explicit rename");
    assert.deepEqual(world.replayThread(seeded.threadId), world.getThread(seeded.threadId),
      "renamed self identity must replay exactly");
  });

  withWorld(({ world, identity }) => {
    const source = structuredClone(fixture);
    source.identity.name = "Luka Mzechabuki";
    source.currentState.selfModel = "I am Luka Beridze.";
    const seeded = world.seedThread(source).thread;

    const repaired = identity.update(seeded, {
      name:"Luka Mzechabuki",
      operationKey:"admin_name_luka_repair_stale_self",
      changedAt:"2026-09-22T15:55:30.000Z",
    });

    assert.equal(repaired.thread.identity.name, "Luka Mzechabuki");
    assert.equal(repaired.thread.currentState.selfModel, "I am Luka Mzechabuki.",
      "setting the current name again should repair a stale neutral name-model");
    assert.deepEqual(world.replayThread(seeded.threadId), world.getThread(seeded.threadId),
      "same-name self-model repair must replay exactly");
  });

  withWorld(({ world, identity }) => {
    const source = structuredClone(fixture);
    source.identity.name = "Luka Beridze";
    source.currentState.selfModel = "I am becoming more willing to trust my own judgment.";
    const seeded = world.seedThread(source).thread;

    const renamed = identity.update(seeded, {
      name:"Luka Mzechabuki",
      operationKey:"admin_name_luka_keep_developed_self",
      changedAt:"2026-09-22T15:56:00.000Z",
    });

    assert.equal(renamed.thread.currentState.selfModel,
      "I am becoming more willing to trust my own judgment.",
      "rename must not overwrite developed self-understanding");
  });
});
