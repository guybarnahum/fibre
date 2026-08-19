import { canonicalJson, sha256 } from "./persistence-common.mjs";
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

export const GENESIS_RICH_PASS_A_PROMPT = `You are Fibre Genesis Pass A for rich-life development. Create exactly one concrete historical episode: what happened, not what it meant.
Use only the supplied world, factual roster, chronology, prior episodes, introduced participants, and offered EventStructure affordances.
The offered structures are possibilities, never a checklist. You may produce a world-emergent episode by returning structureRef=null.
Describe only externally witnessable action and circumstance. Do not explain significance, lessons, traits, personality, inner-state conclusions, remembered meaning, or future behavior.
Keep observableAction concise and no more than ${GENESIS_PASS_A_POLICY.maxObservableActionBytes} UTF-8 bytes.
The provisional Thread identified by subject.provisionalThreadId must participate in the episode.
A participant must already exist in the roster/history or be introduced in this same episode through a role explicitly afforded by the world.
If structureRef is non-null, it must exactly match a currently offered structure and the required roles must actually participate.
Advance chronology beyond prior history, remain within chronologyEndsAt, and keep ageAtEvent consistent with bornAt and occurredAt.

If this exact scene includes a genuine intellectual encounter, you may add intellectualEncounter. Use it only to record what was encountered and how access happened: a book, teacher/mentor, argument, conversation, overheard discussion, art, scientific idea, religious/philosophical text, or another intellectual source.
subjectLabel must be a short factual label for the encountered subject, not a lesson or interpretation. For a person subject, participantRef must be that person's episode participant ID. For a non-person subject, participantRef must be null.
Do not add intellectualEncounter merely to make the life look rich. Returning no intellectualEncounter is legal.`;

export const GENESIS_RICH_PASS_A_REPAIR_PROMPT = `You are Fibre Genesis record-form repair for rich Pass A.
Repair only the rejected episode's observableAction wording so it satisfies the observable-history form contract.
Preserve episodeId, occurredAt, ageAtEvent, placeRef, participantRefs, structureRef, introducedParticipants, and every intellectualEncounter fact exactly.
observableAction must be no more than ${GENESIS_PASS_A_POLICY.maxObservableActionBytes} UTF-8 bytes. Shorten wording rather than changing event facts.
Do not improve the life, make it more interesting, add or remove an intellectual encounter, change its source/access facts, or change its meaning.
Remove explicit lesson, significance, personality, inner-state conclusion, remembered-meaning, or future-policy wording and describe only witnessable action/circumstance.`;

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

function validateConsistentRichEpisode(candidate, input) {
  let rich;
  try {
    rich = validateRichPassAEpisode(candidate, input);
  } catch (error) {
    if (error instanceof GenesisPassAValidationError && error.record !== candidate) error.record = structuredClone(candidate);
    throw error;
  }
  validateConsistentPassAEpisode(stripEncounter(rich), input);
  return rich;
}

function repairable(error) {
  return error instanceof GenesisPassAValidationError && [
    "pass_a_interiority_form",
    "pass_a_observable_action_bounds",
  ].includes(error.gate);
}

function repairConstraint(error, rejectedEpisode) {
  const constraint = { failedGate: error.gate, failureMessage: error.message };
  if (error.gate === "pass_a_observable_action_bounds") {
    constraint.maxObservableActionUtf8Bytes = GENESIS_PASS_A_POLICY.maxObservableActionBytes;
    constraint.rejectedObservableActionUtf8Bytes = typeof rejectedEpisode?.observableAction === "string"
      ? Buffer.byteLength(rejectedEpisode.observableAction, "utf8")
      : null;
  }
  return constraint;
}

function modelRepairEpisode(candidate) {
  const copy = structuredClone(candidate);
  if (copy.intellectualEncounter !== undefined && copy.intellectualEncounter !== null) {
    delete copy.intellectualEncounter.subjectRef;
  }
  return copy;
}

export function richPassAPromptHash() { return digest(GENESIS_RICH_PASS_A_PROMPT); }
export function richPassARepairPromptHash() { return digest(GENESIS_RICH_PASS_A_REPAIR_PROMPT); }
export function richPassASchemaHash() { return digest(GENESIS_RICH_PASS_A_RESPONSE_SCHEMA); }

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
      const failedConstraint = repairConstraint(error, rejectedEpisode);
      const repairInput = {
        passAInput: cognitionInput,
        rejectedEpisode: modelRepairEpisode(rejectedEpisode),
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
        responseSchema: GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
        clientRequestId: `${clientRequestId}:repair:${repairOrdinal}`,
      });
      candidate = rawEpisode(result.output);
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
