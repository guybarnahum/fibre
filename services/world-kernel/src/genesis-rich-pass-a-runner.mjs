import { assertExactKeys, canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  GENESIS_PASS_A_POLICY,
  GenesisPassAValidationError,
} from "./genesis-pass-a-domain.mjs";
import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  GENESIS_PASS_A_RELIABILITY_V3_VERSION,
} from "./genesis-pass-a-reliability-v3.mjs";
import {
  assertPassAHistoryConsistency,
  validateConsistentPassAEpisode,
} from "./genesis-pass-a-consistency.mjs";
import {
  passACognitionInputDigest,
} from "./genesis-pass-a-cognition.mjs";
import {
  GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
  assertRichRepairPreservesEpisodeFacts,
  validateRichPassAEpisode,
} from "./genesis-rich-life-episode.mjs";
import { projectRichLifePassAInputForCognition } from "./genesis-rich-life-domain.mjs";

export const GENESIS_RICH_PASS_A_REPAIR_TARGET_BYTES = Math.floor(GENESIS_PASS_A_POLICY.maxObservableActionBytes / 2);
export const GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_BYTES = Math.floor(GENESIS_PASS_A_POLICY.maxObservableActionBytes / 4);
export const GENESIS_RICH_PASS_A_REPAIR_TARGET_WORDS = 80;
export const GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_WORDS = 40;
export const GENESIS_RICH_PASS_A_RECORD_RETRY_CONSTRAINT_VERSION = "genesis-rich-pass-a-record-retry-constraint-v3";

export const GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["observableAction"],
  properties: {
    observableAction: { type: "string" },
  },
});

export const GENESIS_RICH_PASS_A_PROMPT = `You are Fibre Genesis Pass A for rich-life development. Create exactly one concrete historical episode: what happened, not what it meant.
Use only the supplied world, factual roster, chronology, prior episodes, introduced participants, and offered EventStructure affordances.
The offered structures are possibilities, never a checklist. You may produce a world-emergent episode by returning structureRef=null.
Describe only externally witnessable action and circumstance. Do not explain significance, lessons, traits, personality, inner-state conclusions, remembered meaning, or future behavior.
Keep observableAction concise and no more than ${GENESIS_PASS_A_POLICY.maxObservableActionBytes} UTF-8 bytes.
The provisional Thread identified by subject.provisionalThreadId must participate in the episode.
A participant must already exist in the roster/history or be introduced in this same episode through a role explicitly afforded by the world.
If structureRef is non-null, it must exactly match a currently offered structure. Each offered structure carries a counterpartMode:
- present_required: at least one listed participatingRole must actually participate;
- present_optional: the subject may realize the structure without a listed counterpart, though any participant that is used must still be grounded normally;
- known_required: at least one listed participatingRole must already exist in the factual roster/history, but that known person need not participate in this episode.
Advance chronology beyond prior history, remain within chronologyEndsAt, and keep ageAtEvent consistent with bornAt and occurredAt.

If this exact scene includes a genuine intellectual encounter, you may add intellectualEncounter. Use it only to record what was encountered and how access happened: a book, teacher/mentor, argument, conversation, overheard discussion, art, scientific idea, religious/philosophical text, or another intellectual source.
subjectLabel must be a short factual label for the encountered subject, not a lesson or interpretation. subjectPersonRef identifies the encountered subject itself only when subjectKind=person; otherwise subjectPersonRef must be null. A teacher, mentor, caregiver, librarian, or peer who merely points to or provides access to a non-person subject remains an ordinary episode participant and must not be placed in subjectPersonRef.
Do not add intellectualEncounter merely to make the life look rich. Returning no intellectualEncounter is legal.`;

export const GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_PROMPT = `${GENESIS_RICH_PASS_A_PROMPT}

For this diagnostic call, a separate stateless selector has already fixed selectedOpportunity. You are realizing that opportunity, not choosing what kind of event happens.
If selectedOpportunity.selectionKind=offered_structure, episode.structureRef must exactly equal selectedOpportunity.structureRef.
If selectedOpportunity.selectionKind=world_emergent, episode.structureRef must be null.
Do not substitute an easier offered structure. If the selected structure requires a counterpart not already known, you may introduce a new participant only through the existing world-afforded participant-introduction contract.
The selector did not choose this opportunity because it is important, rich, diverse, intellectual, dramatic, formative, or useful. Do not add those properties.`;

