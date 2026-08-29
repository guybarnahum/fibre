// Narrow inward-facing utility bridge for reasoning-model integrations.
// These are Fibre validation/digest primitives, not provider or deployment selection.
export {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "../../services/world-kernel/src/persistence-common.mjs";
