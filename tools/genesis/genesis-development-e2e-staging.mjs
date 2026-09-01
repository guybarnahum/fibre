import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runGenesisDevelopmentE2E } from "./genesis-development-e2e.mjs";
import {
  createWranglerActivityReader,
  inspectRuntimeActivity,
} from "../inspect/inspect-runtime-activity.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const E2E_ACTIVITY_REFERENCE_VERSION = "fibre-slice-g-activity-reference-v0.1";

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
  activityReader = null,
  inspect = inspectRuntimeActivity,
} = {}) {
  const core = await runCore({
    mode: "staging",
    environment,
    fetchImpl,
    ...(sleep ? { sleep } : {}),
    emit,
    ...(sourceResolver ? { sourceResolver } : {}),
    repoRoot,
  });
  const reader = activityReader ?? createWranglerActivityReader({ cwd: repoRoot });
  return attachActivityLogEvidence({ e2eResult: core, repoRoot, activityReader: reader, inspect, emit });
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
