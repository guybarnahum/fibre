import { pathToFileURL } from "node:url";

import { guardianModelAdapterFromEnvironment } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import {
  WHOLE_PERSON_PASS2,
  buildWholePersonPass2Cases,
} from "../experiments/whole-person-benchmark/pass2-memory-meaning.mjs";
import {
  semanticWholePersonMemoryMeaningCandidate,
} from "../experiments/whole-person-benchmark/guardian-memory-meaning-candidate.mjs";

function parseArgs(argv) {
  const options = { trials: WHOLE_PERSON_PASS2.trialsPerArm, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--trials" || arg.startsWith("--trials=")) {
      const raw = arg.startsWith("--trials=") ? arg.slice(9) : argv[++index];
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 1 || value > 50) throw new Error("--trials must be 1..50");
      options.trials = value;
    } else if (arg === "--json") {
      options.json = true;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return options;
}

function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { value: ordered[0]?.[0] ?? null, count: ordered[0]?.[1] ?? 0, counts: Object.fromEntries(ordered) };
}

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function neutrality(cases) {
  const [a, b] = cases;
  const eventBytes = [Buffer.byteLength(a.arm.formativeEvent), Buffer.byteLength(b.arm.formativeEvent)];
  const meaningBytes = [Buffer.byteLength(a.arm.rememberedMeaning), Buffer.byteLength(b.arm.rememberedMeaning)];
  const inputBytes = [bytes(a.input), bytes(b.input)];
  const relative = (values) => (Math.max(...values) - Math.min(...values)) / Math.max(...values);
  return {
    eventBytes,
    rememberedMeaningBytes: meaningBytes,
    modelInputBytes: inputBytes,
    eventDifference: relative(eventBytes),
    rememberedMeaningDifference: relative(meaningBytes),
    modelInputDifference: relative(inputBytes),
  };
}

function summarize(arm, rows) {
  const action = mode(rows.map((row) => row.output.decision));
  const meaning = mode(rows.map((row) => row.output.factors.personalMeaning.effect));
  const disposition = mode(rows.map((row) => row.output.factors.participationDisposition.effect));
  const advantage = mode(rows.map((row) => row.output.factors.individualizedAdvantage.effect));
  const interchangeability = mode(rows.map((row) => row.output.factors.interchangeability.effect));
  const memoryMeaningCitations = rows.filter((row) => row.output.factors.personalMeaning.evidenceRefs.includes(arm.memoryRef)).length;
  const memoryDispositionCitations = rows.filter((row) => row.output.factors.participationDisposition.evidenceRefs.includes(arm.memoryRef)).length;
  return {
    armId: arm.id,
    predictedDirection: arm.predictedDirection,
    trials: rows.length,
    modalAction: action.value,
    modalActionFrequency: rows.length === 0 ? 0 : action.count / rows.length,
    actionCounts: action.counts,
    modalPersonalMeaning: meaning.value,
    personalMeaningCounts: meaning.counts,
    modalParticipationDisposition: disposition.value,
    participationDispositionCounts: disposition.counts,
    modalIndividualizedAdvantage: advantage.value,
    individualizedAdvantageCounts: advantage.counts,
    modalInterchangeability: interchangeability.value,
    interchangeabilityCounts: interchangeability.counts,
    memoryMeaningCitationRate: rows.length === 0 ? 0 : memoryMeaningCitations / rows.length,
    memoryDispositionCitationRate: rows.length === 0 ? 0 : memoryDispositionCitations / rows.length,
    personalMeaningSummaries: [...new Set(rows.map((row) => row.output.factors.personalMeaning.summary))],
  };
}

export async function runWholePersonPass2(options) {
  const cases = buildWholePersonPass2Cases();
  const neutral = neutrality(cases);
  if (neutral.eventDifference > 0.02 || neutral.rememberedMeaningDifference > 0.02 || neutral.modelInputDifference > 0.02) {
    throw new Error("Whole-Person Pass 2 neutrality exceeds 2%");
  }
  const adapter = guardianModelAdapterFromEnvironment();
  const results = [];
  for (const { arm, input } of cases) {
    for (let trial = 1; trial <= options.trials; trial += 1) {
      process.stderr.write(`Whole-Person Pass 2 ${arm.id} · ${trial}/${options.trials}\n`);
      const result = await semanticWholePersonMemoryMeaningCandidate(input, adapter, {
        clientRequestId: `whole-person-pass2:${arm.id}:${trial}`,
      });
      results.push({ armId: arm.id, trial, output: result.output, provenance: result.provenance });
    }
  }
  const summaries = cases.map(({ arm }) => summarize(arm, results.filter((row) => row.armId === arm.id)));
  const [a, b] = summaries;
  const diagnostic = {
    stable: summaries.every((summary) => summary.modalActionFrequency >= 0.75),
    memoryMeaningUsed: summaries.every((summary) => summary.memoryMeaningCitationRate >= 0.75),
    meaningSeparated: a.modalPersonalMeaning !== b.modalPersonalMeaning,
    dispositionSeparated: a.modalParticipationDisposition !== b.modalParticipationDisposition,
    choiceSeparated: a.modalAction !== b.modalAction,
    advantageHeldConstant: a.modalIndividualizedAdvantage === b.modalIndividualizedAdvantage,
    interchangeabilityHeldConstant: a.modalInterchangeability === b.modalInterchangeability,
  };
  diagnostic.wholePersonSignal = Object.values(diagnostic).every(Boolean);
  return {
    benchmarkId: WHOLE_PERSON_PASS2.id,
    evidentiaryStatus: WHOLE_PERSON_PASS2.evidentiaryStatus,
    trialsPerArm: options.trials,
    neutrality: neutral,
    summaries,
    diagnostic,
    results,
  };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const report = await runWholePersonPass2(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log("Fibre · Whole-Person Benchmark · Pass 2 remembered meaning");
    for (const summary of report.summaries) {
      console.log(`${summary.armId}: ${summary.modalPersonalMeaning} → ${summary.modalParticipationDisposition} → ${summary.modalAction}`);
    }
    console.log(JSON.stringify(report.diagnostic));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
