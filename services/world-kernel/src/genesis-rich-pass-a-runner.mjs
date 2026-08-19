import { assertExactKeys, canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  GENESIS_PASS_A_POLICY,
  GenesisPassAValidationError,
} from "./genesis-pass-a-domain.mjs";
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
If structureRef is non-null, it must exactly match a currently offered structure and at least one of that v2 structure's listed counterpart roles must actually participate.
Advance chronology beyond prior history, remain within chronologyEndsAt, and keep ageAtEvent consistent with bornAt and occurredAt.

If this exact scene includes a genuine intellectual encounter, you may add intellectualEncounter. Use it only to record what was encountered and how access happened: a book, teacher/mentor, argument, conversation, overheard discussion, art, scientific idea, religious/philosophical text, or another intellectual source.
subjectLabel must be a short factual label for the encountered subject, not a lesson or interpretation. For a person subject, participantRef must be that person's episode participant ID. For a non-person subject, participantRef must be null.
Do not add intellectualEncounter merely to make the life look rich. Returning no intellectualEncounter is legal.`;

export const GENESIS_RICH_PASS_A_REPAIR_PROMPT = `You are Fibre Genesis record-form repair for rich Pass A.
You receive only the rejected observableAction and the exact failed form constraint. You do not receive the world, roster, structure, event identity, chronology, or intellectual-encounter metadata.
Return only a replacement observableAction. Fibre preserves every other event field mechanically.
Rewrite only what is already present in rejectedObservableAction: do not invent, reverse, upgrade, interpret, or import facts.
Use one plain concise sentence. Obey both failedConstraint.targetRepairUtf8Bytes and failedConstraint.targetRepairWords; both targets become stricter on a repeated failure and remain below the authoritative ${GENESIS_PASS_A_POLICY.maxObservableActionBytes}-byte limit.
Remove explicit lesson, significance, personality, inner-state conclusion, remembered-meaning, or future-policy wording. Return JSON matching the supplied one-field schema.`;

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function stripEncounter(candidate) {
  const base = structuredClone(candidate);
  delete base.intellectualEncounter;
  return base;
}

function rawEpisode(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new GenesisPassAValidationError("pass_a_output_schema", "rich Pass-A model output must be an object");
  }
  if (output.episode === null || typeof output.episode !== "object" || Array.isArray(output.episode)) {
    throw new GenesisPassAValidationError("pass_a_output_schema", "rich Pass-A model output must contain one episode");
  }
  return output.episode;
}

function rawRepairObservableAction(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new GenesisPassAValidationError("pass_a_output_schema", "rich Pass-A repair output must be an object");
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

  // validateRichPassAEpisode already validates the real v2 structureRef, its
  // developmental range and the rich any-of counterpart-role policy. Re-run the
  // legacy consistency validator with structureRef suppressed so we reuse its
  // chronology, age, subject-participation and duplicate-ID guards without
  // accidentally applying the Gate-C all-roles semantics a second time.
  const consistencyEpisode = stripEncounter(rich);
  consistencyEpisode.structureRef = null;
  validateConsistentPassAEpisode(consistencyEpisode, input);
  return rich;
}

function repairable(error) {
  return error instanceof GenesisPassAValidationError && [
    "pass_a_interiority_form",
    "pass_a_observable_action_bounds",
  ].includes(error.gate);
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

export function richPassAPromptHash() { return digest(GENESIS_RICH_PASS_A_PROMPT); }
export function richPassARepairPromptHash() { return digest(GENESIS_RICH_PASS_A_REPAIR_PROMPT); }
export function richPassASchemaHash() { return digest(GENESIS_RICH_PASS_A_RESPONSE_SCHEMA); }
export function richPassARepairSchemaHash() { return digest(GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA); }

export async function generateRichPassAEpisode({
  adapter,
  repairAdapter = adapter,
  input,
  clientRequestId,
  onRecordRepair = null,
}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("rich Pass-A adapter must expose invoke()");
  if (repairAdapter === null || typeof repairAdapter?.invoke !== "function") throw new TypeError("rich Pass-A repair adapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("rich Pass-A clientRequestId is required");

  const consistentInput = assertPassAHistoryConsistency(input);
  const cognitionInput = projectRichLifePassAInputForCognition(consistentInput);
  const inputDigest = passACognitionInputDigest(cognitionInput);
  const calls = [];
  const repairs = [];

  let result = await adapter.invoke({
    systemPrompt: GENESIS_RICH_PASS_A_PROMPT,
    input: cognitionInput,
    responseSchema: GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
    clientRequestId: `${clientRequestId}:initial`,
  });
  let candidate = rawEpisode(result.output);
  calls.push({ kind: "initial", inputDigest, outputDigest: digest(result.output), provenance: result.provenance });

  for (let generatedVersion = 1; generatedVersion <= GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord; generatedVersion += 1) {
    try {
      if (generatedVersion > 1) assertRichRepairPreservesEpisodeFacts(repairs[0].rejectedEpisode, candidate);
      const episode = validateConsistentRichEpisode(candidate, consistentInput);
      return {
        episode,
        inputDigest,
        episodeDigest: digest(episode),
        calls,
        repairs: repairs.map(({ rejectedEpisode, ...repair }) => repair),
      };
    } catch (error) {
      if (!repairable(error) || generatedVersion >= GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord) {
        if (repairable(error) && generatedVersion >= GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord) {
          const exhausted = new GenesisPassAValidationError(
            "record_repair_exhausted",
            `rich Pass-A record repair exhausted after ${generatedVersion} generated versions`,
            { record: error.record ?? candidate },
          );
          exhausted.cause = error;
          exhausted.calls = structuredClone(calls);
          exhausted.repairs = repairs.map(({ rejectedEpisode, ...repair }) => repair);
          exhausted.repairEvidence = structuredClone(repairs);
          throw exhausted;
        }
        if (error instanceof GenesisPassAValidationError) {
          error.calls = structuredClone(calls);
          error.repairEvidence = structuredClone(repairs);
        }
        throw error;
      }

      const rejectedEpisode = structuredClone(candidate);
      const repairOrdinal = generatedVersion;
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
      candidate = applyRepairObservableAction(rejectedEpisode, result.output);
      calls.push({
        kind: "record_repair",
        repairOrdinal,
        failedGate: error.gate,
        inputDigest: repairRecord.repairInputDigest,
        outputDigest: digest(result.output),
        provenance: result.provenance,
      });
    }
  }

  throw new Error("unreachable rich Pass-A generation state");
}
