#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createDurableModelAdapter,
  createFileModelInvocationJournal,
} from "#services/birth-center/src/model-runtime/durable-invocation-journal.mjs";
import {
  assertSealedHistoryExposureManifest,
  computeSealedHistoryTaintClosure,
} from "#services/world-kernel/src/genesis-sealed-history-isolation.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";

export const GENESIS_D5_PACKET_CONTRACT = "fibre-genesis-d5-sealed-history-packet-v1";
export const GENESIS_D5_RESULT_CONTRACT = "fibre-genesis-d5-sealed-history-result-v1";
export const GENESIS_D5_DEFAULT_MODEL = "gpt-5.1-2025-11-13";
export const GENESIS_D5_DEFAULT_ROOT = ".fibre/genesis/d5-sealed-history";
export const GENESIS_D5_CONDITIONS = Object.freeze([
  "remembered_positive",
  "own_sealed_holdout",
  "matched_plausible_non_event",
  "cross_thread_sealed_holdout",
]);

export const GENESIS_D5_EVALUATOR_PROMPT = `You are a blind evaluator for Fibre's Genesis D5 self-account accommodation diagnostic.
You receive exactly one self-account text and one candidate episode description.
Judge two different questions and keep them separate:
1. thematicAccommodation: whether the broad self-understanding in the self-account could plausibly accommodate the candidate episode as part of the same person's life. Use none, plausible, or strong.
2. factualAlignment: whether the self-account contains concrete details, relationships, actions, circumstances, or unusually specific structure that align with this particular candidate episode. Use none, partial, or specific.
Generic personality language or a broad theme is not episode-specific factual alignment. Do not infer that the candidate episode actually happened. Do not reward optimism, coherence, dramatic fit, or narrative sophistication. Do not guess which experimental condition the item belongs to.
Return a short reason grounded only in the supplied texts.`;

export const GENESIS_D5_EVALUATOR_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["thematicAccommodation", "factualAlignment", "reason"]),
  properties: Object.freeze({
    thematicAccommodation: Object.freeze({
      type: "string",
      enum: Object.freeze(["none", "plausible", "strong"]),
    }),
    factualAlignment: Object.freeze({
      type: "string",
      enum: Object.freeze(["none", "partial", "specific"]),
    }),
    reason: Object.freeze({ type: "string", maxLength: 240 }),
  }),
});

const digestValue = (value) => `sha256:${sha256(canonicalJson(value))}`;
const digestText = (value) => `sha256:${sha256(value)}`;
const uniqueSorted = (values) => [...new Set(values)].sort();

