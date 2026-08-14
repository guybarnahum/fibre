import { pathToFileURL } from "node:url";

import {
  buildDignityGuardianV4ModelInput,
  buildDignityGuardianV4ResponseSchema,
  semanticDignityGuardianV4,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { guardianModelAdapterFromEnvironment } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import {
  WHOLE_PERSON_BENCHMARK_V4,
  buildWholePersonPass1Cases,
} from "../experiments/whole-person-benchmark/pass1-v4.mjs";

export function wholePersonBenchmarkUsage() {
  return `Fibre Whole-Person Benchmark — Guardian v4 Pass 1\n\nUsage:\n  npm run guardian:whole-person\n  npm run guardian:whole-person -- --trials 12\n  npm run guardian:whole-person -- --trials 12 --json\n\nThis is a development diagnostic only. It does not award standing or score movement.\n`;
}

export function parseWholePersonBenchmarkArgs(argv) {
  const options = { trials: WHOLE_PERSON_BENCHMARK_V4.trialsPerArm, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--trials" || arg.startsWith("--trials=")) {
      const raw = arg.startsWith("--trials=") ? arg.slice("--trials=".length) : argv[index + 1];
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 1 || value > 50) {
        throw new Error("--trials must be an integer from 1 through 50");
      }
      options.trials = value;
      if (arg === "--trials") index += 1;
    } else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function wholePersonNeutralityReport(cases = buildWholePersonPass1Cases()) {
  if (cases.length !== 2) throw new Error("Whole-Person Pass 1 requires exactly two arms");
  const [left, right] = cases;
  const leftInput = buildDignityGuardianV4ModelInput(left.capsule);
  const rightInput = buildDignityGuardianV4ModelInput(right.capsule);
  const leftSchema = buildDignityGuardianV4ResponseSchema(left.capsule);
  const rightSchema = buildDignityGuardianV4ResponseSchema(right.capsule);
  const inputBytes = [bytes(leftInput), bytes(rightInput)];
  const schemaBytes = [bytes(leftSchema), bytes(rightSchema)];
  const formativeBytes = [
    Buffer.byteLength(left.arm.formativeRecord, "utf8"),
    Buffer.byteLength(right.arm.formativeRecord, "utf8"),
  ];
  const relativeDifference = (values) => {
    const maximum = Math.max(...values);
    const minimum = Math.min(...values);
    return maximum === 0 ? 0 : (maximum - minimum) / maximum;
  };
  return {
    formativeBytes,
    modelInputBytes: inputBytes,
    responseSchemaBytes: schemaBytes,
    formativeByteDifference: relativeDifference(formativeBytes),
    modelInputByteDifference: relativeDifference(inputBytes),
    responseSchemaByteDifference: relativeDifference(schemaBytes),
  };
}

export function assertWholePersonNeutrality(report = wholePersonNeutralityReport()) {
  const maximumDifference = 0.02;
  for (const [name, value] of [
    ["formative record", report.formativeByteDifference],
    ["model input", report.modelInputByteDifference],
    ["response schema", report.responseSchemaByteDifference],
  ]) {
    if (value > maximumDifference) {
      throw new Error(`Whole-Person Benchmark ${name} differs by ${(value * 100).toFixed(2)}%, above the 2% ceiling`);
    }
  }
  return true;
}

function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ordered = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return { value: ordered[0]?.[0] ?? null, count: ordered[0]?.[1] ?? 0, counts: Object.fromEntries(ordered) };
}

function armSummary(arm, trials) {
  const actions = trials.map((trial) => trial.output.proposedAction);
  const fits = trials.map((trial) => trial.output.participationFit);
  const actionMode = mode(actions);
  const fitMode = mode(fits);
  const memoryRef = `memory:${arm.memoryId}`;
  const memoryCitations = trials.filter((trial) => trial.output.evidenceRefs.includes(memoryRef)).length;
  const factorCitationCounts = {};
  for (const factor of Object.keys(trials[0]?.output.factors ?? {})) {
    factorCitationCounts[factor] = trials.filter((trial) =>
      trial.output.factors[factor].evidenceRefs.includes(memoryRef)).length;
  }
  return {
    armId: arm.id,
    predictedDirection: arm.predictedDirection,
    trials: trials.length,
    modalAction: actionMode.value,
    modalActionFrequency: trials.length === 0 ? 0 : actionMode.count / trials.length,
    actionCounts: actionMode.counts,
    modalFit: fitMode.value,
    fitCounts: fitMode.counts,
    memoryCitationRate: trials.length === 0 ? 0 : memoryCitations / trials.length,
    memoryFactorCitationCounts: factorCitationCounts,
    individualizedAdvantage: mode(trials.map((trial) => trial.output.factors.individualizedAdvantage.effect)).counts,
    interchangeability: mode(trials.map((trial) => trial.output.factors.interchangeability.effect)).counts,
    highFitCount: trials.filter((trial) => trial.output.participationFit === "high").length,
  };
}

