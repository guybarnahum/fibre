// fibre-test-lifecycle: development
// fibre-test-scope: genesis
// fibre-test-purpose: prospective-four-condition-sealed-history-diagnostic

import assert from "node:assert/strict";
import test from "node:test";

import {
  compilePassBCognitionWithSealedHistory,
} from "#services/world-kernel/src/genesis-sealed-history-isolation.mjs";
import {
  GENESIS_D5_CONDITIONS,
  GENESIS_D5_PACKET_CONTRACT,
  buildGenesisD5Plan,
  normalizeGenesisD5Packet,
  scoreGenesisD5,
} from "./genesis-d5-sealed-history-diagnostic.mjs";

function sourceGraph() {
  const graph = [];
  for (let index = 1; index <= 4; index += 1) {
    graph.push({ sourceRef: `ep_pos_${index}`, kind: "history_episode", dependsOn: [] });
    graph.push({ sourceRef: `mem_pos_${index}`, kind: "memory", dependsOn: [`ep_pos_${index}`] });
    graph.push({ sourceRef: `ep_hold_${index}`, kind: "history_episode", dependsOn: [] });
    graph.push({ sourceRef: `ep_hold_desc_${index}`, kind: "history_episode", dependsOn: [`ep_hold_${index}`] });
  }
  graph.push({
    sourceRef: "self_account_d5",
    kind: "self_account",
    dependsOn: ["mem_pos_1", "mem_pos_2", "mem_pos_3", "mem_pos_4"],
  });
  return graph;
}

function passBCognition() {
  const history = [];
  const priorMemories = [];
  for (let index = 1; index <= 4; index += 1) {
    history.push({ episodeId: `ep_pos_${index}`, observableAction: `visible positive episode ${index}` });
    history.push({ episodeId: `ep_hold_${index}`, observableAction: `sealed holdout ${index}` });
    history.push({ episodeId: `ep_hold_desc_${index}`, observableAction: `descendant revealing holdout ${index}` });
    priorMemories.push({
      memoryRef: `mem_pos_${index}`,
      episodeRefs: [`ep_pos_${index}`],
      rememberedContent: `remembered positive ${index}`,
      uncertainty: [],
    });
  }
  return {
    inputVersion: "genesis-pass-b-cognition-input-v1",
    subject: { provisionalThreadId: "thr_d5_target", bornAt: "2000-01-01T00:00:00Z" },
    world: { worldSpecId: "world_d5_target" },
    rememberingAt: "2020-01-01T00:00:00Z",
    ageAtRemembering: 20,
    chronologyEndsAt: "2020-01-01T00:00:00Z",
    history,
    priorMemories,
    genomeExposure: null,
    policyWitness: { policyVersion: "genesis-pass-b-policy-v1" },
  };
}

function packet() {
  const graph = sourceGraph();
  const sealedSourceRefs = ["ep_hold_1", "ep_hold_2", "ep_hold_3", "ep_hold_4"];
  const compiled = compilePassBCognitionWithSealedHistory({
    cognitionInput: passBCognition(),
    sourceGraph: graph,
    sealedSourceRefs,
    callId: "d5_fixture_pass_b",
  });
  return {
    contract: GENESIS_D5_PACKET_CONTRACT,
    developmentOnly: true,
    packetId: "d5_fixture_packet",
    targetThreadId: "thr_d5_target",
    selfAccount: {
      sourceRef: "self_account_d5",
      text: "I tend to remember moments when another person relied on me, and I often understand setbacks through what I did next rather than as a single verdict about myself.",
    },
    sourceGraph: graph,
    sealedSourceRefs,
    exposureManifests: [compiled.manifest],
    units: Array.from({ length: 4 }, (_, offset) => {
      const index = offset + 1;
      return {
        unitId: `d5_unit_${index}`,
        rememberedPositive: {
          episodeRef: `ep_pos_${index}`,
          memoryRef: `mem_pos_${index}`,
          text: `A visible remembered episode ${index} in which another person relied on the subject during an ordinary setback.`,
        },
        ownSealedHoldout: {
          episodeRef: `ep_hold_${index}`,
          text: `A prospectively sealed episode ${index} involving a different concrete situation that cognition was forbidden to receive.`,
        },
        matchedPlausibleNonEvent: {
          syntheticRef: `non_event_${index}`,
          text: `A plausible but fabricated matched episode ${index} that did not occur in the target Thread history.`,
        },
        crossThreadSealedHoldout: {
          episodeRef: `cross_ep_${index}`,
          ownerThreadId: "thr_d5_donor",
          text: `A sealed episode ${index} from another Thread with comparable narrative plausibility.`,
        },
      };
    }),
  };
}

