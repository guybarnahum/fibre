function assertRuntime(runtime) {
  if (!runtime || typeof runtime !== "object") throw new TypeError("Genesis development inspection requires a Birth Center runtime");
  if (!runtime.developmentRequestStore || typeof runtime.developmentRequestStore.get !== "function") {
    throw new TypeError("Genesis development inspection requires development request lookup");
  }
  if (!runtime.invocationJournal || typeof runtime.invocationJournal.listByPrefix !== "function") {
    throw new TypeError("Genesis development inspection requires durable invocation lookup");
  }
  if (!runtime.provisionalBirthStore || typeof runtime.provisionalBirthStore.get !== "function") {
    throw new TypeError("Genesis development inspection requires provisional birth lookup");
  }
  return runtime;
}

function summarizeInvocation(record) {
  const provenance = record?.result?.provenance;
  return Object.freeze({
    clientRequestId: record.request.clientRequestId,
    provider: record.request.provider,
    modelId: record.request.modelId,
    requestDigest: record.request.requestDigest,
    resultDigest: record.resultDigest,
    providerRequestId: typeof provenance?.providerRequestId === "string" ? provenance.providerRequestId : null,
    recordedAt: record.recordedAt,
  });
}

export function createGenesisDevelopmentInspectionService({ runtime } = {}) {
  const birthRuntime = assertRuntime(runtime);
  return Object.freeze({
    inspect(requestId) {
      const reservation = birthRuntime.developmentRequestStore.get(requestId);
      if (reservation === null) return null;
      const prefix = reservation.plan?.freshModelRequestDomain;
      if (typeof prefix !== "string" || prefix.trim() === "") {
        throw new Error(`Genesis development ${requestId} has no durable model-request domain`);
      }
      const provisional = birthRuntime.provisionalBirthStore.get(reservation.genesisId);
      const invocations = birthRuntime.invocationJournal.listByPrefix(prefix).map(summarizeInvocation);
      return Object.freeze({
        requestId: reservation.requestId,
        requestDigest: reservation.requestDigest,
        planDigest: reservation.planDigest,
        admissionDigest: reservation.admissionDigest,
        genesisId: reservation.genesisId,
        threadId: reservation.threadId,
        requestStatus: reservation.status,
        provisionalStatus: provisional?.status ?? null,
        invocationCount: invocations.length,
        invocations: Object.freeze(invocations),
      });
    },
  });
}
