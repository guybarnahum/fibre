import { assertIsoTimestamp, assertNonEmpty } from "./persistence-common.mjs";
import { planThreadPresentationAssetSlots } from "./thread-presentation-asset-planner.mjs";

export function createThreadPresentationAssetDemandTrigger({
  presentationServer,
  demandService,
  providerProfile = "presentation-image-default-v1",
} = {}) {
  if (!presentationServer || typeof presentationServer.getSnapshot !== "function") {
    throw new TypeError("presentationServer.getSnapshot must be a function");
  }
  if (!demandService || typeof demandService.reconcile !== "function") {
    throw new TypeError("demandService.reconcile must be a function");
  }
  assertNonEmpty("providerProfile", providerProfile);

  return Object.freeze({
    async reconcileCurrent({
      channelId,
      requestedAt,
      regenerationKey = null,
    }) {
      assertNonEmpty("channelId", channelId);
      assertIsoTimestamp("requestedAt", requestedAt);
      if (regenerationKey !== null) assertNonEmpty("regenerationKey", regenerationKey);

      // Always load the current admitted snapshot at trigger time. A delayed
      // callback must not dispatch demand from an older presentation revision.
      const current = await presentationServer.getSnapshot(channelId);
      if (current === null) return null;

      const slotPlan = planThreadPresentationAssetSlots({
        bundle: {
          presentation: current.snapshot.presentation,
          media: current.snapshot.media,
          provenance: current.snapshot.provenance,
        },
        snapshotObjectRef: current.pointer.objectRef,
        snapshotDigest: current.pointer.snapshotDigest,
      });
      const demand = await demandService.reconcile({
        scope: {
          entityKind: "thread",
          entityRef: slotPlan.threadId,
        },
        slots: slotPlan.slots,
        requestedAt,
        providerProfile,
        regenerationKey,
      });

      return Object.freeze({
        channelId,
        threadId: slotPlan.threadId,
        presentationId: slotPlan.presentationId,
        snapshotObjectRef: slotPlan.snapshotObjectRef,
        snapshotDigest: slotPlan.snapshotDigest,
        demand,
      });
    },
  });
}
