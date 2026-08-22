import assert from "node:assert/strict";
import test from "node:test";

import {
  H2_RECOVERY_ORCHESTRATOR_VERSION,
  runAuthorizedH2Recovery,
  verifyH2RecoveryOrchestratorPreflight,
} from "./genesis-h2-recovery-orchestrator.mjs";

test("H-v2 recovery orchestrator is fully wired but remains provider-blocked before review authorization", () => {
  const preflight = verifyH2RecoveryOrchestratorPreflight();
  assert.equal(preflight.status, "CLEAR_RECOVERY_ORCHESTRATOR_IMPLEMENTED_NOT_AUTHORIZED");
  assert.equal(preflight.orchestratorVersion, H2_RECOVERY_ORCHESTRATOR_VERSION);
  assert.equal(preflight.providerCallsAuthorized, false);
  assert.equal(preflight.executionAttemptVersion, "H-v2");
  assert.equal(preflight.stageCount, 5);
  assert.equal(
    preflight.firstProviderOperation.clientRequestId,
    "pr39-h:slot-04:pass-a:episode-03:record-retry:2",
  );
  assert.equal(preflight.scientificStanding.isReplacementCohort, false);
  assert.equal(preflight.scientificStanding.mayEnterFrozenG5G6, false);
  assert.equal(preflight.scientificStanding.mayReplaceH2Hold, false);
});

test("H-v2 recovery orchestrator cannot make a provider call until the frozen recovery binding is amended after review", async () => {
  await assert.rejects(
    () => runAuthorizedH2Recovery(),
    /provider execution remains blocked/,
  );
});
