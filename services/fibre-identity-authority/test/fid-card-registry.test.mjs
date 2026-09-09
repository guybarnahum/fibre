import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";
import {
  FidActiveCredentialConflictError,
  FidCardRegistry,
} from "../src/index.mjs";

const FIN = "8PKH-A4-VH5R";
const OTHER_FIN = "7K3M-2Q-8W5M";

function storage(databasePath) {
  return {
    infraDriver: createSqliteStateInfraDriver({ scopes: { fid: databasePath } }),
    stateScopeId: "fid",
  };
}

function civilIdentity() {
  return {
    threadId: "thr_mira",
    fibreIdentityNumber: FIN,
    registrationId: "reg_mira",
  };
}

function credential(overrides = {}) {
  return {
    credentialId: "fidc_mira_001",
    revision: 1,
    threadId: "thr_mira",
    fibreIdentityNumber: FIN,
    registrationId: "reg_mira",
    supersedesCredentialId: null,
    issuedAt: "2026-09-09T18:30:00.000Z",
    expiresAt: null,
    ...overrides,
  };
}

function withDatabase(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-fid-registry-"));
  const databasePath = join(root, "fid.sqlite");
  try { return run(databasePath); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test("FID registry preserves immutable credential history across reopen", () => withDatabase((databasePath) => {
  const registry = new FidCardRegistry(storage(databasePath));
  const created = registry.registerCredential({
    credential: credential(),
    civilIdentity: civilIdentity(),
    initialStatus: "active",
  });
  assert.equal(created.created, true);
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, "fidc_mira_001");
  registry.close();

  const reopened = new FidCardRegistry(storage(databasePath));
  const persisted = reopened.getByCredentialId("fidc_mira_001");
  assert.equal(persisted.status, "active");
  assert.equal(persisted.credential.fibreIdentityNumber, FIN);
  assert.equal(reopened.registerCredential({
    credential: credential(),
    civilIdentity: civilIdentity(),
    initialStatus: "active",
  }).created, false);
  assert.throws(() => reopened.registerCredential({
    credential: credential({ issuedAt: "2026-09-09T18:31:00.000Z" }),
    civilIdentity: civilIdentity(),
    initialStatus: "active",
  }));
  reopened.close();
}));

test("FID registry rejects civil-identity drift and a second active card for one FIN", () => withDatabase((databasePath) => {
  const registry = new FidCardRegistry(storage(databasePath));
  registry.registerCredential({
    credential: credential(),
    civilIdentity: civilIdentity(),
    initialStatus: "active",
  });

  assert.throws(() => registry.registerCredential({
    credential: credential({ credentialId: "fidc_wrong_fin", fibreIdentityNumber: OTHER_FIN }),
    civilIdentity: civilIdentity(),
    initialStatus: "revoked",
  }));
  assert.throws(() => registry.registerCredential({
    credential: credential({
      credentialId: "fidc_mira_002",
      revision: 2,
      supersedesCredentialId: "fidc_mira_001",
      issuedAt: "2026-09-09T18:40:00.000Z",
    }),
    civilIdentity: civilIdentity(),
    initialStatus: "active",
  }), FidActiveCredentialConflictError);

  assert.equal(registry.listByFin(FIN).length, 1);
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, "fidc_mira_001");
  registry.close();
}));
