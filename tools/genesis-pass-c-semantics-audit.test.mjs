import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
  passCInitialPromptHash,
  passCInitialResponseSchemaHash,
  passCReinterpretationPromptHash,
  passCReinterpretationResponseSchemaHash,
} from "../services/world-kernel/src/genesis-pass-c-prompts.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
  normalizeReinterpretationPassCModelOutput,
} from "../services/world-kernel/src/genesis-pass-c-domain.mjs";
import { E2_N1_PASS_C_PROMPT } from "./genesis-rich-life-e2-n1.mjs";

function initialInput() {
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "initial",
    targetMemory: {
      memoryRef: "mem_pass_c_semantics_001",
      episodeRefs: ["ep_pass_c_semantics_001"],
      rememberedContent: "I remember waiting alone by the library window after the others had left.",
      uncertainty: ["I am unsure whether it was raining or only overcast."],
    },
    formation: {
      asOf: "2010-01-01T00:00:00Z",
      ageAtFormation: 13,
      chronologyIndex: 6,
    },
    priorMeaning: null,
    trigger: null,
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  });
}

test("canonical Pass C prompts are constitutive and preserve no-meaning outcomes", () => {
  assert.match(GENESIS_PASS_C_INITIAL_PROMPT, /Form what the one supplied remembered experience comes to mean durably/i);
  assert.match(GENESIS_PASS_C_INITIAL_PROMPT, /not a request to detect, prove, or recover a meaning/i);
  assert.match(GENESIS_PASS_C_INITIAL_PROMPT, /no_durable_meaning is fully legal/i);
  assert.match(GENESIS_PASS_C_INITIAL_PROMPT, /do not force meaning because a memory was retained/i);

  assert.match(GENESIS_PASS_C_REINTERPRETATION_PROMPT, /constitutive reinterpretation task/i);
  assert.match(GENESIS_PASS_C_REINTERPRETATION_PROMPT, /not a request to detect, prove, or recover a revised meaning/i);
  assert.match(GENESIS_PASS_C_REINTERPRETATION_PROMPT, /All three outcomes are fully legal; do not force revision/i);

  assert.deepEqual(GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA.properties.outcome.enum, ["durable_meaning", "no_durable_meaning"]);
  assert.deepEqual(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA.properties.outcome.enum, ["revised", "unchanged", "none"]);

  for (const value of [
    passCInitialPromptHash(),
    passCInitialResponseSchemaHash(),
    passCReinterpretationPromptHash(),
    passCReinterpretationResponseSchemaHash(),
  ]) {
    assert.match(value, /^sha256:[0-9a-f]{64}$/);
  }
});

test("no_durable_meaning remains a complete legal canonical Pass C outcome", () => {
  assert.deepEqual(normalizeInitialPassCModelOutput({
    outcome: "no_durable_meaning",
    summary: null,
    parts: [],
  }, initialInput()), {
    outcome: "no_durable_meaning",
    summary: null,
    parts: [],
  });
});

test("reinterpretation keeps unchanged and none distinct legal non-revision outcomes", () => {
  const base = initialInput();
  const reinterpretation = normalizePassCInput({
    ...base,
    mode: "reinterpretation",
    formation: {
      asOf: "2017-01-01T00:00:00Z",
      ageAtFormation: 20,
      chronologyIndex: 12,
    },
    priorMeaning: {
      summary: "Quiet public places became associated with room to choose without explanation.",
      parts: [{
        meaningPartId: "mpart_1064819a36060606f61318145745111319f006567bf340d4",
        meaning: "The remembered wait remained linked with privacy rather than loneliness.",
      }],
    },
    trigger: {
      episodeRef: "ep_pass_c_semantics_002",
      occurredAt: "2016-12-01T00:00:00Z",
      observableAction: "Years later, the Thread waits in the same library while a younger relative chooses books.",
      relation: "same_structure_family",
    },
  });

  for (const outcome of ["unchanged", "none"]) {
    assert.deepEqual(normalizeReinterpretationPassCModelOutput({ outcome, summary: null, parts: [] }, reinterpretation), {
      outcome,
      summary: null,
      parts: [],
    });
  }
});

test("burned N1/N2 Pass C wording remains historical evidence and is not the canonical future prompt", () => {
  assert.match(E2_N1_PASS_C_PROMPT, /Decide whether this memory has durable meaning/);
  assert.notEqual(E2_N1_PASS_C_PROMPT, GENESIS_PASS_C_INITIAL_PROMPT);
});
