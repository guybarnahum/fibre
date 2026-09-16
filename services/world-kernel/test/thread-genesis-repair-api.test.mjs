import test from "node:test";
import assert from "node:assert/strict";

import { createThreadGenesisRepairApi } from "../src/thread-genesis-repair-api.mjs";

const privateToken = "repair-private-token-123";

function api(options = {}) {
  return createThreadGenesisRepairApi({
    privateToken,
    repairService:{
      async diagnose(threadId) {
        if (threadId === "thr_missing") return { threadId, exists:false, health:"unrecoverable", findings:[] };
        return { threadId, exists:true, health:"repairable", findings:[{ code:"PRESENTATION_MISSING", state:"repairable" }] };
      },
      async migrate(threadId, { migrationId, migrationKey, input }) {
        return {
          threadId,
          migrationId,
          migrationKey,
          input,
          before:{ exists:true, health:"migration_required" },
          after:{ exists:true, health:"healthy" },
          migrated:true,
        };
      },
      async repair(threadId, { repairKey }) {
        return {
          threadId,
          repairKey,
          before:{ exists:true, health:"repairable" },
          after:{ exists:true, health:"healthy" },
          actions:[{ action:"rebuild_presentation" }],
        };
      },
    },
    ...options,
  });
}

function authorized(url, init = {}) {
  return new Request(url, {
    ...init,
    headers:{
      ...(init.headers ?? {}),
      "x-fibre-private-token":privateToken,
    },
  });
}

test("R1 repair diagnosis is private and read-only", async () => {
  const repairApi = api();
  const denied = await repairApi.fetch(new Request("https://world.internal/internal/threads/thr_1/repair"));
  assert.equal(denied.status, 403);

  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_1/repair"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.contract, "fibre-thread-repair-v0.3");
  assert.equal(body.diagnosis.health, "repairable");
});

test("named migration remains distinct from repair", async () => {
  const repairApi = api();
  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_1/repair", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({
      action:"migrate",
      migrationId:"genesis_sex_v1",
      migrationKey:"admin-migration-1",
      input:null,
    }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.migration.migrationId, "genesis_sex_v1");
  assert.equal(body.migration.after.health, "healthy");
});

test("R2-R3 repair executes only through authenticated POST", async () => {
  const repairApi = api();
  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_1/repair", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ repairKey:"admin-test-1" }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.after.health, "healthy");
  assert.deepEqual(body.result.actions.map((entry) => entry.action), ["rebuild_presentation"]);
});

test("dead-letter Thread is visible and recovery revives only that work", async () => {
  let state = {
    threadId:"thr_dead",
    state:"dead_letter",
    lastError:{ code:"INVALID_BIRTH_MISSING_CANONICAL_VISUAL_IDENTITY", retryable:false },
    updatedAt:"2026-09-16T00:00:00.000Z",
  };
  let wakes = 0;
  const workset = {
    get(threadId) { return threadId === "thr_dead" ? state : null; },
    requeue(threadId) {
      if (threadId !== "thr_dead" || state.state !== "dead_letter") return false;
      state = { ...state, state:"pending", lastError:null };
      return true;
    },
  };
  const repairApi = api({ reconciliationWorkset:workset, onRecover:async () => { wakes += 1; } });

  const diagnosis = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_dead/repair"));
  assert.equal((await diagnosis.json()).reconciliation.state, "dead_letter", "dead letter must be visible");

  const recovery = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_dead/repair", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ action:"recover" }),
  }));
  const body = await recovery.json();
  assert.equal(recovery.status, 200);
  assert.equal(body.recovery.after.state, "pending", "recovery must revive targeted work");
  assert.equal(wakes, 1, "recovery must schedule one reconciliation wake");
});

test("R1 distinguishes a missing World Thread from malformed admitted state", async () => {
  const repairApi = api();
  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_missing/repair"));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).diagnosis.exists, false);
});
