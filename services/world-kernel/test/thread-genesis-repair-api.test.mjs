import test from "node:test";
import assert from "node:assert/strict";

import { createThreadGenesisRepairApi } from "../src/thread-genesis-repair-api.mjs";

const privateToken = "repair-private-token-123";

function api() {
  return createThreadGenesisRepairApi({
    privateToken,
    repairService:{
      async diagnose(threadId) {
        if (threadId === "thr_missing") return { threadId, exists:false, health:"unrecoverable", findings:[] };
        return { threadId, exists:true, health:"repairable", findings:[{ code:"PRESENTATION_MISSING", state:"repairable" }] };
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
  });
}

test("R1 repair diagnosis is private and read-only", async () => {
  const repairApi = api();
  const denied = await repairApi.fetch(new Request("https://world.internal/internal/threads/thr_1/repair"));
  assert.equal(denied.status, 403);

  const response = await repairApi.fetch(new Request("https://world.internal/internal/threads/thr_1/repair", {
    headers:{ "x-fibre-private-token":privateToken },
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.contract, "fibre-thread-repair-v0.1");
  assert.equal(body.diagnosis.health, "repairable");
});

test("R2-R3 repair executes only through authenticated POST", async () => {
  const repairApi = api();
  const response = await repairApi.fetch(new Request("https://world.internal/internal/threads/thr_1/repair", {
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-fibre-private-token":privateToken,
    },
    body:JSON.stringify({ repairKey:"admin-test-1" }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.after.health, "healthy");
  assert.deepEqual(body.result.actions.map((entry) => entry.action), ["rebuild_presentation"]);
});

test("R1 distinguishes a missing World Thread from malformed admitted state", async () => {
  const repairApi = api();
  const response = await repairApi.fetch(new Request("https://world.internal/internal/threads/thr_missing/repair", {
    headers:{ "x-fibre-private-token":privateToken },
  }));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).diagnosis.exists, false);
});
