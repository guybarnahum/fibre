// Narrow inward-facing utility bridge for model integrations.
// These are stable Fibre validation/digest primitives, not infrastructure selection.
export {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "../services/world-kernel/src/persistence-common.mjs";
