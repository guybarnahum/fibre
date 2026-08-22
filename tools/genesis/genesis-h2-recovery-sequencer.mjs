export const H2_RECOVERY_SEQUENCER_VERSION = "pr39-h-v2-recovery-sequencer-v1";

const FIRST_PROVIDER_OPERATION = "pr39-h:slot-04:pass-a:episode-03:record-retry:2";
const EXPECTED_STAGES = Object.freeze([
  "reuse_completed_thread_generations",
  "continue_partial_slot_04_pass_a",
  "complete_slot_04_memory_and_meaning",
  "generate_unstarted_slot_05",
  "publish_recovered_world",
]);

function fail(message) {
  throw new Error(message);
}

function assertFunction(name, value) {
  if (typeof value !== "function") throw new TypeError(`${name} must be a function`);
}

function assertPlan(plan) {
  if (plan === null || typeof plan !== "object" || Array.isArray(plan)) {
    throw new TypeError("H-v2 recovery sequencer requires a plan");
  }
  if (plan.firstProviderOperation?.clientRequestId !== FIRST_PROVIDER_OPERATION) {
    fail("H-v2 recovery sequencer first provider operation drift");
  }
  const stageNames = plan.stages?.map((stage) => stage.stage);
  if (!Array.isArray(stageNames) ||
      stageNames.length !== EXPECTED_STAGES.length ||
      stageNames.some((stage, index) => stage !== EXPECTED_STAGES[index])) {
    fail("H-v2 recovery sequencer stage order drift");
  }
  const preservedSlots = plan.stages[0].slots?.map((slot) => slot.slot);
  if (JSON.stringify(preservedSlots) !== JSON.stringify([1, 2, 3])) {
    fail("H-v2 recovery sequencer preserved-slot order drift");
  }
  if (plan.stages[3].slot !== 5) fail("H-v2 recovery sequencer unstarted slot drift");
  return plan;
}

export async function executeH2RecoverySequence({
  plan,
  loadPreserved,
  recoverSlot4,
  persistSlot4,
  generateSlot5,
  persistSlot5,
  publishCohort,
  onStage = null,
} = {}) {
  assertPlan(plan);
  for (const [name, value] of Object.entries({
    loadPreserved,
    recoverSlot4,
    persistSlot4,
    generateSlot5,
    persistSlot5,
    publishCohort,
  })) assertFunction(name, value);
  if (onStage !== null) assertFunction("onStage", onStage);

  const stageEvents = [];
  const mark = (stage, details = {}) => {
    const event = Object.freeze({ stage, ...structuredClone(details) });
    stageEvents.push(event);
    if (onStage !== null) onStage(structuredClone(event));
  };

  mark("reuse_completed_thread_generations", { status: "started" });
  const preserved = await loadPreserved(structuredClone(plan.stages[0].slots));
  if (!Array.isArray(preserved) || preserved.length !== 3 ||
      preserved.some((generation, index) => generation?.slot !== index + 1)) {
    fail("H-v2 recovery sequencer preserved generation set drift");
  }
  mark("reuse_completed_thread_generations", { status: "complete", slots: [1, 2, 3] });

  mark("continue_partial_slot_04_pass_a", {
    status: "started",
    firstProviderOperation: FIRST_PROVIDER_OPERATION,
  });
  const slot4 = await recoverSlot4();
  if (slot4?.slot !== 4) fail("H-v2 recovery sequencer recovered slot 4 identity drift");
  await persistSlot4(slot4);
  mark("complete_slot_04_memory_and_meaning", { status: "complete", slot: 4 });

  mark("generate_unstarted_slot_05", { status: "started", slot: 5 });
  const slot5 = await generateSlot5();
  if (slot5?.slot !== 5) fail("H-v2 recovery sequencer generated slot 5 identity drift");
  await persistSlot5(slot5);
  mark("generate_unstarted_slot_05", { status: "complete", slot: 5 });

  const generations = [...preserved, slot4, slot5];
  if (generations.map((generation) => generation.slot).join(",") !== "1,2,3,4,5") {
    fail("H-v2 recovery sequencer publication generation order drift");
  }
  mark("publish_recovered_world", { status: "started", slots: [1, 2, 3, 4, 5] });
  const publications = await publishCohort(generations);
  mark("publish_recovered_world", { status: "complete", slots: [1, 2, 3, 4, 5] });

  return Object.freeze({
    sequencerVersion: H2_RECOVERY_SEQUENCER_VERSION,
    firstProviderOperation: FIRST_PROVIDER_OPERATION,
    generations: Object.freeze(generations.map((generation) => structuredClone(generation))),
    publications: structuredClone(publications),
    stageEvents: Object.freeze(stageEvents.map((event) => structuredClone(event))),
  });
}
