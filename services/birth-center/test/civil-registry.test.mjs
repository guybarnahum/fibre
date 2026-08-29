import assert from "node:assert/strict";
import test from "node:test";

import {
  FIBRE_IDENTITY_NUMBER_ALPHABET,
  FIBRE_IDENTITY_NUMBER_POLICY,
  buildFibreCivilRegistration,
  fibreIdentityNumberFromPayload,
  normalizeFibreCivilRegistration,
  normalizeFibreIdentityNumber,
} from "#core/src/fibre-civil-identity.mjs";
import { createCivilRegistryService } from "../src/civil-registry.mjs";

function fakeAuthority(registrations = []) {
  const byFin = new Map(registrations.map((record) => [record.fibreIdentityNumber, record]));
  const byThread = new Map(registrations.map((record) => [record.threadId, record]));
  return {
    getCivilRegistrationByFin(fin) { return byFin.get(fin) ?? null; },
    getCivilRegistrationByThreadId(threadId) { return byThread.get(threadId) ?? null; },
  };
}

function randomSequenceFor(...payloads) {
  const queue = [...payloads.join("")].map((character) => FIBRE_IDENTITY_NUMBER_ALPHABET.indexOf(character));
  return (maximum) => {
    assert.equal(maximum, FIBRE_IDENTITY_NUMBER_ALPHABET.length);
    const value = queue.shift();
    if (value === undefined) throw new Error("deterministic FIN random sequence exhausted");
    return value;
  };
}

const birth = Object.freeze({
  threadId: "thr_civil_newborn_001",
  birthEventRef: "evt_civil_birth_001",
  worldRef: "world_civil_001",
  registeredAt: "2026-08-25T06:30:00Z",
});

test("FIN is canonical XXXX-XX-XXXX with one check character and no ambiguous alphabet", () => {
  assert.equal(FIBRE_IDENTITY_NUMBER_POLICY.displayPattern, "XXXX-XX-XXXX");
  for (const ambiguous of ["I", "L", "O", "U"]) {
    assert.equal(FIBRE_IDENTITY_NUMBER_ALPHABET.includes(ambiguous), false);
  }
  const fin = fibreIdentityNumberFromPayload("123456789");
  assert.match(fin, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(normalizeFibreIdentityNumber(fin), fin);
  const compact = fin.replaceAll("-", "");
  const replacement = compact.at(-1) === "0" ? "1" : "0";
  const tamperedCompact = `${compact.slice(0, -1)}${replacement}`;
  const tampered = `${tamperedCompact.slice(0, 4)}-${tamperedCompact.slice(4, 6)}-${tamperedCompact.slice(6)}`;
  assert.throws(() => normalizeFibreIdentityNumber(tampered), /check character/);
});

test("civil registration binds one FIN to Thread, birth event and World", () => {
  const registration = buildFibreCivilRegistration({
    ...birth,
    fibreIdentityNumber: fibreIdentityNumberFromPayload("123456789"),
  });
  assert.deepEqual(normalizeFibreCivilRegistration(registration), registration);
  assert.equal(registration.threadId, birth.threadId);
  assert.equal(registration.birthEventRef, birth.birthEventRef);
  assert.equal(registration.worldRef, birth.worldRef);
  assert.equal(registration.issuer, "fibre_civil_registry");
  assert.match(registration.registrationId, /^civreg_[0-9a-f]{64}$/);
});

test("Civil Registry retries an observed FIN collision before preparing a birth registration", () => {
  const blockedFin = fibreIdentityNumberFromPayload("123456789");
  const blocked = buildFibreCivilRegistration({
    threadId: "thr_other_001",
    fibreIdentityNumber: blockedFin,
    registeredAt: "2026-08-25T06:00:00Z",
    birthEventRef: "evt_other_birth_001",
    worldRef: "world_other_001",
  });
  const registry = createCivilRegistryService({
    authority: fakeAuthority([blocked]),
    randomIntFn: randomSequenceFor("123456789", "ABCDEFGHJ"),
  });
  const registration = registry.prepareBirthRegistration(birth);
  assert.notEqual(registration.fibreIdentityNumber, blockedFin);
  assert.equal(registration.fibreIdentityNumber, fibreIdentityNumberFromPayload("ABCDEFGHJ"));
  assert.equal(registration.threadId, birth.threadId);
});

test("Civil Registry is idempotent for an already registered Thread and rejects conflicting birth identity", () => {
  const existing = buildFibreCivilRegistration({
    ...birth,
    fibreIdentityNumber: fibreIdentityNumberFromPayload("ABCDEFGHJ"),
  });
  const registry = createCivilRegistryService({ authority: fakeAuthority([existing]) });
  assert.deepEqual(registry.prepareBirthRegistration(birth), existing);
  assert.throws(
    () => registry.prepareBirthRegistration({ ...birth, worldRef: "world_other_002" }),
    /already has a different Fibre civil registration/,
  );
});

test("Civil Registry attaches registration to a complete birth bundle without changing Thread identity", () => {
  const registry = createCivilRegistryService({
    authority: fakeAuthority(),
    randomIntFn: randomSequenceFor("ABCDEFGHJ"),
  });
  const bundle = {
    manifest: {
      threadId: birth.threadId,
      worldSpecRef: birth.worldRef,
      publication: { publishedAt: birth.registeredAt },
    },
    thread: {
      threadId: birth.threadId,
      provenance: { lastEventId: birth.birthEventRef },
    },
    episodes: [],
  };
  const attached = registry.attachRegistrationToBirth(bundle);
  assert.equal(attached.thread, bundle.thread);
  assert.equal(attached.manifest, bundle.manifest);
  assert.equal(attached.civilRegistration.threadId, birth.threadId);
  assert.equal(attached.civilRegistration.fibreIdentityNumber, fibreIdentityNumberFromPayload("ABCDEFGHJ"));
});
