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

function storage(path) {
  return { infraDriver: createSqliteStateInfraDriver({ scopes: { fid: path } }), stateScopeId: "fid" };
}

function source(overrides = {}) {
  return {
    threadId: "thr_mira",
    candidatePhotoRef: "obj_photo_mira",
    candidatePhotoDigest: PHOTO_DIGEST,
    canonicalVisualReferenceRef: "obj_visual_mira",
    canonicalVisualReferenceDigest: VISUAL_DIGEST,
    derivationReceiptRef: "gen_photo_mira",
    sourceReferences: ["obj_visual_mira", "emb_mira"],
    targetAgeYears: 34,
    ...overrides,
  };
}

function inspection(overrides = {}) {
  return {
    faceCount: 1,
    faceVisible: true,
    occlusionAcceptable: true,
    cropCompliant: true,
    dimensionsCompliant: true,
    poseCompliant: true,
    framingCompliant: true,
    visualIdentityConsistent: true,
    ageConsistent: true,
    ...overrides,
  };
}

function withHarness(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-fid-photo-"));
  const path = join(root, "fid.sqlite");
  const state = storage(path);
  const registration = buildFibreCivilRegistration({
    threadId: "thr_mira",
    fibreIdentityNumber: FIN,
    registeredAt: "2026-09-01T12:00:00.000Z",
    birthEventRef: "evt_birth_mira",
    worldRef: "world_b1",
  });
  const civilRegistry = createCivilRegistryReadService({
    authority: {
      getCivilRegistrationByThreadId: (threadId, { required = true } = {}) =>
        threadId === registration.threadId ? registration : (required ? (() => { throw new Error("missing registration"); })() : null),
      getCivilRegistrationByFin: (fin, { required = true } = {}) =>
        fin === registration.fibreIdentityNumber ? registration : (required ? (() => { throw new Error("missing FIN"); })() : null),
    },
  });
  const registry = new FidCardRegistry(state);
  const issuanceStore = new FidCardIssuanceStore(state);
  const admissions = new FidPhotoAdmissionStore(state);
  let candidate = source();
  let examined = inspection();
  let tick = 0;
  const authority = createFibreIdentityAuthority({
    civilRegistry,
    issuanceStore,
    photoAdmissionStore: admissions,
    photoSource: { resolveCandidate: async () => candidate },
    photoExaminer: { inspect: async () => examined },
    now: () => `2026-09-09T19:${String(10 + tick++).padStart(2, "0")}:00.000Z`,
  });
  const workflow = authority.issueFidCard({
    threadId: "thr_mira",
    reason: "initial",
    idempotencyKey: "b1_mira",
  }).workflow;

  return Promise.resolve(run({
    authority,
    admissions,
    workflow,
    path,
    setSource: (value) => { candidate = value; },
    setInspection: (value) => { examined = value; },
  })).finally(() => {
    admissions.close();
    issuanceStore.close();
    registry.close();
    rmSync(root, { recursive: true, force: true });
  });
}

test("B1 admits only authority-resolved visual lineage and persists one immutable accepted gate", async () => withHarness(async ({ authority, admissions, workflow, path }) => {
  await assert.rejects(
    () => authority.admitFidPhoto({ workflowId: workflow.workflowId, photo: Buffer.from("caller image") }),
    /exactly: workflowId/,
  );

  const first = await authority.admitFidPhoto({ workflowId: workflow.workflowId });
  assert.equal(first.progressionAllowed, true);
  assert.deepEqual(first.receipt.reasons, []);
  assert.equal(first.receipt.candidatePhotoDigest, PHOTO_DIGEST);
  assert.equal(first.receipt.canonicalVisualReferenceDigest, VISUAL_DIGEST);
  assert.equal(admissions.getAcceptedByWorkflowId(workflow.workflowId).receipt.admissionId, first.receipt.admissionId);

  const repeated = await authority.admitFidPhoto({ workflowId: workflow.workflowId });
  assert.equal(repeated.created, false);
  assert.equal(repeated.receipt.admittedAt, first.receipt.admittedAt);

  const raw = storage(path).infraDriver.state.open("fid");
  assert.throws(
    () => raw.prepare("UPDATE fid_photo_admissions SET decision='rejected' WHERE admission_id=?").run(first.receipt.admissionId),
    /fid_photo_admissions is immutable/,
  );
  raw.close();
}));

test("B1 rejects wrong provenance and unusable identity photos without opening the gate", async () => withHarness(async ({ authority, admissions, workflow, setSource, setInspection }) => {
  const admit = () => authority.admitFidPhoto({ workflowId: workflow.workflowId });

  setSource(source({ threadId: "thr_other" }));
  assert.ok((await admit()).receipt.reasons.includes("wrong_thread_provenance"));

  setSource(source({ candidatePhotoRef: null, candidatePhotoDigest: null, derivationReceiptRef: null }));
  assert.ok((await admit()).receipt.reasons.includes("no_admitted_official_photo"));

  setSource(source());
  for (const patch of [{ faceCount: 0 }, { faceCount: 2 }, { faceVisible: false }, { occlusionAcceptable: false }]) {
    setInspection(inspection(patch));
    assert.equal((await admit()).progressionAllowed, false);
  }

  setInspection(inspection({
    cropCompliant: false,
    dimensionsCompliant: false,
    poseCompliant: false,
    framingCompliant: false,
    visualIdentityConsistent: false,
    ageConsistent: false,
  }));
  const rejected = await admit();
  assert.ok(rejected.receipt.reasons.includes("visual_identity_inconsistent"));
  assert.ok(rejected.receipt.reasons.includes("age_inconsistent"));
  assert.equal(admissions.getAcceptedByWorkflowId(workflow.workflowId), null);
}));
