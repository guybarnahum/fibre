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

export function createFibreIdentityAuthority({
  civilRegistry,
  issuanceStore,
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
      throw new FidCivilRegistrationNotFoundError(`Thread ${normalizedRequest.threadId} has no Fibre civil registration`);
    }
    return workflows.beginIssuanceWorkflow({
      request: normalizedRequest,
      civilRegistration: registration,
      requestedAt: now(),
    });
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
    const source = await photoSource.resolveCandidate({ threadId: workflow.threadId, at: workflow.requestedAt });
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
    const source = await photoSource.resolveCandidate({ threadId: workflow.threadId, at: workflow.requestedAt });
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
    if (typeof photoGeneration?.request !== "function") {
      throw new TypeError("FID photo fallback requires the Asset Generation service");
    }

    let job;
    try {
      job = buildFidPhotoDerivationJob({
        workflow,
        source,
        requestedAt: now(),
        providerProfile: photoGenerationProviderProfile,
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

    const derivation = await photoGeneration.request(job);
    return Object.freeze({
      state: "derivation_requested",
      progressionAllowed: false,
      reused: false,
      admission,
      derivation,
    });
  }

  return Object.freeze({ issueFidCard, admitFidPhoto, ensureFidPhoto });
}
