import {
  fidIssuanceRequestMatchesWorkflow,
  normalizeFidIssuanceRequest,
} from "./fid-card-issuance-domain.mjs";
import { FidIssuanceIdempotencyConflictError } from "./fid-card-registry.mjs";

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

function assertFidRegistry(fidRegistry) {
  if (fidRegistry === null || typeof fidRegistry !== "object" || Array.isArray(fidRegistry)) {
    throw new TypeError("Fibre Identity Authority requires a FidCardRegistry");
  }
  for (const method of ["beginIssuanceWorkflow", "getIssuanceWorkflowByIdempotencyKey"]) {
    if (typeof fidRegistry[method] !== "function") {
      throw new TypeError(`FidCardRegistry must implement ${method}()`);
    }
  }
  return fidRegistry;
}

export function createFibreIdentityAuthority({
  civilRegistry,
  fidRegistry,
  now = () => new Date().toISOString(),
} = {}) {
  const civil = assertCivilRegistry(civilRegistry);
  const registry = assertFidRegistry(fidRegistry);
  if (typeof now !== "function") throw new TypeError("Fibre Identity Authority now must be a function");

  function issueFidCard(request) {
    const normalizedRequest = normalizeFidIssuanceRequest(request);
    const existing = registry.getIssuanceWorkflowByIdempotencyKey(
      normalizedRequest.idempotencyKey,
      { required: false },
    );
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

    return registry.beginIssuanceWorkflow({
      request: normalizedRequest,
      civilRegistration: registration,
      requestedAt: now(),
    });
  }

  return Object.freeze({ issueFidCard });
}