export const GENESIS_RICH_PASS_A_REPAIR_PROMPT = `You are Fibre Genesis record-form repair for rich Pass A.
You receive only the rejected observableAction and the exact failed form constraint. You do not receive the world, roster, structure, event identity, chronology, or intellectual-encounter metadata.
Return only a replacement observableAction. Fibre preserves every other event field mechanically.
Rewrite only what is already present in rejectedObservableAction: do not invent, reverse, upgrade, interpret, or import facts.
Use one plain concise sentence. Obey both failedConstraint.targetRepairUtf8Bytes and failedConstraint.targetRepairWords; both targets become stricter on a repeated failure and remain below the authoritative ${GENESIS_PASS_A_POLICY.maxObservableActionBytes}-byte limit.
Remove explicit lesson, significance, personality, inner-state conclusion, remembered-meaning, or future-policy wording. Return JSON matching the supplied one-field schema.`;

export const GENESIS_RICH_PASS_A_RECORD_RETRY_PROMPT = `You are Fibre Genesis record retry for rich Pass A.
The previous candidate for this one episode failed a mechanical record-validity gate and has been discarded. You do not receive that rejected episode.
Generate one entirely new episode from the same frozen passAInput. Obey the same observable-history, chronology, participant, structure, counterpartMode, and intellectual-encounter contracts as normal Pass A.
failedGate is supplied only to make the mechanical contract failure visible; it is not a quality signal. When failedConstraint is present, it states only a fixed gate-level mechanical rule and contains no rejected-scene content.
Do not make the replacement richer, more interesting, more intellectual, more diverse, or more consequential because a retry occurred.
The offered structures remain possibilities, never a checklist, and a world-emergent episode remains legal.`;

export const GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_RETRY_PROMPT = `${GENESIS_RICH_PASS_A_RECORD_RETRY_PROMPT}
A stateless selector fixed selectedOpportunity before this life candidate was realized. The rejected episode did not change that selection.
If selectedOpportunity.selectionKind=offered_structure, the replacement episode.structureRef must exactly equal selectedOpportunity.structureRef.
If selectedOpportunity.selectionKind=world_emergent, the replacement episode.structureRef must be null.
Do not substitute another opportunity merely because the prior record failed mechanically.`;

const LEGACY_GENERATION_POLICY = Object.freeze({
  version: "genesis-rich-pass-a-shared-version-budget-v1",
  maxTotalGeneratedVersionsPerRecord: GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord,
});

const G4_V3_FORM_TARGET = `G4-v3 mechanical form control: target observableAction at no more than ${GENESIS_PASS_A_RELIABILITY_POLICY_V3.initialDraftTargetUtf8Bytes} UTF-8 bytes and no more than ${GENESIS_PASS_A_RELIABILITY_POLICY_V3.initialDraftTargetWords} words. This is generation guidance only; the unchanged authoritative admission ceiling remains ${GENESIS_PASS_A_RELIABILITY_POLICY_V3.authoritativeObservableActionMaxUtf8Bytes} UTF-8 bytes.`;

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

export function richPassAPromptForPolicy({ generationPolicy = null, selectedOpportunity = false, retry = false } = {}) {
  const policy = normalizeGenerationPolicy(generationPolicy);
  const base = retry
    ? selectedOpportunity ? GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_RETRY_PROMPT : GENESIS_RICH_PASS_A_RECORD_RETRY_PROMPT
    : selectedOpportunity ? GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_PROMPT : GENESIS_RICH_PASS_A_PROMPT;
  return policy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION ? `${base}\n\n${G4_V3_FORM_TARGET}` : base;
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

function rawEpisode(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new GenesisPassAValidationError(
      "pass_a_output_schema",
      "rich Pass-A model output must be an object",
      { record: output },
    );
  }
  if (output.episode === null || typeof output.episode !== "object" || Array.isArray(output.episode)) {
    throw new GenesisPassAValidationError(
      "pass_a_output_schema",
      "rich Pass-A model output must contain one episode",
      { record: output },
    );
  }
  return output.episode;
}