function fail(message) { throw new TypeError(message); }
function assertObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${name} must be an object`);
}
function assertText(name, value) {
  if (typeof value !== "string" || value.trim() === "") fail(`${name} is required`);
}
function assertArray(name, value) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
}
function readArg(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  if (index !== -1) return argv[index + 1] ?? null;
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}
function parseMode(argv) {
  const modes = [
    ["preflight", argv.includes("--preflight")],
    ["run", argv.includes("--run")],
    ["replay", argv.includes("--replay")],
  ].filter(([, present]) => present);
  if (modes.length > 1) fail("choose only one of --preflight, --run, or --replay");
  return modes.length === 0 ? "preflight" : modes[0][0];
}

function graphMap(closure) {
  return new Map(closure.sourceGraph.map((source) => [source.sourceRef, source]));
}

function dependsTransitively(closure, sourceRef, targetRef) {
  const byRef = graphMap(closure);
  if (!byRef.has(sourceRef) || !byRef.has(targetRef)) return false;
  const seen = new Set();
  const stack = [sourceRef];
  while (stack.length > 0) {
    const current = stack.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    for (const dependency of byRef.get(current)?.dependsOn ?? []) {
      if (dependency === targetRef) return true;
      stack.push(dependency);
    }
  }
  return false;
}

function validateManifest(manifest, closure, index) {
  assertObject(`D5 exposure manifest ${index + 1}`, manifest);
  assertSealedHistoryExposureManifest(manifest);
  if (manifest.sourceGraphDigest !== closure.sourceGraphDigest) {
    fail(`D5 exposure manifest ${index + 1} sourceGraphDigest drift`);
  }
  if (canonicalJson(uniqueSorted(manifest.sealedSourceRefs ?? [])) !== canonicalJson(closure.sealedSourceRefs)) {
    fail(`D5 exposure manifest ${index + 1} sealedSourceRefs drift`);
  }
}

export function normalizeGenesisD5Packet(candidate) {
  assertObject("D5 packet", candidate);
  if (candidate.contract !== GENESIS_D5_PACKET_CONTRACT) fail("D5 packet contract drift");
  if (candidate.developmentOnly !== true) fail("D5 packet must be developmentOnly");
  assertText("D5 packetId", candidate.packetId);
  assertText("D5 targetThreadId", candidate.targetThreadId);
  assertObject("D5 selfAccount", candidate.selfAccount);
  assertText("D5 selfAccount.sourceRef", candidate.selfAccount.sourceRef);
  assertText("D5 selfAccount.text", candidate.selfAccount.text);
  assertArray("D5 sourceGraph", candidate.sourceGraph);
  assertArray("D5 sealedSourceRefs", candidate.sealedSourceRefs);
  if (candidate.sealedSourceRefs.length < 1 || candidate.sealedSourceRefs.length > 4) {
    fail("D5 requires between one and four prospectively sealed own holdouts");
  }
  assertArray("D5 exposureManifests", candidate.exposureManifests);
  if (candidate.exposureManifests.length === 0) fail("D5 requires cognition exposure manifests");
  assertArray("D5 units", candidate.units);
  if (candidate.units.length !== candidate.sealedSourceRefs.length) {
    fail("D5 requires exactly one four-condition unit per sealed own holdout");
  }

  const closure = computeSealedHistoryTaintClosure({
    sourceGraph: candidate.sourceGraph,
    sealedSourceRefs: candidate.sealedSourceRefs,
  });
  const byRef = graphMap(closure);
  const tainted = new Set(closure.taintedSourceRefs);
  if (!byRef.has(candidate.selfAccount.sourceRef)) fail("D5 self-account sourceRef is missing from sourceGraph");
  if (tainted.has(candidate.selfAccount.sourceRef)) fail("D5 self-account is tainted by sealed history");
  candidate.exposureManifests.forEach((manifest, index) => validateManifest(manifest, closure, index));

  const unitIds = new Set();
  const ownRefs = new Set();
  const syntheticRefs = new Set();
  const normalizedUnits = candidate.units.map((unit, index) => {
    const label = `D5 unit ${index + 1}`;
    assertObject(label, unit);
    assertText(`${label}.unitId`, unit.unitId);
    if (unitIds.has(unit.unitId)) fail(`duplicate D5 unitId ${unit.unitId}`);
    unitIds.add(unit.unitId);

    for (const key of ["rememberedPositive", "ownSealedHoldout", "matchedPlausibleNonEvent", "crossThreadSealedHoldout"]) {
      assertObject(`${label}.${key}`, unit[key]);
      assertText(`${label}.${key}.text`, unit[key].text);
    }

    const positive = unit.rememberedPositive;
    assertText(`${label}.rememberedPositive.episodeRef`, positive.episodeRef);
    assertText(`${label}.rememberedPositive.memoryRef`, positive.memoryRef);
    if (!byRef.has(positive.episodeRef) || !byRef.has(positive.memoryRef)) fail(`${label} positive control refs must exist in sourceGraph`);
    if (tainted.has(positive.episodeRef) || tainted.has(positive.memoryRef)) fail(`${label} positive control must be visible/unsealed`);
    if (!dependsTransitively(closure, positive.memoryRef, positive.episodeRef)) {
      fail(`${label} positive memory must depend on its episode`);
    }
    if (!dependsTransitively(closure, candidate.selfAccount.sourceRef, positive.memoryRef)) {
      fail(`${label} positive memory must contribute to the self-account source graph`);
    }

    const own = unit.ownSealedHoldout;
    assertText(`${label}.ownSealedHoldout.episodeRef`, own.episodeRef);
    if (!candidate.sealedSourceRefs.includes(own.episodeRef)) fail(`${label} own holdout was not prospectively sealed`);
    if (ownRefs.has(own.episodeRef)) fail(`duplicate D5 own holdout ${own.episodeRef}`);
    ownRefs.add(own.episodeRef);

    const nonEvent = unit.matchedPlausibleNonEvent;
    assertText(`${label}.matchedPlausibleNonEvent.syntheticRef`, nonEvent.syntheticRef);
    if (byRef.has(nonEvent.syntheticRef)) fail(`${label} plausible non-event must not be a target-Thread source`);
    if (syntheticRefs.has(nonEvent.syntheticRef)) fail(`duplicate D5 plausible non-event ${nonEvent.syntheticRef}`);
    syntheticRefs.add(nonEvent.syntheticRef);

    const cross = unit.crossThreadSealedHoldout;
    assertText(`${label}.crossThreadSealedHoldout.episodeRef`, cross.episodeRef);
    assertText(`${label}.crossThreadSealedHoldout.ownerThreadId`, cross.ownerThreadId);
    if (cross.ownerThreadId === candidate.targetThreadId) fail(`${label} cross-Thread holdout must belong to another Thread`);
    if (byRef.has(cross.episodeRef)) fail(`${label} cross-Thread holdout must not occur in the target sourceGraph`);

    return Object.freeze(structuredClone(unit));
  });

  if (canonicalJson(uniqueSorted([...ownRefs])) !== canonicalJson(uniqueSorted(candidate.sealedSourceRefs))) {
    fail("D5 units must cover every sealed own holdout exactly once");
  }

  return Object.freeze({
    ...structuredClone(candidate),
    sourceGraph: closure.sourceGraph,
    sealedSourceRefs: closure.sealedSourceRefs,
    units: Object.freeze(normalizedUnits),
    closure,
  });
}

function conditionMaterials(unit) {
  return {
    remembered_positive: unit.rememberedPositive,
    own_sealed_holdout: unit.ownSealedHoldout,
    matched_plausible_non_event: unit.matchedPlausibleNonEvent,
    cross_thread_sealed_holdout: unit.crossThreadSealedHoldout,
  };
}

function conditionOrder(index) {
  const offset = index % GENESIS_D5_CONDITIONS.length;
  return [...GENESIS_D5_CONDITIONS.slice(offset), ...GENESIS_D5_CONDITIONS.slice(0, offset)];
}

export function buildGenesisD5Plan({ packet: packetCandidate, model = GENESIS_D5_DEFAULT_MODEL } = {}) {
  assertText("D5 model", model);
  const packet = normalizeGenesisD5Packet(packetCandidate);
  const items = [];
  for (const [unitIndex, unit] of packet.units.entries()) {
    const materials = conditionMaterials(unit);
    for (const condition of conditionOrder(unitIndex)) {
      const material = materials[condition];
      const evaluatorInput = Object.freeze({
        selfAccount: packet.selfAccount.text,
        candidateEpisode: material.text,
      });
      const leaked = canonicalJson(evaluatorInput);
      for (const forbidden of [
        "unitId", "condition", "rememberedPositive", "ownSealedHoldout",
        "matchedPlausibleNonEvent", "crossThreadSealedHoldout", "sourceRef",
        "episodeRef", "memoryRef", "syntheticRef", "ownerThreadId",
      ]) {
        if (leaked.includes(`\"${forbidden}\"`)) fail(`D5 evaluator input leaked ${forbidden}`);
      }
      items.push(Object.freeze({
        unitId: unit.unitId,
        condition,
        evaluatorInput,
        evaluatorInputDigest: digestValue(evaluatorInput),
      }));
    }
  }

  const unitCount = packet.units.length;
  const minimumThreeQuarters = Math.ceil(unitCount * 0.75);
  const maximumOneQuarter = Math.floor(unitCount * 0.25);
  const core = {
    contract: GENESIS_D5_PACKET_CONTRACT,
    developmentOnly: true,
    packetId: packet.packetId,
    targetThreadId: packet.targetThreadId,
    packetDigest: digestValue({
      contract: packet.contract,
      packetId: packet.packetId,
      targetThreadId: packet.targetThreadId,
      selfAccount: packet.selfAccount,
      sourceGraph: packet.sourceGraph,
      sealedSourceRefs: packet.sealedSourceRefs,
      exposureManifests: packet.exposureManifests,
      units: packet.units,
    }),
    sourceGraphDigest: packet.closure.sourceGraphDigest,
    evaluatorPromptHash: digestText(GENESIS_D5_EVALUATOR_PROMPT),
    evaluatorSchemaHash: digestValue(GENESIS_D5_EVALUATOR_SCHEMA),
    model,
    unitOfObservation: "one prospectively sealed own-holdout unit evaluated under four blinded conditions",
    unitCount,
    evaluatorJudgmentCount: items.length,
    scientificRetries: 0,
    decisionRule: {
      positiveControlThematicMinimum: minimumThreeQuarters,
      genericOvergeneralizationMinimumPerCondition: minimumThreeQuarters,
      provenanceAuditOwnSpecificMinimum: minimumThreeQuarters,
      provenanceAuditControlSpecificMaximum: maximumOneQuarter,
      interpretation: "Large-effect development diagnostic only. Thematic and factual alignment remain separate; own forbidden factual excess is an audit trigger, never evidence for the Thread.",
    },
  };
  return Object.freeze({ ...core, planDigest: digestValue(core), items: Object.freeze(items), packet });
}

