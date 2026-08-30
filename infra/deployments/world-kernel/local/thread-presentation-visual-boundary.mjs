import { createThreadPresentationVisualPublicationReconciler } from "#services/thread-presentation/src/visual-publication-reconciler.mjs";
import { createPresentationAssetDemandService } from "#services/world-kernel/src/presentation-asset-demand-service.mjs";
import { planThreadPresentationAssetSlots } from "#services/world-kernel/src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationEmbodimentRewriteService } from "#services/world-kernel/src/thread-presentation-embodiment-rewrite-service.mjs";
import { createThreadPresentationIdentityMediaRewriteService } from "#services/world-kernel/src/thread-presentation-identity-media-rewrite-service.mjs";

/**
 * Deployment composition for the current Presentation migration boundary.
 *
 * Thread Presentation owns projection/publication. The current implementation
 * modules still physically live under World Kernel, so deployment composition
 * injects them behind the Presentation service's stable reconciler boundary.
 * No World authority is transferred by this adapter.
 */
export function createThreadPresentationVisualBoundary({
  presentationServer,
  infra,
  selectProviderProfile,
  createDemandService = createPresentationAssetDemandService,
} = {}) {
  return createThreadPresentationVisualPublicationReconciler({
    presentationServer,
    infra,
    selectProviderProfile,
    createDemandService,
    createVisualRewrite: createThreadPresentationEmbodimentRewriteService,
    createIdentityRewrite: createThreadPresentationIdentityMediaRewriteService,
    planSlots: planThreadPresentationAssetSlots,
  });
}
