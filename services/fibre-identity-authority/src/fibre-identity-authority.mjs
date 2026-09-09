import {
  fidIssuanceRequestMatchesWorkflow,
  normalizeFidIssuanceRequest,
} from "./fid-card-issuance-domain.mjs";
import { FidIssuanceIdempotencyConflictError } from "./fid-card-issuance-store.mjs";

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
  for (const method of ["beginIssuanceWorkflow", "getByIdempotencyKey"]) {
    if (typeof issuanceStore[method] !== "function") {
      throw new TypeError(`FidCardIssuanceStore must implement ${method}()`);
    }
  }
  return issuanceStore;
}

export function createFibreIdentityAuthority({
  civilRegistry,
  issuanceStore,
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

  return Object.freeze({ issueFidCard });
}
