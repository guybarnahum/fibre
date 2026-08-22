#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { verifyReplacementG2Freeze } from "./genesis-replacement-g2-verify.mjs";

export const REPLACEMENT_G2_CEILING_PREFLIGHT_VERSION = "pr39-replacement-g2-ceiling-preflight-v1";
export const EXPECTED_REPLACEMENT_G2_PROTOCOL_DIGEST = "sha256:7d8f7fbf481e7a4bd404c0757fbc7c40418cd142b9b8f2a3da294820692e2f91";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const absolute = (path) => resolve(ROOT, path);
const fail = (message) => { throw new Error(message); };

export function verifyReplacementG2CeilingPreflight({ exists = existsSync } = {}) {
  const verified = verifyReplacementG2Freeze();
  const { protocol, protocolDigest } = verified;
  if (protocolDigest !== EXPECTED_REPLACEMENT_G2_PROTOCOL_DIGEST) {
    fail(`replacement G2 protocol digest drift: ${protocolDigest}`);
  }

  const control = protocol.control;
  if (control.instrumentVersion !== "genesis-genome-specificity-control-v3" ||
      control.trialCountPerPair !== 24 ||
      control.modelCallsPerPair !== 72 ||
      control.generator?.provider !== "google" ||
      control.generator?.model !== "gemini-3.6-flash" ||
      control.rater?.provider !== "openai" ||
      control.rater?.model !== "gpt-5.1-2025-11-13") {
    fail("replacement G2 control instrument/provider binding drift");
  }
  if (control.predeclaredReading?.detectablePairCorrectAtLeast !== 17 ||
      control.predeclaredReading?.minimumDetectablePairs !== 3 ||
      control.predeclaredReading?.requireEveryGenomeIncidentToAtLeastOneDetectablePair !== true ||
      control.predeclaredReading?.onFailure !== "HOLD_G2_PRESERVE_RESULTS_NO_GENOME_REWRITE") {
    fail("replacement G2 predeclared decision rule drift");
  }
  if (!Array.isArray(control.pairSchedule) || control.pairSchedule.length !== 5) {
    fail("replacement G2 pair schedule drift");
  }

  const resultPaths = [
    ...control.pairSchedule.map(({ resultPath }) => resultPath),
    control.aggregateResultPath,
  ];
  const existing = resultPaths.filter((path) => exists(absolute(path)));
  if (existing.length !== 0) {
    fail(`replacement G2 ceiling has already started; preserve existing results and use resumable runner: ${existing.join(", ")}`);
  }

  return Object.freeze({
    status: "CLEAR_REPLACEMENT_G2_CEILING_FIRST_RUN_ZERO_CALL",
    preflightVersion: REPLACEMENT_G2_CEILING_PREFLIGHT_VERSION,
    protocolDigest,
    pairCount: control.pairSchedule.length,
    callsPerPair: control.modelCallsPerPair,
    maximumProviderCalls: control.pairSchedule.length * control.modelCallsPerPair,
    generator: Object.freeze({ ...control.generator }),
    rater: Object.freeze({ ...control.rater }),
    resultPaths: Object.freeze(resultPaths),
    finalLifeCognitionAuthorized: false,
  });
}

function print(result) {
  process.stdout.write("PR39 REPLACEMENT G2 CEILING PREFLIGHT: CLEAR — ZERO CALL\n\n");
  process.stdout.write(`Version: ${result.preflightVersion}\n`);
  process.stdout.write(`Protocol digest: ${result.protocolDigest}\n`);
  process.stdout.write(`Pairs: ${result.pairCount}\n`);
  process.stdout.write(`Calls per pair: ${result.callsPerPair}\n`);
  process.stdout.write(`Maximum provider calls: ${result.maximumProviderCalls}\n`);
  process.stdout.write(`Generator: ${result.generator.provider}/${result.generator.model}\n`);
  process.stdout.write(`Rater: ${result.rater.provider}/${result.rater.model}\n`);
  process.stdout.write("Fresh G2 result paths: all absent.\n");
  process.stdout.write("Final-life cognition: NOT AUTHORIZED.\n");
  process.stdout.write("\nPreflight made zero provider calls.\n");
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 1 && args[0] === "--preflight")) {
    throw new Error("usage: genesis-replacement-g2-ceiling-preflight.mjs [--preflight]");
  }
  print(verifyReplacementG2CeilingPreflight());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
