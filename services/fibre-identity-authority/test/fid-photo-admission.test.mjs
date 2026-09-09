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
  FidPhotoAdmissionStore,
  createFibreIdentityAuthority,
} from "../src/index.mjs";

const FIN = "8PKH-A4-VH5R";
const PHOTO_DIGEST = `sha256:${"a".repeat(64)}`;
const VISUAL_DIGEST = `sha256:${"b".repeat(64)}`;

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
    worldRef: "world_b1",
  });
}

function civilRegistryFor(record) {
  return createCivilRegistryReadService({
    authority: {
      getCivilRegistrationByThreadId(threadId, { required = true } = {}) {
        if (record.threadId === threadId) return record;
        if (!required) return null;
        throw new Error(`Thread ${threadId} has no Fibre registration`);
      },
      getCivilRegistrationByFin(fin, { required = true } = {}) {
        if (record.fibreIdentityNumber === fin) return record;
        if (!required) return null;
        throw new Error(`FIN ${fin} was not found`);
      },
    },
  });
}

function source(overrides = {}) {
  return {
    sourceKind: "official_id_photo",
    threadId: "thr_mira",
    candidatePhotoRef: "obj_official_photo_mira",
    candidatePhotoDigest: PHOTO_DIGEST,
    canonicalVisualReferenceRef: "obj_canonical_visual_mira",
    canonicalVisualReferenceDigest: VISUAL_DIGEST,
    derivationReceiptRef: "gen_official_photo_mira",
    sourceReferences: ["obj_canonical_visual_mira", "emb_mira", "prov_visual_mira"],
    targetAgeYears: 34,
    ...overrides,
  };
}

function inspection(overrides = {}) {
  return {
    faceCount: 1,
    faceVisibility: "clear",
    occlusion: "acceptable",
    crop: "compliant",
    dimensions: "compliant",
    pose: "compliant",
    framing: "compliant",
    visualIdentityContinuity: "consistent",
    ageConsistency: "consistent",
    ...overrides,
  };
}

function withDatabase(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-fid-photo-"));
  const databasePath = join(root, "fid.sqlite");
  return Promise.resolve(run(databasePath)).finally(() => rmSync(root, { recursive: true, force: true }));
}

function createHarness(databasePath) {
  const state = storage(databasePath);
  const civilRegistration = registration();
  const registry = new FidCardRegistry(state);
  const issuanceStore = new FidCardIssuanceStore(state);
  const photoAdmissionStore = new FidPhotoAdmissionStore(state);
  let currentSource = source();
  let currentInspection = inspection();
  let clock = 0;
  let examinerCalls = 0;
  const authority = createFibreIdentityAuthority({
    civilRegistry: civilRegistryFor(civilRegistration),
    issuanceStore,
    photoAdmissionStore,
    photoSource: {
      async resolveCandidate() { return currentSource; },
    },
    photoExaminer: {
      async inspect() {
        examinerCalls += 1;
        return currentInspection;
      },
    },
    now() {
      clock += 1;
      return clock === 1 ? "2026-09-09T18:50:00.000Z" : `2026-09-09T18:${50 + clock}:00.000Z`;
    },
  });
  const workflow = authority.issueFidCard({
    threadId: "thr_mira",
    reason: "initial",
    idempotencyKey: "issue_mira_b1",
  }).workflow;
  return {
    authority,
    issuanceStore,
    photoAdmissionStore,
    registry,
    workflow,
    setSource(value) { currentSource = value; },
    setInspection(value) { currentInspection = value; },
    examinerCalls() { return examinerCalls; },
  };
}