function normalizeJudgment(output) {
  assertObject("D5 evaluator output", output);
  if (!["none", "plausible", "strong"].includes(output.thematicAccommodation)) fail("D5 thematicAccommodation is invalid");
  if (!["none", "partial", "specific"].includes(output.factualAlignment)) fail("D5 factualAlignment is invalid");
  assertText("D5 evaluator reason", output.reason);
  return Object.freeze(structuredClone(output));
}

export function scoreGenesisD5(plan, results) {
  if (!Array.isArray(results) || results.length !== plan.items.length) fail("D5 scoring requires one result per evaluator item");
  const byKey = new Map(results.map((item) => [`${item.unitId}:${item.condition}`, item]));
  if (byKey.size !== plan.items.length) fail("D5 scoring results must be unique by unit/condition");
  const counts = Object.fromEntries(GENESIS_D5_CONDITIONS.map((condition) => [condition, {
    total: plan.unitCount,
    thematic: 0,
    strongThematic: 0,
    factualSpecific: 0,
  }]));
  for (const item of plan.items) {
    const result = byKey.get(`${item.unitId}:${item.condition}`);
    if (result === undefined) fail(`D5 result missing ${item.unitId}/${item.condition}`);
    const judgment = normalizeJudgment(result.output ?? result);
    const cell = counts[item.condition];
    if (judgment.thematicAccommodation !== "none") cell.thematic += 1;
    if (judgment.thematicAccommodation === "strong") cell.strongThematic += 1;
    if (judgment.factualAlignment === "specific") cell.factualSpecific += 1;
  }

  const rule = plan.decisionRule;
  let classification = "NO_LARGE_OVERREACH_SIGNAL_AT_RESOLUTION";
  if (counts.remembered_positive.thematic < rule.positiveControlThematicMinimum) {
    classification = "INSTRUMENT_SENSITIVITY_FAILED";
  } else if (
    counts.own_sealed_holdout.factualSpecific >= rule.provenanceAuditOwnSpecificMinimum &&
    counts.matched_plausible_non_event.factualSpecific <= rule.provenanceAuditControlSpecificMaximum &&
    counts.cross_thread_sealed_holdout.factualSpecific <= rule.provenanceAuditControlSpecificMaximum
  ) {
    classification = "PROVENANCE_AUDIT_TRIGGER";
  } else if (
    counts.own_sealed_holdout.thematic >= rule.genericOvergeneralizationMinimumPerCondition &&
    counts.matched_plausible_non_event.thematic >= rule.genericOvergeneralizationMinimumPerCondition &&
    counts.cross_thread_sealed_holdout.thematic >= rule.genericOvergeneralizationMinimumPerCondition
  ) {
    classification = "GENERIC_OVERGENERALIZATION";
  }

  return Object.freeze({
    admissionVerdict: null,
    classification,
    counts: Object.freeze(Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Object.freeze(value)]))),
    note: rule.interpretation,
  });
}