export function evaluateWholePersonPass1(cases, results) {
  const summaries = cases.map(({ arm }) => {
    const trials = results.filter((result) => result.armId === arm.id);
    return armSummary(arm, trials);
  });
  const [left, right] = summaries;
  const separated = left.modalAction !== right.modalAction;
  const stable = summaries.every((summary) => summary.modalActionFrequency >= 0.75);
  const attributable = summaries.every((summary) => summary.memoryCitationRate >= 0.75);
  return {
    summaries,
    diagnostic: {
      stable,
      separated,
      attributable,
      wholePersonSignal: stable && separated && attributable,
      interpretation: stable && separated && attributable
        ? "Guardian v4 shows a development-only non-professional life differential. Full controls are still required before any standing claim."
        : "Pass 1 does not establish an attributable whole-person differential. This is the expected diagnostic if Guardian v4's participation-fit schema is the limiting consumer.",
    },
  };
}

export async function runWholePersonBenchmark(options) {
  const cases = buildWholePersonPass1Cases();
  const neutrality = wholePersonNeutralityReport(cases);
  assertWholePersonNeutrality(neutrality);
  const adapter = guardianModelAdapterFromEnvironment();
  const results = [];

  for (const { arm, capsule } of cases) {
    for (let trial = 1; trial <= options.trials; trial += 1) {
      process.stderr.write(`Whole-Person ${arm.id} · ${trial}/${options.trials}\n`);
      const result = await semanticDignityGuardianV4(capsule, adapter, {
        clientRequestId: `whole-person:${arm.id}:${trial}`,
      });
      results.push({
        armId: arm.id,
        trial,
        output: result.output,
        provenance: result.provenance,
      });
    }
  }

  const evaluation = evaluateWholePersonPass1(cases, results);
  return {
    benchmarkId: WHOLE_PERSON_BENCHMARK_V4.id,
    evidentiaryStatus: WHOLE_PERSON_BENCHMARK_V4.evidentiaryStatus,
    coreQuestion: WHOLE_PERSON_BENCHMARK_V4.interpretation.coreQuestion,
    expectedV4Ceiling: WHOLE_PERSON_BENCHMARK_V4.interpretation.expectedV4Ceiling,
    trialsPerArm: options.trials,
    neutrality,
    ...evaluation,
    results,
  };
}

export function printWholePersonBenchmarkSummary(report) {
  console.log("Fibre · Whole-Person Benchmark · Guardian v4 Pass 1");
  console.log(`${report.evidentiaryStatus} · ${report.trialsPerArm} trials/arm`);
  console.log("");
  console.log(
    `Neutrality · formative ${report.neutrality.formativeBytes.join("/")} B · ` +
    `input ${report.neutrality.modelInputBytes.join("/")} B · ` +
    `schema ${report.neutrality.responseSchemaBytes.join("/")} B`,
  );
  for (const summary of report.summaries) {
    console.log("");
    console.log(`${summary.armId}`);
    console.log(`  modal action: ${summary.modalAction} (${Math.round(summary.modalActionFrequency * 100)}%)`);
    console.log(`  actions: ${JSON.stringify(summary.actionCounts)}`);
    console.log(`  fits: ${JSON.stringify(summary.fitCounts)}`);
    console.log(`  memory cited: ${Math.round(summary.memoryCitationRate * 100)}%`);
    console.log(`  individualized advantage: ${JSON.stringify(summary.individualizedAdvantage)}`);
    console.log(`  interchangeability: ${JSON.stringify(summary.interchangeability)}`);
  }
  console.log("");
  console.log(`stable=${report.diagnostic.stable} separated=${report.diagnostic.separated} attributable=${report.diagnostic.attributable}`);
  console.log(report.diagnostic.interpretation);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseWholePersonBenchmarkArgs(argv);
  if (options.help) {
    console.log(wholePersonBenchmarkUsage());
    return;
  }
  const report = await runWholePersonBenchmark(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printWholePersonBenchmarkSummary(report);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
