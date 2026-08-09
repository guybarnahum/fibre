import assert from "node:assert/strict";
import test from "node:test";

import {
  deterministicApplicability,
  legacyObligationReferenceDigest,
  legacyObligationTombstoneId,
  normalizeStructuredObligation,
  structuredObligationDigest,
} from "../src/obligation-domain.mjs";

const REQUEST_A = `sha256:${"a".repeat(64)}`;
const REQUEST_B = `sha256:${"b".repeat(64)}`;

function obligation(overrides = {}) {
  return {
    obligationId: `obl_${"1".repeat(64)}`,
    revision: 1,
    threadId: "thr_mina_001",
    status: "active",
    issuer: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    parties: [{
      role: "beneficiary",
      entity: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    }],
    scope: {
      description: "Participate in the bounded review request identified by Fibre-owned request evidence.",
      binding: { kind: "request_fingerprint", requestFingerprint: REQUEST_A },
    },
    terms: "Perform one bounded review while preserving private dignity state.",
    effectiveAt: "2026-08-09T00:00:00.000Z",
    expiresAt: "2026-09-09T00:00:00.000Z",
    recurrence: { kind: "none" },
    satisfaction: { criteria: "One authorized participation episode is frozen and discharged." },
    provenance: {
      createdBy: "fixture",
      createdAt: "2026-08-09T00:00:00.000Z",
      evidenceReferences: ["request:req_bound"],
    },
    visibility: "restricted",
    ...overrides,
  };
}

test("Structured Obligation normalizes and digests deterministically", () => {
  const normalized = normalizeStructuredObligation(obligation());
  assert.equal(normalized.obligationId, `obl_${"1".repeat(64)}`);
  assert.equal(normalized.scope.binding.requestFingerprint, REQUEST_A);
  assert.match(structuredObligationDigest(normalized), /^sha256:[0-9a-f]{64}$/);
  assert.equal(structuredObligationDigest(normalized), structuredObligationDigest(obligation()));
});

test("deterministic applicability requires the Fibre-owned request binding", () => {
  const record = obligation();
  assert.deepEqual(
    deterministicApplicability(record, {
      threadId: record.threadId,
      requestFingerprint: REQUEST_A,
      decidedAt: "2026-08-10T00:00:00.000Z",
    }),
    { result: "applies", reasonCode: "request_binding_match" },
  );
  assert.deepEqual(
    deterministicApplicability(record, {
      threadId: record.threadId,
      requestFingerprint: REQUEST_B,
      decidedAt: "2026-08-10T00:00:00.000Z",
    }),
    { result: "does_not_apply", reasonCode: "request_binding_mismatch" },
  );
});

test("stored natural-language scope without supported binding has no override authority", () => {
  const record = obligation({
    scope: {
      description: "Help Guy with security reviews when appropriate.",
      binding: null,
    },
  });
  assert.deepEqual(
    deterministicApplicability(record, {
      threadId: record.threadId,
      requestFingerprint: REQUEST_A,
      decidedAt: "2026-08-10T00:00:00.000Z",
    }),
    { result: "does_not_apply", reasonCode: "no_supported_binding" },
  );
});

test("spent legacy authority cannot be applicable", () => {
  assert.deepEqual(
    deterministicApplicability(obligation(), {
      threadId: "thr_mina_001",
      requestFingerprint: REQUEST_A,
      decidedAt: "2026-08-10T00:00:00.000Z",
      legacyTombstoned: true,
    }),
    { result: "does_not_apply", reasonCode: "legacy_authority_spent" },
  );
});

test("legacy tombstone identity is deterministic per Thread and exact reference", () => {
  const reference = "Read a case study on identity-system failures";
  const digest = legacyObligationReferenceDigest("thr_mina_001", reference);
  assert.match(digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(
    legacyObligationTombstoneId("thr_mina_001", reference),
    `olt_${digest.slice(7)}`,
  );
  assert.notEqual(
    legacyObligationReferenceDigest("thr_other", reference),
    digest,
  );
});

test("expiry and revision invariants fail closed", () => {
  assert.throws(
    () => normalizeStructuredObligation(obligation({ expiresAt: "2026-08-08T00:00:00.000Z" })),
    /expiresAt must be after effectiveAt/,
  );
  assert.throws(
    () => normalizeStructuredObligation(obligation({ revision: 2 })),
    /must identify supersedesRevision/,
  );
});
