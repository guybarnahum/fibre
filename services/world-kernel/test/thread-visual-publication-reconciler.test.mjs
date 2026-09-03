import assert from "node:assert/strict";
import test from "node:test";

import { createActivityRecorder } from "#infra/telemetry";
import { createLocalActivityTelemetryPort } from "#infra/providers/local/telemetry";
import { STORED_ASSET_RECEIPT_VERSION } from "#services/asset-generator/src/index.mjs";
import {
  embodimentId,
  embodimentSpecificationDigest,
} from "../src/embodiment-domain.mjs";
import { createThreadVisualPublicationReconciler } from "../src/thread-visual-publication-reconciler.mjs";

const sha = (char) => `sha256:${char.repeat(64)}`;

function pendingEmbodiment(threadId = "thr_visual_process_001") {
  const specification = {
    subject: {
      partyId: threadId,
      description: "A person with a softly angular oval face; medium warm-brown skin with ordinary visible texture; wide-set dark brown almond-shaped eyes; straight medium-width brows with a subtly higher left arch; a narrow straight nose with rounded tip; a defined cupid's bow and fuller lower lip; a tapered jaw and rounded chin; attached earlobes; thick dark-brown wavy hair with a subtly uneven natural hairline; and a small pale diagonal scar above the outer left eyebrow. These proportions, landmarks, asymmetries, and the scar remain stable identity cues across age transformations.",
    },
    method: "canonical synthetic portrait specification",
    description: "Preserve ordinary asymmetry and skin detail instead of idealizing the face. Build is lean-to-average with relaxed shoulders and a long neck. The normalized reference composition is head-and-shoulders, mostly frontal, both ears and hairline visible, neutral mouth and relaxed eyes, no eyewear or jewelry obscuring landmarks, even daylight-balanced illumination, and ordinary perspective without wide-angle distortion.",
    model: "replaceable-renderer",
  };
  return {
    embodimentId: embodimentId({ threadId, kind: "portrait", lineage: "canonical" }),
    revision: 1,
    threadId,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: [`evt_seed_${threadId}`],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility: "public",
    recordedAt: "2026-08-30T20:00:00Z",
  };
}

function readyRoot(job) {
  const receipt = {
    receiptVersion: STORED_ASSET_RECEIPT_VERSION,
    jobId: job.jobId,
    status: "ready",
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    objectRef: job.outputObjectRef,
    sha256: sha("a"),
    mediaType: "image/webp",
    width: 1024,
    height: 1024,
    durationMs: null,
    completedAt: "2026-08-30T20:01:00Z",
    generationRecordObjectRef: "generation_record_visual_process_001",
    generationRecordDigest: sha("b"),
    providerOutputDigest: sha("c"),
    credential: {
      format: "fixture-content-credential",
      signerId: "fixture-signer",
      manifestDigest: sha("d"),
      embeddedAt: "2026-08-30T20:00:58Z",
      verifiedAt: "2026-08-30T20:00:59Z",
    },
    inputReferences: job.inputReferences,
    context: job.context,
  };
  return {
    state: "ready",
    proof: {
      receipt,
      generationRecord: { job },
      verification: { valid: true },
    },
    recordedAt: "2026-08-30T20:01:01Z",
  };
}