function rawRepairObservableAction(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new GenesisPassAValidationError("pass_a_output_schema", "rich Pass-A repair output must be an object", { record: output });
  }
  try {
    assertExactKeys("rich Pass-A repair output", output, ["observableAction"]);
  } catch (error) {
    throw new GenesisPassAValidationError("pass_a_output_schema", error.message, { record: output });
  }
  if (typeof output.observableAction !== "string" || output.observableAction.trim() === "") {
    throw new GenesisPassAValidationError("pass_a_output_schema", "rich Pass-A repair observableAction must be a non-empty string", { record: output });
  }
  return output.observableAction;
}

function validateConsistentRichEpisode(candidate, input) {
  let rich;
  try {
    rich = validateRichPassAEpisode(candidate, input);
  } catch (error) {
    if (error instanceof GenesisPassAValidationError && error.record !== candidate) error.record = structuredClone(candidate);
    throw error;
  }

  const consistencyEpisode = stripEncounter(rich);
  consistencyEpisode.structureRef = null;
  validateConsistentPassAEpisode(consistencyEpisode, input);
  return rich;
}

function normalizeSelectedOpportunity(candidate, input) {
  if (candidate === null || candidate === undefined) return null;
  if (typeof candidate !== "object" || Array.isArray(candidate)) throw new TypeError("selectedOpportunity must be an object or null");
  assertExactKeys("selectedOpportunity", candidate, ["selectionKind", "structureRef"]);
  if (!["offered_structure", "world_emergent"].includes(candidate.selectionKind)) {
    throw new TypeError("selectedOpportunity.selectionKind is invalid");
  }
  if (candidate.selectionKind === "world_emergent") {
    if (candidate.structureRef !== null) throw new TypeError("world_emergent selectedOpportunity requires structureRef=null");
    return Object.freeze({ selectionKind: "world_emergent", structureRef: null });
  }
  if (typeof candidate.structureRef !== "string" || candidate.structureRef.trim() === "") {
    throw new TypeError("offered_structure selectedOpportunity requires a structureRef");
  }
  if (!input.offeredStructures.some((structure) => structure.structureId === candidate.structureRef)) {
    throw new TypeError(`selectedOpportunity structure ${candidate.structureRef} is not currently offered`);
  }
  return Object.freeze({ selectionKind: "offered_structure", structureRef: candidate.structureRef });
}

