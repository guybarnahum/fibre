import {
  GENESIS_PASS_A_POLICY,
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  GENESIS_PASS_A_RELIABILITY_V3_VERSION,
} from "fibre/world-kernel/genesis-authority-contracts";

export const GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["observableAction"],
  properties: {
    observableAction: { type: "string" },
  },
});

const LEGACY_GENERATION_POLICY = Object.freeze({
  version: "genesis-rich-pass-a-shared-version-budget-v1",
  maxTotalGeneratedVersionsPerRecord: GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord,
});

function normalizeGenerationPolicy(candidate) {
  if (candidate === null || candidate === undefined) return LEGACY_GENERATION_POLICY;
  if (candidate?.version !== GENESIS_PASS_A_RELIABILITY_V3_VERSION) {
    throw new TypeError(`unsupported rich Pass-A generation policy ${candidate?.version ?? "unknown"}`);
  }
  for (const [key, value] of Object.entries(GENESIS_PASS_A_RELIABILITY_POLICY_V3)) {
    if (candidate[key] !== value) throw new TypeError(`G4-v3 generation policy field ${key} drift`);
  }
  return GENESIS_PASS_A_RELIABILITY_POLICY_V3;
}

export function richPassAGenerationDecision({
  generationPolicy = null,
  generatedVersions,
  formRepairs,
  recordRetries,
  nextKind,
}) {
  const policy = normalizeGenerationPolicy(generationPolicy);
  for (const [name, value] of Object.entries({ generatedVersions, formRepairs, recordRetries })) {
    if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer`);
  }
  if (!["form_repair", "record_retry"].includes(nextKind)) throw new TypeError("nextKind is invalid");
  if (generatedVersions >= policy.maxTotalGeneratedVersionsPerRecord) {
    return Object.freeze({ allowed: false, reason: "total_generated_version_budget_exhausted", policyVersion: policy.version });
  }
  if (policy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION) {
    if (nextKind === "form_repair" && formRepairs >= policy.maxFormRepairsPerRecord) {
      return Object.freeze({ allowed: false, reason: "form_repair_budget_exhausted", policyVersion: policy.version });
    }
    if (nextKind === "record_retry" && recordRetries >= policy.maxRecordRetriesPerRecord) {
      return Object.freeze({ allowed: false, reason: "record_retry_budget_exhausted", policyVersion: policy.version });
    }
  }
  return Object.freeze({ allowed: true, reason: null, policyVersion: policy.version });
}
