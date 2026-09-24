export function fidPhotoSourceMatchesCanonicalReference(source, canonicalReferenceObjectRef) {
  if (typeof canonicalReferenceObjectRef !== "string" || canonicalReferenceObjectRef === "") return false;
  if (!source || source.canonicalVisualReferenceRef !== canonicalReferenceObjectRef) return false;
  return Array.isArray(source.sourceReferences)
    && source.sourceReferences.includes(canonicalReferenceObjectRef);
}
