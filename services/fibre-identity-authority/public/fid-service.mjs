const CARD_WIDTH = 856;
const CARD_HEIGHT = 540;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function requireMethod(owner, method, label) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`FID service requires ${label}.${method}()`);
  }
}

function credentialView(registry, entry) {
  const evidence = registry.getIssuanceByCredentialId(entry.credential.credentialId, { required: false });
  return Object.freeze({
    credential: entry.credential,
    status: entry.status,
    recordDigest: entry.recordDigest,
    issuance: evidence?.record ?? null,
    issuanceRecordDigest: evidence?.recordDigest ?? null,
  });
}

/**
 * Provider-neutral Fibre Identity Authority boundary for operator inspection,
 * lifecycle actions, and Thread Presentation consumption.
 *
 * Cryptographic keys, protected credential bodies, and provider-specific
 * storage details deliberately never cross this boundary.
 */
export function createFidService({ authority, registry, issuanceStore, photoAdmissionStore = null } = {}) {
  requireMethod(authority, "issueFidCard", "FibreIdentityAuthority");
  requireMethod(authority, "revokeFidCard", "FibreIdentityAuthority");
  for (const method of ["listByThreadId", "getActiveByFin", "getIssuanceByCredentialId"]) {
    requireMethod(registry, method, "FidCardRegistry");
  }
  requireMethod(issuanceStore, "listByThreadId", "FidCardIssuanceStore");

  function inspectThread(threadId) {
    const id = nonEmpty("threadId", threadId);
    const credentials = registry.listByThreadId(id).map((entry) => credentialView(registry, entry));
    const workflows = issuanceStore.listByThreadId(id).map((entry) => {
      const admission = photoAdmissionStore?.getAcceptedByWorkflowId?.(
        entry.workflow.workflowId,
        { required: false },
      ) ?? null;
      return Object.freeze({
        workflow: entry.workflow,
        state: entry.state,
        recordDigest: entry.recordDigest,
        photoAdmission: admission?.receipt ?? null,
        photoAdmissionRecordDigest: admission?.recordDigest ?? null,
      });
    });
    const active = credentials.find((entry) => entry.status === "active") ?? null;
    return Object.freeze({
      threadId: id,
      activeCredentialId: active?.credential.credentialId ?? null,
      credentials: Object.freeze(credentials),
      workflows: Object.freeze(workflows),
    });
  }

  function getActivePresentation(threadId) {
    const inspected = inspectThread(threadId);
    const active = inspected.credentials.find((entry) => entry.status === "active") ?? null;
    if (active === null) return null;
    if (active.issuance === null || active.issuance.c2pa?.validationStatus !== "verified") {
      throw new Error(`active FID ${active.credential.credentialId} has no verified issuance evidence`);
    }
    const { credential, issuance, issuanceRecordDigest } = active;
    return Object.freeze({
      threadId: credential.threadId,
      credentialId: credential.credentialId,
      revision: credential.revision,
      supersedesCredentialId: credential.supersedesCredentialId,
      registrationId: credential.registrationId,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
      status: "active",
      issuerAuthorityId: issuance.issuer.authorityId,
      issuanceRecordDigest,
      photoAdmissionId: issuance.photoAdmissionId,
      photoDigest: issuance.photoDigest,
      front: Object.freeze({
        objectRef: issuance.front.objectRef,
        digest: issuance.front.finalDigest,
        mediaType: "image/png",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }),
      back: Object.freeze({
        objectRef: issuance.back.objectRef,
        digest: issuance.back.finalDigest,
        mediaType: "image/png",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }),
    });
  }

  return Object.freeze({
    inspectThread,
    getActivePresentation,
    issueFidCard: (request) => authority.issueFidCard(request),
    revokeFidCard: (request) => authority.revokeFidCard(request),
  });
}
