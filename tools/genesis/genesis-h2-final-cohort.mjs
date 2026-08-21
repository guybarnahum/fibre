#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { GENESIS_PASS_B_RESPONSE_SCHEMA } from "../services/world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  createH2OpenAICompatibilityFetch,
  projectPassBResponseSchemaForOpenAI,
} from "./genesis-h2-openai-schema-compat.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const H2_EXECUTION_BINDING_PATH = "artifacts/validation/m2-pr39/h/protocol/h-execution-binding-v2.json";
const H1_FAILURE_PATH = "artifacts/validation/m2-pr39/h/cohort-v1/h-final-cohort-failure-v1.json";
const H1_FREEZE_COMMIT = "448bd669f742a566da289cc4117907f2d37e32e3";
const H1_RUNNER_BLOB = "b3f8dc0b382ea64431df866a80ab91804021431f";
const EXPECTED_CANONICAL_PASS_B_SCHEMA = "sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a";
const EXPECTED_TRANSPORT_PASS_B_SCHEMA = "sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c";
const H2_TRANSPORT_EVIDENCE_FILENAME = "h2-transport-compatibility-v1.json";

const absolute = (path) => resolve(ROOT, path);
const readJson = (path) => JSON.parse(readFileSync(absolute(path), "utf8"));
const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const fail = (message) => { throw new Error(message); };