function createBaseAdapter({ model, observer, replay }) {
  return replay
    ? createOpenAIModelAdapter({
        environment: { OPENAI_API_KEY: "provider-network-disabled" },
        modelId: model,
        fetchImpl: async () => { throw new Error("provider network access is disabled for D5 replay"); },
        observer,
      })
    : createOpenAIModelAdapter({ modelId: model, observer });
}

async function executePlan({ plan, rootPath, replay }) {
  const modelEvents = [];
  const durableEvents = [];
  const journal = createFileModelInvocationJournal(resolve(rootPath, "invocations"));
  const adapter = createDurableModelAdapter({
    baseAdapter: createBaseAdapter({ model: plan.model, observer: (event) => modelEvents.push(event), replay }),
    journal,
    observer: (event) => durableEvents.push(event),
  });
  const results = [];
  for (const [index, item] of plan.items.entries()) {
    const invoked = await adapter.invoke({
      systemPrompt: GENESIS_D5_EVALUATOR_PROMPT,
      input: item.evaluatorInput,
      responseSchema: GENESIS_D5_EVALUATOR_SCHEMA,
      clientRequestId: `genesis-d5:${plan.planDigest.slice(7, 19)}:${String(index + 1).padStart(2, "0")}`,
    });
    results.push(Object.freeze({
      unitId: item.unitId,
      condition: item.condition,
      evaluatorInputDigest: item.evaluatorInputDigest,
      output: normalizeJudgment(invoked.output),
      provenance: structuredClone(invoked.provenance ?? null),
    }));
  }
  const score = scoreGenesisD5(plan, results);
  return Object.freeze({
    contract: GENESIS_D5_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: Object.freeze({
      packetId: plan.packetId,
      targetThreadId: plan.targetThreadId,
      packetDigest: plan.packetDigest,
      sourceGraphDigest: plan.sourceGraphDigest,
      evaluatorPromptHash: plan.evaluatorPromptHash,
      evaluatorSchemaHash: plan.evaluatorSchemaHash,
      model: plan.model,
      unitCount: plan.unitCount,
      evaluatorJudgmentCount: plan.evaluatorJudgmentCount,
      scientificRetries: plan.scientificRetries,
      decisionRule: structuredClone(plan.decisionRule),
      planDigest: plan.planDigest,
    }),
    results: Object.freeze(results),
    score,
    execution: Object.freeze({
      durableCommitsThisInvocation: durableEvents.filter((event) => event.type === "durable_model_commit").length,
      durableReplaysThisInvocation: durableEvents.filter((event) => event.type === "durable_model_replay").length,
      physicalProviderAttemptsThisInvocation: modelEvents.filter((event) => event.type === "model_attempt").length,
    }),
  });
}

