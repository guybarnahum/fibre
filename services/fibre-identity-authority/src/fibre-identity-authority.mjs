import {
  fidIssuanceRequestMatchesWorkflow,
  normalizeFidIssuanceRequest,
} from "./fid-card-issuance-domain.mjs";
import { FidIssuanceIdempotencyConflictError } from "./fid-card-issuance-store.mjs";
import { FID_PHOTO_POLICY_VERSION, buildFidPhotoAdmission } from "./fid-photo-admission.mjs";
import {
  FidPhotoDerivationUnavailableError,
  buildFidPhotoDerivationJob,
} from "./fid-photo-derivation.mjs";

export class FidCivilRegistrationNotFoundError extends Error {}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function assertCivilRegistry(civilRegistry) {
  if (civilRegistry === null || typeof civilRegistry !== "object" || Array.isArray(civilRegistry)) {
    throw new TypeError("Fibre Identity Authority requires a Civil Registry service");
  }
  for (const method of ["lookupByThreadId", "lookupByFin"]) {
    if (typeof civilRegistry[method] !== "function") {
      throw new TypeError(`Civil Registry service must implement ${method}()`);
    }
  }
  return civilRegistry;
}

function assertIssuanceStore(issuanceStore) {
  if (issuanceStore === null || typeof issuanceStore !== "object" || Array.isArray(issuanceStore)) {
    throw new TypeError("Fibre Identity Authority requires a FidCardIssuanceStore");
  }
  for (const method of ["beginIssuanceWorkflow", "getByIdempotencyKey", "getByWorkflowId", "listByThreadId"]) {
    if (typeof issuanceStore[method] !== "function") throw new TypeError(`FidCardIssuanceStore must implement ${method}()`);
  }
  return issuanceStore;
}

function workflowIdOnly(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== 1 || typeof value.workflowId !== "string" || value.workflowId.trim() === "") {
    throw new TypeError("FID photo request must contain exactly: workflowId");
  }
  return value.workflowId;
}

function prepareRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("FID cut request is required");
  }
  const threadId = value.threadId == null ? null : nonEmpty("FID cut threadId", value.threadId);
  const fin = value.fin == null ? null : nonEmpty("FID cut FIN", value.fin);
  if ((threadId === null) === (fin === null)) throw new TypeError("FID cut request requires exactly one of threadId or fin");
  return { threadId, fin, idempotencyKey: nonEmpty("FID cut idempotencyKey", value.idempotencyKey) };
}

function revocationRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== "credentialId,reason") {
    throw new TypeError("FID revocation request must contain exactly: credentialId, reason");
  }
  return {
    credentialId: nonEmpty("FID revocation credentialId", value.credentialId),
    reason: nonEmpty("FID revocation reason", value.reason),
  };
}

