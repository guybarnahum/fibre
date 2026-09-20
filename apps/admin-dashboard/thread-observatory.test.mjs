import assert from "node:assert/strict";
import test from "node:test";

import {
  identityWithFidPublication,
  mergeObservatoryWorldIdentity,
  reissueFidCard,
  resumeFidReissue,
} from "./thread-observatory.js";

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

test("Thread Observatory keeps a newer authoritative identity read when deep Observatory lags", () => {
  const currentIdentity = {
    threadId:"thr_observatory_1",
    displayName:"Maya Cohen",
    sex:"female",
    birthDate:"2004-08-20",
    birthPlace:"Jerusalem, Israel",
    culture:["Jerusalem formative context"],
    languages:["Hebrew", "Russian", "English"],
    originOrientation:"original",
    lifecycleStatus:"active",
    version:9,
  };
  const laggingDeepWorld = {
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
        languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
        originOrientation:"original",
        selfDescription:"I persist.",
      },
    },
    civilRegistration:{ fibreIdentityNumber:"FIN-OBS-1" },
    embodiments:[],
    symbolicGenomes:[],
  };

  const merged = mergeObservatoryWorldIdentity(currentIdentity, laggingDeepWorld);

  assert.deepEqual(merged.languages, ["Hebrew", "Russian", "English"]);
  assert.equal(merged.version, 9);
  assert.equal(merged.world.thread.version, 8, "lagging deep World remains inspectable rather than being rewritten");
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


test("successful FIN reissue projects returned publication immediately", () => {
  const identity = {
    threadId:"thr_sara",
    assets:[{
      mediaId:"media_old_front",
      role:"fibre_identity_card_front",
      objectRef:"fidcard_old_front",
      url:"/api/thread-assets/fidcard_old_front",
      source:"current_public_presentation",
      deliveryStatus:"published",
    },{
      mediaId:"world_portrait",
      role:"canonical_portrait",
      source:"world_embodiment",
      url:null,
    }],
    presentation:{
      presentation:{
        identityCard:{ credentialId:"fidc_old", revision:1 },
      },
    },
  };
  const result = {
    credential:{ credentialId:"fidc_new", revision:2 },
    presentation:{
      publication:{
        snapshot:{
          presentation:{
            identityCard:{
              credentialId:"fidc_new",
              revision:2,
              frontMediaRef:"media_new_front",
              backMediaRef:"media_new_back",
            },
          },
          media:{
            assets:[{
              mediaId:"media_new_front",
              kind:"image",
              role:"fibre_identity_card_front",
              status:"ready",
              locator:"fidcard_new_front",
              mediaType:"image/png",
            },{
              mediaId:"media_new_back",
              kind:"image",
              role:"fibre_identity_card_back",
              status:"ready",
              locator:"fidcard_new_back",
              mediaType:"image/png",
            }],
          },
        },
      },
    },
  };

  const projected = identityWithFidPublication(identity, result);

  assert.equal(projected.presentation.presentation.identityCard.credentialId, "fidc_new", "new FIN snapshot was not projected");
  assert.equal(projected.assets.find((asset) => asset.mediaId === "media_new_front")?.url, "/api/thread-assets/fidcard_new_front", "new FIN media was not immediately addressable");
  assert.equal(projected.assets.some((asset) => asset.mediaId === "media_old_front"), false, "stale FIN media survived reissue projection");
  assert.equal(projected.assets.some((asset) => asset.mediaId === "world_portrait"), true, "non-presentation media was lost");
});


test("first FIN issuance resumes the same idempotent workflow after photo derivation", async () => {
  const originalFetch = globalThis.fetch;
  const bodies = [];
  let request = 0;
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    request += 1;
    const payload = request === 1
      ? {
          complete:false,
          state:"derivation_requested",
          credential:null,
          derivation:{ jobId:"asset_fid_photo_1", status:"queued" },
          presentation:null,
        }
      : {
          complete:true,
          state:"active",
          credential:{ credentialId:"fidc_first", revision:1, supersedesCredentialId:null },
          derivation:null,
          presentation:{ changed:true },
        };
    return new Response(JSON.stringify(payload), {
      status:request === 1 ? 202 : 200,
      headers:{ "Content-Type":"application/json" },
    });
  };

  try {
    const idempotencyKey = "admin_fid_reissue_first_card";
    const initial = await reissueFidCard("thr_first_card", { idempotencyKey });
    assert.equal(initial.state, "derivation_requested");

    const completed = await resumeFidReissue("thr_first_card", {
      idempotencyKey,
      initialResult:initial,
      wait:async () => {},
      maxAttempts:2,
    });

    assert.equal(completed.state, "active");
    assert.equal(completed.credential.revision, 1);
    assert.deepEqual(
      bodies.map((body) => body.idempotencyKey),
      [idempotencyKey, idempotencyKey],
      "first-card continuation started a new issuance workflow instead of resuming the existing one",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
