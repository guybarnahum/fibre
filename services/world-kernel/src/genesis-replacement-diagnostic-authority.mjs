import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const REPLACEMENT_V2_D3_PRIMARY_ORDINALS = Object.freeze([3, 6]);
export const REPLACEMENT_V2_D3_PRIMARY_HORIZONS = Object.freeze([8, 14]);
export const REPLACEMENT_V2_D3_EACH_ORDINAL_MINIMUM_CORRECT_CORE_EDGES = 4;
export const REPLACEMENT_V2_D3_AT_LEAST_ONE_ORDINAL_CORRECT_CORE_EDGES = 5;
export const REPLACEMENT_V2_D3_THRESHOLD_STATEMENT = "Both treated ordinals must score at least 4/5 measured core edges correct, and at least one treated ordinal must score 5/5 measured core edges correct.";

function fail(message) {
  throw new Error(message);
}

function equalJson(actual, expected) {
  return canonicalJson(actual) === canonicalJson(expected);
}

export function assertReplacementV2DiagnosticAuthority(reconciliation) {
  if (reconciliation === null || typeof reconciliation !== "object" || Array.isArray(reconciliation)) {
    fail("replacement-v2 diagnostic reconciliation must be an object");
  }
  const d3 = reconciliation.effectiveReplacementV2D3;
  if (d3 === null || typeof d3 !== "object" || Array.isArray(d3)) {
    fail("replacement-v2 diagnostic reconciliation is missing effective D3 authority");
  }
  if (!equalJson(d3.primaryOrdinals, REPLACEMENT_V2_D3_PRIMARY_ORDINALS)) {
    fail("replacement-v2 D3 primary ordinals drift");
  }
  if (!equalJson(d3.primaryHorizons, REPLACEMENT_V2_D3_PRIMARY_HORIZONS)) {
    fail("replacement-v2 D3 primary horizons drift");
  }
  if (d3.thresholdChanged !== false) {
    fail("replacement-v2 D3 threshold changed");
  }
  const requirement = d3.clearRequirement;
  if (requirement === null || typeof requirement !== "object" || Array.isArray(requirement)) {
    fail("replacement-v2 D3 clear requirement is missing");
  }
  if (requirement.eachOrdinalMinimumCorrectCoreEdges !== REPLACEMENT_V2_D3_EACH_ORDINAL_MINIMUM_CORRECT_CORE_EDGES) {
    fail("replacement-v2 D3 each-ordinal threshold drift");
  }
  if (requirement.atLeastOneOrdinalCorrectCoreEdges !== REPLACEMENT_V2_D3_AT_LEAST_ONE_ORDINAL_CORRECT_CORE_EDGES) {
    fail("replacement-v2 D3 one-ordinal perfect threshold drift");
  }
  if (d3.statement !== REPLACEMENT_V2_D3_THRESHOLD_STATEMENT) {
    fail("replacement-v2 D3 threshold statement drift");
  }
  const authority = Object.freeze({
    primaryOrdinals: REPLACEMENT_V2_D3_PRIMARY_ORDINALS,
    primaryHorizons: REPLACEMENT_V2_D3_PRIMARY_HORIZONS,
    eachOrdinalMinimumCorrectCoreEdges: REPLACEMENT_V2_D3_EACH_ORDINAL_MINIMUM_CORRECT_CORE_EDGES,
    atLeastOneOrdinalCorrectCoreEdges: REPLACEMENT_V2_D3_AT_LEAST_ONE_ORDINAL_CORRECT_CORE_EDGES,
    statement: REPLACEMENT_V2_D3_THRESHOLD_STATEMENT,
  });
  return Object.freeze({
    ...authority,
    digest: `sha256:${sha256(canonicalJson(authority))}`,
  });
}
