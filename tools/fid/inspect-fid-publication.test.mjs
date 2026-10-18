import assert from "node:assert/strict";
import test from "node:test";

import { inspectFidPublication } from "./inspect-fid-publication.mjs";

test("FID continuity requires a new, canonical-derived active photo and both published card sides", () => {
  const canonicalRef = "portrait_current";
  const active = {
    threadId:"thr_example", credentialId:"fid_new", status:"active",
    proofStatus:"verified", revision:2, supersedesCredentialId:"fid_previous",
    registrationId:"registration_example",
    photo:{objectRef:"photo_new",digest:"sha256:photo",sourceReferences:[canonicalRef]},
    front:{objectRef:"fid_front",digest:"sha256:front"},
    back:{objectRef:"fid_back",digest:"sha256:back"},
  };
  const snapshot = {
    presentation:{
      visualIdentity:{referenceObjectRefs:[canonicalRef]},
      identityCard:{
        status:"active", credentialId:"fid_new", revision:2,
        supersedesCredentialId:"fid_previous", registrationId:"registration_example",
        frontMediaRef:"media_front", backMediaRef:"media_back",
      },
    },
    media:{assets:[
      {role:"official_id_photo",status:"ready",locator:"photo_new",sha256:"sha256:photo",sourceReferences:[canonicalRef]},
      {mediaId:"media_front",role:"fibre_identity_card_front",status:"ready",locator:"fid_front",sha256:"sha256:front"},
      {mediaId:"media_back",role:"fibre_identity_card_back",status:"ready",locator:"fid_back",sha256:"sha256:back"},
    ]},
  };
  const data = {
    world:{observatory:{embodiments:[{kind:"portrait",status:"available",visibility:"public",asset:{referenceObjectRef:canonicalRef,sha256:"sha256:root"}}]}},
    worldIdentity:{contract:"fibre-world-thread-identity-v0.3",identity:{threadId:"thr_example",embodiments:[{asset:{referenceObjectRef:canonicalRef,sha256:"sha256:root"}}]}},
    authority:{active},
    publicSnapshot:{snapshot},
    previousPhotoRef:"photo_old",
  };
  assert.equal(inspectFidPublication(data).passed,true,"current FID must be verifiable");

  assert.equal(inspectFidPublication({...data,previousPhotoRef:"photo_new"}).passed,false,
    "reissuing the old photograph is not a correction");
  assert.equal(inspectFidPublication({...data,authority:{active:{...active,photo:{...active.photo,sourceReferences:[]}}}}).passed,false,
    "a FID photo without canonical provenance is not admitted continuity");
  assert.equal(inspectFidPublication({...data,publicSnapshot:{
    snapshot:{...snapshot,media:{assets:snapshot.media.assets.filter(a=>a.role!=="fibre_identity_card_back")}},
  }}).passed,false,"missing card back cannot pass publication");
  assert.equal(inspectFidPublication({...data,publicSnapshot:{
    snapshot:{...snapshot,media:{assets:snapshot.media.assets.filter(a=>a.role!=="official_id_photo")}},
  }}).passed,false,"missing public ID photo cannot pass publication");
});
