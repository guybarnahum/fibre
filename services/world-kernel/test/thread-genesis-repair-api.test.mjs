import test from "node:test";
import assert from "node:assert/strict";

import { createThreadGenesisRepairApi } from "../src/thread-genesis-repair-api.mjs";

const privateToken = "repair-private-token-123";

function api(options = {}) {
  return createThreadGenesisRepairApi({
    privateToken,
    identityService:{
      async update(threadId, { operationKey, name, sex, birthDate }) {
        return {
          threadId,
          operationKey,
          exists:threadId !== "thr_missing",
          changed:threadId !== "thr_missing",
          eventId:threadId === "thr_missing" ? null : "evt_identity_1",
          changes:threadId === "thr_missing" ? {} : { name, sex, birthDate },
          identity:threadId === "thr_missing" ? null : { name:name ?? "Thread", sex:sex ?? null, birthDate:birthDate ?? null },
          version:threadId === "thr_missing" ? null : 2,
        };
      },
    },
    visualIdentityRepairService:{
      repair({ threadId, operationKey, correctedSpecification, reason, evidenceReferences }) {
        return {
          threadId,
          operationKey,
          previous:{ revision:2, referenceObjectRef:"visual_identity_reference_old" },
          embodiment:{
            revision:3,
            status:"pending_generation",
            specification:correctedSpecification,
            respecification:{ reason, evidenceReferences:["visual_identity_reference_old", ...evidenceReferences] },
          },
        };
      },
    },
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
      async updateRaisedLanguages(threadId, { operationKey, languages }) {
        return {
          threadId,
          operationKey,
          before:{ exists:true, health:"operator_decision_required" },
          after:{ exists:true, health:"healthy" },
          changed:true,
          result:{ languages },
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

test("repair diagnosis exposes the Thread's semantic repair state", async () => {
  const body = await (await api().fetch(authorized("https://world.internal/internal/threads/thr_1/repair"))).json();
  assert.equal(body.diagnosis.health, "repairable");
});

test("Admin identity input changes World authority without requiring a repair diagnosis", async () => {
  const repairApi = api();
  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_1/repair", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({
      action:"identity",
      operationKey:"admin_identity_1",
      name:"Maya Cohen",
      sex:"female",
      birthDate:"2004-08-20",
    }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.identityUpdate.identity, { name:"Maya Cohen", sex:"female", birthDate:"2004-08-20" });
  assert.equal(body.identityUpdate.changed, true);
});

test("canonical visual correction replaces authority then reopens reconciliation", async () => {
  let state = {
    threadId:"thr_1",
    state:"complete",
    lastError:null,
    updatedAt:"2026-09-24T04:00:00.000Z",
  };
  let wakes = 0;
  const workset = {
    get() { return state; },
    requeue() {
      state = { ...state, state:"pending", updatedAt:"2026-09-24T05:10:00.000Z" };
      return true;
    },
  };
  const repairApi = api({
    reconciliationWorkset:workset,
    onVisualIdentityCorrection:async () => { wakes += 1; },
  });
  const correctedSpecification = {
    subject:{ partyId:"thr_1", description:"adult male person with concrete corrected stable visual identity landmarks" },
    method:"canonical synthetic portrait specification",
    description:"Preserve the corrected stable visual identity across age transformations and derived imagery.",
    model:"replaceable-renderer",
  };

  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_1/repair", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({
      action:"canonical_visual_identity",
      operationKey:"repair_visual_1",
      correctedSpecification,
      reason:"Correct a materially wrong admitted canonical root.",
      evidenceReferences:[],
    }),
  }));
  const body = await response.json();

  assert.equal(response.status, 200, "visual correction failed");
  assert.equal(body.visualIdentityCorrection.embodiment.status, "pending_generation", "canonical root was not reopened");
  assert.equal(body.reconciliation.state, "pending", "corrected identity did not re-enter reconciliation");
  assert.equal(wakes, 1, "corrected identity did not schedule reconciliation");
});

test("Raised languages use Genesis correction rather than identity mutation", async () => {
  let identityCalled = false;
  const repairApi = api({
    identityService:{
      async update() {
        identityCalled = true;
        throw new Error("raised languages must not use identity mutation");
      },
    },
  });
  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_1/repair", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({
      action:"raised_languages",
      operationKey:"admin_raised_languages_1",
      languages:["Hebrew", "Russian"],
    }),
  }));
  const body = await response.json();

  assert.equal(response.status, 200, "raised-language correction failed");
  assert.equal(identityCalled, false, "raised languages mutated current identity");
  assert.deepEqual(body.raisedLanguagesUpdate.result.languages, ["Hebrew", "Russian"], "Genesis correction lost languages");
});

test("identity correction projects the new person state after World accepts it", async () => {
  let projected = null;
  const repairApi = api({
    onIdentityUpdate:async ({ threadId, result }) => {
      projected = { threadId, name:result.identity.name };
      return { state:"current", changed:true };
    },
  });
  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_1/repair", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({
      action:"identity",
      operationKey:"admin_identity_projection_1",
      name:"Maya Cohen",
    }),
  }));
  const body = await response.json();

  assert.equal(response.status, 200, "identity correction failed");
  assert.deepEqual(projected, { threadId:"thr_1", name:"Maya Cohen" }, "Presentation missed World correction");
  assert.equal(body.identityProjection.state, "current", "projection did not converge");
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

test("repair converts repairable state through bounded repair actions", async () => {
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

test("repair diagnosis distinguishes a missing World Thread", async () => {
  const repairApi = api();
  const response = await repairApi.fetch(authorized("https://world.internal/internal/threads/thr_missing/repair"));
  assert.equal((await response.json()).diagnosis.exists, false);
});
