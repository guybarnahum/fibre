import assert from "node:assert/strict";
import test from "node:test";

import {
  FIBRE_IDENTITY_CARD_CURRENT_VERSION,
  normalizeFibreIdentityCard,
} from "../src/index.mjs";

test("FID revision history does not invent a superseded predecessor", () => {
  const card = normalizeFibreIdentityCard({
    credentialVersion: FIBRE_IDENTITY_CARD_CURRENT_VERSION,
    credentialId: "fid_credential_2",
    revision: 2,
    supersedesCredentialId: null,
    registrationId: "registration_demo",
    issuedAt: "2026-09-10T00:00:00Z",
    expiresAt: null,
    status: "active",
    visibility: "public",
    frontMediaRef: "media_fid_front",
    backMediaRef: "media_fid_back",
    issuerAuthorityId: "fibre_identity_authority",
    sourceReferences: ["issuance_record_2"],
    provenanceRef: "prov_fid_2",
  });

  assert.equal(card.revision, 2);
  assert.equal(card.supersedesCredentialId, null);
});
