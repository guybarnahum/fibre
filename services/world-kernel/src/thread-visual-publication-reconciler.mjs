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

/**
 * World-owned convergent process for one Thread's canonical visual publication.
 *
 * This process owns no second durable workflow state. Recovery is derived from
 * authoritative Embodiment state plus the durable downstream handoff state.
 * Re-running after a crash therefore resumes from the first incomplete seam.
 *
 * Authority split:
 * - World owns the canonical Embodiment and admission of the generated root.
 * - canonicalRootBoundary executes/reconciles generation but cannot admit it.
 * - presentationBoundary projects already-admitted World truth and requests
 *   derived presentation media, but cannot redefine canonical identity.
 */
export function createThreadVisualPublicationReconciler({
  embodimentStore,
  canonicalRootBoundary,
  presentationBoundary,
  now = () => new Date().toISOString(),
} = {}) {
  if (!embodimentStore
    || typeof embodimentStore.listCurrent !== "function"
    || typeof embodimentStore.record !== "function") {
    throw new TypeError("Thread visual publication reconciler requires writable Embodiment authority");
  }
  requireBoundary("canonicalRootBoundary", canonicalRootBoundary, "reconcile");
  requireBoundary("presentationBoundary", presentationBoundary, "reconcileAvailableEmbodiment");
  if (typeof now !== "function") throw new TypeError("Thread visual publication reconciler now must be a function");

  return Object.freeze({
    async reconcileThread({ threadId } = {}) {
      assertId("threadId", threadId);
      let embodiment = currentCanonicalPortrait(embodimentStore, threadId);
      if (embodiment === null) {
        return pending("awaiting_canonical_embodiment", { threadId });
      }

      if (embodiment.status === "pending_generation") {
        const requestedAt = assertIsoTimestamp("canonical visual root requestedAt", now());
        const job = planCanonicalVisualIdentityGeneration({ embodiment, requestedAt });
        const root = normalizeRootResult(await canonicalRootBoundary.reconcile({
          threadId,
          embodiment,
          job,
          requestedAt,
        }));
        if (root.state === "pending") {
          return pending("canonical_visual_root_pending", {
            threadId,
            embodimentId: embodiment.embodimentId,
            jobId: job.jobId,
          });
        }

        embodiment = embodimentStore.record(bindVerifiedCanonicalVisualIdentityProof({
          embodiment,
          proof: root.proof,
          recordedAt: root.recordedAt,
        }));
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
        await presentationBoundary.reconcileAvailableEmbodiment({
          threadId,
          embodiment,
          observedAt,
        }),
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
