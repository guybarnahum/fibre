import { verifyCredentialedAssetForPublication } from "#services/asset-generator/src/index.mjs";
import { threadPresentationChannelId } from "#services/thread-presentation/src/public-asset-resolver.mjs";
import {
  bindVerifiedCanonicalVisualIdentityProof,
  planCanonicalVisualIdentityGeneration,
} from "./canonical-visual-identity-generation.mjs";
import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import { createPresentationAssetDemandService } from "./presentation-asset-demand-service.mjs";
import { planThreadPresentationAssetSlots } from "./thread-presentation-asset-planner.mjs";
import { createThreadPresentationEmbodimentRewriteService } from "./thread-presentation-embodiment-rewrite-service.mjs";
import { createThreadPresentationIdentityMediaRewriteService } from "./thread-presentation-identity-media-rewrite-service.mjs";
import { assertId } from "./persistence-common.mjs";

function assertIsoTimestamp(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
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
    throw new Error(`Thread ${threadId} has ${portraits.length} current public synthetic portrait embodiments; exactly one canonical portrait is required`);
  }
  return portraits[0];
}

async function defaultCanonicalRootCompletion({ infra, credentialSigner, generation }) {
  const proof = await verifyCredentialedAssetForPublication({
    infra,
    credentialSigner,
    receipt: generation.receipt,
  });
  return {
    state: "ready",
    proof,
    recordedAt: generation.receipt.completedAt,
  };
}

function requireCanonicalRootDriver(value) {
  if (!value || typeof value.reconcile !== "function") {
    throw new TypeError("Thread visual publication orchestrator requires canonicalRootDriver.reconcile()");
  }
  return value;
}

function requireProviderSelector(value) {
  if (typeof value !== "function") {
    throw new TypeError("Thread visual publication orchestrator requires selectProviderProfile()");
  }
  return value;
}

function waiting(stage, detail = {}) {
  return Object.freeze({ complete: false, stage, ...detail });
}

function complete(detail = {}) {
  return Object.freeze({ complete: true, stage: "complete", ...detail });
}

export function createImmediateCanonicalRootDriver({
  infra,
  credentialSigner,
  assetRuntimeForProviderProfile,
  completion = defaultCanonicalRootCompletion,
} = {}) {
  if (!infra?.objects) throw new TypeError("immediate canonical root driver requires infra.objects");
  if (!credentialSigner) throw new TypeError("immediate canonical root driver requires credentialSigner");
  if (typeof assetRuntimeForProviderProfile !== "function") {
    throw new TypeError("immediate canonical root driver requires assetRuntimeForProviderProfile()");
  }
  if (typeof completion !== "function") throw new TypeError("canonical root completion must be a function");

  return Object.freeze({
    async reconcile({ job }) {
      const runtime = await assetRuntimeForProviderProfile(job.providerProfile);
      if (!runtime || typeof runtime.execute !== "function") {
        throw new TypeError(`asset runtime for ${job.providerProfile} must expose execute()`);
      }
      const generation = await runtime.execute(job);
      return completion({ infra, credentialSigner, generation });
    },
  });
}

