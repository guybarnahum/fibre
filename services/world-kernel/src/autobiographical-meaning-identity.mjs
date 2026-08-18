import {
  assertFiniteNumber,
  assertId,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export function autobiographicalMeaningId(memoryRef) {
  assertId("meaning memoryRef", memoryRef);
  return `mean_${sha256(canonicalJson({ memoryRef }))}`;
}

export function autobiographicalMeaningPartIdFromRef({ memoryRef, ordinal }) {
  assertId("meaning-part memoryRef", memoryRef);
  assertFiniteNumber("meaning-part ordinal", ordinal, { integer: true, minimum: 1 });
  return `mpart_${sha256(canonicalJson({ memoryRef, ordinal })).slice(0, 40)}`;
}