function comparable(result) {
  return { contract: result.contract, developmentOnly: result.developmentOnly, plan: result.plan, results: result.results, score: result.score };
}

function printGenericPreflight() {
  process.stdout.write("GENESIS D5 SEALED HISTORY: INSTRUMENT PREFLIGHT\n");
  process.stdout.write(`Packet contract: ${GENESIS_D5_PACKET_CONTRACT}\n`);
  process.stdout.write(`Evaluator prompt: ${digestText(GENESIS_D5_EVALUATOR_PROMPT)}\n`);
  process.stdout.write(`Evaluator schema: ${digestValue(GENESIS_D5_EVALUATOR_SCHEMA)}\n`);
  process.stdout.write("Conditions: remembered/cited positive · own sealed holdout · plausible non-event · cross-Thread sealed holdout\n");
  process.stdout.write("Holdouts: 1-4 prospectively sealed per target Thread\n");
  process.stdout.write("Scoring: thematic accommodation and episode-specific factual alignment remain separate\n");
  process.stdout.write("Provider calls made: 0\n");
  process.stdout.write("A retrospective #39 packet is invalid because its history was not prospectively sealed before cognition.\n");
}

function printPlan(plan) {
  process.stdout.write("GENESIS D5 SEALED HISTORY: PACKET PREFLIGHT\n");
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  process.stdout.write(`Packet: ${plan.packetDigest}\n`);
  process.stdout.write(`Source graph: ${plan.sourceGraphDigest}\n`);
  process.stdout.write(`Evaluator prompt: ${plan.evaluatorPromptHash}\n`);
  process.stdout.write(`Evaluator schema: ${plan.evaluatorSchemaHash}\n`);
  process.stdout.write(`Model: openai/${plan.model}\n`);
  process.stdout.write(`Units: ${plan.unitCount} sealed holdouts · ${plan.evaluatorJudgmentCount} blinded judgments\n`);
  process.stdout.write("Scientific retries: 0\n");
  process.stdout.write(`Maximum clean live provider calls: ${plan.evaluatorJudgmentCount}\n`);
  process.stdout.write("Provider calls made: 0\n");
}

