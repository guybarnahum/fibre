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
import { PreM2CausalWorldKernelService } from "../src/causal-service.mjs";
import { deriveDignityTraceFromPersistedRequest } from "../src/causal-inspection.mjs";

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

function openCausalWorld(databasePath, instant) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const causalContextStore = openCausalContextStore(databasePath);
  const service = new PreM2CausalWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    { clock: () => new Date(instant) },
  );
  return {
    service,
    close() {
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

test("all seven grounded Guardian factors remain inspectable after restart by capsule-only re-derivation", () => {
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
    assert.equal(created.trace.privateStance.policy.version, "2");
    world.close();

    world = openCausalWorld(databasePath, "2026-08-07T22:30:00Z");
    const persisted = world.service.getPrivateRequestTrace(mina.threadId, request().requestId);
    const dignity = deriveDignityTraceFromPersistedRequest(persisted);
    assert.equal(dignity.matchesPersistedStance, true);
    assert.equal(dignity.desiredAction, "clarify");
    assert.equal(dignity.dignityBand, "contested");
    assert.deepEqual(Object.keys(dignity.factors).sort(), [...FACTOR_KEYS].sort());
    for (const key of FACTOR_KEYS) assert.equal(typeof dignity.factors[key], "string");
    assert.match(dignity.factors.identityAlignment, /does not claim semantic understanding/i);
    assert.match(dignity.factors.individualizedAdvantage, /no model-backed or provenance-grounded semantic evidence/i);
    assert.match(dignity.factors.relationalMeaning, /no resolved requester-specific relationship/i);
    assert.match(dignity.factors.respectAndReciprocity, /reciprocity history remains unavailable/i);
    assert.match(dignity.factors.obligationsAndOpportunityCost, /unresolved intention/i);
    assert.deepEqual(dignity.feelings, mina.currentState.feelings);
    assert.deepEqual(dignity.conflictingMotives, []);
  } finally {
    world.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