function assertSelectedOpportunityRealized(episode, selectedOpportunity) {
  if (selectedOpportunity === null) return episode;
  const expected = selectedOpportunity.selectionKind === "world_emergent" ? null : selectedOpportunity.structureRef;
  if (episode.structureRef !== expected) {
    throw new GenesisPassAValidationError(
      "pass_a_selected_opportunity",
      `episode ${episode.episodeId} realized ${episode.structureRef ?? "world_emergent"} instead of frozen selected opportunity ${expected ?? "world_emergent"}`,
      { record: episode },
    );
  }
  return episode;
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

function selectedStructureParticipationConstraint(selectedOpportunity, cognitionInput) {
  if (selectedOpportunity?.selectionKind !== "offered_structure") return null;
  const structure = cognitionInput.offeredStructures.find(({ structureId }) => structureId === selectedOpportunity.structureRef);
  if (structure === undefined || !Array.isArray(structure.participatingRoles) || structure.participatingRoles.length === 0) return null;
  if (structure.counterpartMode === "present_required") {
    return Object.freeze({
      rule: "The frozen selected opportunity has counterpartMode=present_required. The validator counts an allowed counterpart only when that participant's ID appears in episode.participantRefs; mentioning a caregiver, peer, teacher, or other counterpart only in observableAction does not satisfy the gate. Use a known participant from passAInput.initialRoster or passAInput.previouslyIntroducedParticipants whose role matches participatingRoles, and include that participant ID in episode.participantRefs. Or, when legal, introduce an allowed-role participant in episode.introducedParticipants and include the same provisionalPersonId in episode.participantRefs.",
      counterpartMode: "present_required",
      participatingRoles: Object.freeze([...structure.participatingRoles]),
      participantRefsRequired: true,
      sameEpisodeIntroductionAllowed: true,
      sameEpisodeIntroductionParticipantRefRequired: true,
    });
  }
  if (structure.counterpartMode === "known_required") {
    return Object.freeze({
      rule: "The frozen selected opportunity has counterpartMode=known_required. At least one allowed counterpart must already exist in the factual roster/history; a same-episode introduction does not satisfy this precondition.",
      counterpartMode: "known_required",
      participatingRoles: Object.freeze([...structure.participatingRoles]),
      sameEpisodeIntroductionAllowed: false,
    });
  }
  return null;
}

function recordRetryConstraint(error, { selectedOpportunity, cognitionInput }) {
  if (!(error instanceof GenesisPassAValidationError)) return null;
  if (error.gate === "pass_a_intellectual_encounter") return INTELLECTUAL_ENCOUNTER_RETRY_CONSTRAINT;
  if (error.gate === "pass_a_structure_participation") {
    return selectedStructureParticipationConstraint(selectedOpportunity, cognitionInput);
  }
  return null;
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

function applyRepairObservableAction(rejectedEpisode, output) {
  return {
    ...structuredClone(rejectedEpisode),
    observableAction: rawRepairObservableAction(output),
  };
}

function exhaustRecord(error, candidate, calls, repairs, recordRetries, generatedVersions, generationPolicy, budgetExhaustion) {
  const exhausted = new GenesisPassAValidationError(
    "record_repair_exhausted",
    `rich Pass-A record generation exhausted after ${generatedVersions} generated versions`,
    { record: error?.record ?? candidate },
  );
  exhausted.cause = error;
  exhausted.calls = structuredClone(calls);
  exhausted.repairs = repairs.map(({ rejectedEpisode, ...repair }) => repair);
  exhausted.repairEvidence = structuredClone(repairs);
  exhausted.recordRetries = recordRetries.map(({ rejectedEpisode, ...retry }) => retry);
  exhausted.recordRetryEvidence = structuredClone(recordRetries);
  exhausted.generationPolicyVersion = generationPolicy.version;
  exhausted.budgetExhaustion = structuredClone(budgetExhaustion);
  exhausted.budgetState = Object.freeze({
    generatedVersions,
    formRepairs: repairs.length,
    recordRetries: recordRetries.length,
  });
  return exhausted;
}

export function richPassAPromptHash() { return digest(GENESIS_RICH_PASS_A_PROMPT); }
export function richPassASelectedOpportunityPromptHash() { return digest(GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_PROMPT); }
export function richPassARepairPromptHash() { return digest(GENESIS_RICH_PASS_A_REPAIR_PROMPT); }
export function richPassARecordRetryPromptHash() { return digest(GENESIS_RICH_PASS_A_RECORD_RETRY_PROMPT); }
export function richPassASelectedOpportunityRetryPromptHash() { return digest(GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_RETRY_PROMPT); }
export function richPassASchemaHash() { return digest(GENESIS_RICH_PASS_A_RESPONSE_SCHEMA); }
export function richPassARepairSchemaHash() { return digest(GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA); }
export function richPassAV3PromptHash() { return digest(richPassAPromptForPolicy({ generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3 })); }
export function richPassAV3SelectedOpportunityPromptHash() { return digest(richPassAPromptForPolicy({ generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3, selectedOpportunity: true })); }
export function richPassAV3RecordRetryPromptHash() { return digest(richPassAPromptForPolicy({ generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3, retry: true })); }
export function richPassAV3SelectedOpportunityRetryPromptHash() { return digest(richPassAPromptForPolicy({ generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3, selectedOpportunity: true, retry: true })); }

export async function generateRichPassAEpisode({
  adapter,
  repairAdapter = adapter,
  input,
  clientRequestId,
  selectedOpportunity = null,
  onRecordRepair = null,
  onRecordRetry = null,
  generationPolicy = null,
}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("rich Pass-A adapter must expose invoke()");
  if (repairAdapter === null || typeof repairAdapter?.invoke !== "function") throw new TypeError("rich Pass-A repair adapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("rich Pass-A clientRequestId is required");

  const normalizedGenerationPolicy = normalizeGenerationPolicy(generationPolicy);
  const consistentInput = assertPassAHistoryConsistency(input);
  const normalizedSelectedOpportunity = normalizeSelectedOpportunity(selectedOpportunity, consistentInput);
  const cognitionInput = projectRichLifePassAInputForCognition(consistentInput);
  const initialInput = normalizedSelectedOpportunity === null
    ? cognitionInput
    : Object.freeze({ passAInput: cognitionInput, selectedOpportunity: normalizedSelectedOpportunity });
  const initialPrompt = richPassAPromptForPolicy({
    generationPolicy: normalizedGenerationPolicy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION ? normalizedGenerationPolicy : null,
    selectedOpportunity: normalizedSelectedOpportunity !== null,
  });
  const inputDigest = normalizedSelectedOpportunity === null
    ? passACognitionInputDigest(cognitionInput)
    : digest(initialInput);
  const calls = [];
  const repairs = [];
  const recordRetries = [];
  let generatedVersions = 0;
  let candidate = null;
  let pendingError = null;

  let result = await adapter.invoke({
    systemPrompt: initialPrompt,
    input: initialInput,
    responseSchema: GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
    clientRequestId: `${clientRequestId}:initial`,
  });
  generatedVersions += 1;
  calls.push({ kind: "initial", inputDigest, outputDigest: digest(result.output), provenance: result.provenance });
  try {
    candidate = rawEpisode(result.output);
  } catch (error) {
    pendingError = error;
  }

  while (true) {
    try {
      if (pendingError !== null) {
        const error = pendingError;
        pendingError = null;
        throw error;
      }
      const episode = validateConsistentRichEpisode(candidate, consistentInput);
      assertSelectedOpportunityRealized(episode, normalizedSelectedOpportunity);
      return {
        episode,
        inputDigest,
        episodeDigest: digest(episode),
        selectedOpportunity: normalizedSelectedOpportunity,
        calls,
        repairs: repairs.map(({ rejectedEpisode, ...repair }) => repair),
        recordRetries: recordRetries.map(({ rejectedEpisode, ...retry }) => retry),
        ...(normalizedGenerationPolicy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION
          ? { generationPolicyVersion: normalizedGenerationPolicy.version }
          : {}),
      };
    } catch (error) {
      if (formRepairable(error)) {
        const budget = richPassAGenerationDecision({
          generationPolicy: normalizedGenerationPolicy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION ? normalizedGenerationPolicy : null,
          generatedVersions,
          formRepairs: repairs.length,
          recordRetries: recordRetries.length,
          nextKind: "form_repair",
        });
        if (!budget.allowed) {
          throw exhaustRecord(error, candidate, calls, repairs, recordRetries, generatedVersions, normalizedGenerationPolicy, budget);
        }

        const rejectedEpisode = structuredClone(candidate);
        const repairOrdinal = repairs.length + 1;
        const failedConstraint = repairConstraint(error, rejectedEpisode, repairOrdinal);
        const repairInput = {
          rejectedObservableAction: rejectedEpisode.observableAction,
          failedGate: error.gate,
          failedConstraint,
        };
        const repairRecord = {
          repairOrdinal,
          failedGate: error.gate,
          failedConstraint,
          rejectedContentDigest: digest(rejectedEpisode),
          rejectedEpisode,
          repairInputDigest: digest(repairInput),
        };
        if (typeof onRecordRepair === "function") {
          await onRecordRepair({
            repairOrdinal,
            failedGate: error.gate,
            failedConstraint: structuredClone(failedConstraint),
            rejectedContentDigest: repairRecord.rejectedContentDigest,
            inputDigest: repairRecord.repairInputDigest,
            outputDigest: digest(rejectedEpisode),
            rejectedContent: structuredClone(rejectedEpisode),
          });
        }
        repairs.push(repairRecord);

        result = await repairAdapter.invoke({
          systemPrompt: GENESIS_RICH_PASS_A_REPAIR_PROMPT,
          input: repairInput,
          responseSchema: GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
          clientRequestId: `${clientRequestId}:repair:${repairOrdinal}`,
        });
        generatedVersions += 1;
        calls.push({
          kind: "record_repair",
          repairOrdinal,
          failedGate: error.gate,
          inputDigest: repairRecord.repairInputDigest,
          outputDigest: digest(result.output),
          provenance: result.provenance,
        });
        try {
          candidate = applyRepairObservableAction(rejectedEpisode, result.output);
          assertRichRepairPreservesEpisodeFacts(rejectedEpisode, candidate);
        } catch (repairError) {
          candidate = rejectedEpisode;
          pendingError = repairError;
        }
        continue;
      }

      if (recordRetryable(error)) {
        const budget = richPassAGenerationDecision({
          generationPolicy: normalizedGenerationPolicy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION ? normalizedGenerationPolicy : null,
          generatedVersions,
          formRepairs: repairs.length,
          recordRetries: recordRetries.length,
          nextKind: "record_retry",
        });
        if (!budget.allowed) {
          throw exhaustRecord(error, candidate, calls, repairs, recordRetries, generatedVersions, normalizedGenerationPolicy, budget);
        }

        const rejectedEpisode = structuredClone(error.record ?? candidate ?? {});
        const recordRetryOrdinal = recordRetries.length + 1;
        const failedConstraint = recordRetryConstraint(error, {
          selectedOpportunity: normalizedSelectedOpportunity,
          cognitionInput,
        });
        const retryInput = normalizedSelectedOpportunity === null
          ? {
            passAInput: cognitionInput,
            failedGate: error.gate,
            ...(failedConstraint === null ? {} : { failedConstraint }),
          }
          : {
            passAInput: cognitionInput,
            selectedOpportunity: normalizedSelectedOpportunity,
            failedGate: error.gate,
            ...(failedConstraint === null ? {} : { failedConstraint }),
          };
        const retryPrompt = richPassAPromptForPolicy({
          generationPolicy: normalizedGenerationPolicy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION ? normalizedGenerationPolicy : null,
          selectedOpportunity: normalizedSelectedOpportunity !== null,
          retry: true,
        });
        const retryRecord = {
          recordRetryOrdinal,
          failedGate: error.gate,
          failedConstraint: failedConstraint === null ? null : structuredClone(failedConstraint),
          rejectedContentDigest: digest(rejectedEpisode),
          rejectedEpisode,
          retryInputDigest: digest(retryInput),
        };
        if (typeof onRecordRetry === "function") {
          await onRecordRetry({
            recordRetryOrdinal,
            failedGate: error.gate,
            failedConstraint: failedConstraint === null ? null : structuredClone(failedConstraint),
            rejectedContentDigest: retryRecord.rejectedContentDigest,
            inputDigest: retryRecord.retryInputDigest,
            outputDigest: digest(rejectedEpisode),
            rejectedContent: structuredClone(rejectedEpisode),
          });
        }
        recordRetries.push(retryRecord);

        result = await adapter.invoke({
          systemPrompt: retryPrompt,
          input: retryInput,
          responseSchema: GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
          clientRequestId: `${clientRequestId}:record-retry:${recordRetryOrdinal}`,
        });
        generatedVersions += 1;
        calls.push({
          kind: "record_retry",
          recordRetryOrdinal,
          failedGate: error.gate,
          failedConstraint: failedConstraint === null ? null : structuredClone(failedConstraint),
          inputDigest: retryRecord.retryInputDigest,
          outputDigest: digest(result.output),
          provenance: result.provenance,
        });
        try {
          candidate = rawEpisode(result.output);
        } catch (retryError) {
          candidate = null;
          pendingError = retryError;
        }
        continue;
      }

      if (error instanceof GenesisPassAValidationError) {
        error.calls = structuredClone(calls);
        error.repairs = repairs.map(({ rejectedEpisode, ...repair }) => repair);
        error.repairEvidence = structuredClone(repairs);
        error.recordRetries = recordRetries.map(({ rejectedEpisode, ...retry }) => retry);
        error.recordRetryEvidence = structuredClone(recordRetries);
        if (normalizedGenerationPolicy.version === GENESIS_PASS_A_RELIABILITY_V3_VERSION) {
          error.generationPolicyVersion = normalizedGenerationPolicy.version;
          error.budgetState = Object.freeze({ generatedVersions, formRepairs: repairs.length, recordRetries: recordRetries.length });
        }
      }
      throw error;
    }
  }
}
