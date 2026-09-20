import assert from "node:assert/strict";
import test from "node:test";

import { createFidLifecycleReconciler } from "../src/fid-lifecycle-reconciler.mjs";

function active(revision) {
  return {
    threadId:"thr_fid_lifecycle",
    credentialId:`fidc_${revision}`,
    revision,
    supersedesCredentialId:revision === 1 ? null : `fidc_${revision - 1}`,
  };
}

test("FID lifecycle ensure reuses active identity while reissue advances it", async () => {
  let current = null;
  let cuts = 0;
  const projected = [];
  const reconciler = createFidLifecycleReconciler({
    fidAuthority:{
      async getActive() { return current; },
      async cut({ idempotencyKey }) {
        cuts += 1;
        current = active(cuts);
        return { result:{ state:"active", reused:false }, active:current, idempotencyKey };
      },
    },
    presentationProjection:{
      async reconcile({ activeFid }) {
        projected.push(activeFid.credentialId);
        return { changed:true, credentialId:activeFid.credentialId };
      },
    },
    now:() => "2026-09-19T19:30:00.000Z",
  });

  const initial = await reconciler.reconcile({
    threadId:"thr_fid_lifecycle",
    idempotencyKey:"fid_initial_1",
    mode:"ensure",
  });
  const replay = await reconciler.reconcile({
    threadId:"thr_fid_lifecycle",
    idempotencyKey:"fid_initial_replay",
    mode:"ensure",
  });
  const replacement = await reconciler.reconcile({
    threadId:"thr_fid_lifecycle",
    idempotencyKey:"fid_reissue_1",
    mode:"reissue",
  });

  assert.equal(initial.credential.revision, 1, "initial FID missing");
  assert.equal(replay.credential.credentialId, initial.credential.credentialId, "ensure replaced an active FID");
  assert.equal(replacement.credential.revision, 2, "reissue did not advance revision");
  assert.equal(replacement.credential.supersedesCredentialId, initial.credential.credentialId, "reissue lost predecessor");
  assert.equal(cuts, 2, "wrong number of FID cuts");
  assert.deepEqual(projected, ["fidc_1","fidc_1","fidc_2"], "active FID was not projected");
});

test("FID lifecycle waits for issuance before projecting a credential", async () => {
  let projections = 0;
  const reconciler = createFidLifecycleReconciler({
    fidAuthority:{
      async getActive() { return null; },
      async cut() {
        return {
          result:{ state:"derivation_requested", derivation:{ jobId:"job_fid_photo" } },
          active:null,
        };
      },
    },
    presentationProjection:{
      async reconcile() { projections += 1; },
    },
  });

  const result = await reconciler.reconcile({
    threadId:"thr_fid_pending",
    idempotencyKey:"fid_pending_1",
    mode:"ensure",
  });

  assert.equal(result.complete, false, "pending FID reported complete");
  assert.equal(result.state, "derivation_requested", "pending issuance state was lost");
  assert.equal(projections, 0, "unissued FID was projected");
});

test("FID reissue cuts a replacement without requiring the prior active presentation", async () => {
  const replacement = active(3);
  const reconciler = createFidLifecycleReconciler({
    fidAuthority:{
      async getActive() { throw new Error("old card is not projectable"); },
      async cut() { return { result:{ state:"active" }, active:replacement }; },
    },
    presentationProjection:{
      async reconcile({ activeFid }) {
        return { changed:true, credentialId:activeFid.credentialId };
      },
    },
  });

  const result = await reconciler.reconcile({
    threadId:"thr_fid_lifecycle",
    idempotencyKey:"fid_reissue_from_old_1",
    mode:"reissue",
  });

  assert.equal(result.complete, true, "reissue should replace an unreadable prior card");
  assert.equal(result.credential.credentialId, replacement.credentialId, "replacement card was not projected");
});