test("B1 admits only a source-resolved official photo and persists an idempotent immutable receipt", async () => withDatabase(async (databasePath) => {
  const harness = createHarness(databasePath);

  await assert.rejects(
    () => harness.authority.admitFidPhoto({
      workflowId: harness.workflow.workflowId,
      photo: Buffer.from("caller image"),
    }),
    /must contain exactly: workflowId/,
  );

  const accepted = await harness.authority.admitFidPhoto({ workflowId: harness.workflow.workflowId });
  assert.equal(accepted.created, true);
  assert.equal(accepted.progressionAllowed, true);
  assert.equal(accepted.receipt.decision, "accepted");
  assert.deepEqual(accepted.receipt.reasons, []);
  assert.equal(accepted.receipt.candidatePhotoDigest, PHOTO_DIGEST);
  assert.equal(accepted.receipt.canonicalVisualReferenceDigest, VISUAL_DIGEST);
  assert.equal(
    accepted.receipt.admissionId,
    `fidadm_${accepted.receipt.provenanceDigest.slice("sha256:".length)}`,
  );
  assert.equal(
    harness.photoAdmissionStore.getAcceptedByWorkflowId(harness.workflow.workflowId).receipt.admissionId,
    accepted.receipt.admissionId,
  );

  const repeated = await harness.authority.admitFidPhoto({ workflowId: harness.workflow.workflowId });
  assert.equal(repeated.created, false);
  assert.equal(repeated.receipt.admissionId, accepted.receipt.admissionId);
  assert.equal(repeated.receipt.admittedAt, accepted.receipt.admittedAt);

  const raw = storage(databasePath).infraDriver.state.open("fid");
  assert.throws(
    () => raw.prepare("UPDATE fid_photo_admissions SET decision='rejected' WHERE admission_id=?")
      .run(accepted.receipt.admissionId),
    /fid_photo_admissions is immutable/,
  );
  raw.close();

  harness.photoAdmissionStore.close();
  const reopened = new FidPhotoAdmissionStore(storage(databasePath));
  assert.equal(
    reopened.getAcceptedByWorkflowId(harness.workflow.workflowId).receipt.provenanceDigest,
    accepted.receipt.provenanceDigest,
  );
  reopened.close();
  harness.issuanceStore.close();
  harness.registry.close();
}));

test("B1 rejection reasons block the accepted-photo gate without inventing image plumbing", async () => withDatabase(async (databasePath) => {
  const harness = createHarness(databasePath);

  harness.setSource(source({ threadId: "thr_other" }));
  let result = await harness.authority.admitFidPhoto({ workflowId: harness.workflow.workflowId });
  assert.equal(result.progressionAllowed, false);
  assert.ok(result.receipt.reasons.includes("wrong_thread_provenance"));
  assert.equal(harness.photoAdmissionStore.getAcceptedByWorkflowId(harness.workflow.workflowId), null);

  harness.setSource(source({ sourceKind: null, candidatePhotoRef: null, candidatePhotoDigest: null, derivationReceiptRef: null }));
  const callsBeforeNoSource = harness.examinerCalls();
  result = await harness.authority.admitFidPhoto({ workflowId: harness.workflow.workflowId });
  assert.ok(result.receipt.reasons.includes("no_admitted_official_photo"));
  assert.equal(harness.examinerCalls(), callsBeforeNoSource, "no candidate must not invoke image examination");

  harness.setSource(source());
  for (const [patch, reason] of [
    [{ faceCount: 0 }, "face_count_not_one"],
    [{ faceCount: 2 }, "face_count_not_one"],
    [{ faceVisibility: "unusable" }, "face_not_visible"],
    [{ occlusion: "material" }, "face_materially_occluded"],
  ]) {
    harness.setInspection(inspection(patch));
    result = await harness.authority.admitFidPhoto({ workflowId: harness.workflow.workflowId });
    assert.equal(result.progressionAllowed, false);
    assert.ok(result.receipt.reasons.includes(reason));
    assert.equal(harness.photoAdmissionStore.getAcceptedByWorkflowId(harness.workflow.workflowId), null);
  }

  harness.setInspection(inspection({
    crop: "noncompliant",
    dimensions: "noncompliant",
    pose: "noncompliant",
    framing: "noncompliant",
    visualIdentityContinuity: "inconsistent",
    ageConsistency: "inconsistent",
  }));
  result = await harness.authority.admitFidPhoto({ workflowId: harness.workflow.workflowId });
  for (const reason of [
    "crop_noncompliant",
    "dimensions_noncompliant",
    "pose_noncompliant",
    "framing_noncompliant",
    "visual_identity_inconsistent",
    "age_inconsistent",
  ]) assert.ok(result.receipt.reasons.includes(reason));
  assert.equal(harness.photoAdmissionStore.getAcceptedByWorkflowId(harness.workflow.workflowId), null);

  harness.photoAdmissionStore.close();
  harness.issuanceStore.close();
  harness.registry.close();
}));
