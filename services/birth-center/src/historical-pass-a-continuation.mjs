import { canonicalJson, sha256 } from "../../world-kernel/src/persistence-common.mjs";
import {
  GENESIS_PASS_A_POLICY,
  GenesisPassAValidationError,
} from "../../world-kernel/src/genesis-pass-a-domain.mjs";
import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  GENESIS_PASS_A_RELIABILITY_V3_VERSION,
} from "../../world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import {
  assertPassAHistoryConsistency,
  validateConsistentPassAEpisode,
} from "../../world-kernel/src/genesis-pass-a-consistency.mjs";
import { passACognitionInputDigest } from "../../world-kernel/src/genesis-pass-a-cognition.mjs";
import {
  GENESIS_RICH_PASS_A_REPAIR_PROMPT,
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
  GENESIS_RICH_PASS_A_REPAIR_TARGET_BYTES,
  GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_BYTES,
  GENESIS_RICH_PASS_A_REPAIR_TARGET_WORDS,
  GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_WORDS,
  richPassAGenerationDecision,
  richPassAPromptForPolicy,
} from "../../world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  assertRichRepairPreservesEpisodeFacts,
  validateRichPassAEpisode,
} from "../../world-kernel/src/genesis-rich-life-episode.mjs";
import { projectRichLifePassAInputForCognition } from "../../world-kernel/src/genesis-rich-life-domain.mjs";

export const HISTORICAL_PASS_A_CONTINUATION_VERSION = "fibre-historical-pass-a-continuation-v1";

const RECORD_RETRYABLE_GATES = Object.freeze(new Set([
  "pass_a_output_schema",
  "pass_a_chronology",
  "pass_a_place_ref",
  "pass_a_participant_ref",
  "pass_a_participant_introduction",
  "pass_a_structure_ref",
  "pass_a_structure_participation",
  "pass_a_subject_participation",
  "pass_a_episode_identity",
  "pass_a_age_witness",
  "pass_a_intellectual_encounter",
  "pass_a_selected_opportunity",
]));

const INTELLECTUAL_ENCOUNTER_RETRY_CONSTRAINT = Object.freeze({
  rule: "intellectualEncounter.subjectPersonRef identifies the encountered subject only when subjectKind=person; otherwise subjectPersonRef must be null. A person who merely mediates access to a text, path, practice, idea, event, artwork, community, or other non-person subject belongs in episode.participantRefs instead.",
});

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function stripEncounter(candidate) {
  const base = structuredClone(candidate);
  delete base.intellectualEncounter;
  return base;
}

function validateConsistentRichEpisode(candidate, input) {
  const rich = validateRichPassAEpisode(candidate, input);
  const consistencyEpisode = stripEncounter(rich);
  consistencyEpisode.structureRef = null;
  validateConsistentPassAEpisode(consistencyEpisode, input);
  return rich;
}

function formRepairable(error) {
  return error instanceof GenesisPassAValidationError && [
    "pass_a_interiority_form",
    "pass_a_observable_action_bounds",
  ].includes(error.gate);
}

function recordRetryable(error) {
  return error instanceof GenesisPassAValidationError && RECORD_RETRYABLE_GATES.has(error.gate);
}

function repairTargets(repairOrdinal) {
  return repairOrdinal <= 1
    ? {
      targetRepairUtf8Bytes: GENESIS_RICH_PASS_A_REPAIR_TARGET_BYTES,
      targetRepairWords: GENESIS_RICH_PASS_A_REPAIR_TARGET_WORDS,
    }
    : {
      targetRepairUtf8Bytes: GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_BYTES,
      targetRepairWords: GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_WORDS,
    };
}

function repairConstraint(error, rejectedEpisode, repairOrdinal) {
  const constraint = {
    failedGate: error.gate,
    failureMessage: error.message,
    authoritativeMaxObservableActionUtf8Bytes: GENESIS_PASS_A_POLICY.maxObservableActionBytes,
    ...repairTargets(repairOrdinal),
  };
  if (error.gate === "pass_a_observable_action_bounds") {
    constraint.rejectedObservableActionUtf8Bytes = typeof rejectedEpisode?.observableAction === "string"
      ? Buffer.byteLength(rejectedEpisode.observableAction, "utf8")
      : null;
  }
  return constraint;
}

