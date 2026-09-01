import {
  bindVerifiedCanonicalVisualIdentityProof,
  planCanonicalVisualIdentityGeneration,
} from "./canonical-visual-identity-generation.mjs";
import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import { assertId } from "./persistence-common.mjs";

function assertIsoTimestamp(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return value;
}

function requireBoundary(name, value, method) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
  return value;
}

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("Thread visual publication activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation();
  return activity.runStage(metadata, operation);
}

function activityIdentity(threadId, supplied = {}) {
  return Object.freeze({
    requestId: supplied.requestId ?? null,
    genesisId: supplied.genesisId ?? null,
    threadId,
  });
}

function currentCanonicalPortrait(embodimentStore, threadId) {
  const current = embodimentStore.listCurrent(threadId).map(normalizeEmbodimentRepresentation);
  const portraits = current.filter((entry) => (
    entry.kind === "portrait"
    && entry.representationKind === "synthetic_generation"
    && entry.visibility === "public"
  ));
  if (portraits.length === 0) return null;
  if (portraits.length !== 1) {
    throw new Error(
      `Thread ${threadId} has ${portraits.length} current public synthetic portrait embodiments; exactly one canonical portrait is required`,
    );
  }
  return portraits[0];
}

function pending(stage, detail = {}) {
  return Object.freeze({ complete: false, stage, ...detail });
}

function finished(detail = {}) {
  return Object.freeze({ complete: true, stage: "complete", ...detail });
}

function normalizeRootResult(result) {
  if (!result || typeof result !== "object") {
    throw new TypeError("canonical visual root boundary must return a result object");
  }
  if (result.state === "pending") return result;
  if (result.state !== "ready") {
    throw new TypeError("canonical visual root boundary state must be pending or ready");
  }
  if (!result.proof || typeof result.proof !== "object") {
    throw new TypeError("ready canonical visual root result requires proof");
  }
  assertIsoTimestamp("canonical visual root recordedAt", result.recordedAt);
  return result;
}

function normalizePresentationResult(result) {
  if (!result || typeof result !== "object") {
    throw new TypeError("Thread Presentation visual boundary must return a result object");
  }
  if (result.complete === true) return result;
  if (result.complete !== false || typeof result.stage !== "string" || result.stage.trim() === "") {
    throw new TypeError("Thread Presentation visual boundary must return complete=true or a named pending stage");
  }
  return result;
}

function normalizeMaterializationResult(result) {
  if (!result || typeof result !== "object") {
    throw new TypeError("canonical Embodiment materializer must return a result object");
  }
  if (result.state === "pending") return result;
  if (result.state !== "ready" || !result.embodiment) {
    throw new TypeError("canonical Embodiment materializer state must be pending or ready with an Embodiment");
  }
  return { ...result, embodiment: normalizeEmbodimentRepresentation(result.embodiment) };
}

export function createThreadVisualPublicationReconciler({
  embodimentStore,
  canonicalEmbodimentMaterializer = null,
  canonicalRootBoundary,
  presentationBoundary,
  activityRecorder = null,
  now = () => new Date().toISOString(),
} = {}) {
  if (!embodimentStore
    || typeof embodimentStore.listCurrent !== "function"
    || typeof embodimentStore.record !== "function") {
    throw new TypeError("Thread visual publication reconciler requires writable Embodiment authority");
  }
  if (canonicalEmbodimentMaterializer !== null) {
    requireBoundary("canonicalEmbodimentMaterializer", canonicalEmbodimentMaterializer, "materialize");
  }
  requireBoundary("canonicalRootBoundary", canonicalRootBoundary, "reconcile");
  requireBoundary("presentationBoundary", presentationBoundary, "reconcileAvailableEmbodiment");
  const activity = optionalActivityRecorder(activityRecorder);
  if (typeof now !== "function") throw new TypeError("Thread visual publication reconciler now must be a function");

  return Object.freeze({
    async reconcileThread({ threadId, activityContext = {} } = {}) {
      assertId("threadId", threadId);
      const context = activityIdentity(threadId, activityContext);
      let embodiment = currentCanonicalPortrait(embodimentStore, threadId);
      if (embodiment === null && canonicalEmbodimentMaterializer !== null) {
        const materialized = normalizeMaterializationResult(
          await runActivityStage(activity, {
            ...context,
            stage: "world.embodiment.reconcile",
            attempt: 1,
          }, async () => canonicalEmbodimentMaterializer.materialize({ threadId })),
        );
        if (materialized.state === "pending") {
          return pending(materialized.reason ?? "awaiting_canonical_embodiment", { threadId });
        }
        embodiment = materialized.embodiment;
      }
      if (embodiment === null) {
        return pending("awaiting_canonical_embodiment", { threadId });
      }

      if (embodiment.status === "pending_generation") {
        const requestedAt = assertIsoTimestamp("canonical visual root requestedAt", now());
        const job = planCanonicalVisualIdentityGeneration({ embodiment, requestedAt });
        const root = normalizeRootResult(await runActivityStage(activity, {
          ...context,
          stage: "world.visual_identity.demand",
          attempt: 1,
          evidence: { embodimentId: embodiment.embodimentId },
        }, async () => canonicalRootBoundary.reconcile({
          threadId,
          embodiment,
          job,
          requestedAt,
        })));
        if (root.state === "pending") {
          return pending("canonical_visual_root_pending", {
            threadId,
            embodimentId: embodiment.embodimentId,
            jobId: job.jobId,
          });
        }

        embodiment = await runActivityStage(activity, {
          ...context,
          stage: "world.embodiment.admission",
          attempt: 1,
          evidence: { embodimentId: embodiment.embodimentId },
        }, async () => embodimentStore.record(bindVerifiedCanonicalVisualIdentityProof({
          embodiment,
          proof: root.proof,
          recordedAt: root.recordedAt,
        })));
      }

      if (embodiment.status !== "available" || !embodiment.asset?.referenceObjectRef) {
        return pending("awaiting_admitted_canonical_visual_root", {
          threadId,
          embodimentId: embodiment.embodimentId,
          embodimentStatus: embodiment.status,
        });
      }

      const observedAt = assertIsoTimestamp("visual publication observedAt", now());
      const projection = normalizePresentationResult(
        await runActivityStage(activity, {
          ...context,
          stage: "world.reconciliation.complete",
          attempt: 1,
          evidence: {
            embodimentId: embodiment.embodimentId,
            objectRef: embodiment.asset.referenceObjectRef,
          },
        }, async () => presentationBoundary.reconcileAvailableEmbodiment({
          threadId,
          embodiment,
          observedAt,
          activityContext: context,
        })),
      );

      if (!projection.complete) {
        return pending(projection.stage, {
          threadId,
          embodimentId: embodiment.embodimentId,
          canonicalReferenceObjectRef: embodiment.asset.referenceObjectRef,
          ...(projection.detail ?? {}),
        });
      }

      return finished({
        threadId,
        embodimentId: embodiment.embodimentId,
        canonicalReferenceObjectRef: embodiment.asset.referenceObjectRef,
        ...(projection.detail ?? {}),
      });
    },
  });
}
