import {
  buildFibreCivilRegistration,
  mintFibreIdentityNumber,
  normalizeFibreCivilRegistration,
  normalizeFibreIdentityNumber,
} from "#packages/domain/src/fibre-civil-identity.mjs";

const MAX_MINT_ATTEMPTS = 64;

function assertAuthority(authority) {
  if (!authority || typeof authority !== "object") {
    throw new TypeError("Civil Registry authority is required");
  }
  for (const method of ["getCivilRegistrationByFin", "getCivilRegistrationByThreadId"]) {
    if (typeof authority[method] !== "function") {
      throw new TypeError(`Civil Registry authority must expose ${method}()`);
    }
  }
  return authority;
}

function sameRegistration(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createCivilRegistryService({
  authority,
  randomIntFn,
  maxMintAttempts = MAX_MINT_ATTEMPTS,
} = {}) {
  const registryAuthority = assertAuthority(authority);
  if (!Number.isSafeInteger(maxMintAttempts) || maxMintAttempts < 1) {
    throw new TypeError("Civil Registry maxMintAttempts must be a positive integer");
  }

  function lookupByFin(fin) {
    const normalized = normalizeFibreIdentityNumber(fin);
    const record = registryAuthority.getCivilRegistrationByFin(normalized, { required: false });
    return record === null ? null : normalizeFibreCivilRegistration(record);
  }

  function lookupByThreadId(threadId) {
    const record = registryAuthority.getCivilRegistrationByThreadId(threadId, { required: false });
    return record === null ? null : normalizeFibreCivilRegistration(record);
  }

  function prepareBirthRegistration({ threadId, birthEventRef, worldRef, registeredAt }) {
    const existing = lookupByThreadId(threadId);
    if (existing !== null) {
      const requested = buildFibreCivilRegistration({
        threadId,
        fibreIdentityNumber: existing.fibreIdentityNumber,
        registeredAt,
        birthEventRef,
        worldRef,
      });
      if (!sameRegistration(existing, requested)) {
        throw new Error(`Thread ${threadId} already has a different Fibre civil registration`);
      }
      return existing;
    }

    for (let attempt = 1; attempt <= maxMintAttempts; attempt += 1) {
      const fibreIdentityNumber = mintFibreIdentityNumber({ randomIntFn });
      if (lookupByFin(fibreIdentityNumber) !== null) continue;
      return buildFibreCivilRegistration({
        threadId,
        fibreIdentityNumber,
        registeredAt,
        birthEventRef,
        worldRef,
      });
    }
    throw new Error(`Civil Registry could not mint a unique FIN after ${maxMintAttempts} attempts`);
  }

  function attachRegistrationToBirth(bundle) {
    if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
      throw new TypeError("Civil Registry birth bundle is required");
    }
    if (!bundle.manifest || !bundle.thread) {
      throw new TypeError("Civil Registry birth bundle requires manifest and thread");
    }
    if (bundle.civilRegistration !== undefined && bundle.civilRegistration !== null) {
      const registration = normalizeFibreCivilRegistration(bundle.civilRegistration);
      return Object.freeze({ ...bundle, civilRegistration: registration });
    }
    const registration = prepareBirthRegistration({
      threadId: bundle.manifest.threadId,
      birthEventRef: bundle.thread.provenance?.lastEventId,
      worldRef: bundle.manifest.worldSpecRef,
      registeredAt: bundle.manifest.publication?.publishedAt,
    });
    return Object.freeze({ ...bundle, civilRegistration: registration });
  }

  return Object.freeze({
    lookupByFin,
    lookupByThreadId,
    prepareBirthRegistration,
    attachRegistrationToBirth,
  });
}
