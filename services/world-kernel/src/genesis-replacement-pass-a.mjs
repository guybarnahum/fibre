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

export const GENESIS_REPLACEMENT_PASS_A_PROMPT = `You are Fibre Genesis historical realization.
Fibre has already frozen the event skeleton: exact time, local civil-time context, place, selected EventStructure/world-emergent status, and any required counterpart. You are not choosing those facts.
Using only the supplied Pass-A cognition context and frozen envelope, realize one externally witnessable episode.
Return only observableAction, additionalParticipantRefs, additionalIntroductions, and intellectualEncounter.
Do not return or restate episodeId, occurredAt, ageAtEvent, placeRef, structureRef, participantRefs, introducedAt, or any other skeleton field; Fibre stamps them mechanically.
additionalParticipantRefs may name only participants already grounded by the supplied Pass-A context. additionalIntroductions may add a genuinely needed new participant only through a World-afforded role; Fibre stamps introducedAt to the envelope instant.
Describe what happened, not what it meant. Do not write significance, lessons, personality, remembered meaning, future policy, desired adult character, or frequency claims about the sparse life sample.
The envelope's local weekday/daypart/place are factual authority. Do not narrate a conflicting weekday, daypart, or location.
Keep observableAction concise; the unchanged authoritative maximum is 1200 UTF-8 bytes, with an initial target of 800 bytes / 100 words.`;

export const GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT = `${GENESIS_REPLACEMENT_PASS_A_PROMPT}\n\nThe previous realization failed a mechanical record-validity gate and has been discarded. You do not receive the rejected realization. Generate a fresh realization from the exact same frozen context. failedGate is a mechanical contract signal only, not a quality signal. Do not make the replacement richer, more meaningful, more diverse, or more consequential because a retry occurred.`;

export const GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT = `You are Fibre Genesis observable-action form repair.
You receive only the rejected observableAction and the failed mechanical form gate. Return only a replacement observableAction.
Preserve the externally stated event facts already present in the sentence; do not invent, reverse, upgrade, interpret, or add participants, places, causes, meanings, lessons, or future implications.
Use one plain concise sentence. Target no more than 600 UTF-8 bytes and 80 words on the first repair; no more than 300 UTF-8 bytes and 40 words on the second. The authoritative ceiling remains 1200 UTF-8 bytes.`;

const FORM_REPAIRABLE_GATES = new Set([
  "pass_a_interiority_form",
  "pass_a_observable_action_bounds",
]);
const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;

function frozenEnvelopeForCognition(envelope) {
  return Object.freeze({
    ordinal: envelope.ordinal,
    windowId: envelope.windowId,
    localDate: envelope.localDate,
    localTime: envelope.localTime,
    localWeekday: envelope.localWeekday,
    daypart: envelope.daypart,
    timeZone: envelope.timeZone,
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

export function buildReplacementPassACognitionInput({ passAInput, envelope }) {
  const cognition = Object.freeze({
    passAInput: projectRichLifePassAInputForCognition(passAInput),
    frozenEnvelope: frozenEnvelopeForCognition(envelope),
  });
  if (/genome/iu.test(canonicalJson(cognition))) {
    throw new TypeError("replacement Pass-A cognition surface contains genome material");
  }
  return cognition;
}

function isFormRepairable(error) {
  return error instanceof GenesisPassAValidationError && FORM_REPAIRABLE_GATES.has(error.gate);
}

function failureGate(error) {
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

export async function generateReplacementHistoricalEpisode({
  adapter,
  repairAdapter = adapter,
  passAInput,
  envelope,
  clientRequestId,
} = {}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("replacement Pass-A adapter must expose invoke()");
  if (repairAdapter === null || typeof repairAdapter?.invoke !== "function") throw new TypeError("replacement Pass-A repairAdapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("replacement Pass-A clientRequestId is required");

  const cognitionInput = buildReplacementPassACognitionInput({ passAInput, envelope });
  const calls = [];
  let generatedVersions = 0;
  let formRepairs = 0;
  let recordRetries = 0;
  let rawRealization = null;
  let pendingError = null;

  const invokeRealization = async ({ prompt, kind, failedGate = null }) => {
    const modelInput = failedGate === null ? cognitionInput : { ...cognitionInput, failedGate };
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

  rawRealization = await invokeRealization({ prompt: GENESIS_REPLACEMENT_PASS_A_PROMPT, kind: "initial" });
  while (true) {
    let realization = null;
    try {
      if (pendingError !== null) {
        const error = pendingError;
        pendingError = null;
        throw error;
      }
      realization = normalizeHistoricalRealizationModelOutput(rawRealization);
      const episode = materializeHistoricalEnvelopeEpisode({ modelOutput: realization, envelope, passAInput });
      return Object.freeze({
        episode,
        calls: Object.freeze([...calls]),
        budgetState: Object.freeze({ generatedVersions, formRepairs, recordRetries }),
      });
    } catch (error) {
      if (isFormRepairable(error) && realization !== null) {
        budgetOrThrow({ generatedVersions, formRepairs, recordRetries, nextKind: "form_repair", cause: error, calls });
        const repairOrdinal = formRepairs + 1;
        const repairInput = {
          rejectedObservableAction: realization.observableAction,
          failedGate: error.gate,
          repairOrdinal,
        };
        const result = await repairAdapter.invoke({
          systemPrompt: GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT,
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
          promptHash: digest(GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT),
          outputDigest: digest(result.output),
          provenance: structuredClone(result.provenance ?? null),
        }));
        if (result.output === null || typeof result.output !== "object" || Object.keys(result.output).length !== 1 || typeof result.output.observableAction !== "string") {
          pendingError = new GenesisPassAValidationError("pass_a_output_schema", "replacement Pass-A form repair must return only observableAction");
        } else {
          rawRealization = Object.freeze({ ...realization, observableAction: result.output.observableAction });
        }
        continue;
      }

      budgetOrThrow({ generatedVersions, formRepairs, recordRetries, nextKind: "record_retry", cause: error, calls });
      const recordRetryOrdinal = recordRetries + 1;
      recordRetries += 1;
      const gate = failureGate(error);
      rawRealization = await invokeRealization({
        prompt: GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT,
        kind: `record-retry-${recordRetryOrdinal}`,
        failedGate: gate,
      });
    }
  }
}
