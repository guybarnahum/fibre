#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  E2_V2_A0_EVIDENCE_VERSION,
  buildE2V2A0Preflight,
  runE2V2A0Source,
} from "./genesis-rich-life-e2-v2-a0.mjs";
import { E2_V2_WORLD_AUTHORING_RECORD } from "./genesis-rich-life-e2-v2-world.mjs";

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

export function decorateE2V2A0Preflight(preflight) {
  return Object.freeze({
    ...structuredClone(preflight),
    worldAuthoringRecord: structuredClone(E2_V2_WORLD_AUTHORING_RECORD),
  });
}

export function decorateE2V2A0Artifact(artifact) {
  return Object.freeze({
    ...structuredClone(artifact),
    preflight: decorateE2V2A0Preflight(artifact.preflight),
    worldAuthoringRecord: structuredClone(E2_V2_WORLD_AUTHORING_RECORD),
  });
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

  process.stderr.write(`E2-V2 A0 reviewed execution: START · evidence=${E2_V2_A0_EVIDENCE_VERSION} · authoring record frozen before burn\n`);
  try {
    const result = decorateE2V2A0Artifact(await runE2V2A0Source({ provider, model }));
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
