import assert from "node:assert/strict";
import test from "node:test";

import { createActivityRecorder } from "#infra/telemetry";
import { createLocalActivityTelemetryPort } from "#infra/providers/local/telemetry";
import {
  embodimentId,
  embodimentSpecificationDigest,
} from "../src/embodiment-domain.mjs";
import { createThreadVisualPublicationReconciler } from "../src/thread-visual-publication-reconciler.mjs";

function pendingEmbodiment(threadId) {
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
    sourceReferences: ["evt_fixture"],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility: "public",
    recordedAt: "2026-09-03T20:00:00Z",
  };
}

test("repeated pending canonical-root sweeps emit no Activity until state changes", async () => {
  const threadId = "thr_world_quiescent_pending";
  const embodiment = pendingEmbodiment(threadId);
  const telemetry = createLocalActivityTelemetryPort();
  let activityId = 0;
  const activityRecorder = createActivityRecorder({
    telemetry,
    environment: "test",
    service: "world-kernel",
    now: () => "2026-09-03T20:00:00.000Z",
    activityIdFactory: () => `act_quiescent_${++activityId}`,
  });
  let rootCalls = 0;
  const reconciler = createThreadVisualPublicationReconciler({
    embodimentStore: {
      listCurrent() { return [embodiment]; },
      record() { throw new Error("pending root must not be admitted"); },
    },
    canonicalRootBoundary: {
      async reconcile({ job }) {
        rootCalls += 1;
        return { state: "pending", jobId: job.jobId };
      },
    },
    presentationBoundary: {
      async reconcileAvailableEmbodiment() { throw new Error("not reached"); },
    },
    activityRecorder,
    now: () => "2026-09-03T20:00:05Z",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await reconciler.reconcileThread({ threadId });
    assert.equal(result.stage, "canonical_visual_root_pending");
  }

  assert.equal(rootCalls, 3);
  assert.deepEqual(await telemetry.query({ threadId }), []);
});
