import { pathToFileURL } from "node:url";

import { guardianModelAdapterFromEnvironment } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import {
  WHOLE_PERSON_BENCHMARK_V4,
  buildWholePersonPass1Cases,
} from "../experiments/whole-person-benchmark/pass1-v4.mjs";
import {
  semanticWholePersonGuardianCandidate,
} from "../experiments/whole-person-benchmark/guardian-candidate.mjs";

export function wholePersonCandidateUsage() {
  return `Fibre Whole-Person Guardian Candidate\n\nUsage:\n  npm run guardian:whole-person:candidate\n  npm run guardian:whole-person:candidate -- --trials 12\n  npm run guardian:whole-person:candidate -- --trials 12 --json\n\nDevelopment experiment only. No standing or score movement.\n`;
}

export function parseWholePersonCandidateArgs(argv) {
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

function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ordered = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return { value: ordered[0]?.[0] ?? null, count: ordered[0]?.[1] ?? 0, counts: Object.fromEntries(ordered) };
}

function armSummary(arm, trials) {
  const memoryRef = `memory:${arm.memoryId}`;
  const actionMode = mode(trials.map((trial) => trial.output.decision));
  const dispositionMode = mode(trials.map((trial) => trial.output.factors.participationDisposition.effect));
  const meaningMode = mode(trials.map((trial) => trial.output.factors.personalMeaning.effect));
  const advantageMode = mode(trials.map((trial) => trial.output.factors.individualizedAdvantage.effect));
  const interchangeabilityMode = mode(trials.map((trial) => trial.output.factors.interchangeability.effect));
  const meaningCitations = trials.filter((trial) =>
    trial.output.factors.personalMeaning.evidenceRefs.includes(memoryRef)).length;
  const dispositionCitations = trials.filter((trial) =>
    trial.output.factors.participationDisposition.evidenceRefs.includes(memoryRef)).length;

  return {
    armId: arm.id,
    predictedDirection: arm.predictedDirection,
    trials: trials.length,
    modalAction: actionMode.value,
    modalActionFrequency: trials.length === 0 ? 0 : actionMode.count / trials.length,
    actionCounts: actionMode.counts,
    modalPersonalMeaning: meaningMode.value,
    personalMeaningCounts: meaningMode.counts,
    modalParticipationDisposition: dispositionMode.value,
    participationDispositionCounts: dispositionMode.counts,
    memoryMeaningCitationRate: trials.length === 0 ? 0 : meaningCitations / trials.length,
    memoryDispositionCitationRate: trials.length === 0 ? 0 : dispositionCitations / trials.length,
    individualizedAdvantage: advantageMode.counts,
    modalIndividualizedAdvantage: advantageMode.value,
    interchangeability: interchangeabilityMode.counts,
    modalInterchangeability: interchangeabilityMode.value,
  };
}

export function evaluateWholePersonCandidate(cases, results) {
  const summaries = cases.map(({ arm }) => armSummary(
    arm,
    results.filter((result) => result.armId === arm.id),
  ));
  const [left, right] = summaries;
  const stable = summaries.every((summary) => summary.modalActionFrequency >= 0.75);
  const memoryMeaningUsed = summaries.every((summary) => summary.memoryMeaningCitationRate >= 0.75);
  const memoryDispositionUsed = summaries.every((summary) => summary.memoryDispositionCitationRate >= 0.75);
  const meaningSeparated = left.modalPersonalMeaning !== right.modalPersonalMeaning;
  const dispositionSeparated = left.modalParticipationDisposition !== right.modalParticipationDisposition;
  const choiceSeparated = left.modalAction !== right.modalAction;
  const advantageHeldConstant = left.modalIndividualizedAdvantage === right.modalIndividualizedAdvantage;
  const interchangeabilityHeldConstant = left.modalInterchangeability === right.modalInterchangeability;
  const wholePersonSignal = stable && memoryMeaningUsed && meaningSeparated &&
    dispositionSeparated && choiceSeparated && advantageHeldConstant && interchangeabilityHeldConstant;

  return {
    summaries,
    diagnostic: {
      stable,
      memoryMeaningUsed,
      memoryDispositionUsed,
      meaningSeparated,
      dispositionSeparated,
      choiceSeparated,
      advantageHeldConstant,
      interchangeabilityHeldConstant,
      wholePersonSignal,
      interpretation: wholePersonSignal
        ? "The experimental Guardian shows personal life changing personal meaning, disposition, and choice without manufacturing individualized task advantage or non-interchangeability. This is development evidence only."
        : "The experimental Guardian has not yet shown the full life-to-meaning-to-choice chain while holding functional advantage and interchangeability constant.",
    },
  };
}

export async function runWholePersonCandidate(options) {
  const cases = buildWholePersonPass1Cases();
  const adapter = guardianModelAdapterFromEnvironment();
  const results = [];

  for (const { arm, capsule } of cases) {
    for (let trial = 1; trial <= options.trials; trial += 1) {
      process.stderr.write(`Whole-Person candidate ${arm.id} · ${trial}/${options.trials}\n`);
      const result = await semanticWholePersonGuardianCandidate(capsule, adapter, {
        clientRequestId: `whole-person-candidate:${arm.id}:${trial}`,
      });
      results.push({
        armId: arm.id,
        trial,
        output: result.output,
        provenance: result.provenance,
      });
    }
  }

  return {
    benchmarkId: WHOLE_PERSON_BENCHMARK_V4.id,
    evidentiaryStatus: "development_experiment_only_no_standing_credit",
    trialsPerArm: options.trials,
    ...evaluateWholePersonCandidate(cases, results),
    results,
  };
}

export function printWholePersonCandidateSummary(report) {
  console.log("Fibre · Whole-Person Guardian Candidate");
  console.log(`${report.evidentiaryStatus} · ${report.trialsPerArm} trials/arm`);
  for (const summary of report.summaries) {
    console.log("");
    console.log(summary.armId);
    console.log(`  action: ${summary.modalAction} (${Math.round(summary.modalActionFrequency * 100)}%)`);
    console.log(`  personal meaning: ${summary.modalPersonalMeaning}`);
    console.log(`  disposition: ${summary.modalParticipationDisposition}`);
    console.log(`  memory→meaning cited: ${Math.round(summary.memoryMeaningCitationRate * 100)}%`);
    console.log(`  memory→disposition cited: ${Math.round(summary.memoryDispositionCitationRate * 100)}%`);
    console.log(`  individualized advantage: ${JSON.stringify(summary.individualizedAdvantage)}`);
    console.log(`  interchangeability: ${JSON.stringify(summary.interchangeability)}`);
  }
  console.log("");
  console.log(JSON.stringify(report.diagnostic));
  console.log(report.diagnostic.interpretation);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseWholePersonCandidateArgs(argv);
  if (options.help) {
    console.log(wholePersonCandidateUsage());
    return;
  }
  const report = await runWholePersonCandidate(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printWholePersonCandidateSummary(report);
  if (!report.diagnostic.wholePersonSignal) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
