import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runGenesisDevelopmentE2E } from "./genesis-development-e2e.mjs";
import { createWranglerGenesisE2EActivityRecorder } from "./genesis-development-e2e-activity.mjs";
import {
  createWranglerActivityReader,
  inspectRuntimeActivity,
} from "../inspect/inspect-runtime-activity.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const E2E_ACTIVITY_REFERENCE_VERSION = "fibre-slice-g-activity-reference-v0.2";
const TERMINAL_FAILURE_PROBE_INTERVAL_MS = 5_000;

function safeError(error) {
  return Object.freeze({
    name: error?.constructor?.name ?? "Error",
    message: String(error?.message ?? error).slice(0, 512),
  });
}

function queryReference({ selector, result }) {
  return Object.freeze({
    selector: structuredClone(selector),
    databaseName: result.databaseName,
    recordCount: result.records.length,
    summary: result.summary,
  });
}

function failures(records) {
  return Object.freeze(records
    .filter((record) => record.status === "failed" || record.status === "retrying")
    .map((record) => Object.freeze({
      activityId: record.activityId,
      occurredAt: record.occurredAt,
      service: record.service,
      stage: record.stage,
      status: record.status,
      attempt: record.attempt,
      error: record.error === null ? null : structuredClone(record.error),
    })));
}

export function terminalWorldFailure(records) {
  if (!Array.isArray(records)) throw new TypeError("Activity records must be an array");
  const terminal = records.filter((record) => (
    record?.service === "world-kernel"
    && record?.status === "failed"
    && record?.error?.retryable === false
  ));
  if (terminal.length === 0) return null;
  terminal.sort((left, right) => String(left.occurredAt ?? "").localeCompare(String(right.occurredAt ?? "")));
  const record = terminal[terminal.length - 1];
  return Object.freeze({
    activityId: record.activityId ?? null,
    occurredAt: record.occurredAt ?? null,
    stage: record.stage ?? "unknown",
    code: record.error?.code ?? "ERROR",
    message: record.message ?? "World reconciliation failed",
  });
}

function failOpenActivityRecorder(recorder, emit) {
  if (recorder === null || recorder === undefined) return null;
  if (typeof recorder.record !== "function") {
    emit({
      event: "genesis-development-staging-activity-recorder-invalid",
      errorName: "TypeError",
    });
    return null;
  }
  return Object.freeze({
    async record(candidate) {
      try {
        return await recorder.record(candidate);
      } catch (error) {
        emit({
          event: "genesis-development-staging-activity-write-failed",
          stage: candidate?.stage ?? null,
          status: candidate?.status ?? null,
          errorName: error?.constructor?.name ?? "Error",
        });
        return candidate;
      }
    },
  });
}

function failFastSleep({
  sleep,
  reader,
  inspect,
  repoRoot,
  emit,
  activeIdentity,
  nowMs = Date.now,
  probeIntervalMs = TERMINAL_FAILURE_PROBE_INTERVAL_MS,
}) {
  let lastProbeAt = 0;
  let activityUnavailableReported = false;

  async function probe() {
    const threadId = activeIdentity.threadId;
    if (!threadId) return;
    const now = nowMs();
    if (lastProbeAt !== 0 && now - lastProbeAt < probeIntervalMs) return;
    lastProbeAt = now;
    try {
      const result = await inspect({
        repoRoot,
        environment: "staging",
        selector: { kind: "threadId", value: threadId },
        reader,
      });
      const failure = terminalWorldFailure(result.records);
      if (failure === null) return;
      const error = new Error(
        `World reconciliation failed terminally at ${failure.stage} (${failure.code}): ${failure.message}`,
      );
      error.code = failure.code;
      error.retryable = false;
      throw error;
    } catch (error) {
      if (error?.retryable === false) throw error;
      if (!activityUnavailableReported) {
        activityUnavailableReported = true;
        emit({
          event: "genesis-development-staging-terminal-failure-probe-unavailable",
          errorName: error?.constructor?.name ?? "Error",
          message: String(error?.message ?? error).slice(0, 512),
        });
      }
    }
  }

  return async (milliseconds) => {
    await probe();
    await sleep(milliseconds);
    await probe();
  };
}