function retryConstraint(error) {
  if (!(error instanceof GenesisPassAValidationError)) return null;
  if (error.gate === "pass_a_intellectual_encounter") return INTELLECTUAL_ENCOUNTER_RETRY_CONSTRAINT;
  return null;
}

function rawEpisode(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output) ||
      output.episode === null || typeof output.episode !== "object" || Array.isArray(output.episode)) {
    throw new GenesisPassAValidationError(
      "pass_a_output_schema",
      "historical continuation model output must contain one episode",
      { record: output },
    );
  }
  return output.episode;
}

function rawRepairObservableAction(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output) ||
      Object.keys(output).length !== 1 || typeof output.observableAction !== "string" || output.observableAction.trim() === "") {
    throw new GenesisPassAValidationError(
      "pass_a_output_schema",
      "historical continuation repair output must contain only observableAction",
      { record: output },
    );
  }
  return output.observableAction;
}

function exhaust(error, state, continuationCalls, continuationRepairs, continuationRetries, budget) {
  const exhausted = new GenesisPassAValidationError(
    "record_repair_exhausted",
    `historical Pass-A continuation exhausted after ${state.generatedVersions} generated versions`,
    { record: error?.record ?? state.candidate },
  );
  exhausted.cause = error;
  exhausted.generationPolicyVersion = GENESIS_PASS_A_RELIABILITY_V3_VERSION;
  exhausted.budgetExhaustion = structuredClone(budget);
  exhausted.budgetState = Object.freeze({
    generatedVersions: state.generatedVersions,
    formRepairs: state.formRepairs,
    recordRetries: state.recordRetries,
  });
  exhausted.historicalState = structuredClone(state.historicalState);
  exhausted.continuationCalls = structuredClone(continuationCalls);
  exhausted.continuationRepairs = structuredClone(continuationRepairs);
  exhausted.continuationRetries = structuredClone(continuationRetries);
  return exhausted;
}

function normalizeHistoricalState(candidate, inputDigest) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("historical Pass-A continuation requires state");
  }
  if (candidate.stateVersion !== HISTORICAL_PASS_A_CONTINUATION_VERSION) {
    throw new TypeError("historical Pass-A continuation state version drift");
  }
  if (candidate.inputDigest !== inputDigest) {
    throw new TypeError("historical Pass-A continuation input digest drift");
  }
  for (const name of ["generatedVersions", "formRepairs", "recordRetries"]) {
    if (!Number.isInteger(candidate[name]) || candidate[name] < 0) {
      throw new TypeError(`historical Pass-A continuation ${name} must be a non-negative integer`);
    }
  }
  if (candidate.generatedVersions !== 1 + candidate.formRepairs + candidate.recordRetries) {
    throw new TypeError("historical Pass-A continuation generated-version accounting drift");
  }
  if (candidate.generatedVersions > GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxTotalGeneratedVersionsPerRecord ||
      candidate.formRepairs > GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxFormRepairsPerRecord ||
      candidate.recordRetries > GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxRecordRetriesPerRecord) {
    throw new TypeError("historical Pass-A continuation state already exceeds G4-v3 budgets");
  }
  if (candidate.candidate === null || typeof candidate.candidate !== "object" || Array.isArray(candidate.candidate)) {
    throw new TypeError("historical Pass-A continuation candidate is required");
  }
  if (!Array.isArray(candidate.historicalCalls) || candidate.historicalCalls.length !== candidate.generatedVersions) {
    throw new TypeError("historical Pass-A continuation call accounting drift");
  }
  return {
    stateVersion: candidate.stateVersion,
    sourcePolicyVersion: candidate.sourcePolicyVersion,
    inputDigest: candidate.inputDigest,
    generatedVersions: candidate.generatedVersions,
    formRepairs: candidate.formRepairs,
    recordRetries: candidate.recordRetries,
    candidate: structuredClone(candidate.candidate),
    historicalCalls: structuredClone(candidate.historicalCalls),
    historicalState: structuredClone(candidate),
  };
}

