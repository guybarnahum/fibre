import {
  normalizeFibreCivilRegistration,
  normalizeFibreIdentityNumber,
} from "#core/src/fibre-civil-identity.mjs";

function requiredId(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function assertAuthority(authority) {
  if (authority === null || typeof authority !== "object" || Array.isArray(authority)) {
    throw new TypeError("Civil Registry authority is required");
  }
  for (const method of ["getCivilRegistrationByThreadId", "getCivilRegistrationByFin"]) {
    if (typeof authority[method] !== "function") {
      throw new TypeError(`Civil Registry authority must implement ${method}()`);
    }
  }
  return authority;
}

export function createCivilRegistryReadService({ authority } = {}) {
  const source = assertAuthority(authority);

  function lookupByThreadId(threadId) {
    const requestedThreadId = requiredId("Civil Registry threadId", threadId);
    const candidate = source.getCivilRegistrationByThreadId(requestedThreadId, { required: false });
    if (candidate === null) return null;
    const record = normalizeFibreCivilRegistration(candidate);
    if (record.threadId !== requestedThreadId) {
      throw new TypeError("Civil Registry authority returned a registration for a different Thread");
    }
    return record;
  }

  function lookupByFin(fin) {
    const requestedFin = normalizeFibreIdentityNumber(fin);
    const candidate = source.getCivilRegistrationByFin(requestedFin, { required: false });
    if (candidate === null) return null;
    const record = normalizeFibreCivilRegistration(candidate);
    if (record.fibreIdentityNumber !== requestedFin) {
      throw new TypeError("Civil Registry authority returned a registration for a different FIN");
    }
    return record;
  }

  return Object.freeze({ lookupByThreadId, lookupByFin });
}
