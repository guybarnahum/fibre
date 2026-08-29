// fibre-test-support: test-only

import {
  FIBRE_IDENTITY_NUMBER_ALPHABET,
  buildFibreCivilRegistration,
  fibreIdentityNumberFromPayload,
} from "#core/src/fibre-civil-identity.mjs";
import { normalizeSeedSnapshot } from "../../src/persistence-domain.mjs";
import { sha256 } from "../../src/persistence-common.mjs";

function payloadForThread(threadId) {
  const hex = sha256(`test-fin:${threadId}`);
  let payload = "";
  for (let index = 0; index < 9; index += 1) {
    const byte = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    payload += FIBRE_IDENTITY_NUMBER_ALPHABET[byte % FIBRE_IDENTITY_NUMBER_ALPHABET.length];
  }
  return payload;
}

export function testCivilRegistrationForBirth(birth) {
  if (!birth?.manifest || !birth?.thread) throw new TypeError("test FIN fixture requires manifest and Thread");
  const seed = normalizeSeedSnapshot(birth.thread);
  return buildFibreCivilRegistration({
    threadId: birth.manifest.threadId,
    fibreIdentityNumber: fibreIdentityNumberFromPayload(payloadForThread(birth.manifest.threadId)),
    registeredAt: birth.manifest.publication.publishedAt,
    birthEventRef: seed.provenance.lastEventId,
    worldRef: birth.manifest.worldSpecRef,
  });
}

export function attachTestCivilRegistration(birth) {
  const civilRegistration = testCivilRegistrationForBirth(birth);
  return {
    ...birth,
    manifest: {
      ...birth.manifest,
      publication: {
        ...birth.manifest.publication,
        civilRegistration,
      },
    },
  };
}
