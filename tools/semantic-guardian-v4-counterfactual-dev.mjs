import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { requestFingerprint } from "../services/world-kernel/src/private-participation.mjs";
import { semanticDignityGuardianV4 } from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { createModelRuntime } from "../services/world-kernel/src/model-runtime/model-runtime.mjs";
import { SEMANTIC_GUARDIAN_V4_COUNTERFACTUAL_DEVELOPMENT as SET } from "../experiments/semantic-guardian-v4/counterfactual-development.mjs";

const minaFixture = JSON.parse(readFileSync(new URL("../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));
const amaraFixture = JSON.parse(readFileSync(new URL("../fixtures/threads/amara.thread.json", import.meta.url), "utf8"));

function normalizedThread(fixture) {
  const thread = structuredClone(fixture);
  thread.currentState.needs = [];
  thread.currentState.feelings = [];
  thread.currentState.unresolvedIntentions = [];
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  return thread;
}

function capsuleFor(thread, request, semanticState = []) {
  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    selfModel: thread.currentState.selfModel,
    semanticTraits: structuredClone(thread.genome.textualTraits),
    needs: [],
    feelings: [],
    semanticState: structuredClone(semanticState),
    resolvedMemories: [],
    obligations: [],
    permissions: [...request.permissions],
    requester: structuredClone(request.requester),
    objective: request.objective,
    statedNeed: request.statedNeed,
    acceptanceCriteria: request.acceptanceCriteria,
    knownAlternatives: [],
    causalContext: { selectionAuthority: "fibre" },
  };
}

export function buildCounterfactualDevelopmentCases() {
  const mina = normalizedThread(minaFixture);
  const amara = normalizedThread(amaraFixture);
  return [
    {
      id: "counterfactual_dev_mina_supportive_state",
      capsule: capsuleFor(mina, SET.minaDeadlineReview, [SET.minaAvailableSundayState]),
      expected: SET.differentials[0].expectedBaseline,
    },
    {
      id: "counterfactual_dev_mina_opposing_state",
      capsule: capsuleFor(mina, SET.minaDeadlineReview, [SET.minaNoSundayState]),
      expected: SET.differentials[0].expectedChanged,
    },
    {
      id: "counterfactual_dev_amara_supportive_state",
      capsule: capsuleFor(amara, SET.amaraProvenanceReview, [SET.amaraSupportingRelationshipState]),
      expected: SET.differentials[1].expectedBaseline,
    },
    {
      id: "counterfactual_dev_amara_opposing_state",
      capsule: capsuleFor(amara, SET.amaraProvenanceReview, [SET.amaraOpposingRelationshipState]),
      expected: SET.differentials[1].expectedChanged,
    },
  ];
}

function withoutSemanticState(capsule) {
  return { ...structuredClone(capsule), semanticState: [] };
}

function semanticStateShape(state) {
  return {
    threadId: state.threadId,
    domain: state.domain,
    dimension: state.dimension,
    target: structuredClone(state.target ?? null),
  };
}

export function validateCounterfactualPairs(cases = buildCounterfactualDevelopmentCases()) {
  const byId = new Map(cases.map((item) => [item.id, item]));
  for (const differential of SET.differentials) {
    const baseline = byId.get(differential.baselineCaseId);
    const changed = byId.get(differential.changedCaseId);
    if (!baseline || !changed) throw new Error(`${differential.id}: missing counterfactual case`);
    if (baseline.capsule.semanticState.length === 0 || changed.capsule.semanticState.length === 0) {
      throw new Error(`${differential.id}: both sides must carry explicit semantic state`);
    }
    if (baseline.capsule.semanticState.length !== changed.capsule.semanticState.length) {
      throw new Error(`${differential.id}: semantic-state cardinality differs`);
    }
    if (JSON.stringify(withoutSemanticState(baseline.capsule)) !== JSON.stringify(withoutSemanticState(changed.capsule))) {
      throw new Error(`${differential.id}: pair differs outside semantic state`);
    }
    for (let index = 0; index < baseline.capsule.semanticState.length; index += 1) {
      const baselineState = baseline.capsule.semanticState[index];
      const changedState = changed.capsule.semanticState[index];
      if (JSON.stringify(semanticStateShape(baselineState)) !== JSON.stringify(semanticStateShape(changedState))) {
        throw new Error(`${differential.id}: semantic-state structure differs outside meaning`);
      }
      if (baselineState.state === changedState.state) {
        throw new Error(`${differential.id}: semantic-state meaning did not change`);
      }
    }
  }
  return true;
}

function matchesExpected(output, expected) {
  return expected.actions.includes(output.proposedAction) && expected.fits.includes(output.participationFit);
}

export function evaluateCounterfactualDevelopment(cases, results) {
  const failures = [];
  const byResult = new Map(results.map((item) => [item.caseId, item]));

  for (const testCase of cases) {
    const result = byResult.get(testCase.id);
    if (!result?.output) {
      failures.push(`${testCase.id}: no completed judgment`);
      continue;
    }
    if (!matchesExpected(result.output, testCase.expected)) {
      failures.push(
        `${testCase.id}: expected ${testCase.expected.actions.join("|")}/${testCase.expected.fits.join("|")}, ` +
        `got ${result.output.proposedAction}/${result.output.participationFit}`,
      );
    }
  }

  for (const differential of SET.differentials) {
    const baseline = byResult.get(differential.baselineCaseId)?.output;
    const changed = byResult.get(differential.changedCaseId)?.output;
    if (!baseline || !changed) {
      failures.push(`${differential.id}: counterfactual pair incomplete`);
      continue;
    }
    if (baseline.proposedAction === changed.proposedAction && baseline.participationFit === changed.participationFit) {
      failures.push(`${differential.id}: semantic-state meaning did not change downstream judgment`);
    }
  }

  return failures;
}

function compact(value, max = 180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

export function formatCounterfactualProgress({ caseIndex, totalCases, caseId, lastEvent, selection, elapsedMs }) {
  const elapsed = elapsedLabel(elapsedMs);
  if (lastEvent?.type === "model_attempt") {
    return `${caseId} · ${caseIndex}/${totalCases} · attempt ${lastEvent.attempt}/${lastEvent.maximumAttempts} · waiting for ${selection.provider} · ${elapsed}`;
  }
  if (lastEvent?.type === "operational_failure" && lastEvent.retrying) {
    return `${caseId} · ${caseIndex}/${totalCases} · attempt ${lastEvent.attempt}/${lastEvent.maximumAttempts} failed ${lastEvent.failure?.code ?? "provider error"} · retrying · ${elapsed}`;
  }
  return `${caseId} · ${caseIndex}/${totalCases} · waiting for ${selection.provider} · ${elapsed}`;
}

function startCounterfactualProgress(selection, totalCases) {
  if (!process.stderr.isTTY) return { beginCase() {}, observe() {}, completeCase() {}, stop() {} };

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const startedAt = Date.now();
  let frame = 0;
  let caseIndex = 1;
  let caseId = "starting";
  let completed = 0;
  let lastEvent = null;
  let stopped = false;

  process.stderr.write(
    `\nFibre · Semantic Guardian v4 counterfactual development\n` +
    `NON-EVIDENTIARY · ${SET.id} · ${selection.provider}/${selection.modelId} · ${totalCases} cases\n\n`,
  );

  const render = () => {
    process.stderr.write(
      `\r\u001b[2K${frames[frame % frames.length]} ${formatCounterfactualProgress({
        caseIndex,
        totalCases,
        caseId,
        lastEvent,
        selection,
        elapsedMs: Date.now() - startedAt,
      })}`,
    );
    frame += 1;
  };

  render();
  const timer = setInterval(render, 250);
  timer.unref();

  return {
    beginCase(index, id) {
      caseIndex = index;
      caseId = id;
      lastEvent = null;
      render();
    },
    observe(event) {
      lastEvent = event;
    },
    completeCase() {
      completed += 1;
    },
    stop(status) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      const symbol = status === "passed" ? "✓" : "×";
      process.stderr.write(
        `\r\u001b[2K${symbol} Counterfactual development · ${completed}/${totalCases} model calls completed · ${status.toUpperCase()} · ${elapsedLabel(Date.now() - startedAt)}\n\n`,
      );
    },
  };
}

export function formatCounterfactualDevelopmentSummary({ selection, results, failures }) {
  const lines = [
    "Fibre · Semantic Guardian v4 counterfactual development",
    "NON-EVIDENTIARY · repeatable · score movement NEVER",
    `Set: ${SET.id}`,
    `Model: ${selection.provider}/${selection.modelId}`,
    "",
    `RESULT: ${failures.length === 0 ? "PASSED" : "FAILED"}`,
    "",
    "Cases",
    "────────────────────────────────────────",
  ];

  for (const item of results) {
    if (item.error) {
      lines.push(`✗ ${item.caseId}`, `  ${item.error.code ?? item.error.name ?? "ERROR"}: ${item.error.message}`);
      continue;
    }
    const state = item.output.factors.semanticStateImpact;
    lines.push(
      `• ${item.caseId}`,
      `  action=${item.output.proposedAction} · fit=${item.output.participationFit}`,
      `  semanticStateImpact=${state.status}/${state.effect}`,
      `  why: ${compact(item.output.rationale)}`,
    );
  }

  lines.push("", "Differential", "────────────────────────────────────────");
  for (const differential of SET.differentials) {
    const baseline = results.find((item) => item.caseId === differential.baselineCaseId)?.output;
    const changed = results.find((item) => item.caseId === differential.changedCaseId)?.output;
    const before = baseline ? `${baseline.proposedAction}/${baseline.participationFit}` : "incomplete";
    const after = changed ? `${changed.proposedAction}/${changed.participationFit}` : "incomplete";
    lines.push(`${differential.id}: ${before} → ${after}`);
  }

  if (failures.length > 0) {
    lines.push("", "Findings", "────────────────────────────────────────", ...failures.map((failure) => `✗ ${failure}`));
  }
  lines.push("", "This diagnostic is development-only. It never earns standing credit and may be rerun.");
  return `${lines.join("\n")}\n`;
}

export async function runCounterfactualDevelopment({ environment = process.env } = {}) {
  const cases = buildCounterfactualDevelopmentCases();
  validateCounterfactualPairs(cases);
  let progress = null;
  const observer = (event) => progress?.observe(event);
  const runtime = createModelRuntime({ environment, observer });
  const selection = runtime.selectionForBlock("dignity_guardian");
  const adapter = runtime.forBlock("dignity_guardian");
  const results = [];
  progress = startCounterfactualProgress(selection, cases.length);

  try {
    for (const [index, testCase] of cases.entries()) {
      progress.beginCase(index + 1, testCase.id);
      try {
        const result = await semanticDignityGuardianV4(testCase.capsule, adapter, {
          clientRequestId: `guardian-v4-counterfactual-dev:${testCase.id}`,
        });
        results.push({ caseId: testCase.id, output: structuredClone(result.output) });
      } catch (error) {
        results.push({
          caseId: testCase.id,
          error: { name: error?.constructor?.name ?? "Error", code: error?.code ?? null, message: error?.message ?? String(error) },
        });
      } finally {
        progress.completeCase();
      }
    }

    const failures = evaluateCounterfactualDevelopment(cases, results);
    progress.stop(failures.length === 0 ? "passed" : "failed");
    return { selection, cases, results, failures, passed: failures.length === 0 };
  } catch (error) {
    progress.stop("failed");
    throw error;
  }
}

async function main() {
  const report = await runCounterfactualDevelopment();
  process.stdout.write(formatCounterfactualDevelopmentSummary(report));
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Semantic Guardian v4 counterfactual development failed: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