export function inspectHistoricalPassAContinuation({ input, state }) {
  const consistentInput = assertPassAHistoryConsistency(input);
  const cognitionInput = projectRichLifePassAInputForCognition(consistentInput);
  const inputDigest = passACognitionInputDigest(cognitionInput);
  const normalized = normalizeHistoricalState(state, inputDigest);
  let gate = null;
  try {
    validateConsistentRichEpisode(normalized.candidate, consistentInput);
  } catch (error) {
    if (!(error instanceof GenesisPassAValidationError)) throw error;
    gate = error.gate;
  }
  const nextKind = gate === null
    ? "already_admitted"
    : formRepairable(new GenesisPassAValidationError(gate, gate)) ? "form_repair"
      : RECORD_RETRYABLE_GATES.has(gate) ? "record_retry" : "terminal_validation_failure";
  const decision = gate === null || nextKind === "terminal_validation_failure"
    ? null
    : richPassAGenerationDecision({
      generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
      generatedVersions: normalized.generatedVersions,
      formRepairs: normalized.formRepairs,
      recordRetries: normalized.recordRetries,
      nextKind,
    });
  return Object.freeze({
    inputDigest,
    currentGate: gate,
    nextKind,
    nextOrdinal: nextKind === "form_repair" ? normalized.formRepairs + 1 : nextKind === "record_retry" ? normalized.recordRetries + 1 : null,
    budgetDecision: decision === null ? null : Object.freeze({ ...decision }),
    budgetState: Object.freeze({
      generatedVersions: normalized.generatedVersions,
      formRepairs: normalized.formRepairs,
      recordRetries: normalized.recordRetries,
    }),
  });
}

