import assert from "node:assert/strict";
import test from "node:test";

import { createBirthRequestStore } from "../src/birth-request-store.mjs";
import { createGenesisDevelopmentRequestStore } from "../src/genesis-development-request-store.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

test("birth queue is durable from enqueue through progress", (t) => {
  const state = tempBirthState(t);
  let now = "2026-09-25T14:30:00.000Z";
  const store = createBirthRequestStore(state.storage(), { now:() => now });
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

  const reopened = createBirthRequestStore(state.storage(), { now:() => now });
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

test("unsettled failed query reaches an old admin reservation outside recent births",t=>{
  const state=tempBirthState(t);
  let now="2026-09-01T00:00:00.000Z";
  const store=createBirthRequestStore(state.storage(),{now:()=>now});
  const developments=createGenesisDevelopmentRequestStore(state.storage(),{now:()=>now});
  t.after(()=>{developments.close();store.close();});
  const requestId="admin_old_failure",genesisId="gen_admin_old",threadId="thr_admin_old";
  store.enqueue({requestId,requestedAt:now});
  developments.reserve({requestId,requestDigest:"digest_admin_old",
    plan:{requestId,requestDigest:"digest_admin_old",genesisId,threadId}});
  store.progress(requestId,{status:"failed",locationSource:"sampled",genesisId,threadId});
  now="2026-10-28T00:00:00.000Z";
  for(let i=0;i<65;i++){
    const id="admin_new_"+i;
    store.enqueue({requestId:id,requestedAt:now});
    store.progress(id,{status:"published"});
  }
  assert.ok(!store.recent({limit:64}).some(birth=>birth.requestId===requestId),
    "old failure was not outside the recency window");
  assert.deepEqual(store.unsettledFailed({limit:64}).map(birth=>birth.requestId),
    [requestId],"indexed failure query missed old admin reservation");
  developments.settleStillborn(requestId);
  assert.deepEqual(store.unsettledFailed({limit:64}),[],
    "settled failure remains eligible for World reconciliation");
});
