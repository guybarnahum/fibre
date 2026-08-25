import { normalizeFibreCivilRegistration } from "#packages/domain/src/fibre-civil-identity.mjs";
import { normalizePresentationCivilIdentity } from "#services/world-kernel/src/thread-presentation-identity-domain.mjs";

function assertRegistryReader(civilRegistry) {
  if (civilRegistry === null || typeof civilRegistry !== "object") {
    throw new TypeError("civilRegistry reader is required");
  }
  if (typeof civilRegistry.getCivilRegistrationByThreadId !== "function") {
    throw new TypeError("civilRegistry must implement getCivilRegistrationByThreadId(threadId, options)");
  }
  return civilRegistry;
}

export function civilRegistrationToPresentationCivilIdentity(registration, { provenanceRef } = {}) {
  const record = normalizeFibreCivilRegistration(registration);
  return normalizePresentationCivilIdentity({
    fibreIdentityNumber: record.fibreIdentityNumber,
    registrationId: record.registrationId,
    registeredAt: record.registeredAt,
    birthEventRef: record.birthEventRef,
    worldRef: record.worldRef,
    issuer: record.issuer,
    sourceReferences: [record.registrationId, record.birthEventRef, record.worldRef],
    provenanceRef,
  });
}

export function readPresentationCivilIdentity({ civilRegistry, threadId, provenanceRef }) {
  const registry = assertRegistryReader(civilRegistry);
  if (typeof threadId !== "string" || threadId.trim() === "") {
    throw new TypeError("threadId is required");
  }
  const registration = registry.getCivilRegistrationByThreadId(threadId, { required: false });
  if (registration === null) return null;

  const record = normalizeFibreCivilRegistration(registration);
  if (record.threadId !== threadId) {
    throw new TypeError("Civil Registry returned a registration for a different Thread");
  }
  return civilRegistrationToPresentationCivilIdentity(record, { provenanceRef });
}
