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

test("FID registry persists immutable credential history through Infra state", () => withDatabase((databasePath) => {
  const firstStorage = storage(databasePath);
  const registry = new FidCardRegistry(firstStorage);
  const created = registry.registerCredential({
    credential: credential(),
    civilIdentity: civilIdentity(),
    initialStatus: "active",
  });
  assert.equal(created.created, true);
  assert.equal(created.status, "active");
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, "fidc_mira_001");
  assert.deepEqual(registry.listByThreadId("thr_mira").map(({ credential: value }) => value.credentialId), ["fidc_mira_001"]);
  registry.close();

  const raw = firstStorage.infraDriver.state.open("fid");
  assert.throws(
    () => raw.prepare("UPDATE fid_card_credentials SET revision=2 WHERE credential_id=?").run("fidc_mira_001"),
    /fid_card_credentials is immutable/,
  );
  assert.throws(
    () => raw.prepare("DELETE FROM fid_card_lifecycle_events WHERE credential_id=?").run("fidc_mira_001"),
    /fid_card_lifecycle_events is immutable/,
  );
  raw.close();

  const reopened = new FidCardRegistry(storage(databasePath));
  const persisted = reopened.getByCredentialId("fidc_mira_001");
  assert.equal(persisted.credential.fibreIdentityNumber, FIN);
  assert.equal(persisted.status, "active");
  assert.equal(reopened.listByFin(FIN).length, 1);
  reopened.close();
}));

test("FID registry rejects civil-identity drift and a second active card for one FIN", () => withDatabase((databasePath) => {
  const registry = new FidCardRegistry(storage(databasePath));
  registry.registerCredential({
    credential: credential(),
    civilIdentity: civilIdentity(),
    initialStatus: "active",
  });

  assert.throws(
    () => registry.registerCredential({
      credential: credential({ credentialId: "fidc_wrong_fin", fibreIdentityNumber: OTHER_FIN }),
      civilIdentity: civilIdentity(),
      initialStatus: "revoked",
    }),
    /does not match the authority-resolved registration/,
  );

  assert.throws(
    () => registry.registerCredential({
      credential: credential({
        credentialId: "fidc_mira_002",
        revision: 2,
        supersedesCredentialId: "fidc_mira_001",
        issuedAt: "2026-09-09T18:40:00.000Z",
      }),
      civilIdentity: civilIdentity(),
      initialStatus: "active",
    }),
    FidActiveCredentialConflictError,
  );

  assert.equal(registry.listByFin(FIN).length, 1);
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, "fidc_mira_001");
  registry.close();
}));