export function createThreadVisualPublicationOrchestrator({
  embodimentStore,
  presentationServer,
  infra,
  credentialSigner,
  canonicalRootDriver,
  selectProviderProfile,
  now = () => new Date().toISOString(),
  createDemandService = createPresentationAssetDemandService,
  createVisualRewrite = createThreadPresentationEmbodimentRewriteService,
  createIdentityRewrite = createThreadPresentationIdentityMediaRewriteService,
} = {}) {
  if (!embodimentStore
    || typeof embodimentStore.listCurrent !== "function"
    || typeof embodimentStore.record !== "function") {
    throw new TypeError("Thread visual publication orchestrator requires writable Embodiment authority");
  }
  if (!presentationServer
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("Thread visual publication orchestrator requires PresentationServer");
  }
  if (!infra) throw new TypeError("Thread visual publication orchestrator requires infra");
  if (!credentialSigner) throw new TypeError("Thread visual publication orchestrator requires credentialSigner");
  requireCanonicalRootDriver(canonicalRootDriver);
  requireProviderSelector(selectProviderProfile);
  if (typeof now !== "function") throw new TypeError("now must be a function");

  const visualRewrite = createVisualRewrite({ presentationServer, embodimentReader: embodimentStore });
  const identityRewrite = createIdentityRewrite({ presentationServer });
  const demandService = createDemandService({ infra });

  return Object.freeze({
    async reconcileThread({ threadId } = {}) {
      assertId("threadId", threadId);
      const channelId = threadPresentationChannelId(threadId);
      let embodiment = currentCanonicalPortrait(embodimentStore, threadId);
      if (embodiment === null) return waiting("awaiting_embodiment", { threadId });

      if (embodiment.status === "pending_generation") {
        const requestedAt = assertIsoTimestamp("canonical root requestedAt", now());
        const job = planCanonicalVisualIdentityGeneration({ embodiment, requestedAt });
        const root = await canonicalRootDriver.reconcile({
          threadId,
          embodiment,
          job,
          requestedAt,
        });
        if (root?.state === "pending") {
          return waiting("canonical_root_pending", {
            threadId,
            embodimentId: embodiment.embodimentId,
            jobId: job.jobId,
          });
        }
        if (root?.state !== "ready") {
          throw new TypeError("canonicalRootDriver.reconcile() must return state pending or ready");
        }
        const recordedAt = assertIsoTimestamp("canonical root recordedAt", root.recordedAt);
        embodiment = embodimentStore.record(bindVerifiedCanonicalVisualIdentityProof({
          embodiment,
          proof: root.proof,
          recordedAt,
        }));
      }

      if (embodiment.status !== "available" || embodiment.asset?.referenceObjectRef === undefined) {
        return waiting("awaiting_public_visual_identity", {
          threadId,
          embodimentId: embodiment.embodimentId,
          embodimentStatus: embodiment.status,
        });
      }

      const snapshot = await presentationServer.getSnapshot(channelId);
      if (snapshot === null) return waiting("awaiting_genesis_projection", { threadId });

      const visual = await visualRewrite.project({
        channelId,
        embodimentId: embodiment.embodimentId,
      });
      const issuedAt = assertIsoTimestamp("identity media issuedAt", now());
      const identity = await identityRewrite.ensureOfficialIdentityMedia({
        channelId,
        issuedAt,
      });
      const current = await presentationServer.getSnapshot(channelId);
      if (current === null) throw new Error(`Thread ${threadId} presentation disappeared during visual publication`);
      const slots = planThreadPresentationAssetSlots({
        bundle: {
          presentation: current.snapshot.presentation,
          media: current.snapshot.media,
          provenance: current.snapshot.provenance,
        },
        snapshotObjectRef: current.pointer.objectRef,
        snapshotDigest: current.pointer.snapshotDigest,
      });
      const officialPhotoMediaId = identity.identityCard.officialPhotoMediaRef;
      const official = slots.slots.find((slot) => slot.mediaId === officialPhotoMediaId);
      if (!official) throw new Error(`Thread ${threadId} official identity-photo slot was not planned`);
      if (official.status === "ready") {
        return complete({
          threadId,
          embodimentId: embodiment.embodimentId,
          canonicalReferenceObjectRef: embodiment.asset.referenceObjectRef,
          officialPhotoMediaId,
          visualReused: visual.reused === true,
          identityReused: identity.reused === true,
        });
      }
      if (official.status !== "missing") {
        return waiting("official_photo_unavailable", {
          threadId,
          embodimentId: embodiment.embodimentId,
          officialPhotoMediaId,
          slotStatus: official.status,
        });
      }

      const providerProfile = selectProviderProfile({
        requiresReferenceObjects: official.referenceObjectRefs.length > 0,
      });
      const requestedAt = assertIsoTimestamp("official photo requestedAt", now());
      const demand = await demandService.reconcile({
        scope: { entityKind: "thread", entityRef: threadId },
        slots: [official],
        requestedAt,
        providerProfile,
      });
      const currentDemand = demand.projection.demands.find((entry) => (
        entry.demand.current
        && entry.demand.job.context?.kind === "thread_presentation_media"
        && entry.demand.job.context.mediaId === officialPhotoMediaId
      ));
      if (!currentDemand) throw new Error(`Thread ${threadId} official identity-photo demand did not become current`);

      return waiting("official_photo_pending", {
        threadId,
        embodimentId: embodiment.embodimentId,
        canonicalReferenceObjectRef: embodiment.asset.referenceObjectRef,
        officialPhotoMediaId,
        providerProfile,
        demandId: currentDemand.demand.demandId,
        jobId: currentDemand.demand.job.jobId,
        visualReused: visual.reused === true,
        identityReused: identity.reused === true,
      });
    },
  });
}
