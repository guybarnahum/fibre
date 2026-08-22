import { GENESIS_PASS_A_POLICY } from "./genesis-pass-a-domain.mjs";

export const GENESIS_PASS_A_RELIABILITY_V3_VERSION = "pr39-g4-pass-a-reliability-amendment-v3";

export const GENESIS_PASS_A_RELIABILITY_POLICY_V3 = Object.freeze({
  version: GENESIS_PASS_A_RELIABILITY_V3_VERSION,
  authoritativeObservableActionMaxUtf8Bytes: GENESIS_PASS_A_POLICY.maxObservableActionBytes,
  initialDraftTargetUtf8Bytes: 800,
  initialDraftTargetWords: 100,
  maxFormRepairsPerRecord: 2,
  maxRecordRetriesPerRecord: 2,
  maxTotalGeneratedVersionsPerRecord: 5,
});

if (GENESIS_PASS_A_RELIABILITY_POLICY_V3.authoritativeObservableActionMaxUtf8Bytes !== 1200) {
  throw new Error("G4-v3 reliability policy requires the unchanged 1200-byte Pass-A admission ceiling");
}
