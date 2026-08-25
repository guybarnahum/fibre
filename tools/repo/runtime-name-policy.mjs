export const RUNTIME_NAME_DEBT_PATHS = Object.freeze([
  "services/world-kernel/src/genesis-event-structure-pool-v1.mjs",
  "services/world-kernel/src/genesis-event-structure-pool-v2.mjs",
  "services/world-kernel/src/genesis-event-structure-pool-v3.mjs",
  "services/world-kernel/src/genesis-historical-envelope-v1.mjs",
  "services/world-kernel/src/genesis-historical-realization-v1.mjs",
  "services/world-kernel/src/genesis-life-continuity-v1.mjs",
  "services/world-kernel/src/genesis-pass-a-reliability-v3.mjs",
  "services/world-kernel/src/genesis-life-pass-a.mjs",
  "services/world-kernel/src/genesis-life-pass-b-input.mjs",
  "services/world-kernel/src/genesis-life-pass-b.mjs",
  "services/world-kernel/src/genesis-life-pass-c.mjs",
  "services/world-kernel/src/genesis-pass-a-cognition.mjs",
  "services/world-kernel/src/genesis-pass-a-consistency.mjs",
  "services/world-kernel/src/genesis-pass-a-domain.mjs",
  "services/world-kernel/src/genesis-pass-a-runner.mjs",
  "services/world-kernel/src/genesis-pass-b-admission.mjs",
  "services/world-kernel/src/genesis-pass-b-cognition.mjs",
  "services/world-kernel/src/genesis-pass-b-domain.mjs",
  "services/world-kernel/src/genesis-pass-b-prompts.mjs",
  "services/world-kernel/src/genesis-pass-c-cognition.mjs",
  "services/world-kernel/src/genesis-pass-c-domain.mjs",
  "services/world-kernel/src/genesis-pass-c-prompts.mjs",
  "services/world-kernel/src/genesis-pass-c-reinterpretation.mjs",
  "services/world-kernel/src/genesis-rich-pass-a-runner.mjs",
  "services/world-kernel/src/genesis-slice-d-characterization.mjs",
  "services/world-kernel/src/genesis-slice-e-characterization.mjs",
]);

const RUNTIME_NAME_RULES = Object.freeze([
  ["PR number", /(?:^|[-_/])pr\d+(?=[-_.\/]|$)/iu],
  ["milestone label", /(?:^|[-_/])m\d+(?=[-_.\/]|$)/iu],
  ["stage or slice label", /(?:^|[-_/])(?:stage|slice)[-_][a-z0-9]+(?=[-_.\/]|$)/iu],
  ["pass label", /(?:^|[-_/])pass[-_][a-z0-9]+(?=[-_.\/]|$)/iu],
  ["implementation version suffix", /-v\d+(?=[-_.\/]|$)/iu],
]);

function normalized(path) {
  return path.replaceAll("\\", "/");
}

export function runtimeNameSmellReason(path) {
  const value = normalized(path);
  if (!value.startsWith("services/") || !value.includes("/src/")) return null;
  for (const [reason, pattern] of RUNTIME_NAME_RULES) {
    if (pattern.test(value)) return reason;
  }
  return null;
}

export function validateRuntimeNames(paths, { debtPaths = RUNTIME_NAME_DEBT_PATHS } = {}) {
  const current = new Set(paths.map(normalized));
  const allowedDebt = new Set(debtPaths.map(normalized));
  const errors = [];

  for (const path of current) {
    const reason = runtimeNameSmellReason(path);
    if (reason !== null && !allowedDebt.has(path)) {
      errors.push(`New development-chronology runtime name (${reason}): ${path}`);
    }
  }

  for (const path of allowedDebt) {
    if (!current.has(path)) {
      errors.push(`Runtime naming debt allowance is stale and must be removed: ${path}`);
    }
  }

  return errors;
}
