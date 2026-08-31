import {
  FIBRE_BIRTH_STATE_REQUIREMENTS,
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

export function openBirthStateDatabase(storage, {
  readOnly = false,
  storeName = "Birth Center state store",
} = {}) {
  if (storage === null || typeof storage !== "object" || Array.isArray(storage)) {
    throw new TypeError(`${storeName} storage must be an Infra state binding`);
  }
  const { infraDriver, stateScopeId } = storage;
  nonEmpty("stateScopeId", stateScopeId);
  const infra = requireInfraCapabilities(infraDriver, "state");
  requireTransactionalStateGuarantees(
    infra.state,
    stateScopeId,
    FIBRE_BIRTH_STATE_REQUIREMENTS,
  );
  return infra.state.open(stateScopeId, { readOnly });
}
