import test from "node:test";
import assert from "node:assert/strict";

import { resolveAdminThreadIdentity } from "./thread-identity.mjs";

test("O1 resolves a Thread into human identity while preserving provenance", async () => {
  const identity = await resolveAdminThreadIdentity({
    environment:"staging",
    threadId:"thr_test_1",
    fetchImpl:async () => Response.json({
      pointer:{ threadId:"thr_test_1" },
      snapshot:{ presentation:{
        subject:{ displayName:"Thread One", birthDate:"2012-02-03" },
        civilIdentity:{ fibreIdentityNumber:"4JX5-2N-04K2" },
        manifest:{ lifecycleStatus:"active" },
      } },
    }),
  });

  assert.deepEqual(identity, {
    threadId:"thr_test_1",
    displayName:"Thread One",
    fibreIdentityNumber:"4JX5-2N-04K2",
    birthDate:"2012-02-03",
    lifecycleStatus:"active",
    provenance:{
      displayName:"resolved_after_fact",
      fibreIdentityNumber:"resolved_after_fact",
      source:"current_public_presentation",
    },
  });
});
