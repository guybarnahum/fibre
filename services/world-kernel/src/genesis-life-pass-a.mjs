import { resolvePromptAsset } from "#packages/model-runtime/src/prompt-registry.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  GenesisPassAValidationError,
} from "./genesis-pass-a-domain.mjs";
import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
} from "./genesis-pass-a-reliability-v3.mjs";
import {
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  richPassAGenerationDecision,
} from "./genesis-rich-pass-a-runner.mjs";
import { projectRichLifePassAInputForCognition } from "./genesis-rich-life-domain.mjs";
import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
  materializeHistoricalEnvelopeEpisode,
  normalizeHistoricalRealizationModelOutput,
} from "./genesis-historical-realization-v1.mjs";

const GENESIS_PROMPT_DIRECTORY = new URL("../prompts/", import.meta.url);

export const GENESIS_LIFE_PASS_A_PROMPT = resolvePromptAsset({
  directory: GENESIS_PROMPT_DIRECTORY,
  id: "genesis.historical-realization",
}).text;

export const GENESIS_LIFE_PASS_A_RETRY_PROMPT = resolvePromptAsset({
  directory: GENESIS_PROMPT_DIRECTORY,
  id: "genesis.historical-realization-retry",
}).text;

export const GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT = resolvePromptAsset({
  directory: GENESIS_PROMPT_DIRECTORY,
  id: "genesis.observable-action-repair",
}).text;

const FORM_REPAIRABLE_GATES = new Set([
  "pass_a_interiority_form",
  "pass_a_observable_action_bounds",
]);
const LOCAL_CIVIL_TIME_FORM_REPAIR_GATE = "pass_a_local_civil_time_narration";
const LOCAL_CIVIL_TIME_NARRATION_FAILURE = /narrates a (?:weekday|daypart) inconsistent with local civil time/iu;
const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;

function frozenEnvelopeForCognition(envelope) {
  return Object.freeze({
    windowId: envelope.windowId,
    localDate: envelope.localDate,
    localTime: envelope.localTime,
    localWeekday: envelope.localWeekday,
    daypart: envelope.daypart,
    timeZone: envelope.timeZone,
    placeRef: envelope.placeRef,
    placeKind: envelope.placeKind,
    selectionKind: envelope.selectionKind,
    structureRef: envelope.structureRef,
    counterpart: envelope.counterpart === null ? null : Object.freeze({
      participantId: envelope.counterpart.participantId,
      roleRef: envelope.counterpart.roleRef,
      introducedHere: envelope.counterpart.introducedHere,
    }),
  });
}

export function buildGenesisLifePassACognitionInput({ passAInput, envelope }) {
  const cognition = Object.freeze({
    passAInput: projectRichLifePassAInputForCognition(passAInput),
    frozenEnvelope: frozenEnvelopeForCognition(envelope),
  });
  if (/genome/iu.test(canonicalJson(cognition))) {
    throw new TypeError("replacement Pass-A cognition surface contains genome material");
  }
  return cognition;
}

function formRepairGate(error) {
  if (error instanceof GenesisPassAValidationError && FORM_REPAIRABLE_GATES.has(error.gate)) {
    return error.gate;
  }
  if (error instanceof TypeError && LOCAL_CIVIL_TIME_NARRATION_FAILURE.test(error.message)) {
    return LOCAL_CIVIL_TIME_FORM_REPAIR_GATE;
  }
  return null;
}

function failureGate(error) {
  const repairGate = formRepairGate(error);
  if (repairGate !== null) return repairGate;
  if (error instanceof GenesisPassAValidationError) return error.gate;
  return "historical_realization_record_validity";
}

function budgetOrThrow({ generatedVersions, formRepairs, recordRetries, nextKind, cause, calls }) {
  const decision = richPassAGenerationDecision({
    generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
    generatedVersions,
    formRepairs,
    recordRetries,
    nextKind,
  });
  if (decision.allowed) return decision;
  const exhausted = new GenesisPassAValidationError(
    "record_repair_exhausted",
    `replacement Pass-A exhausted ${generatedVersions} generated versions`,
    { record: cause?.record ?? null },
  );
  exhausted.cause = cause;
  exhausted.budgetDecision = structuredClone(decision);
  exhausted.calls = structuredClone(calls);
  throw exhausted;
}