export function createFibreIdentityAuthority({
  civilRegistry,
  issuanceStore,
  registry = null,
  photoSource = null,
  photoExaminer = null,
  photoAdmissionStore = null,
  photoGeneration = null,
  photoGenerationProviderProfile = null,
  now = () => new Date().toISOString(),
} = {}) {
  const civil = assertCivilRegistry(civilRegistry);
  const workflows = assertIssuanceStore(issuanceStore);
  if (typeof now !== "function") throw new TypeError("Fibre Identity Authority now must be a function");

  async function issueFidCard(request) {
    const normalizedRequest = normalizeFidIssuanceRequest(request);
    const existing = workflows.getByIdempotencyKey(normalizedRequest.idempotencyKey, { required: false });
    if (existing !== null) {
      if (!fidIssuanceRequestMatchesWorkflow(normalizedRequest, existing.workflow)) {
        throw new FidIssuanceIdempotencyConflictError(
          `FID issuance idempotency key ${normalizedRequest.idempotencyKey} is already bound to a different request`,
        );
      }
      return Object.freeze({ ...existing, created: false });
    }

    const registration = await civil.lookupByThreadId(normalizedRequest.threadId);
    if (registration === null) {
      throw new FidCivilRegistrationNotFoundError(`Thread ${normalizedRequest.threadId} has no Fibre civil registration`);
    }
    return workflows.beginIssuanceWorkflow({
      request: normalizedRequest,
      civilRegistration: registration,
      requestedAt: now(),
    });
  }

  async function prepareFidCard(request) {
    const prepared = prepareRequest(request);
    const registration = prepared.threadId === null
      ? await civil.lookupByFin(prepared.fin)
      : await civil.lookupByThreadId(prepared.threadId);
    if (registration === null) {
      throw new FidCivilRegistrationNotFoundError(
        prepared.threadId === null ? `FIN ${prepared.fin} has no Fibre civil registration` : `Thread ${prepared.threadId} has no Fibre civil registration`,
      );
    }

    const existing = workflows.getByIdempotencyKey(prepared.idempotencyKey, { required: false });
    if (existing !== null) {
      if (existing.workflow.threadId !== registration.threadId) {
        throw new FidIssuanceIdempotencyConflictError(
          `FID issuance idempotency key ${prepared.idempotencyKey} is already bound to a different Thread`,
        );
      }
      return Object.freeze({ ...existing, created: false });
    }
    if (typeof registry?.listByFin !== "function" || typeof registry?.getByCredentialId !== "function") {
      throw new TypeError("FID credential registry is required for automatic issuance");
    }
    const pending = workflows.listByThreadId(registration.threadId)
      .findLast((entry) => registry.getByCredentialId(entry.workflow.proposedCredentialId, { required: false }) === null) ?? null;
    if (pending !== null) return Object.freeze({ ...pending, created: false, resumed: true });
    const reason = registry.listByFin(registration.fibreIdentityNumber).length === 0 ? "initial" : "replacement";
    return issueFidCard({
      threadId: registration.threadId,
      reason,
      idempotencyKey: prepared.idempotencyKey,
    });
  }

  function revokeFidCard(request) {
    if (typeof registry?.revokeCredential !== "function") {
      throw new TypeError("FID credential registry is not configured for revocation");
    }
    const normalized = revocationRequest(request);
    return registry.revokeCredential({ ...normalized, occurredAt: now() });
  }

  function requirePhotoAdmission() {
    if (!photoSource?.resolveCandidate || !photoExaminer?.inspect || !photoAdmissionStore?.record) {
      throw new TypeError("FID photo admission dependencies are not configured");
    }
  }

  async function admitResolvedPhoto(workflow, source) {
    const inspection = source?.candidatePhotoRef == null ? null : await photoExaminer.inspect({
      source,
      threadId: workflow.threadId,
      at: workflow.requestedAt,
      policyVersion: FID_PHOTO_POLICY_VERSION,
    });
    const receipt = buildFidPhotoAdmission({ workflow, source, inspection, admittedAt: now() });
    const existing = photoAdmissionStore.getByAdmissionId?.(receipt.admissionId, { required: false }) ?? null;
    const stored = existing === null
      ? photoAdmissionStore.record(receipt)
      : Object.freeze({ ...existing, created: false });
    return Object.freeze({ ...stored, progressionAllowed: stored.receipt.decision === "accepted" });
  }

  async function admitFidPhoto(request) {
    const workflow = workflows.getByWorkflowId(workflowIdOnly(request)).workflow;
    requirePhotoAdmission();
    const source = await photoSource.resolveCandidate({ threadId: workflow.threadId, at: workflow.requestedAt, workflow });
    return admitResolvedPhoto(workflow, source);
  }

  async function ensureFidPhoto(request) {
    const workflow = workflows.getByWorkflowId(workflowIdOnly(request)).workflow;
    if (typeof photoAdmissionStore?.getAcceptedByWorkflowId !== "function") {
      throw new TypeError("FID photo admission store is not configured for fallback derivation");
    }
    const accepted = photoAdmissionStore.getAcceptedByWorkflowId(workflow.workflowId, { required: false });
    if (accepted !== null) {
      return Object.freeze({
        state: "accepted",
        progressionAllowed: true,
        reused: true,
        admission: accepted,
        derivation: null,
      });
    }

    requirePhotoAdmission();
    const source = await photoSource.resolveCandidate({ threadId: workflow.threadId, at: workflow.requestedAt, workflow });
    const admission = await admitResolvedPhoto(workflow, source);
    if (admission.progressionAllowed) {
      return Object.freeze({
        state: "accepted",
        progressionAllowed: true,
        reused: false,
        admission,
        derivation: null,
      });
    }
    if (typeof photoGeneration?.request !== "function" || typeof photoGeneration?.createJobFromIdentity !== "function") {
      throw new TypeError("FID photo fallback requires the Asset Generation service");
    }

    let job;
    try {
      job = buildFidPhotoDerivationJob({
        workflow,
        source,
        requestedAt: now(),
        providerProfile: photoGenerationProviderProfile,
        createGenerationJob: (options) => photoGeneration.createJobFromIdentity(options),
      });
    } catch (error) {
      if (!(error instanceof FidPhotoDerivationUnavailableError)) throw error;
      return Object.freeze({
        state: "rejected",
        progressionAllowed: false,
        reused: false,
        admission,
        derivation: null,
      });
    }

    if (source?.candidatePhotoRef === job.outputObjectRef) {
      return Object.freeze({
        state: "rejected",
        progressionAllowed: false,
        reused: false,
        admission,
        derivation: null,
      });
    }

    const derivation = await photoGeneration.request(job);
    return Object.freeze({
      state: "derivation_requested",
      progressionAllowed: false,
      reused: false,
      admission,
      derivation,
    });
  }

  return Object.freeze({ issueFidCard, prepareFidCard, revokeFidCard, admitFidPhoto, ensureFidPhoto });
}
