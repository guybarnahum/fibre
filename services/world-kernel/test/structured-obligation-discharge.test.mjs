import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDischargedObligationRevision,
  buildStructuredObligationDischarge,
  structuredObligationDischargeDigest,
} from "../src/structured-obligation-discharge.mjs";
import { structuredObligationDigest } from "../src/obligation-domain.mjs";

const obligationId = `obl_${"d".repeat(64)}`;
const sha = (character) => `sha256:${character.repeat(64)}`;

function obligation(overrides = {}) {
  return {
    obligationId,
    revision: 1,
    threadId: "thread_discharge_test",
    status: "active",
    issuer: { entityId: "human_issuer", kind: "human", displayName: "Issuer" },
    parties: [{
      role: "beneficiary",
      entity: { entityId: "human_beneficiary", kind: "human", displayName: "Beneficiary" },
    }],
    scope: {
      description: "Participate in one exact request.",
      binding: { kind: "request_fingerprint", requestFingerprint: sha("a") },
    },
    terms: "Complete one bounded participation episode.",
    effectiveAt: "2026-08-10T00:00:00.000Z",
    expiresAt: "2026-08-11T00:00:00.000Z",
    recurrence: { kind: "none" },
    satisfaction: { criteria: "The bound runtime completes with Guardian pass." },
    provenance: {
      createdBy: "structured_discharge_test",
      createdAt: "2026-08-10T00:00:00.000Z",
      evidenceReferences: ["test:structured-discharge"],
    },
    visibility: { standing: "restricted", terms: "private" },
    ...overrides,
  };
}

test("one-shot Structured Obligation discharge appends an exact terminal revision and causal witness", () => {
  const current = obligation();
  const currentDigest = structuredObligationDigest(current);
  const result = buildStructuredObligationDischarge({
    currentObligation: current,
    currentObligationDigest: currentDigest,
    applicability: {
      applicabilityId: `oba_${"e".repeat(64)}`,
      decisionDigest: sha("b"),
      obligationId,
      obligationRevision: 1,
      obligationDigest: currentDigest,
      policy: { id: "structured_obligation_applicability", version: "1" },
    },
    applicabilityDecisionDigest: sha("b"),
    authorizationId: "auth_structured_discharge_test",
    authorizationDigest: sha("c"),
    authorizationConsumptionDigest: sha("d"),
    sessionId: "run_structured_discharge_test",
    requestId: "req_structured_discharge_test",
    freezeOperationId: "op_structured_discharge_test",
    freezeReportId: "frz_structured_discharge_test",
    freezeReportDigest: sha("e"),
    eventId: "evt_structured_discharge_test",
    dischargedAt: "2026-08-10T01:00:00.000Z",
  });

  assert.equal(result.terminalObligation.revision, 2);
  assert.equal(result.terminalObligation.supersedesRevision, 1);
  assert.equal(result.terminalObligation.status, "discharged");
  assert.equal(result.terminalObligation.terms, current.terms);
  assert.deepEqual(result.terminalObligation.scope, current.scope);
  assert.deepEqual(result.terminalObligation.provenance, current.provenance);
  assert.equal(result.discharge.priorRevision, 1);
  assert.equal(result.discharge.terminalRevision, 2);
  assert.equal(result.discharge.priorObligationDigest, currentDigest);
  assert.equal(result.discharge.terminalObligationDigest, result.terminalObligationDigest);
  assert.equal(result.discharge.reasonCode, "runtime_completed_guardian_pass");
  assert.equal(structuredObligationDischargeDigest(result.discharge), result.dischargeDigest);
});

test("descriptive recurrence is representation-only and cannot be collapsed into one v1 discharge", () => {
  const current = obligation({
    recurrence: { kind: "descriptive", description: "Repeat monthly while the commitment remains active." },
  });
  assert.throws(
    () => buildDischargedObligationRevision(current, "2026-08-10T01:00:00.000Z"),
    /descriptive recurrence and cannot auto-discharge in v1/,
  );
});

test("expired or terminal Structured Obligations cannot be discharged again", () => {
  assert.throws(
    () => buildDischargedObligationRevision(obligation(), "2026-08-11T00:00:00.000Z"),
    /expired before discharge/,
  );
  assert.throws(
    () => buildDischargedObligationRevision(
      obligation({ status: "revoked" }),
      "2026-08-10T01:00:00.000Z",
    ),
    /cannot discharge from revoked/,
  );
});