export async function continueRichPassAFromHistoricalState({
  adapter,
  repairAdapter = adapter,
  input,
  clientRequestId,
  state,
  onRecordRepair = null,
  onRecordRetry = null,
}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("historical continuation adapter must expose invoke()");
  if (repairAdapter === null || typeof repairAdapter?.invoke !== "function") throw new TypeError("historical continuation repairAdapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("historical continuation clientRequestId is required");

  const consistentInput = assertPassAHistoryConsistency(input);
  const cognitionInput = projectRichLifePassAInputForCognition(consistentInput);
  const inputDigest = passACognitionInputDigest(cognitionInput);
  const normalized = normalizeHistoricalState(state, inputDigest);
  const continuationCalls = [];
  const continuationRepairs = [];
  const continuationRetries = [];
  let candidate = structuredClone(normalized.candidate);
  let generatedVersions = normalized.generatedVersions;
  let formRepairs = normalized.formRepairs;
  let recordRetries = normalized.recordRetries;
  let pendingError = null;

  while (true) {
    try {
      if (pendingError !== null) {
        const error = pendingError;
        pendingError = null;
        throw error;
      }
      const episode = validateConsistentRichEpisode(candidate, consistentInput);
      return Object.freeze({
        episode,
        episodeDigest: digest(episode),
        inputDigest,
        generationPolicyVersion: GENESIS_PASS_A_RELIABILITY_V3_VERSION,
        historicalState: structuredClone(normalized.historicalState),
        continuationCalls: structuredClone(continuationCalls),
        continuationRepairs: structuredClone(continuationRepairs),
        continuationRetries: structuredClone(continuationRetries),
        budgetState: Object.freeze({ generatedVersions, formRepairs, recordRetries }),
      });
    } catch (error) {
      if (formRepairable(error)) {
        const budget = richPassAGenerationDecision({
          generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
          generatedVersions,
          formRepairs,
          recordRetries,
          nextKind: "form_repair",
        });
        const stateSnapshot = { ...normalized, candidate, generatedVersions, formRepairs, recordRetries };
        if (!budget.allowed) throw exhaust(error, stateSnapshot, continuationCalls, continuationRepairs, continuationRetries, budget);

        const rejectedEpisode = structuredClone(candidate);
        const repairOrdinal = formRepairs + 1;
        const failedConstraint = repairConstraint(error, rejectedEpisode, repairOrdinal);
        const repairInput = {
          rejectedObservableAction: rejectedEpisode.observableAction,
          failedGate: error.gate,
          failedConstraint,
        };
        const repairEvidence = {
          repairOrdinal,
          failedGate: error.gate,
          failedConstraint,
          rejectedContentDigest: digest(rejectedEpisode),
          inputDigest: digest(repairInput),
        };
        if (typeof onRecordRepair === "function") await onRecordRepair(structuredClone(repairEvidence));
        const result = await repairAdapter.invoke({
          systemPrompt: GENESIS_RICH_PASS_A_REPAIR_PROMPT,
          input: repairInput,
          responseSchema: GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
          clientRequestId: `${clientRequestId}:repair:${repairOrdinal}`,
        });
        generatedVersions += 1;
        formRepairs += 1;
        continuationRepairs.push(repairEvidence);
        continuationCalls.push({
          kind: "record_repair",
          repairOrdinal,
          failedGate: error.gate,
          inputDigest: repairEvidence.inputDigest,
          outputDigest: digest(result.output),
          provenance: structuredClone(result.provenance),
        });
        try {
          const next = {
            ...structuredClone(rejectedEpisode),
            observableAction: rawRepairObservableAction(result.output),
          };
          assertRichRepairPreservesEpisodeFacts(rejectedEpisode, next);
          candidate = next;
        } catch (repairError) {
          candidate = rejectedEpisode;
          pendingError = repairError;
        }
        continue;
      }

      if (recordRetryable(error)) {
        const budget = richPassAGenerationDecision({
          generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
          generatedVersions,
          formRepairs,
          recordRetries,
          nextKind: "record_retry",
        });
        const stateSnapshot = { ...normalized, candidate, generatedVersions, formRepairs, recordRetries };
        if (!budget.allowed) throw exhaust(error, stateSnapshot, continuationCalls, continuationRepairs, continuationRetries, budget);

        const rejectedEpisode = structuredClone(error.record ?? candidate ?? {});
        const recordRetryOrdinal = recordRetries + 1;
        const failedConstraint = retryConstraint(error);
        const retryInput = {
          passAInput: cognitionInput,
          failedGate: error.gate,
          ...(failedConstraint === null ? {} : { failedConstraint }),
        };
        const retryEvidence = {
          recordRetryOrdinal,
          failedGate: error.gate,
          failedConstraint: failedConstraint === null ? null : structuredClone(failedConstraint),
          rejectedContentDigest: digest(rejectedEpisode),
          inputDigest: digest(retryInput),
        };
        if (typeof onRecordRetry === "function") await onRecordRetry(structuredClone(retryEvidence));
        const result = await adapter.invoke({
          systemPrompt: richPassAPromptForPolicy({
            generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
            retry: true,
          }),
          input: retryInput,
          responseSchema: GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
          clientRequestId: `${clientRequestId}:record-retry:${recordRetryOrdinal}`,
        });
        generatedVersions += 1;
        recordRetries += 1;
        continuationRetries.push(retryEvidence);
        continuationCalls.push({
          kind: "record_retry",
          recordRetryOrdinal,
          failedGate: error.gate,
          failedConstraint: retryEvidence.failedConstraint,
          inputDigest: retryEvidence.inputDigest,
          outputDigest: digest(result.output),
          provenance: structuredClone(result.provenance),
        });
        try {
          candidate = rawEpisode(result.output);
        } catch (retryError) {
          candidate = null;
          pendingError = retryError;
        }
        continue;
      }

      throw error;
    }
  }
}
