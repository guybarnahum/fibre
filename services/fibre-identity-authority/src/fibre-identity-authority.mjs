import {
  fidIssuanceRequestMatchesWorkflow,
  normalizeFidIssuanceRequest,
} from "./fid-card-issuance-domain.mjs";
import { FidIssuanceIdempotencyConflictError } from "./fid-card-issuance-store.mjs";
import {
  FID_PHOTO_POLICY_VERSION,
  buildFidPhotoAdmissionReceipt,
  fidPhotoAdmissionIdentity,
  normalizeFidPhotoInspection,
  normalizeFidPhotoSource,
} from "./fid-photo-admission.mjs";

export class FidCivilRegistrationNotFoundError extends Error {}

function assertCivilRegistry(civilRegistry) {
  if (civilRegistry === null || typeof civilRegistry !== "object" || Array.isArray(civilRegistry)) {
    throw new TypeError("Fibre Identity Authority requires a Civil Registry service");
  }
  if (typeof civilRegistry.lookupByThreadId !== "function") {
    throw new TypeError("Civil Registry service must implement lookupByThreadId(threadId)");
  }
  return civilRegistry;
}

function assertIssuanceStore(issuanceStore) {
  if (issuanceStore === null || typeof issuanceStore !== "object" || Array.isArray(issuanceStore)) {
    throw new TypeError("Fibre Identity Authority requires a FidCardIssuanceStore");
  }
  for (const method of ["beginIssuanceWorkflow", "getByIdempotencyKey", "getByWorkflowId"]) {
    if (typeof issuanceStore[method] !== "function") {
      throw new TypeError(`FidCardIssuanceStore must implement ${method}()`);
    }
  }
  return issuanceStore;
}

function assertPhotoAdmissionDependencies({ photoSource, photoExaminer, photoAdmissionStore }) {
  if (!photoSource || typeof photoSource.resolveCandidate !== "function") {
    throw new TypeError("FID photo admission requires photoSource.resolveCandidate()");
  }
  if (!photoExaminer || typeof photoExaminer.inspect !== "function") {
    throw new TypeError("FID photo admission requires photoExaminer.inspect()");
  }
  if (!photoAdmissionStore
    || typeof photoAdmissionStore.record !== "function"
    || typeof photoAdmissionStore.getByAdmissionId !== "function") {
    throw new TypeError("FID photo admission requires a FidPhotoAdmissionStore");
  }
  return { photoSource, photoExaminer, photoAdmissionStore };
}

function photoAdmissionRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== 1 || Object.keys(value)[0] !== "workflowId") {
    throw new TypeError("FID photo admission request must contain exactly: workflowId");
  }
  if (typeof value.workflowId !== "string" || value.workflowId.trim() === "") {
    throw new TypeError("FID photo admission workflowId is required");
  }
  return value.workflowId;
}

export function createFibreIdentityAuthority({
  civilRegistry,
  issuanceStore,
  photoSource = null,
  photoExaminer = null,
  photoAdmissionStore = null,
  now = () => new Date().toISOString(),
} = {}) {
  const civil = assertCivilRegistry(civilRegistry);
  const workflows = assertIssuanceStore(issuanceStore);
  if (typeof now !== "function") throw new TypeError("Fibre Identity Authority now must be a function");

  function issueFidCard(request) {
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

    const registration = civil.lookupByThreadId(normalizedRequest.threadId);
    if (registration === null) {
      throw new FidCivilRegistrationNotFoundError(
        `Thread ${normalizedRequest.threadId} has no Fibre civil registration`,
      );
    }

    return workflows.beginIssuanceWorkflow({
      request: normalizedRequest,
      civilRegistration: registration,
      requestedAt: now(),
    });
  }

  async function admitFidPhoto(request) {
    const workflowId = photoAdmissionRequest(request);
    const { photoSource: sourceProvider, photoExaminer: examiner, photoAdmissionStore: admissions } =
      assertPhotoAdmissionDependencies({ photoSource, photoExaminer, photoAdmissionStore });
    const workflow = workflows.getByWorkflowId(workflowId).workflow;
    const source = normalizeFidPhotoSource(await sourceProvider.resolveCandidate({
      threadId: workflow.threadId,
      at: workflow.requestedAt,
    }));
    const inspection = source.candidatePhotoRef === null
      ? null
      : normalizeFidPhotoInspection(await examiner.inspect({
          source,
          threadId: workflow.threadId,
          at: workflow.requestedAt,
          policyVersion: FID_PHOTO_POLICY_VERSION,
        }));
    const identity = fidPhotoAdmissionIdentity({ workflow, source, inspection });
    const existing = admissions.getByAdmissionId(identity.admissionId, { required: false });
    if (existing !== null) {
      return Object.freeze({
        ...existing,
        created: false,
        progressionAllowed: existing.receipt.decision === "accepted",
      });
    }

    const stored = admissions.record(buildFidPhotoAdmissionReceipt({
      workflow,
      source,
      inspection,
      admittedAt: now(),
    }));
    return Object.freeze({
      ...stored,
      progressionAllowed: stored.receipt.decision === "accepted",
    });
  }

  return Object.freeze({ issueFidCard, admitFidPhoto });
}
