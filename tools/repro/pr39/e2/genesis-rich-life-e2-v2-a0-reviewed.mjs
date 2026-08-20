#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { assertPassAHistoryConsistency } from "../services/world-kernel/src/genesis-pass-a-consistency.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { buildE2A0Plan } from "./genesis-rich-life-e2-a0.mjs";
import {
  E2_V2_A0_EVIDENCE_VERSION,
  E2_V2_A0_SEEDS,
  buildE2V2A0Preflight,
  runE2V2A0Source,
} from "./genesis-rich-life-e2-v2-a0.mjs";
import {
  E2_V2_WORLD_AUTHORING_RECORD,
  E2_V2_WORLD_FIXTURE,
} from "./genesis-rich-life-e2-v2-world.mjs";

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

export function validateE2V2A0StaticInputs() {
  const windows = [];
  for (const seed of E2_V2_A0_SEEDS) {
    const plan = buildE2A0Plan(E2_V2_WORLD_FIXTURE, seed);
    for (const { developmentalWindow, offeredEntries } of plan) {
      const input = buildRichLifePassAInput({
        originMode: "de_novo",
        syntheticLineageWitness: null,
        worldSpec: E2_V2_WORLD_FIXTURE.worldSpec,
        subject: E2_V2_WORLD_FIXTURE.subject,
        developmentalWindow,
        chronologyEndsAt: developmentalWindow.endAt,
        initialRoster: E2_V2_WORLD_FIXTURE.initialRoster,
        priorEpisodes: [],
        previouslyIntroducedParticipants: [],
        eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
        offeredEntries,
      });
      const consistent = assertPassAHistoryConsistency(input);
      windows.push(Object.freeze({
        seed,
        windowId: developmentalWindow.windowId,
        offeredStructureIds: Object.freeze(
          consistent.offeredStructures.map(({ structureId }) => structureId).sort(),
        ),
        staticInputDigest: digest(consistent),
      }));
    }
  }
  return Object.freeze({
    validationVersion: "pr39-slice-e2-v2-static-rich-input-preflight-v1",
    modelCallsUsed: 0,
    seedsValidated: E2_V2_A0_SEEDS.length,
    windowsPerSeed: windows.length / E2_V2_A0_SEEDS.length,
    validatedWindows: windows.length,
    expectedWindows: E2_V2_A0_SEEDS.length * 10,
    allFrozenWindowsValidated: windows.length === E2_V2_A0_SEEDS.length * 10,
    windows: Object.freeze(windows),
    witnessDigest: digest(windows),
  });
}

export function decorateE2V2A0Preflight(preflight) {
  const reviewed = {
    ...structuredClone(preflight),
    worldAuthoringRecord: structuredClone(E2_V2_WORLD_AUTHORING_RECORD),
    staticInputValidation: structuredClone(validateE2V2A0StaticInputs()),
  };
  return Object.freeze({
    ...reviewed,
    reviewedPreflightDigest: digest(reviewed),
  });
}

export function decorateE2V2A0Artifact(artifact) {
  return Object.freeze({
    ...structuredClone(artifact),
    preflight: decorateE2V2A0Preflight(artifact.preflight),
    worldAuthoringRecord: structuredClone(E2_V2_WORLD_AUTHORING_RECORD),
  });
}

function progressPrinter(event) {
  if (event.type === "candidate_attempt_start") {
    process.stderr.write(`[E2-V2 A0 seed=${event.seed}] candidate ${event.candidateAttemptNumber}/${event.maxCandidateAttempts}\n`);
  } else if (event.type === "candidate_attempt_failed") {
    process.stderr.write(`[E2-V2 A0 seed=${event.seed}] candidate ${event.candidateAttemptNumber} rejected · ${event.failure.failedGate ?? event.failure.code ?? "validation"}: ${event.failure.message}\n`);
  } else if (event.type === "episode_start") {
    process.stderr.write(`[E2-V2 A0 seed=${event.seed} episode=${String(event.ordinal).padStart(2, "0")}/${event.total}] ... `);
  } else if (event.type === "record_repair") {
    process.stderr.write(`\n  repair ${event.repair.failedGate} ... `);
  } else if (event.type === "record_retry") {
    process.stderr.write(`\n  retry ${event.recordRetry.failedGate} ... `);
  } else if (event.type === "episode_complete") {
    process.stderr.write(`✓ structure=${event.episode.structureRef ?? "world-emergent"} · encounter=${event.episode.intellectualEncounter?.kind ?? "none"} · repairs=${event.repairs} · retries=${event.recordRetries}\n`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage:\n  npm run genesis:e2-v2-a0 -- --preflight [--out <file>]\n  npm run genesis:e2-v2-a0 -- --provider <openai|google> --model <model> --out <file>\n");
    return;
  }

  const outputPath = readArg(argv, "--out");
  if (argv.includes("--preflight")) {
    const preflight = decorateE2V2A0Preflight(buildE2V2A0Preflight());
    const text = `${JSON.stringify(preflight, null, 2)}\n`;
    if (outputPath === null) process.stdout.write(text);
    else writeFileSync(outputPath, text, "utf8");
    return;
  }

  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  if (outputPath === null) throw new TypeError("E2-V2 burned source generation requires --out <file>");
  if (existsSync(outputPath)) throw new Error(`E2-V2 output already exists: ${outputPath}; this fresh world must not be overwritten or rerun`);

  // Reviewed preflight includes a zero-model-call validation of every frozen
  // seed/window Pass-A input. Any static world/offer incompatibility must fail here,
  // before the provider adapter can be invoked and before the world can burn.
  const reviewedPreflight = decorateE2V2A0Preflight(buildE2V2A0Preflight());
  if (!reviewedPreflight.staticInputValidation.allFrozenWindowsValidated) {
    throw new TypeError("E2-V2 static rich-input preflight did not validate every frozen window");
  }
  process.stderr.write(`E2-V2 A0 reviewed execution: START · evidence=${E2_V2_A0_EVIDENCE_VERSION} · reviewedPreflight=${reviewedPreflight.reviewedPreflightDigest}\n`);
  try {
    const result = decorateE2V2A0Artifact(await runE2V2A0Source({ provider, model, onProgress: progressPrinter }));
    if (result.preflight.reviewedPreflightDigest !== reviewedPreflight.reviewedPreflightDigest) throw new TypeError("E2-V2 reviewed preflight changed during execution");
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write(`E2-V2 A0: complete · structureJ=${result.meanPairwiseJaccard.structureRefs} · placeJ=${result.meanPairwiseJaccard.placeRefs}\n`);
    process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    if (error.e2V2A0FailureArtifact !== undefined) {
      const failed = decorateE2V2A0Artifact(error.e2V2A0FailureArtifact);
      writeFileSync(outputPath, `${JSON.stringify(failed, null, 2)}\n`, "utf8");
      process.stderr.write(`Failure artifact: ${outputPath}\n`);
    }
    throw error;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`E2-V2 A0 reviewed execution: FAILED\n${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
