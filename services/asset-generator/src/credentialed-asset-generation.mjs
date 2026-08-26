import { createGenerationAttemptObjectPort } from "./generation-attempt-object-port.mjs";
import {
  executeCredentialedAssetGenerationJob as executeCore,
  verifyCredentialedAssetForPublication as verifyCore,
} from "./credentialed-asset-generation-service.mjs";

function withGenerationAttemptObjects(infra) {
  if (!infra || typeof infra !== "object") throw new TypeError("infra is required");
  return {
    ...infra,
    objects: createGenerationAttemptObjectPort(infra.objects),
  };
}

export function executeCredentialedAssetGenerationJob(options) {
  return executeCore({
    ...options,
    infra: withGenerationAttemptObjects(options?.infra),
  });
}

export function verifyCredentialedAssetForPublication(options) {
  return verifyCore({
    ...options,
    infra: withGenerationAttemptObjects(options?.infra),
  });
}