function historicalRunnerBlob() {
  return execFileSync("git", ["rev-parse", `${H1_FREEZE_COMMIT}:tools/genesis/genesis-h-final-cohort.mjs`], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function verifyH2CompatibilityBoundary() {
  if (!existsSync(absolute(H1_FAILURE_PATH))) fail("H-v2 requires the frozen H-v1 failure artifact");
  const failure = readJson(H1_FAILURE_PATH);
  if (failure.status !== "HOLD_FIRST_COHORT_ATTEMPT_FAILED_NO_REGENERATION") fail("H-v1 failure status drift");
  if (!String(failure.error?.message ?? "").includes("'uniqueItems' is not permitted")) fail("H-v1 failure is not the frozen OpenAI uniqueItems transport rejection");
  if (historicalRunnerBlob() !== H1_RUNNER_BLOB) fail("H-v1 historical runner blob drift");

  const binding = readJson(H2_EXECUTION_BINDING_PATH);
  if (binding.executionAttemptVersion !== "H-v2") fail("unexpected H-v2 binding version");
  if (binding.supersedesAttempt?.freezeCommit !== H1_FREEZE_COMMIT || binding.supersedesAttempt?.rerunAllowed !== false) fail("H-v2 does not preserve H-v1 as an immutable HOLD");
  if (binding.oneShot?.outputRoot !== "artifacts/validation/m2-pr39/h/cohort-v2") fail("H-v2 output root drift");
  const outputRootExists = existsSync(absolute(binding.oneShot.outputRoot));

  const projection = projectPassBResponseSchemaForOpenAI(GENESIS_PASS_B_RESPONSE_SCHEMA);
  if (projection.canonicalSchemaHash !== EXPECTED_CANONICAL_PASS_B_SCHEMA) fail("H-v2 canonical Pass-B schema drift");
  if (projection.transportSchemaHash !== EXPECTED_TRANSPORT_PASS_B_SCHEMA) fail("H-v2 transport Pass-B schema drift");
  if (binding.transportCompatibility?.canonicalPassBSchemaHash !== projection.canonicalSchemaHash) fail("H-v2 binding/canonical schema disagreement");
  if (binding.transportCompatibility?.projectedTransportSchemaHash !== projection.transportSchemaHash) fail("H-v2 binding/transport schema disagreement");
  if (binding.transportCompatibility?.canonicalSchemaChanged !== false || binding.transportCompatibility?.promptChanged !== false || binding.transportCompatibility?.modelChanged !== false) {
    fail("H-v2 compatibility binding changes frozen cognition authority");
  }

  return Object.freeze({
    status: "H2_COMPATIBILITY_BOUNDARY_VERIFIED",
    h1FailurePath: H1_FAILURE_PATH,
    h1FreezeCommit: H1_FREEZE_COMMIT,
    h1RunnerBlob: H1_RUNNER_BLOB,
    bindingPath: H2_EXECUTION_BINDING_PATH,
    bindingDigest: digest(binding),
    canonicalPassBSchemaHash: projection.canonicalSchemaHash,
    transportPassBSchemaHash: projection.transportSchemaHash,
    removedConstraints: projection.removedConstraints,
    outputRoot: binding.oneShot.outputRoot,
    outputRootExists,
  });
}

async function loadVersionedHRunner() {
  verifyH2CompatibilityBoundary();
  const previous = process.env.FIBRE_H_EXECUTION_BINDING_PATH;
  process.env.FIBRE_H_EXECUTION_BINDING_PATH = H2_EXECUTION_BINDING_PATH;
  try {
    return await import(`./genesis-h-final-cohort.mjs?h2=${Date.now()}`);
  } finally {
    if (previous === undefined) delete process.env.FIBRE_H_EXECUTION_BINDING_PATH;
    else process.env.FIBRE_H_EXECUTION_BINDING_PATH = previous;
  }
}

export async function verifyH2FinalCohortPreflight() {
  const runner = await loadVersionedHRunner();
  const preflight = runner.verifyHFinalCohortPreflight();
  if (preflight.oneShot.outputRoot !== "artifacts/validation/m2-pr39/h/cohort-v2") fail("versioned H runner did not load H-v2 binding");
  return Object.freeze({ ...preflight, h2Compatibility: verifyH2CompatibilityBoundary() });
}

function writeH2TransportEvidence({ boundary, projectionEvents, runStatus, error = null }) {
  const path = `${boundary.outputRoot}/${H2_TRANSPORT_EVIDENCE_FILENAME}`;
  if (!existsSync(absolute(boundary.outputRoot))) return;
  writeFileSync(absolute(path), `${JSON.stringify({
    evidenceVersion: "pr39-h2-transport-compatibility-evidence-v1",
    runStatus,
    recordedAt: new Date().toISOString(),
    h1FreezeCommit: boundary.h1FreezeCommit,
    h1RunnerBlob: boundary.h1RunnerBlob,
    canonicalPassBSchemaHash: boundary.canonicalPassBSchemaHash,
    transportPassBSchemaHash: boundary.transportPassBSchemaHash,
    removedConstraints: boundary.removedConstraints,
    projectionEventCount: projectionEvents.length,
    projectionEvents,
    error: error === null ? null : { name: error?.name ?? "Error", message: error?.message ?? String(error) },
  }, null, 2)}\n`, { flag: "wx" });
}

export async function runH2FinalCohort() {
  const projectionEvents = [];
  const boundary = verifyH2CompatibilityBoundary();
  const runner = await loadVersionedHRunner();
  const rawFetch = globalThis.fetch;
  if (typeof rawFetch !== "function") fail("global fetch is unavailable");
  globalThis.fetch = createH2OpenAICompatibilityFetch({
    fetchImpl: rawFetch,
    onProjection: (event) => projectionEvents.push(structuredClone(event)),
  });
  try {
    const result = await runner.runHFinalCohort();
    writeH2TransportEvidence({ boundary, projectionEvents, runStatus: "H2_COHORT_GENERATION_COMPLETED" });
    return Object.freeze({ ...result, h2CompatibilityProjectionEvents: structuredClone(projectionEvents) });
  } catch (error) {
    writeH2TransportEvidence({ boundary, projectionEvents, runStatus: "H2_COHORT_GENERATION_FAILED", error });
    throw error;
  } finally {
    globalThis.fetch = rawFetch;
  }
}

export async function runH2SchemaProbe({ environment = process.env, fetchImpl = globalThis.fetch } = {}) {
  const boundary = verifyH2CompatibilityBoundary();
  if (boundary.outputRootExists) fail("H-v2 schema probe is pre-life only and is blocked after the H-v2 attempt root exists");
  const projections = [];
  const compatFetch = createH2OpenAICompatibilityFetch({ fetchImpl, onProjection: (event) => projections.push(structuredClone(event)) });
  const adapter = createOpenAIModelAdapter({
    environment,
    fetchImpl: compatFetch,
    modelId: "gpt-5.1-2025-11-13",
    timeoutMs: 45_000,
    maxOutputTokens: null,
    temperature: 0,
    topP: 1,
    reasoningEffort: "none",
    retryLimit: 0,
    retryDelayMs: 2_000,
  });
  const result = await adapter.invoke({
    systemPrompt: "This is an operational Structured Outputs compatibility probe. Return outcome=not_remembered, episodeRefs=[], rememberedContent=null, uncertainty=[]. Do not infer or generate any life content.",
    input: { probe: "h2_pass_b_schema_transport_only" },
    responseSchema: GENESIS_PASS_B_RESPONSE_SCHEMA,
    clientRequestId: "pr39-h2:pass-b-schema-compatibility-probe",
  });
  if (result.output?.outcome !== "not_remembered" || result.output?.episodeRefs?.length !== 0 || result.output?.rememberedContent !== null || result.output?.uncertainty?.length !== 0) {
    fail("H-v2 schema probe returned an unexpected structured value");
  }
  if (projections.length !== 1) fail("H-v2 schema probe did not use exactly one compatibility projection");
  return Object.freeze({ status: "H2_PASS_B_SCHEMA_TRANSPORT_ACCEPTED", boundary, projection: projections[0], provenance: result.provenance });
}

function printPreflight(result) {
  const blocked = result.h2Compatibility.outputRootExists;
  process.stdout.write(blocked ? "H-V2 FINAL COHORT PREFLIGHT: ATTEMPT FROZEN — EXECUTION BLOCKED\n\n" : "H-V2 FINAL COHORT PREFLIGHT: CLEAR\n\n");
  process.stdout.write(`H-v1 frozen HOLD: ${result.h2Compatibility.h1FreezeCommit}\n`);
  process.stdout.write(`Canonical Pass-B schema: ${result.h2Compatibility.canonicalPassBSchemaHash}\n`);
  process.stdout.write(`OpenAI transport schema: ${result.h2Compatibility.transportPassBSchemaHash}\n`);
  process.stdout.write(`Output root: ${result.h2Compatibility.outputRoot}${blocked ? " [EXISTS — ONE-SHOT REFUSES RERUN]" : " [absent]"}\n`);
  process.stdout.write(`Runtime: ${result.runtime.provider}/${result.runtime.modelId}\n`);
  process.stdout.write("\nNo provider call was made.\n");
}

async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(["--preflight", "--schema-probe", "--help", "-h"]);
  const unknown = args.filter((arg) => !allowed.has(arg));
  if (unknown.length !== 0) fail(`unsupported H-v2 argument(s): ${unknown.join(", ")}`);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Usage: npm run genesis:h2-generate -- --preflight\n       npm run genesis:h2-generate -- --schema-probe\n       npm run genesis:h2-generate\n\nH-v2 is a separately versioned compiler/runtime correction after the permanently frozen H-v1 operational HOLD.\n");
    return;
  }
  if (args.includes("--preflight")) return printPreflight(await verifyH2FinalCohortPreflight());
  if (args.includes("--schema-probe")) {
    const result = await runH2SchemaProbe();
    process.stdout.write("H-V2 PASS-B SCHEMA PROBE: ACCEPTED\n");
    process.stdout.write(`Canonical schema: ${result.boundary.canonicalPassBSchemaHash}\n`);
    process.stdout.write(`Transport schema: ${result.boundary.transportPassBSchemaHash}\n`);
    return;
  }
  const result = await runH2FinalCohort();
  process.stdout.write(`\nH-V2 FINAL COHORT: ${result.status}\n`);
  process.stdout.write(`Result: ${result.preflight.oneShot.resultPath}\n`);
  process.stdout.write(`Database: ${result.databasePath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