export async function attachActivityLogEvidence({
  e2eResult,
  repoRoot,
  activityReader,
  inspect = inspectRuntimeActivity,
  emit = () => {},
} = {}) {
  const requestId = e2eResult?.evidence?.request?.requestId;
  const genesisId = e2eResult?.evidence?.request?.developmentPlanGenesisId;
  const threadId = e2eResult?.evidence?.request?.developmentPlanThreadId;
  if (!requestId || !genesisId || !threadId) throw new TypeError("staging E2E evidence lacks request/genesis/thread identity");

  const selectors = Object.freeze({
    request: Object.freeze({ kind: "requestId", value: requestId }),
    genesis: Object.freeze({ kind: "genesisId", value: genesisId }),
    thread: Object.freeze({ kind: "threadId", value: threadId }),
  });

  let activityLog;
  try {
    const request = await inspect({ repoRoot, environment: "staging", selector: selectors.request, reader: activityReader });
    const genesis = await inspect({ repoRoot, environment: "staging", selector: selectors.genesis, reader: activityReader });
    const thread = await inspect({ repoRoot, environment: "staging", selector: selectors.thread, reader: activityReader });
    activityLog = Object.freeze({
      contract: E2E_ACTIVITY_REFERENCE_VERSION,
      available: true,
      request: queryReference({ selector: selectors.request, result: request }),
      genesis: queryReference({ selector: selectors.genesis, result: genesis }),
      thread: queryReference({ selector: selectors.thread, result: thread }),
      failuresAndRetries: failures(request.records),
    });
    emit({
      event: "genesis-development-staging-activity-inspected",
      requestId,
      genesisId,
      threadId,
      recordCount: request.records.length,
    });
  } catch (error) {
    activityLog = Object.freeze({
      contract: E2E_ACTIVITY_REFERENCE_VERSION,
      available: false,
      request: Object.freeze({ selector: structuredClone(selectors.request) }),
      genesis: Object.freeze({ selector: structuredClone(selectors.genesis) }),
      thread: Object.freeze({ selector: structuredClone(selectors.thread) }),
      error: safeError(error),
    });
    emit({
      event: "genesis-development-staging-activity-inspection-failed",
      requestId,
      errorName: activityLog.error.name,
      message: activityLog.error.message,
    });
  }

  const retained = JSON.parse(readFileSync(e2eResult.evidencePath, "utf8"));
  retained.activityLog = activityLog;
  writeFileSync(e2eResult.evidencePath, `${JSON.stringify(retained, null, 2)}\n`, { mode: 0o600 });
  return Object.freeze({
    evidence: Object.freeze(retained),
    evidencePath: e2eResult.evidencePath,
  });
}

export async function runStagingGenesisDevelopmentE2EWithActivity({
  environment = process.env,
  fetchImpl = globalThis.fetch,
  sleep,
  emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
  sourceResolver,
  repoRoot = REPO_ROOT,
  runCore = runGenesisDevelopmentE2E,
  activityRecorder = undefined,
  activityRecorderFactory = createWranglerGenesisE2EActivityRecorder,
  activityReader = null,
  inspect = inspectRuntimeActivity,
} = {}) {
  let recorder = activityRecorder;
  if (recorder === undefined) {
    try {
      recorder = await activityRecorderFactory({
        repoRoot,
        environment: "staging",
        onTelemetryError(error, activity) {
          emit({
            event: "genesis-development-staging-activity-write-failed",
            stage: activity.stage,
            status: activity.status,
            errorName: error?.constructor?.name ?? "Error",
          });
        },
      });
      if (!recorder || typeof recorder.record !== "function") {
        throw new TypeError("staging Activity recorder factory must return record()");
      }
      emit({
        event: "genesis-development-staging-activity-writer-ready",
        databaseName: recorder.databaseName,
      });
    } catch (error) {
      recorder = null;
      const diagnostic = safeError(error);
      emit({
        event: "genesis-development-staging-activity-writer-unavailable",
        errorName: diagnostic.name,
        message: diagnostic.message,
      });
    }
  }

  const reader = activityReader ?? createWranglerActivityReader({ cwd: repoRoot });
  const activeIdentity = { requestId: null, genesisId: null, threadId: null };
  const emitWithIdentity = (event) => {
    if (event?.requestId) activeIdentity.requestId = event.requestId;
    if (event?.genesisId) activeIdentity.genesisId = event.genesisId;
    if (event?.threadId) activeIdentity.threadId = event.threadId;
    emit(event);
  };
  const wrappedSleep = failFastSleep({
    sleep: sleep ?? delay,
    reader,
    inspect,
    repoRoot,
    emit: emitWithIdentity,
    activeIdentity,
  });

  const core = await runCore({
    mode: "staging",
    environment,
    fetchImpl,
    sleep: wrappedSleep,
    emit: emitWithIdentity,
    ...(sourceResolver ? { sourceResolver } : {}),
    repoRoot,
    activityRecorder: failOpenActivityRecorder(recorder, emitWithIdentity),
  });
  return attachActivityLogEvidence({ e2eResult: core, repoRoot, activityReader: reader, inspect, emit: emitWithIdentity });
}

async function main() {
  await runStagingGenesisDevelopmentE2EWithActivity();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: "genesis-development-staging-e2e-failed",
      errorName: error?.constructor?.name ?? "Error",
      message: error?.message ?? String(error),
    })}\n`);
    process.exitCode = 1;
  });
}
