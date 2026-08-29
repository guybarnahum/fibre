import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  GENESIS_PASS_A_POLICY,
  GENESIS_PASS_A_RESPONSE_SCHEMA,
  GenesisPassAValidationError,
  passAEpisodeOutputDigest,
} from "./genesis-pass-a-domain.mjs";
import {
  assertPassAHistoryConsistency,
  validateConsistentPassAEpisode,
} from "./genesis-pass-a-consistency.mjs";
import {
  passACognitionInputDigest,
  projectPassAInputForCognition,
} from "./genesis-pass-a-cognition.mjs";

const GENESIS_PROMPT_DIRECTORY = new URL("../prompts/", import.meta.url);

export const GENESIS_PASS_A_PROMPT = resolvePromptAsset({
  directory: GENESIS_PROMPT_DIRECTORY,
  id: "genesis.pass-a",
}).text;

export const GENESIS_PASS_A_REPAIR_PROMPT = resolvePromptAsset({
  directory: GENESIS_PROMPT_DIRECTORY,
  id: "genesis.pass-a-repair",
}).text;

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function utf8Bytes(value) {
  return typeof value === "string" ? Buffer.byteLength(value, "utf8") : null;
}

export function passAPromptHash() {
  return digest(GENESIS_PASS_A_PROMPT);
}

export function passARepairPromptHash() {
  return digest(GENESIS_PASS_A_REPAIR_PROMPT);
}

export function passASchemaHash() {
  return digest(GENESIS_PASS_A_RESPONSE_SCHEMA);
}

function rawEpisode(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new GenesisPassAValidationError("pass_a_output_schema", "Pass-A model output must be an object");
  }
  if (output.episode === null || typeof output.episode !== "object" || Array.isArray(output.episode)) {
    throw new GenesisPassAValidationError("pass_a_output_schema", "Pass-A model output must contain one episode");
  }
  return output.episode;
}

function episodeFacts(candidate) {
  return {
    episodeId: candidate?.episodeId,
    occurredAt: candidate?.occurredAt,
    ageAtEvent: candidate?.ageAtEvent,
    placeRef: candidate?.placeRef,
    participantRefs: candidate?.participantRefs,
    structureRef: candidate?.structureRef,
    introducedParticipants: candidate?.introducedParticipants,
  };
}

function assertRepairFacts(previous, repaired) {
  if (canonicalJson(episodeFacts(previous)) !== canonicalJson(episodeFacts(repaired))) {
    throw new GenesisPassAValidationError(
      "pass_a_record_repair_changed_facts",
      "Pass-A form repair changed event facts instead of repairing only observableAction",
      { record: repaired },
    );
  }
}

function repairable(error) {
  return error instanceof GenesisPassAValidationError && [
    "pass_a_interiority_form",
    "pass_a_observable_action_bounds",
  ].includes(error.gate);
}

function repairConstraint(error, rejectedEpisode) {
  const constraint = {
    failedGate: error.gate,
    failureMessage: error.message,
  };
  if (error.gate === "pass_a_observable_action_bounds") {
    constraint.maxObservableActionUtf8Bytes = GENESIS_PASS_A_POLICY.maxObservableActionBytes;
    constraint.rejectedObservableActionUtf8Bytes = utf8Bytes(rejectedEpisode?.observableAction);
  }
  return constraint;
}

export async function generatePassAEpisode({
  adapter,
  repairAdapter = adapter,
  input,
  clientRequestId,
  onRecordRepair = null,
}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("Pass-A adapter must expose invoke()");
  if (repairAdapter === null || typeof repairAdapter?.invoke !== "function") throw new TypeError("Pass-A repair adapter must expose invoke()");
  if (typeof clientRequestId !== "string" || clientRequestId.trim() === "") throw new TypeError("Pass-A clientRequestId is required");

  const consistentInput = assertPassAHistoryConsistency(input);
  const cognitionInput = projectPassAInputForCognition(consistentInput);
  const initialInputDigest = passACognitionInputDigest(cognitionInput);
  const calls = [];
  const repairs = [];
  let result = await adapter.invoke({
    systemPrompt: GENESIS_PASS_A_PROMPT,
    input: cognitionInput,
    responseSchema: GENESIS_PASS_A_RESPONSE_SCHEMA,
    clientRequestId: `${clientRequestId}:initial`,
  });
  let candidate = rawEpisode(result.output);
  calls.push({
    kind: "initial",
    inputDigest: initialInputDigest,
    outputDigest: digest(result.output),
    provenance: result.provenance,
  });

  for (let generatedVersion = 1; generatedVersion <= GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord; generatedVersion += 1) {
    try {
      if (generatedVersion > 1) assertRepairFacts(repairs[0].rejectedEpisode, candidate);
      const episode = validateConsistentPassAEpisode(candidate, consistentInput);
      return {
        episode,
        inputDigest: initialInputDigest,
        episodeDigest: passAEpisodeOutputDigest(episode),
        calls,
        repairs: repairs.map(({ rejectedEpisode, ...repair }) => repair),
      };
    } catch (error) {
      if (!repairable(error) || generatedVersion >= GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord) {
        if (repairable(error) && generatedVersion >= GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord) {
          const exhausted = new GenesisPassAValidationError(
            "record_repair_exhausted",
            `Pass-A record repair exhausted after ${generatedVersion} generated versions`,
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

      const rejectedEpisode = error.record ?? candidate;
      const repairOrdinal = generatedVersion;
      const failedConstraint = repairConstraint(error, rejectedEpisode);
      const repairInput = {
        passAInput: cognitionInput,
        rejectedEpisode,
        failedGate: error.gate,
        failedConstraint,
      };
      const repairRecord = {
        repairOrdinal,
        failedGate: error.gate,
        failedConstraint,
        rejectedContentDigest: digest(rejectedEpisode),
        rejectedEpisode: structuredClone(rejectedEpisode),
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
        systemPrompt: GENESIS_PASS_A_REPAIR_PROMPT,
        input: repairInput,
        responseSchema: GENESIS_PASS_A_RESPONSE_SCHEMA,
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

  throw new Error("unreachable Pass-A generation state");
}

export function summarizePassARepairProfile(results) {
  const repairsByGate = {};
  let recordsGenerated = 0;
  let recordRepairs = 0;
  for (const result of results) {
    recordsGenerated += result.calls.length;
    for (const repair of result.repairs) {
      recordRepairs += 1;
      repairsByGate[repair.failedGate] = (repairsByGate[repair.failedGate] ?? 0) + 1;
    }
  }
  return {
    recordsGenerated,
    admittedRecords: results.length,
    recordRepairs,
    recordRepairsByGate: repairsByGate,
    recordRepairExhaustions: 0,
  };
}