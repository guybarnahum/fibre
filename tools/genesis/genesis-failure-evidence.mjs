function cloneOrNull(value) {
  return value === undefined || value === null ? null : structuredClone(value);
}

function errorSummary(error) {
  if (error === undefined || error === null) return null;
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    gate: error?.gate ?? null,
  };
}

export function serializeGenesisFailureEvidence(error) {
  return Object.freeze({
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    gate: error?.gate ?? null,
    cause: errorSummary(error?.cause),
    calls: cloneOrNull(error?.calls),
    repairs: cloneOrNull(error?.repairs),
    repairEvidence: cloneOrNull(error?.repairEvidence),
    recordRetries: cloneOrNull(error?.recordRetries),
    recordRetryEvidence: cloneOrNull(error?.recordRetryEvidence),
    record: cloneOrNull(error?.record),
  });
}
