import assert from "node:assert/strict";
import test from "node:test";

import {
  fidPresentationInvalidation,
  presentationCompletionInvalidation,
  publishAdminInvalidation,
} from "../src/admin-invalidation.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";

test("Admin invalidations are provider-neutral realtime hints", async () => {
  const infra = createMemoryInfraDriver();
  const received = [];
  await infra.realtime.listen("admin", (value) => { received.push(value); });

  const accepted = {
    handled:true,
    duplicate:false,
    stale:false,
    scope:{ entityKind:"thread", entityRef:"thr_live" },
    publication:{ event:{ kind:"media.ready" } },
  };
  await publishAdminInvalidation(infra.realtime, presentationCompletionInvalidation(accepted));
  await publishAdminInvalidation(
    infra.realtime,
    fidPresentationInvalidation("thr_fid", { complete:true, presentation:{ changed:true } }),
  );

  assert.deepEqual(received, [
    { entity:"thread", id:"thr_live", aspect:"presentation" },
    { entity:"thread", id:"thr_fid", aspect:"presentation" },
  ], "Admin invalidations leaked provider semantics");
  assert.equal(presentationCompletionInvalidation({ ...accepted, duplicate:true }), null);
  assert.equal(fidPresentationInvalidation("thr_fid", { complete:true, presentation:{ changed:false } }), null);
});
