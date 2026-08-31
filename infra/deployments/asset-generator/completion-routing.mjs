export const ASSET_COMPLETION_ROUTE_PRESENTATION = "presentation";
export const ASSET_COMPLETION_ROUTE_NONE = "none";

export function assetGenerationCompletionRoute(job) {
  const contextKind = job?.context?.kind;
  if (contextKind === "thread_presentation_media") {
    return ASSET_COMPLETION_ROUTE_PRESENTATION;
  }
  return ASSET_COMPLETION_ROUTE_NONE;
}

export function shouldPublishPresentationAssetCompletion(job) {
  return assetGenerationCompletionRoute(job) === ASSET_COMPLETION_ROUTE_PRESENTATION;
}
