import {
  FIBRE_WORLD_STATE_REQUIREMENTS,
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";
import { assertNonEmpty } from "./persistence-common.mjs";

export function openWorldStateDatabase(storage, {
  readOnly = false,
  storeName = "World state store",
} = {}) {
  if (storage === null || typeof storage !== "object" || Array.isArray(storage)) {
    throw new TypeError(`${storeName} storage must be an Infra state binding`);
  }

  const { infraDriver, stateScopeId } = storage;
  assertNonEmpty("stateScopeId", stateScopeId);
  const infra = requireInfraCapabilities(infraDriver, "state");
  requireTransactionalStateGuarantees(
    infra.state,
    stateScopeId,
    FIBRE_WORLD_STATE_REQUIREMENTS,
  );
  return infra.state.open(stateScopeId, { readOnly });
}
