import { runGuardian } from "./dignity-guardian.mjs";

// Stable active entry point used by the world kernel. The Guardian policy
// version is data returned by the current Guardian implementation; historical
// Guardian versions remain evidence, not parallel runtime branches.
export function runSemanticDignityGuardian(capsule, modelAdapter, options = {}) {
  return runGuardian(capsule, modelAdapter, options);
}
