#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  E2_N1_BOUNDED_EVIDENCE_VERSION,
  E2_N1_PASS_B_FORM_PROFILE,
  runE2N1Bounded,
} from "./genesis-rich-life-e2-n1-bounded-driver.mjs";
import { E2_N1_TRIAL_COUNT } from "./genesis-rich-life-e2-n1.mjs";

export const E2_N1_NOT_REMEMBERED_RESIDUE_POLICY = "n1-not-remembered-residue-canonicalization-v1";
export const E2_N1_NOT_REMEMBERED_RESIDUE_FAILURE = "not_remembered Pass-B output must not author memory uncertainty";

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

export function isCanonicalizableN1NotRememberedResidue(artifact) {
  if (artifact?.status !== "failed") return false;
  if (artifact.evidenceVersion !== E2_N1_BOUNDED_EVIDENCE_VERSION) return false;
  if (artifact.failure?.message !== E2_N1_NOT_REMEMBERED_RESIDUE_FAILURE) return false;
  const raw = artifact.inFlight?.passBRaw?.output;
  return raw?.outcome === "not_remembered"
    && Array.isArray(raw.episodeRefs)
    && raw.episodeRefs.length === 0
    && raw.rememberedContent === null
    && Array.isArray(raw.uncertainty)
    && raw.uncertainty.length > 0;
}

export function canonicalizeN1NotRememberedResidue(artifact) {
  if (!isCanonicalizableN1NotRememberedResidue(artifact)) {
    throw new TypeError("N1 failure is not the canonicalizable not_remembered uncertainty residue");
  }
  const next = structuredClone(artifact);
  const original = structuredClone(next.inFlight.passBRaw.output);
  const canonical = {
    outcome: "not_remembered",
    episodeRefs: [],
    rememberedContent: null,
    uncertainty: [],
  };
  next.inFlight.passBRaw.output = canonical;
  next.modelEvents = [...(next.modelEvents ?? []), {
    type: "n1_not_remembered_residue_canonicalization",
    policy: E2_N1_NOT_REMEMBERED_RESIDUE_POLICY,
    trialOrdinal: next.inFlight.trialOrdinal,
    originalOutputDigest: digest(original),
    canonicalOutputDigest: digest(canonical),
    originalOutput: original,
    canonicalOutput: structuredClone(canonical),
    modelCallUsed: false,
    semanticDecisionChanged: false,
    removedFields: ["uncertainty"],
    reason: "Canonical Pass B permits exactly no memory residue when outcome=not_remembered.",
  }];
  return next;
}

function countCanonicalizations(artifact) {
  return (artifact?.modelEvents ?? []).filter((event) =>
    event?.type === "n1_not_remembered_residue_canonicalization"
    && event?.policy === E2_N1_NOT_REMEMBERED_RESIDUE_POLICY).length;
}

export function decorateN1ResidueArtifact(snapshot) {
  const decorated = structuredClone(snapshot);
  decorated.executionAmendment = {
    ...(decorated.executionAmendment ?? {}),
    notRememberedResiduePolicy: E2_N1_NOT_REMEMBERED_RESIDUE_POLICY,
    postScoreMechanicalAmendment: true,
    scoreObservedBeforeAmendment: { completedTrials: 1, correct: 1 },
    trialPlanChangedByResiduePolicy: false,
    thresholdChangedByResiduePolicy: false,
    semanticMemoryDecisionChangedByResiduePolicy: false,
    residueCanonicalizations: countCanonicalizations(decorated),
  };
  return decorated;
}

export async function runE2N1WithResidueCanonicalization({
  provider,
  model,
  sourceArtifact,
  resumeArtifact = null,
  onCheckpoint = null,
  onProgress = null,
} = {}) {
  let resume = resumeArtifact;
  if (resume !== null && isCanonicalizableN1NotRememberedResidue(resume)) {
    resume = canonicalizeN1NotRememberedResidue(resume);
  }

  while (true) {
    try {
      const result = await runE2N1Bounded({
        provider,
        model,
        sourceArtifact,
        resumeArtifact: resume,
        onCheckpoint: typeof onCheckpoint === "function"
          ? async (snapshot) => onCheckpoint(decorateN1ResidueArtifact(snapshot))
          : null,
        onProgress,
      });
      return decorateN1ResidueArtifact(result);
    } catch (error) {
      const failureArtifact = error?.e2N1FailureArtifact;
      if (!isCanonicalizableN1NotRememberedResidue(failureArtifact)) throw error;
      resume = canonicalizeN1NotRememberedResidue(failureArtifact);
      if (typeof onCheckpoint === "function") await onCheckpoint(decorateN1ResidueArtifact(resume));
    }
  }
}

function progressPrinter(event) {
  const trial = event.trial;
  const prefix = `[N1v2 ${String(trial.trialOrdinal).padStart(2, "0")}/${E2_N1_TRIAL_COUNT} ${trial.worldId} pair${trial.pairOrdinal} h${trial.horizon}]`;
  if (event.type === "trial_start") process.stderr.write(`${prefix} B/C/rater ... `);
  else if (event.type === "trial_complete") process.stderr.write(`${event.memoryOutcome} · meaning=${event.meaningOutcome ?? "n/a"} · chose=${event.chosenCandidate} ${event.correct ? "✓" : "✗"}\n`);
}

function printSummary(result) {
  process.stdout.write(`N1v2: ${result.score.correct}/${result.score.n} correct · threshold=${result.score.positiveThreshold} · p_tail=${result.score.exactBinomialChanceTail}\n`);
  for (const world of result.byWorld) process.stdout.write(`  ${world.worldId}: ${world.correct}/${world.n}\n`);
  process.stdout.write(`Not-remembered residue canonicalizations: ${result.executionAmendment?.residueCanonicalizations ?? 0}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: npm run genesis:e2-n1 -- --provider <openai|google> --model <model> --source <a2b-v3.json> --out <n1-v2.json> [--resume <failed-n1-v2.json>] [--overwrite]\n");
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const sourcePath = readArg(argv, "--source");
  const outputPath = readArg(argv, "--out");
  const resumePath = readArg(argv, "--resume");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (typeof sourcePath !== "string" || sourcePath.trim() === "" || !existsSync(sourcePath)) throw new Error("--source must name an existing A2b artifact");
  if (typeof outputPath !== "string" || outputPath.trim() === "") throw new Error("--out is required for checkpoint-safe N1 execution");
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);
  if (existsSync(outputPath) && !overwrite && resumePath === null) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);

  const sourceArtifact = JSON.parse(readFileSync(sourcePath, "utf8"));
  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));
  const writeCheckpoint = async (artifact) => writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stderr.write(`E2 N1v2: START · ${E2_N1_TRIAL_COUNT} trials · form=${E2_N1_PASS_B_FORM_PROFILE} · residue=${E2_N1_NOT_REMEMBERED_RESIDUE_POLICY} · source=${sourcePath}${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runE2N1WithResidueCanonicalization({
      provider,
      model,
      sourceArtifact,
      resumeArtifact,
      onCheckpoint: writeCheckpoint,
      onProgress: progressPrinter,
    });
    printSummary(result);
    process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    process.stderr.write(`Failure artifact: ${outputPath}\n`);
    throw error;
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`E2 N1v2: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