function printResult(result, replay) {
  process.stdout.write(`GENESIS D5 SEALED HISTORY: ${replay ? "REPLAY EXACT" : result.score.classification}\n`);
  process.stdout.write(`Plan: ${result.plan.planDigest}\n`);
  for (const condition of GENESIS_D5_CONDITIONS) {
    const cell = result.score.counts[condition];
    process.stdout.write(`${condition}: thematic ${cell.thematic}/${cell.total} · strong ${cell.strongThematic}/${cell.total} · factual-specific ${cell.factualSpecific}/${cell.total}\n`);
  }
  process.stdout.write(`Classification: ${result.score.classification}\n`);
  process.stdout.write(`Durable model commits this invocation: ${result.execution.durableCommitsThisInvocation}\n`);
  process.stdout.write(`Durable model replays this invocation: ${result.execution.durableReplaysThisInvocation}\n`);
  process.stdout.write(`Physical provider attempts this invocation: ${result.execution.physicalProviderAttemptsThisInvocation}\n`);
}

export async function runGenesisD5Cli(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const packetPath = readArg(argv, "--packet", null);
  const model = readArg(argv, "--model", GENESIS_D5_DEFAULT_MODEL);
  if (packetPath === null) {
    if (mode !== "preflight") fail("D5 live/replay requires --packet <prospective-packet.json>");
    printGenericPreflight();
    return { mode, providerCallsMade: 0 };
  }
  const packet = JSON.parse(readFileSync(resolve(packetPath), "utf8"));
  const plan = buildGenesisD5Plan({ packet, model });
  const rootPath = resolve(readArg(argv, "--root", resolve(GENESIS_D5_DEFAULT_ROOT, plan.packetId)));
  const resultPath = resolve(rootPath, "result.json");

  if (mode === "preflight") {
    printPlan(plan);
    return { mode, plan, providerCallsMade: 0 };
  }
  if (mode === "run" && !argv.includes("--authorize-provider-calls")) fail("D5 live run requires --authorize-provider-calls");
  if (mode === "run" && existsSync(resultPath)) fail("D5 result already exists; use --replay");
  if (mode === "replay" && !existsSync(resultPath)) fail("D5 replay requires completed result.json");

  const result = await executePlan({ plan, rootPath, replay: mode === "replay" });
  if (mode === "run") {
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    printResult(result, false);
    process.stdout.write(`Result: ${resultPath}\n`);
    return result;
  }
  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparable(stored)) !== canonicalJson(comparable(result))) fail("D5 replay does not match completed result");
  printResult(result, true);
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}
if (isMain()) {
  runGenesisD5Cli().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