function resultsFor(plan, byCondition) {
  return plan.items.map((item) => ({
    unitId: item.unitId,
    condition: item.condition,
    output: {
      thematicAccommodation: byCondition[item.condition].theme,
      factualAlignment: byCondition[item.condition].factual,
      reason: "Fixture judgment for deterministic scorer coverage.",
    },
  }));
}

test("D5 plan requires prospective isolation and blinds all four evaluator conditions", () => {
  const plan = buildGenesisD5Plan({ packet: packet() });
  assert.equal(plan.unitCount, 4);
  assert.equal(plan.evaluatorJudgmentCount, 16);
  assert.deepEqual(new Set(plan.items.map((item) => item.condition)), new Set(GENESIS_D5_CONDITIONS));
  for (const condition of GENESIS_D5_CONDITIONS) {
    assert.equal(plan.items.filter((item) => item.condition === condition).length, 4);
  }
  assert.deepEqual(plan.packet.closure.sealedSourceRefs, ["ep_hold_1", "ep_hold_2", "ep_hold_3", "ep_hold_4"]);
  for (let index = 1; index <= 4; index += 1) {
    assert.equal(plan.packet.closure.taintedSourceRefs.includes(`ep_hold_desc_${index}`), true);
  }
  for (const item of plan.items) {
    assert.deepEqual(Object.keys(item.evaluatorInput).sort(), ["candidateEpisode", "selfAccount"]);
    const encoded = JSON.stringify(item.evaluatorInput);
    for (const forbidden of ["condition", "unitId", "episodeRef", "memoryRef", "ownerThreadId", "syntheticRef"]) {
      assert.equal(encoded.includes(forbidden), false);
    }
  }
});

test("D5 scorer distinguishes no-large-signal, generic overreach, provenance audit and sensitivity failure", () => {
  const plan = buildGenesisD5Plan({ packet: packet() });
  const quiet = scoreGenesisD5(plan, resultsFor(plan, {
    remembered_positive: { theme: "strong", factual: "partial" },
    own_sealed_holdout: { theme: "none", factual: "none" },
    matched_plausible_non_event: { theme: "none", factual: "none" },
    cross_thread_sealed_holdout: { theme: "none", factual: "none" },
  }));
  assert.equal(quiet.classification, "NO_LARGE_OVERREACH_SIGNAL_AT_RESOLUTION");

  const generic = scoreGenesisD5(plan, resultsFor(plan, {
    remembered_positive: { theme: "strong", factual: "partial" },
    own_sealed_holdout: { theme: "plausible", factual: "partial" },
    matched_plausible_non_event: { theme: "plausible", factual: "partial" },
    cross_thread_sealed_holdout: { theme: "plausible", factual: "partial" },
  }));
  assert.equal(generic.classification, "GENERIC_OVERGENERALIZATION");

  const audit = scoreGenesisD5(plan, resultsFor(plan, {
    remembered_positive: { theme: "strong", factual: "specific" },
    own_sealed_holdout: { theme: "strong", factual: "specific" },
    matched_plausible_non_event: { theme: "none", factual: "none" },
    cross_thread_sealed_holdout: { theme: "none", factual: "none" },
  }));
  assert.equal(audit.classification, "PROVENANCE_AUDIT_TRIGGER");

  const insensitive = scoreGenesisD5(plan, resultsFor(plan, {
    remembered_positive: { theme: "none", factual: "none" },
    own_sealed_holdout: { theme: "none", factual: "none" },
    matched_plausible_non_event: { theme: "none", factual: "none" },
    cross_thread_sealed_holdout: { theme: "none", factual: "none" },
  }));
  assert.equal(insensitive.classification, "INSTRUMENT_SENSITIVITY_FAILED");
});

test("D5 packet refuses retrospective or tainted self-account evidence", () => {
  const missingManifests = packet();
  missingManifests.exposureManifests = [];
  assert.throws(() => normalizeGenesisD5Packet(missingManifests), /requires cognition exposure manifests/);

  const tainted = packet();
  tainted.sourceGraph = tainted.sourceGraph.map((source) =>
    source.sourceRef === "self_account_d5"
      ? { ...source, dependsOn: [...source.dependsOn, "ep_hold_1"] }
      : source);
  assert.throws(() => normalizeGenesisD5Packet(tainted), /self-account is tainted by sealed history/);
});
