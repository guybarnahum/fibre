export const IDENTITY_CONTEXT_PROJECTION_POLICY = Object.freeze({
  id: "identity_context_projection",
  version: "2",
  purpose: "request_appraisal",
  maximumIdentityAssertions: 8,
  maximumSemanticStates: 8,
  maximumMemories: 4,
  maximumAvailableMeaningMemories: 2,
  maximumEvidenceItems: 20,
  maximumEvidenceBytes: 12288,
});
