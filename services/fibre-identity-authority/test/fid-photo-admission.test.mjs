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
    role: "official_id_photo",
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

function createGenerationJob({ identityDigest, ...job }) {
  const suffix = identityDigest.slice(7, 19);
  return Object.freeze({
    jobVersion: "asset-generation-job-v0.1",
    jobId: `assetjob_${suffix}`,
    ...job,
    outputObjectRef: `asset_${suffix}`,
    receiptObjectRef: `assetreceipt_${suffix}`,
  });
}

function withHarness(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-fid-photo-"));
  const state = storage(join(root, "fid.sqlite"));
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
  const generationJobs = new Map();
  const authority = createFibreIdentityAuthority({
    civilRegistry,
    issuanceStore,
    photoAdmissionStore: admissions,
    photoSource: { resolveCandidate: async () => candidate },
    photoExaminer: { inspect: async () => examined },
    photoGeneration: {
      createJobFromIdentity: createGenerationJob,
      async request(job) {
        const existing = generationJobs.get(job.jobId);
        if (existing !== undefined) return { job: existing, instance: { duplicate: true } };
        generationJobs.set(job.jobId, job);
        return { job, instance: { duplicate: false } };
      },
    },
    photoGenerationProviderProfile: "fid-photo-test",
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
    generationJobs,
    setSource: (value) => { candidate = value; },
    setInspection: (value) => { examined = value; },
  })).finally(() => {
    admissions.close();
    issuanceStore.close();
    registry.close();
    rmSync(root, { recursive: true, force: true });
  });
}

test("B1 admits only authority-resolved visual lineage and keeps the accepted receipt immutable", async () => withHarness(async ({ authority, admissions, workflow }) => {
  await assert.rejects(
    () => authority.admitFidPhoto({ workflowId: workflow.workflowId, photo: Buffer.from("caller image") }),
    /exactly: workflowId/,
  );

  const first = await authority.admitFidPhoto({ workflowId: workflow.workflowId });
  assert.equal(first.progressionAllowed, true);
  assert.deepEqual(first.receipt.reasons, []);
  assert.equal(first.receipt.candidatePhotoDigest, PHOTO_DIGEST);
  assert.equal(first.receipt.canonicalVisualReferenceDigest, VISUAL_DIGEST);

  const repeated = await authority.admitFidPhoto({ workflowId: workflow.workflowId });
  assert.equal(repeated.created, false);
  assert.equal(repeated.receipt.admittedAt, first.receipt.admittedAt);

  const overwrite = admissions.record({ ...first.receipt, admittedAt: "2026-09-09T23:59:00.000Z" });
  assert.equal(overwrite.created, false);
  assert.equal(overwrite.receipt.admittedAt, first.receipt.admittedAt);
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

test("B2 derives only when no usable photo exists and sends the generated result through B1", async () => withHarness(async ({ authority, generationJobs, workflow, setSource, setInspection }) => {
  const existing = await authority.ensureFidPhoto({ workflowId: workflow.workflowId });
  assert.equal(existing.state, "accepted");
  assert.equal(existing.derivation, null);
  assert.equal(generationJobs.size, 0);

  const fallbackWorkflow = authority.issueFidCard({
    threadId: "thr_mira",
    reason: "correction",
    idempotencyKey: "b2_mira",
  }).workflow;
  setSource(source({ candidatePhotoRef: null, candidatePhotoDigest: null, derivationReceiptRef: null }));

  const requested = await authority.ensureFidPhoto({ workflowId: fallbackWorkflow.workflowId });
  assert.equal(requested.state, "derivation_requested");
  assert.equal(requested.progressionAllowed, false);
  assert.equal(requested.derivation.job.context.kind, "fid_photo_derivation");
  assert.equal(requested.derivation.job.context.targetAgeYears, 34);
  assert.deepEqual(requested.derivation.job.referenceObjectRefs, ["obj_visual_mira"]);
  assert.equal(generationJobs.size, 1);

  const repeated = await authority.ensureFidPhoto({ workflowId: fallbackWorkflow.workflowId });
  assert.equal(repeated.derivation.job.jobId, requested.derivation.job.jobId);
  assert.equal(generationJobs.size, 1);

  setSource(source({
    candidatePhotoRef: requested.derivation.job.outputObjectRef,
    candidatePhotoDigest: `sha256:${"c".repeat(64)}`,
    derivationReceiptRef: requested.derivation.job.receiptObjectRef,
    sourceReferences: ["obj_visual_mira", "emb_mira", requested.derivation.job.receiptObjectRef],
  }));
  setInspection(inspection());
  const admitted = await authority.ensureFidPhoto({ workflowId: fallbackWorkflow.workflowId });
  assert.equal(admitted.state, "accepted");
  assert.equal(admitted.progressionAllowed, true);
  assert.equal(admitted.admission.receipt.candidatePhotoRef, requested.derivation.job.outputObjectRef);
  assert.equal(generationJobs.size, 1);

  const reused = await authority.ensureFidPhoto({ workflowId: fallbackWorkflow.workflowId });
  assert.equal(reused.reused, true);
  assert.equal(reused.admission.receipt.admissionId, admitted.admission.receipt.admissionId);

  const rejectedWorkflow = authority.issueFidCard({
    threadId: "thr_mira",
    reason: "replacement",
    idempotencyKey: "b2_mira_rejected",
  }).workflow;
  setSource(source({
    candidatePhotoRef: "obj_bad_present",
    candidatePhotoDigest: `sha256:${"d".repeat(64)}`,
    derivationReceiptRef: "gen_bad_present",
  }));
  setInspection(inspection({ faceCount: 2 }));
  const rejected = await authority.ensureFidPhoto({ workflowId: rejectedWorkflow.workflowId });
  assert.equal(rejected.state, "rejected");
  assert.equal(rejected.progressionAllowed, false);
  assert.equal(rejected.derivation, null);
  assert.ok(rejected.admission.receipt.reasons.includes("face_count_not_one"));
  assert.equal(generationJobs.size, 1, "a present rejected candidate must not trigger another portrait derivation");
}));
