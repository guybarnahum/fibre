import {
  PASS3_MEANING_PROMPT,
  PASS3_PARTICIPATION_PROMPT,
  WHOLE_PERSON_PASS3,
  buildPass3MeaningInput,
  buildPass3MeaningSchema,
  buildPass3ParticipationInput,
  buildPass3ParticipationSchema,
  validatePass3Meaning,
  validatePass3Participation,
} from "../experiments/whole-person-benchmark/two-stage-pass3.mjs";
import { guardianModelAdapterFromEnvironment } from "../services/world-kernel/src/guardian-model-adapter.mjs";

function parseArgs(argv) {
  let trials = WHOLE_PERSON_PASS3.trialsPerArm;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") json = true;
    if (arg === "--trials") {
      trials = Number(argv[index + 1]);
      index += 1;
    }
  }
  if (!Number.isSafeInteger(trials) || trials < 1 || trials > 24) {
    throw new TypeError("--trials must be an integer from 1 through 24");
  }
  return { trials, json };
}

function counts(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

function modal(values) {
  const tally = counts(values);
  return Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

async function runTrial(adapter, arm, trial) {
  const meaningInput = buildPass3MeaningInput(arm);
  const meaningSchema = buildPass3MeaningSchema(meaningInput);
  const meaningInvocation = await adapter.invoke({
    systemPrompt: PASS3_MEANING_PROMPT,
    input: meaningInput,
    responseSchema: meaningSchema,
    clientRequestId: `whole-person-pass3:meaning:${arm.id}:${trial}`,
  });
  const meaning = validatePass3Meaning(arm, meaningInput, meaningInvocation.output);

  const participationInput = buildPass3ParticipationInput(meaning);
  const participationSchema = buildPass3ParticipationSchema(participationInput);
  const participationInvocation = await adapter.invoke({
    systemPrompt: PASS3_PARTICIPATION_PROMPT,
    input: participationInput,
    responseSchema: participationSchema,
    clientRequestId: `whole-person-pass3:participation:${arm.id}:${trial}`,
  });
  const participation = validatePass3Participation(participationInput, participationInvocation.output);

  return {
    armId: arm.id,
    trial,
    meaning,
    participation,
    provenance: {
      meaning: meaningInvocation.provenance,
      participation: participationInvocation.provenance,
      meaningSourceRefs: [...meaning.evidenceRefs],
      participationAppraisalRef: "appraisal:personal_meaning",
    },
    sizes: {
      meaningInputBytes: byteLength(meaningInput),
      participationInputBytes: byteLength(participationInput),
    },
  };
}

function summarizeArm(arm, results) {
  const armResults = results.filter((result) => result.armId === arm.id);
  const meaningEffects = armResults.map((result) => result.meaning.effect);
  const meaningImpacts = armResults.map((result) => result.participation.meaningImpact.effect);
  const dispositions = armResults.map((result) => result.participation.participationDisposition.effect);
  const decisions = armResults.map((result) => result.participation.decision);
  return {
    armId: arm.id,
    trials: armResults.length,
    modalMeaning: modal(meaningEffects),
    meaningCounts: counts(meaningEffects),
    modalMeaningImpact: modal(meaningImpacts),
    meaningImpactCounts: counts(meaningImpacts),
    modalDisposition: modal(dispositions),
    dispositionCounts: counts(dispositions),
    modalDecision: modal(decisions),
    decisionCounts: counts(decisions),
    meaningSummaries: armResults.map((result) => result.meaning.summary),
    impactSummaries: armResults.map((result) => result.participation.meaningImpact.summary),
    dispositionSummaries: armResults.map((result) => result.participation.participationDisposition.summary),
    meaningInputBytes: [...new Set(armResults.map((result) => result.sizes.meaningInputBytes))],
    participationInputBytes: armResults.map((result) => result.sizes.participationInputBytes),
  };
}

async function main() {
  const { trials, json } = parseArgs(process.argv.slice(2));
  const adapter = guardianModelAdapterFromEnvironment(process.env);
  const results = [];

  for (const arm of WHOLE_PERSON_PASS3.arms) {
    for (let trial = 1; trial <= trials; trial += 1) {
      process.stderr.write(`Whole-Person Pass 3 ${arm.id} · ${trial}/${trials}\n`);
      results.push(await runTrial(adapter, arm, trial));
    }
  }

  const summaries = WHOLE_PERSON_PASS3.arms.map((arm) => summarizeArm(arm, results));
  const [a, b] = summaries;
  const diagnostic = {
    meaningSeparated: a.modalMeaning !== b.modalMeaning,
    meaningImpactSeparated: a.modalMeaningImpact !== b.modalMeaningImpact,
    dispositionSeparated: a.modalDisposition !== b.modalDisposition,
    choiceSeparated: a.modalDecision !== b.modalDecision,
  };
  diagnostic.lifeToMeaningToDisposition =
    diagnostic.meaningSeparated && diagnostic.meaningImpactSeparated && diagnostic.dispositionSeparated;
  diagnostic.lifeToMeaningToChoice = diagnostic.lifeToMeaningToDisposition && diagnostic.choiceSeparated;

  const report = {
    benchmarkId: WHOLE_PERSON_PASS3.id,
    evidentiaryStatus: WHOLE_PERSON_PASS3.evidentiaryStatus,
    trialsPerArm: trials,
    neutrality: {
      eventBytes: WHOLE_PERSON_PASS3.arms.map((arm) => Buffer.byteLength(arm.formativeEvent, "utf8")),
      rememberedMeaningBytes: WHOLE_PERSON_PASS3.arms.map((arm) => Buffer.byteLength(arm.rememberedMeaning, "utf8")),
      stage1InputBytes: summaries.map((summary) => summary.meaningInputBytes),
    },
    summaries,
    diagnostic,
    results,
  };

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify({ summaries, diagnostic }, null, 2)}\n`);
  }
}

await main();
