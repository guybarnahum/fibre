import assert from "node:assert/strict";
import test from "node:test";

import { createModernBirthRequestStore } from "../src/modern-birth-request-store.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

test("modern birth queue is durable from enqueue through progress", (t) => {
  const state = tempBirthState(t);
  let now = "2026-09-25T14:30:00.000Z";
  const store = createModernBirthRequestStore(state.storage(), { now:() => now });
  store.enqueue({
    requestId:"admin_birth_queue_1",
    requestedAt:"2026-09-25T14:29:58.000Z",
    location:null,
    sex:"female",
  });
  assert.equal(store.recent({ activeOnly:true })[0].status, "queued");

  now = "2026-09-25T14:30:02.000Z";
  store.progress("admin_birth_queue_1", {
    status:"authoring",
    location:"Georgia/Tbilisi",
    locationSource:"anchor",
  });
  store.close();

  const reopened = createModernBirthRequestStore(state.storage(), { now:() => now });
  assert.deepEqual(reopened.get("admin_birth_queue_1"), {
    requestId:"admin_birth_queue_1",
    requestedAt:"2026-09-25T14:29:58.000Z",
    requestedLocation:null,
    requestedSex:"female",
    location:"Georgia/Tbilisi",
    locationSource:"anchor",
    sex:null,
    status:"authoring",
    threadId:null,
    genesisId:null,
    error:null,
    createdAt:"2026-09-25T14:30:00.000Z",
    updatedAt:"2026-09-25T14:30:02.000Z",
  });
  reopened.progress("admin_birth_queue_1", {
    status:"developing",
    sex:"female",
    threadId:"thr_queue_1",
    genesisId:"genesis_queue_1",
  });
  reopened.progress("admin_birth_queue_1", { status:"published" });
  assert.equal(reopened.recent({ activeOnly:true }).length, 0);
  reopened.close();
});
