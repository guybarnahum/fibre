// Exact provider-free #41 preflight witnesses captured from the canonical #39 World.
// Maintainer execution at repository head 412a1fdcb252b5cc3eed40b1ff3afcba431f03c6
// returned M2 STANDING PREFLIGHT: CLEAR with providerCalls=0 and World query-only.
// Do not revise these scientific bindings after provider use begins.

export const FROZEN_M2_STANDING_PREFLIGHT_V1 = Object.freeze({
  id: "m2_standing_stability_replacement_v1",
  frozenFromHead: "412a1fdcb252b5cc3eed40b1ff3afcba431f03c6",
  frozenAt: "2026-08-30",
  providerCallsAtFreeze: 0,
  worldQueryOnlyAtFreeze: true,
  plannedSubstantiveCalls: 30,
  requestFingerprint:
    "sha256:3f83a4a6f9744900ed62e33fe191a5de3cd1f7e68fd7b0a0b27d79132535266f",
  guardianPromptHash:
    "sha256:587c6c04d933cdc052ea08057ee16236883a9c8af44e055a19413fa0ee44acb3",
  stability: Object.freeze({
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    trialsPerThread: 5,
    minimumExactTopLevelMatches: 4,
    minimumGroundedTrials: 4,
  }),
  replacement: Object.freeze({
    provider: "google",
    modelId: "gemini-3.6-flash",
    trialsPerThread: 1,
  }),
  // Fresh OpenAI trials are executed round-robin by trial index across this
  // FIN-sorted cohort, followed by one Google replacement call per Thread in
  // the same order. This call order is fixed before provider use.
  threads: Object.freeze([
    Object.freeze({
      fibreIdentityNumber: "8PKH-A4-VH5R",
      threadId: "thr_pr39_final_03",
      canonicalCapsuleDigest:
        "sha256:1076d0ed95731cc60351311fe5c6f46449e015a5ab22ce76cb20042de562c03c",
      modelInputDigest:
        "sha256:9628791369ac9de766d0344d9d2457e66f88e5357fedfa7d7ee165476781ae18",
      responseSchemaHash:
        "sha256:df7236499e104939c773e6a774561344d93d3836762e80430916f263753bea07",
      expected: Object.freeze({ proposedAction: "refuse", participationFit: "mixed" }),
      canonicalIdentityMemoryRefs: Object.freeze([
        "ias_9dd6c44ffdb1b792d90f94a358e426d59dea9dafb36a5057a36db9450fc7b3a3",
        "mem_4b6197dd8a2a9c1cc016ed45d726aba6ca77ff0cf7550b41fbd43ab25b41ba3d",
        "mem_b2995e101d38fa7d61dfaed8d2735033726275d0a8292a50724ae7b0d031824d",
      ]),
    }),
    Object.freeze({
      fibreIdentityNumber: "EBYE-Z1-0434",
      threadId: "thr_pr39_final_05",
      canonicalCapsuleDigest:
        "sha256:e873b27158803e82806b8195269b8a8a877e9988bfa077188d2813f0cedb078a",
      modelInputDigest:
        "sha256:87aed3b52cef60446a7f587e2d477307c34bc9ceb0ce69602890107b391776e2",
      responseSchemaHash:
        "sha256:5b9ee715d4676e2e8775e5cff563410c4fa590b63c32a1dab6ad7ecc11df77fd",
      expected: Object.freeze({ proposedAction: "refuse", participationFit: "mixed" }),
      canonicalIdentityMemoryRefs: Object.freeze([
        "ias_b733380a35363ca9cd350d46abbf24ec62249456afd4a88ea26bf02ee5407348",
        "mem_4ceb8b80d2f90be6e840588f303febf14e7b281272ddacff265c6e32689b106c",
        "mem_99b7de70089ba0ed05e7b92ecadada61738ab91752eeb5cfd4ce6cae2324acbc",
      ]),
    }),
    Object.freeze({
      fibreIdentityNumber: "NXR7-DH-C885",
      threadId: "thr_pr39_final_02",
      canonicalCapsuleDigest:
        "sha256:4993e7ce0d4a0617358eb07d472ce90910ee2e8ef8d64ba1a0b69c7a58924bcb",
      modelInputDigest:
        "sha256:dc03992fe91dd0a8a3950dc6fe5f0c04935e3209b9322f964ad2a568661b12aa",
      responseSchemaHash:
        "sha256:df1181d3d5eab094730968e3978f3dd121707480a9a1fa5aff2a95102d06d088",
      expected: Object.freeze({ proposedAction: "accept", participationFit: "high" }),
      canonicalIdentityMemoryRefs: Object.freeze([
        "ias_cb2e97d5aea3e079433d6276af7f0cc0c387085275b623624f2db3f657408034",
        "mem_60d8bd68e8ff599650f6929a33d2bc21ea1f21aabc23a60c32e2447bb8372ddc",
        "mem_b4e0b42addfbd4b001278463892cff91a1e16aff9e2fc8a54d069d03c6f7475b",
      ]),
    }),
    Object.freeze({
      fibreIdentityNumber: "QA00-HG-BAJF",
      threadId: "thr_pr39_final_01",
      canonicalCapsuleDigest:
        "sha256:9cd93897c72aacd11a8b16084eb120951ccde0d49f46460ef91bc61ce0b378ea",
      modelInputDigest:
        "sha256:0223a45b1ecb9f4d4ce8d647a29abba9bda054cabbf9f8c2ebd0885dadb048e2",
      responseSchemaHash:
        "sha256:7624e47085b02beb5b27193045372d85c4c66688793b312ddd819a4dce5f2015",
      expected: Object.freeze({ proposedAction: "refuse", participationFit: "low" }),
      canonicalIdentityMemoryRefs: Object.freeze([
        "ias_b03921a38665bc06b191c0382b3af93179c934cc705e7827bfcd5fb31e4f23ef",
        "mem_152a713cc6fefd7ebc40cdaddcaf107074f2aa4b5ee1d86105e774c1b723a4ac",
        "mem_62014b4aab0f8f06967b4a6b4b7af0ace9339c4e5aad878905a0e333e7f27607",
      ]),
    }),
    Object.freeze({
      fibreIdentityNumber: "S22Y-SF-MWY5",
      threadId: "thr_pr39_final_04",
      canonicalCapsuleDigest:
        "sha256:80a31b8d194b84da446e4128394ca73bd0abe7adb23846cc5fa386fb6c840baf",
      modelInputDigest:
        "sha256:7a58dff25b2b0898f9cd52939bd8dfb89a59c7b76d4ce7c8b48c7c18b1ec5fd8",
      responseSchemaHash:
        "sha256:a6481f46262ac1fc9213d81450e905811e2bd7a72e6e09b615706fe0e23f3701",
      expected: Object.freeze({ proposedAction: "refuse", participationFit: "mixed" }),
      canonicalIdentityMemoryRefs: Object.freeze([
        "ias_127c1e605c72e96b04e6db1ab648867184a0bed9a367f5409304b39bcd88bd68",
        "mem_06bdb087fd9f550b207ecbbda0ddc1f073b691c0518563321ef2cdbe60ce2c6a",
        "mem_794e60bb88104e33311c7010a5a2d01db09ae3242a49656e287979e2d343c8fb",
      ]),
    }),
  ]),
});