test("World visual reconciliation records state-changing work but stays silent when already converged", async () => {
  let current = pendingEmbodiment();
  let rootCalls = 0;
  let presentationCalls = 0;
  const telemetry = createLocalActivityTelemetryPort();
  let activityId = 0;
  const activityRecorder = createActivityRecorder({
    telemetry,
    environment: "test",
    service: "world-kernel",
    now: () => "2026-08-30T20:00:00.000Z",
    activityIdFactory: () => `act_visual_${String(++activityId).padStart(3, "0")}`,
  });
  const embodimentStore = {
    listCurrent(threadId) {
      return threadId === current.threadId ? [structuredClone(current)] : [];
    },
    record(record) {
      current = structuredClone(record);
      return structuredClone(current);
    },
  };
  const canonicalRootBoundary = {
    async reconcile({ job }) {
      rootCalls += 1;
      return readyRoot(job);
    },
  };
  const presentationBoundary = {
    async reconcileAvailableEmbodiment({ embodiment, activityContext }) {
      presentationCalls += 1;
      assert.equal(embodiment.status, "available");
      assert.equal(activityContext.requestId, "req_visual_process_001");
      assert.equal(activityContext.genesisId, "gen_visual_process_001");
      return {
        complete: true,
        stage: "complete",
        detail: { officialPhotoMediaId: "media_official_visual_process_001" },
      };
    },
  };
  const times = ["2026-08-30T20:00:10Z", "2026-08-30T20:01:02Z", "2026-08-30T20:02:00Z"];
  const reconciler = createThreadVisualPublicationReconciler({
    embodimentStore,
    canonicalRootBoundary,
    presentationBoundary,
    activityRecorder,
    now: () => times.shift() ?? "2026-08-30T20:03:00Z",
  });
  const activityContext = {
    requestId: "req_visual_process_001",
    genesisId: "gen_visual_process_001",
  };

  const first = await reconciler.reconcileThread({ threadId: current.threadId, activityContext });
  assert.equal(first.complete, true);
  assert.equal(current.status, "available");
  assert.equal(current.revision, 2);
  assert.equal(rootCalls, 1);
  assert.equal(presentationCalls, 1);

  const activity = await telemetry.query({ requestId: activityContext.requestId });
  for (const expected of [
    "world.visual_identity.demand",
    "world.embodiment.admission",
  ]) {
    assert.equal(
      activity.some((record) => record.stage === expected && record.status === "succeeded"),
      true,
      `missing successful visual activity stage ${expected}`,
    );
  }
  assert.equal(activity.every((record) => record.genesisId === activityContext.genesisId), true);
  assert.equal(activity.every((record) => record.threadId === current.threadId), true);
  const countAfterWork = activity.length;

  const replay = await reconciler.reconcileThread({ threadId: current.threadId, activityContext });
  assert.equal(replay.complete, true);
  assert.equal(rootCalls, 1, "an admitted canonical root must never be generated twice");
  assert.equal(presentationCalls, 2, "Presentation reconciliation may replay idempotently");
  const replayActivity = await telemetry.query({ requestId: activityContext.requestId });
  assert.equal(replayActivity.length, countAfterWork, "an already-converged replay must emit no activity");
});

test("World visual reconciliation waits without mutating when root generation is still pending", async () => {
  const current = pendingEmbodiment("thr_visual_process_pending_001");
  let writes = 0;
  let presentationCalls = 0;
  const reconciler = createThreadVisualPublicationReconciler({
    embodimentStore: {
      listCurrent() { return [current]; },
      record() { writes += 1; throw new Error("pending root must not be admitted"); },
    },
    canonicalRootBoundary: {
      async reconcile({ job }) { return { state: "pending", jobId: job.jobId }; },
    },
    presentationBoundary: {
      async reconcileAvailableEmbodiment() { presentationCalls += 1; },
    },
    now: () => "2026-08-30T20:00:10Z",
  });

  const result = await reconciler.reconcileThread({ threadId: current.threadId });
  assert.equal(result.complete, false);
  assert.equal(result.stage, "canonical_visual_root_pending");
  assert.equal(writes, 0);
  assert.equal(presentationCalls, 0);
});

test("World visual reconciliation explicitly reports a missing canonical Embodiment", async () => {
  const reconciler = createThreadVisualPublicationReconciler({
    embodimentStore: {
      listCurrent() { return []; },
      record() { throw new Error("not reached"); },
    },
    canonicalRootBoundary: { async reconcile() { throw new Error("not reached"); } },
    presentationBoundary: { async reconcileAvailableEmbodiment() { throw new Error("not reached"); } },
  });
  const result = await reconciler.reconcileThread({ threadId: "thr_visual_process_missing_001" });
  assert.equal(result.complete, false);
  assert.equal(result.stage, "awaiting_canonical_embodiment");
});
