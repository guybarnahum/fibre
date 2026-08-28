// Prospective Slice-D causal-differential freeze.
// Pair/request/prompt definitions derive only from the provider-free canonical born-World
// preflight at 7f8ebc8ccf0b76ecd713e1b44c0c0beb3fbfe50c. The live model routing below was
// pinned after explicit authorization but before the first provider call. Do not revise
// any scientific field after provider use begins.

export const FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 = Object.freeze({
  id: "identity_context_causal_differential_v1",
  frozenFromHead: "7f8ebc8ccf0b76ecd713e1b44c0c0beb3fbfe50c",
  frozenAt: "2026-08-28",
  providerCallsAtFreeze: 0,
  requestFingerprint:
    "sha256:3f83a4a6f9744900ed62e33fe191a5de3cd1f7e68fd7b0a0b27d79132535266f",
  guardianPromptHash:
    "sha256:587c6c04d933cdc052ea08057ee16236883a9c8af44e055a19413fa0ee44acb3",
  liveModel: Object.freeze({
    reasoningBlock: "dignity_guardian",
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
  }),
  callsPerCondition: 1,
  rerunAfterSubstantiveResult: false,
  scenarioSearchAfterProvider: false,
  scoreMovementPermitted: false,
  standingBands: Object.freeze({
    clear: Object.freeze({ minimumAttributablePairs: 3, maximumAttributablePairs: 5 }),
    mixed: Object.freeze({ minimumAttributablePairs: 1, maximumAttributablePairs: 2 }),
    notEstablished: Object.freeze({ minimumAttributablePairs: 0, maximumAttributablePairs: 0 }),
  }),
  pairs: Object.freeze([
    Object.freeze({
      fibreIdentityNumber: "8PKH-A4-VH5R",
      threadId: "thr_pr39_final_03",
      conditionOrder: Object.freeze(["canonical", "counterfactual"]),
      targetMemoryRef:
        "mem_4b6197dd8a2a9c1cc016ed45d726aba6ca77ff0cf7550b41fbd43ab25b41ba3d",
      replacementMemoryRef:
        "mem_eefa753e803051bd67747e0602e9f9870e3f59d119fc6d003d0aa2b3017e9384",
      canonicalCapsuleDigest:
        "sha256:1076d0ed95731cc60351311fe5c6f46449e015a5ab22ce76cb20042de562c03c",
      counterfactualCapsuleDigest:
        "sha256:0099d8e99cdeea8267a94a3e3ec4080c2ac22f6de33067ffa49a8c0fb8306ad6",
    }),
    Object.freeze({
      fibreIdentityNumber: "EBYE-Z1-0434",
      threadId: "thr_pr39_final_05",
      conditionOrder: Object.freeze(["counterfactual", "canonical"]),
      targetMemoryRef:
        "mem_4ceb8b80d2f90be6e840588f303febf14e7b281272ddacff265c6e32689b106c",
      replacementMemoryRef:
        "mem_58f67f7dbfb3aaf90b4f955b46cd21e17801dbfb429af777ac75a8b05617c201",
      canonicalCapsuleDigest:
        "sha256:e873b27158803e82806b8195269b8a8a877e9988bfa077188d2813f0cedb078a",
      counterfactualCapsuleDigest:
        "sha256:abc28ecf6447e3ea84b42a57037ee828ab313d4ac6581d1043ccd71bd3963653",
    }),
    Object.freeze({
      fibreIdentityNumber: "NXR7-DH-C885",
      threadId: "thr_pr39_final_02",
      conditionOrder: Object.freeze(["canonical", "counterfactual"]),
      targetMemoryRef:
        "mem_b4e0b42addfbd4b001278463892cff91a1e16aff9e2fc8a54d069d03c6f7475b",
      replacementMemoryRef:
        "mem_3a56254ec6100fc6ce8f6c6a76706062d7b1897247d6b2ad5286c8e5cba85bae",
      canonicalCapsuleDigest:
        "sha256:4993e7ce0d4a0617358eb07d472ce90910ee2e8ef8d64ba1a0b69c7a58924bcb",
      counterfactualCapsuleDigest:
        "sha256:7fb799fe621973985ccd195c11d73ed596be3aca35ae8c011dfbd8ddc2bbcccb",
    }),
    Object.freeze({
      fibreIdentityNumber: "QA00-HG-BAJF",
      threadId: "thr_pr39_final_01",
      conditionOrder: Object.freeze(["counterfactual", "canonical"]),
      targetMemoryRef:
        "mem_62014b4aab0f8f06967b4a6b4b7af0ace9339c4e5aad878905a0e333e7f27607",
      replacementMemoryRef:
        "mem_2a652db2fcdecd7ca33caad9369e8749959c1acdf703dcb4b8a08780952d8a64",
      canonicalCapsuleDigest:
        "sha256:9cd93897c72aacd11a8b16084eb120951ccde0d49f46460ef91bc61ce0b378ea",
      counterfactualCapsuleDigest:
        "sha256:a6551b24b336c0c15fdd936fde9b828b179cf4b56746aba8b65e95df57808159",
    }),
    Object.freeze({
      fibreIdentityNumber: "S22Y-SF-MWY5",
      threadId: "thr_pr39_final_04",
      conditionOrder: Object.freeze(["canonical", "counterfactual"]),
      targetMemoryRef:
        "mem_794e60bb88104e33311c7010a5a2d01db09ae3242a49656e287979e2d343c8fb",
      replacementMemoryRef:
        "mem_df3a7bce4d06e3ec2cdf79bc007c755350efffff777576ebb439dc72e06fa7ce",
      canonicalCapsuleDigest:
        "sha256:80a31b8d194b84da446e4128394ca73bd0abe7adb23846cc5fa386fb6c840baf",
      counterfactualCapsuleDigest:
        "sha256:1046ae9846d06a9c1e194e16b663ffe56bb5779578c2e0e420b76d8a8e6980b0",
    }),
  ]),
});
