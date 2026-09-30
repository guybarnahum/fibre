export const ASSET_COMPLETION_ROUTE_PRESENTATION = "presentation";
export const ASSET_COMPLETION_ROUTE_WORLD_WAKE = "world_wake";
export const ASSET_COMPLETION_ROUTE_NONE = "none";

const WORLD_VISUAL_COMPLETION_KINDS = new Set([
  "thread_embodiment_canonical_visual_identity_geometry",
  "thread_embodiment_canonical_visual_identity",
]);

export function assetGenerationCompletionRoute(job) {
  const contextKind = job?.context?.kind;
  if (contextKind === "thread_presentation_media") {
    return ASSET_COMPLETION_ROUTE_PRESENTATION;
  }
  if (WORLD_VISUAL_COMPLETION_KINDS.has(contextKind)) {
    return ASSET_COMPLETION_ROUTE_WORLD_WAKE;
  }
  return ASSET_COMPLETION_ROUTE_NONE;
}

export function shouldPublishAssetGenerationCompletion(job) {
  return assetGenerationCompletionRoute(job) !== ASSET_COMPLETION_ROUTE_NONE;
}

export function shouldWakeWorldAfterAssetCompletion(asset) {
  const context = asset?.context;
  return WORLD_VISUAL_COMPLETION_KINDS.has(context?.kind)
    || (context?.kind === "thread_presentation_media" && context?.role === "official_id_photo");
}
