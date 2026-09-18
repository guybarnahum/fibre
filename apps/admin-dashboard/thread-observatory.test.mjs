import assert from "node:assert/strict";
import test from "node:test";

import { mergeObservatoryWorldIdentity } from "./thread-observatory.js";

test("Thread Observatory renders mutable identity from current authoritative World", () => {
  const staleProjection = {
    threadId:"thr_observatory_1",
    displayName:"Maya Cohen",
    sex:"female",
    birthDate:"2004-08-20",
    birthPlace:"Jerusalem, Israel",
    culture:["Jerusalem formative context"],
    languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
    originOrientation:"original",
    lifecycleStatus:"active",
    presentation:{ snapshotVersion:"stale-public-projection" },
  };
  const deepWorld = {
    thread:{
      threadId:"thr_observatory_1",
      version:8,
      status:"active",
      identity:{
        name:"Maya Cohen",
        sex:"female",
        birthDate:"2004-08-20",
        birthCity:"Jerusalem, Israel",
        culture:["Jerusalem formative context"],
        languages:["Hebrew", "English"],
        originOrientation:"original",
        selfDescription:"I persist.",
      },
    },
    civilRegistration:{ fibreIdentityNumber:"FIN-OBS-1" },
    embodiments:[],
    symbolicGenomes:[],
  };

  const merged = mergeObservatoryWorldIdentity(staleProjection, deepWorld);

  assert.deepEqual(merged.languages, ["Hebrew", "English"], "stale projected languages must not override current World identity");
  assert.equal(merged.world.thread.version, 8);
  assert.equal(merged.presentation.snapshotVersion, "stale-public-projection", "Presentation must remain separately inspectable");
});

test("Thread Observatory preserves identity projection when deep World is unavailable", () => {
  const identity = {
    displayName:"Maya Cohen",
    languages:["Hebrew", "English"],
    lifecycleStatus:"active",
  };
  const merged = mergeObservatoryWorldIdentity(identity, null);
  assert.deepEqual(merged.languages, ["Hebrew", "English"]);
  assert.equal(merged.world, null);
});
