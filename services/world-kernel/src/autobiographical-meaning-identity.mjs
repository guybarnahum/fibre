import {
  assertId,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export function autobiographicalMeaningId(memoryRef) {
  assertId("meaning memoryRef", memoryRef);
  return `mean_${sha256(canonicalJson({ memoryRef }))}`;
}