export async function generateGenesisHistoricalEpisode({
  adapter,
  repairAdapter = adapter,
  passAInput,
  envelope,
  clientRequestId,
} = {}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("replacement Pass-A adapter must expose invoke()");
  if (repairAdapter === null || typeof repairAdapter?.invoke !== "function") throw new TypeError("replacement Pass-A repairAdapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("replacement Pass-A clientRequestId is required");

  const cognitionInput = buildGenesisLifePassACognitionInput({ passAInput, envelope });
  const calls = [];
  let generatedVersions = 0;
  let formRepairs = 0;
  let recordRetries = 0;
  let rawRealization = null;

  const invokeRealization = async ({ prompt, kind, failedGate = null, retryOrdinal = null }) => {
    const modelInput = failedGate === null
      ? cognitionInput
      : { ...cognitionInput, failedGate, retryOrdinal };
    const result = await adapter.invoke({
      systemPrompt: prompt,
      input: modelInput,
      responseSchema: GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
      clientRequestId: `${clientRequestId}:${kind}`,
    });
    generatedVersions += 1;
    calls.push(Object.freeze({
      kind,
      generatedVersion: generatedVersions,
      inputDigest: digest(modelInput),
      promptHash: digest(prompt),
      outputDigest: digest(result.output),
      provenance: structuredClone(result.provenance ?? null),
    }));
    return result.output;
  };

  rawRealization = await invokeRealization({ prompt: GENESIS_LIFE_PASS_A_PROMPT, kind: "initial" });
  while (true) {
    let realization = null;
    try {
      realization = normalizeHistoricalRealizationModelOutput(rawRealization);
      const episode = materializeHistoricalEnvelopeEpisode({ modelOutput: realization, envelope, passAInput });
      return Object.freeze({
        episode,
        calls: Object.freeze([...calls]),
        budgetState: Object.freeze({ generatedVersions, formRepairs, recordRetries }),
      });
    } catch (error) {
      const repairGate = formRepairGate(error);
      if (repairGate !== null && realization !== null) {
        const formDecision = richPassAGenerationDecision({
          generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
          generatedVersions,
          formRepairs,
          recordRetries,
          nextKind: "form_repair",
        });
        if (formDecision.allowed) {
          const repairOrdinal = formRepairs + 1;
          const repairInput = {
            rejectedObservableAction: realization.observableAction,
            failedGate: repairGate,
            repairOrdinal,
          };
          const result = await repairAdapter.invoke({
            systemPrompt: GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
            input: repairInput,
            responseSchema: GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
            clientRequestId: `${clientRequestId}:form-repair-${repairOrdinal}`,
          });
          generatedVersions += 1;
          formRepairs += 1;
          calls.push(Object.freeze({
            kind: `form-repair-${repairOrdinal}`,
            generatedVersion: generatedVersions,
            inputDigest: digest(repairInput),
            promptHash: digest(GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT),
            outputDigest: digest(result.output),
            provenance: structuredClone(result.provenance ?? null),
          }));
          if (result.output !== null && typeof result.output === "object" && Object.keys(result.output).length === 1 && typeof result.output.observableAction === "string") {
            rawRealization = Object.freeze({ ...realization, observableAction: result.output.observableAction });
          }
          // A malformed form-repair body remains a form-repair failure. Leave the
          // rejected realization in place so the next loop consumes the next form
          // repair allowance rather than silently debiting record retry early.
          continue;
        }
        if (formDecision.reason !== "form_repair_budget_exhausted") {
          budgetOrThrow({ generatedVersions, formRepairs, recordRetries, nextKind: "form_repair", cause: error, calls });
        }
        // Local rewriting has had its two chances. The independent record-retry
        // budget now gets a fresh realization from the same Fibre-owned skeleton.
        // This is recovery from a mechanical gate, never quality regeneration.
      }

      budgetOrThrow({ generatedVersions, formRepairs, recordRetries, nextKind: "record_retry", cause: error, calls });
      const recordRetryOrdinal = recordRetries + 1;
      recordRetries += 1;
      const gate = failureGate(error);
      rawRealization = await invokeRealization({
        prompt: GENESIS_LIFE_PASS_A_RETRY_PROMPT,
        kind: `record-retry-${recordRetryOrdinal}`,
        failedGate: gate,
        retryOrdinal: recordRetryOrdinal,
      });
    }
  }
}