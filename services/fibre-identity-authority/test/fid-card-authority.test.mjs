import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";
import { createCivilRegistryReadService } from "#services/world-kernel/public/civil-registry-service.mjs";
import {
  FidCardIssuanceStore,
  FidCardRegistry,
  FidCivilRegistrationNotFoundError,
  FidIssuanceIdempotencyConflictError,
  createFibreIdentityAuthority,
} from "../src/index.mjs";

const FIN = "8PKH-A4-VH5R";

function storage(databasePath) {
  return {
    infraDriver: createSqliteStateInfraDriver({ scopes: { fid: databasePath } }),
    stateScopeId: "fid",
  };
}

function registration() {
  return buildFibreCivilRegistration({
    threadId: "thr_mira",
    fibreIdentityNumber: FIN,
    registeredAt: "2026-09-01T12:00:00.000Z",
    birthEventRef: "evt_birth_mira",
    worldRef: "world_a2",
  });
}

function civilRegistryFor(record) {
  return createCivilRegistryReadService({
    authority: {
      getCivilRegistrationByThreadId(threadId, { required = true } = {}) {
        if (record !== null && record.threadId === threadId) return record;
        if (!required) return null;
        throw new Error(`Thread ${threadId} has no Fibre registration`);
      },
      getCivilRegistrationByFin(fin, { required = true } = {}) {
        if (record !== null && record.fibreIdentityNumber === fin) return record;
        if (!required) return null;
        throw new Error(`FIN ${fin} was not found`);
      },
    },
  });
}

function withDatabase(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-fid-authority-"));
  const databasePath = join(root, "fid.sqlite");
  try { return run(databasePath); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test("FID issuance resolves civil identity once and remains durable/idempotent", () => withDatabase((databasePath) => {
  const civilRegistration = registration();
  const stateBinding = storage(databasePath);
  const registry = new FidCardRegistry(stateBinding);
  const issuanceStore = new FidCardIssuanceStore(stateBinding);
  const authority = createFibreIdentityAuthority({
    civilRegistry: civilRegistryFor(civilRegistration),
    issuanceStore,
    now: () => "2026-09-09T18:45:00.000Z",
  });

  assert.throws(() => authority.issueFidCard({
    threadId: "thr_mira",
    reason: "initial",
    idempotencyKey: "issue_mira_001",
    fibreIdentityNumber: FIN,
  }));

  const first = authority.issueFidCard({
    threadId: "thr_mira",
    reason: "initial",
    idempotencyKey: "issue_mira_001",
  });
  assert.equal(first.created, true);
  assert.equal(first.workflow.fibreIdentityNumber, FIN);
  assert.equal(first.workflow.registrationId, civilRegistration.registrationId);
  assert.equal(first.workflow.priorActiveCredentialId, null);
  assert.equal(registry.getActiveByFin(FIN), null, "issuance intent alone must not activate a card");

  const repeated = authority.issueFidCard({
    threadId: "thr_mira",
    reason: "initial",
    idempotencyKey: "issue_mira_001",
  });
  assert.equal(repeated.created, false);
  assert.equal(repeated.workflow.workflowId, first.workflow.workflowId);

  issuanceStore.close();
  registry.close();
  const reopened = new FidCardIssuanceStore(storage(databasePath));
  assert.equal(reopened.getByIdempotencyKey("issue_mira_001").workflow.workflowId, first.workflow.workflowId);
  reopened.close();
}));

test("FID Authority preserves an active card during reissue intent and owns explicit revocation", () => withDatabase((databasePath) => {
  const civilRegistration = registration();
  const registry = new FidCardRegistry(storage(databasePath));
  registry.registerCredential({
    credential: {
      credentialId: "fidc_mira_existing",
      revision: 1,
      threadId: civilRegistration.threadId,
      fibreIdentityNumber: civilRegistration.fibreIdentityNumber,
      registrationId: civilRegistration.registrationId,
      supersedesCredentialId: null,
      issuedAt: "2026-09-05T12:00:00.000Z",
      expiresAt: null,
    },
    civilIdentity: {
      threadId: civilRegistration.threadId,
      fibreIdentityNumber: civilRegistration.fibreIdentityNumber,
      registrationId: civilRegistration.registrationId,
    },
    initialStatus: "active",
  });

  const issuanceStore = new FidCardIssuanceStore(storage(databasePath));
  const authority = createFibreIdentityAuthority({
    civilRegistry: civilRegistryFor(civilRegistration),
    issuanceStore,
    registry,
    now: () => "2026-09-09T18:50:00.000Z",
  });
  const reissue = authority.issueFidCard({
    threadId: "thr_mira",
    reason: "replacement",
    idempotencyKey: "replace_mira_001",
  });

  assert.equal(reissue.workflow.priorActiveCredentialId, "fidc_mira_existing");
  assert.equal(reissue.workflow.proposedRevision, 2);
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, "fidc_mira_existing");
  assert.equal(registry.listByFin(FIN).length, 1, "incomplete reissue must not register the proposed credential");

  assert.throws(() => authority.issueFidCard({
    threadId: "thr_mira",
    reason: "correction",
    idempotencyKey: "replace_mira_001",
  }), FidIssuanceIdempotencyConflictError);

  const revoked = authority.revokeFidCard({ credentialId: "fidc_mira_existing", reason: "operator_revocation" });
  assert.equal(revoked.status, "revoked");
  assert.equal(registry.getActiveByFin(FIN), null);

  const missingAuthority = createFibreIdentityAuthority({
    civilRegistry: civilRegistryFor(null),
    issuanceStore,
    now: () => "2026-09-09T18:55:00.000Z",
  });
  assert.throws(() => missingAuthority.issueFidCard({
    threadId: "thr_missing",
    reason: "initial",
    idempotencyKey: "issue_missing_001",
  }), FidCivilRegistrationNotFoundError);

  issuanceStore.close();
  registry.close();
}));
