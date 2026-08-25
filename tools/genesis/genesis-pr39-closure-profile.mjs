// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: visible closure-cohort repair and rejection accounting
// fibre-tool-disposition: retire after PR39; retain summarized results in milestone history

function fail(message) { throw new Error(message); }
function pad(value) { return String(value).padStart(2, "0"); }

function cloneAdapterSurface(adapter, invoke) {
  return Object.freeze({
    ...(adapter.provider === undefined ? {} : { provider: adapter.provider }),
    ...(adapter.modelId === undefined ? {} : { modelId: adapter.modelId }),
    ...(adapter.configuration === undefined ? {} : { configuration: structuredClone(adapter.configuration) }),
    invoke,
  });
}

export function createPr39ClosureCallRecorder() {
  const records = [];
  return Object.freeze({
    wrap(adapter) {
      if (adapter === null || typeof adapter?.invoke !== "function") fail("closure call recorder requires an adapter with invoke()");
      return cloneAdapterSurface(adapter, async (request) => {
        if (typeof request?.clientRequestId === "string" && /:pass-a:episode-\d+:/u.test(request.clientRequestId)) {
          records.push(Object.freeze({
            clientRequestId: request.clientRequestId,
            failedGate: typeof request.input?.failedGate === "string" ? request.input.failedGate : null,
            retryOrdinal: Number.isInteger(request.input?.retryOrdinal) ? request.input.retryOrdinal : null,
          }));
        }
        return adapter.invoke(request);
      });
    },
    snapshot() {
      return Object.freeze(records.map((item) => structuredClone(item)));
    },
  });
}

function terminalCauseGate(error) {
  if (typeof error?.cause?.gate === "string" && error.cause.gate !== "record_repair_exhausted") return error.cause.gate;
  if (typeof error?.gate === "string" && error.gate !== "record_repair_exhausted") return error.gate;
  if (/narrates a (?:weekday|daypart) inconsistent with local civil time/iu.test(error?.cause?.message ?? error?.message ?? "")) {
    return "pass_a_local_civil_time_narration";
  }
  return error === null || error === undefined ? null : "historical_realization_record_validity";
}

function episodePrefix(slotPlan, ordinal) {
  return `${slotPlan.freshModelRequestDomain}:slot-${pad(slotPlan.slot)}:pass-a:episode-${pad(ordinal)}`;
}

function assertCompleteCandidate(candidate) {
  if (!Array.isArray(candidate?.passA) || candidate.passA.length !== 14) {
    fail("successful closure candidate must contain fourteen Pass-A episode records");
  }
  for (let index = 0; index < 14; index += 1) {
    if (candidate.passA[index]?.ordinal !== index + 1) {
      fail(`successful closure candidate Pass-A ordinal drift at ${index + 1}`);
    }
  }
}

function episodeAccounting({ slotPlan, ordinal, records, candidateRecord, failureOrdinal, terminalGate, terminalExhausted }) {
  const prefix = episodePrefix(slotPlan, ordinal);
  const calls = records.filter((record) => record.clientRequestId.startsWith(`${prefix}:`));
  const formRepairs = calls.filter((record) => /:form-repair-\d+$/u.test(record.clientRequestId)).length;
  const recordRetries = calls.filter((record) => /:record-retry-\d+$/u.test(record.clientRequestId)).length;
  const failedGates = calls
    .map((record) => record.failedGate)
    .filter((gate) => gate !== null);
  if (ordinal === failureOrdinal && terminalGate !== null && failedGates.at(-1) !== terminalGate) {
    failedGates.push(terminalGate);
  }

  if (candidateRecord !== undefined) {
    const expected = candidateRecord.budgetState;
    if (
      calls.length !== expected.generatedVersions ||
      formRepairs !== expected.formRepairs ||
      recordRetries !== expected.recordRetries
    ) {
      fail(`closure repair accounting drift at slot ${slotPlan.slot} episode ${ordinal}`);
    }
  }

  let status = "admitted";
  if (candidateRecord === undefined && calls.length === 0) status = "not_attempted_after_candidate_failure";
  if (ordinal === failureOrdinal) status = terminalExhausted ? "budget_exhausted" : "candidate_failed";

  return Object.freeze({
    ordinal,
    status,
    generatedVersions: calls.length,
    formRepairs,
    recordRetries,
    failedGates: Object.freeze([...failedGates]),
    budgetExhausted: ordinal === failureOrdinal && terminalExhausted,
  });
}

export function buildPr39ClosureRepairProfile({
  slotPlan,
  candidate = null,
  error = null,
  recordedCalls,
} = {}) {
  if (!Number.isInteger(slotPlan?.slot) || typeof slotPlan?.freshModelRequestDomain !== "string") {
    fail("closure repair profile requires a slot plan");
  }
  if (!Array.isArray(recordedCalls)) fail("closure repair profile requires recordedCalls");
  if (candidate !== null && error !== null) fail("closure repair profile accepts candidate or error, not both");
  if (candidate === null && error === null) fail("closure repair profile requires candidate or error");
  if (candidate !== null) assertCompleteCandidate(candidate);

  const byOrdinal = new Map((candidate?.passA ?? []).map((record) => [record.ordinal, record]));
  const attemptedOrdinals = recordedCalls
    .map((record) => Number(record.clientRequestId.match(/:pass-a:episode-(\d+):/u)?.[1] ?? NaN))
    .filter(Number.isInteger);
  const failureOrdinal = error === null || attemptedOrdinals.length === 0 ? null : Math.max(...attemptedOrdinals);
  const terminalGate = error === null ? null : terminalCauseGate(error);
  const terminalExhausted = error?.gate === "record_repair_exhausted";

  const episodes = [];
  for (let ordinal = 1; ordinal <= 14; ordinal += 1) {
    episodes.push(episodeAccounting({
      slotPlan,
      ordinal,
      records: recordedCalls,
      candidateRecord: byOrdinal.get(ordinal),
      failureOrdinal,
      terminalGate,
      terminalExhausted,
    }));
  }

  const totals = episodes.reduce((accumulator, episode) => ({
    generatedVersions: accumulator.generatedVersions + episode.generatedVersions,
    formRepairs: accumulator.formRepairs + episode.formRepairs,
    recordRetries: accumulator.recordRetries + episode.recordRetries,
    failedGates: accumulator.failedGates + episode.failedGates.length,
    exhaustions: accumulator.exhaustions + (episode.budgetExhausted ? 1 : 0),
  }), { generatedVersions: 0, formRepairs: 0, recordRetries: 0, failedGates: 0, exhaustions: 0 });

  return Object.freeze({
    profileVersion: "pr39-closure-repair-profile-v1",
    slot: slotPlan.slot,
    threadId: slotPlan.threadId,
    wholeCandidateFailure: error !== null,
    terminalFailure: error === null ? null : Object.freeze({
      gate: typeof error?.gate === "string" ? error.gate : "candidate_generation_failure",
      failedGate: terminalGate,
      episodeOrdinal: failureOrdinal,
    }),
    episodes: Object.freeze(episodes),
    totals: Object.freeze(totals),
  });
}
