import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openRuntimeStore } from "../src/runtime-store.mjs";
import { openFreezeStore } from "../src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "../src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "../src/expression-store.mjs";
import { openCausalContextStore } from "../src/causal-context-store.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { openGuardianCognitionStore } from "../src/guardian-cognition-store.mjs";
import { PreM2CausalWorldKernelService } from "../src/causal-service.mjs";
import { deriveDignityTraceFromPersistedRequest } from "../src/causal-inspection.mjs";
import { DIGNITY_GUARDIAN_POLICY } from "../src/dignity-guardian.mjs";
import { createScriptedGuardianModelAdapter } from "./support/scripted-guardian-model-adapter.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const daniel = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/daniel.thread.json", import.meta.url), "utf8"),
);

const FACTOR_KEYS = [
  "identityAlignment",
  "individualizedAdvantage",
  "requesterNeed",
  "relationalMeaning",
  "respectAndReciprocity",
  "participationTerms",
  "obligationsAndOpportunityCost",
];

function openCausalWorld(databasePath, instant, guardianModelAdapter = createScriptedGuardianModelAdapter()) {
  const worldStore = openWorldStore(localWorldStateStorage(databasePath));
  const runtimeStore = openRuntimeStore(localWorldStateStorage(databasePath));
  const freezeStore = openFreezeStore(localWorldStateStorage(databasePath));
  const lifecycleStore = openLifecycleHardeningStore(localWorldStateStorage(databasePath));
  const expressionStore = openExpressionStore(localWorldStateStorage(databasePath));
  const causalContextStore = openCausalContextStore(localWorldStateStorage(databasePath));
  const semanticStateStore = openSemanticStateStore(localWorldStateStorage(databasePath));
  const guardianCognitionStore = openGuardianCognitionStore(localWorldStateStorage(databasePath));
  const service = new PreM2CausalWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    {
      clock: () => new Date(instant),
      semanticStateStore,
      guardianCognitionStore,
      guardianModelAdapter,
    },
  );
  return {
    service,
    guardianCognitionStore,
    guardianModelAdapter,
    close() {
      guardianCognitionStore.close();
      semanticStateStore.close();
      causalContextStore.close();
      expressionStore.close();
      lifecycleStore.close();
      freezeStore.close();
      runtimeStore.close();
      worldStore.close();
    },
  };
}

function request() {
  return {
    requestId: "req_causal_factor_trace",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks without expanding the task scope.",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return the three highest-priority infrastructure findings with bounded evidence.",
  };
}

test("current Guardian assessment remains inspectable after restart without a model recall", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-causal-factor-trace-"));
  const databasePath = join(directory, "world.sqlite");
  let world = openCausalWorld(databasePath, "2026-08-07T21:30:00Z");
  try {
    world.service.seedThread({ thread: mina });
    world.service.seedThread({ thread: daniel });
    const created = world.service.appraiseParticipation(mina.threadId, {
      request: request(),
      causationId: "cause_causal_factor_trace",
      correlationId: "corr_causal_factor_trace",
    });
    assert.equal(created.trace.privateStance.desiredAction, "clarify");
    assert.equal(created.trace.privateStance.policy.version, DIGNITY_GUARDIAN_POLICY.version);
    assert.equal(world.guardianModelAdapter.callCount, 1);
    world.close();

    const failIfCalled = createScriptedGuardianModelAdapter({ fail: new Error("model must not be called during replay") });
    world = openCausalWorld(databasePath, "2026-08-07T22:30:00Z", failIfCalled);
    const persisted = world.service.getPrivateRequestTrace(mina.threadId, request().requestId);
    const input = world.guardianCognitionStore.getInputByAppraisal(persisted.appraisalId);
    const assessment = world.guardianCognitionStore.getAssessmentByAppraisal(persisted.appraisalId);
    const dignity = deriveDignityTraceFromPersistedRequest(persisted, input, assessment);
    assert.equal(dignity.matchesPersistedStance, true);
    assert.equal(dignity.modelRecalled, false);
    assert.equal(failIfCalled.callCount, 0);
    assert.equal(dignity.desiredAction, "clarify");
    assert.equal(dignity.dignityBand, "contested");
    assert.deepEqual(Object.keys(dignity.factors).sort(), [...FACTOR_KEYS].sort());
    for (const key of FACTOR_KEYS) assert.equal(typeof dignity.factors[key], "string");
    assert.deepEqual(dignity.feelings, []);
    assert.deepEqual(dignity.conflictingMotives, []);
  } finally {
    world.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
