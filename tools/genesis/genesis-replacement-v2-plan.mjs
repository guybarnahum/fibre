import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import { normalizeGenesisWorldSpec } from "../../services/world-kernel/src/genesis-domain.mjs";
import { symbolicGenomeDigest } from "../../services/world-kernel/src/symbolic-genome-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V3,
  sampleEventStructuresV3,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import { buildHistoricalEnvelopePlan } from "../../services/world-kernel/src/genesis-historical-envelope-v1.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const REPLACEMENT_V2_REDESIGN_PROTOCOL_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/redesign-v2.json";
export const REPLACEMENT_V2_PLACE_AFFORDANCE_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/place-affordance-bindings-v1.json";
export const REPLACEMENT_V2_G2_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-cohort-genome-freeze-v1.json";
export const REPLACEMENT_V2_G4_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-cognition-execution-binding-v1.json";
export const REPLACEMENT_V2_EXPECTED_G2_DIGEST = "sha256:7d8f7fbf481e7a4bd404c0757fbc7c40418cd142b9b8f2a3da294820692e2f91";
export const REPLACEMENT_V2_EXPECTED_ENVELOPE_DIGESTS = Object.freeze(new Map([
  [1, "sha256:7ae30e399e6fac72733a43695d6aa8115243067b385710814c0d707b40667110"],
  [2, "sha256:3a642987f93d308497e84002f5c2aa5b166928c04300d963e31e059567b4e319"],
  [3, "sha256:8ce61436aef530df6e940fe246db86f7d03485746bb33d7a3a93b467df797e0e"],
  [4, "sha256:473ac1dc4680739a39ae6975a47e656ecf7a6dca2bf4987176a249f5db58ad46"],
  [5, "sha256:3d3e2c74b1063aa53ff8e3c72f916f6bece5963b33a8bcf0f46b1230b512a1c7"],
]));

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function pad(value) { return String(value).padStart(2, "0"); }
function fail(message) { throw new Error(message); }

function verifyGenome(binding) {
  const genome = readJson(binding.genomePath);
  const computed = symbolicGenomeDigest({
    header: genome.header,
    loci: genome.loci,
    mutations: genome.mutations ?? [],
  });
  if (computed !== binding.genomeDigest || genome.genomeDigest !== binding.genomeDigest) {
    fail(`replacement-v2 slot ${binding.slot} genome digest drift`);
  }
  if (genome.header.genomeId !== binding.genomeId || genome.header.owner?.ownerId !== binding.threadId || genome.header.genesisId !== binding.genesisId) {
    fail(`replacement-v2 slot ${binding.slot} genome identity drift`);
  }
  return genome;
}

export function buildReplacementV2ExecutionPlans() {
  const protocol = readJson(REPLACEMENT_V2_REDESIGN_PROTOCOL_PATH);
  const placeProtocol = readJson(REPLACEMENT_V2_PLACE_AFFORDANCE_PATH);
  const g2 = readJson(REPLACEMENT_V2_G2_PATH);
  const g4 = readJson(REPLACEMENT_V2_G4_BINDING_PATH);
  if (digest(g2) !== REPLACEMENT_V2_EXPECTED_G2_DIGEST) fail("replacement-v2 G2 starting material drift");
  if (protocol.authorization.providerCallsAuthorized !== false || protocol.authorization.replacementV2ExecutionAuthorized !== false) {
    fail("R1 protocol unexpectedly authorizes replacement-v2 execution");
  }
  const placeByWorld = new Map(placeProtocol.worlds.map((item) => [item.worldSpecId, item.places]));
  const g2BySlot = new Map(g2.worldBindings.map((item) => [item.slot, item]));
  const rosterBySlot = new Map(g4.initialRosters.map((item) => [item.slot, item]));
  const windows = protocol.historicalPlan.windows.map((item) => structuredClone(item));

  const slots = protocol.worldBindings.map((binding) => {
    const inherited = g2BySlot.get(binding.slot);
    if (!inherited || inherited.threadId !== binding.threadId || inherited.worldSpecId !== binding.worldSpecId || inherited.worldSpecPath !== binding.worldSpecPath) {
      fail(`replacement-v2 slot ${binding.slot} starting assignment drift`);
    }
    const roster = rosterBySlot.get(binding.slot);
    if (!roster || roster.threadId !== binding.threadId || roster.worldSpecId !== binding.worldSpecId) {
      fail(`replacement-v2 slot ${binding.slot} roster drift`);
    }
    const worldSpec = normalizeGenesisWorldSpec(readJson(binding.worldSpecPath));
    if (worldSpec.worldSpecId !== binding.worldSpecId || digest(worldSpec) !== inherited.worldSpecDigest) {
      fail(`replacement-v2 slot ${binding.slot} WorldSpec drift`);
    }
    const genome = verifyGenome(inherited);
    const placeAffordances = placeByWorld.get(binding.worldSpecId);
    if (!placeAffordances) fail(`replacement-v2 slot ${binding.slot} place-affordance binding missing`);
    const offersByWindow = new Map();
    for (const window of windows) {
      const seed = `${protocol.startingMaterial.freshEventOfferSeedDomain}:slot:${pad(binding.slot)}:structures:${window.windowId}`;
      offersByWindow.set(window.windowId, sampleEventStructuresV3(
        GENESIS_EVENT_STRUCTURE_POOL_V3,
        window,
        { seed, count: 9 },
      ));
    }
    const envelopePlan = buildHistoricalEnvelopePlan({
      subject: { provisionalThreadId: binding.threadId, bornAt: protocol.historicalPlan.bornAt },
      worldSpec,
      windows,
      offersByWindow,
      initialRoster: roster.participants,
      placeAffordances,
      timeZone: binding.timeZone,
      seedDomain: `${protocol.startingMaterial.freshHistoricalEnvelopeSeedDomain}:slot:${pad(binding.slot)}`,
    });
    const expectedEnvelopeDigest = REPLACEMENT_V2_EXPECTED_ENVELOPE_DIGESTS.get(binding.slot);
    if (envelopePlan.digest !== expectedEnvelopeDigest) {
      fail(`replacement-v2 slot ${binding.slot} reviewed envelope digest drift`);
    }
    return Object.freeze({
      slot: binding.slot,
      threadId: binding.threadId,
      genesisId: inherited.genesisId,
      originMode: inherited.originMode,
      worldSpec,
      worldSpecPath: binding.worldSpecPath,
      worldSpecDigest: inherited.worldSpecDigest,
      genome,
      genomePath: inherited.genomePath,
      genomeDigest: inherited.genomeDigest,
      roster: structuredClone(roster),
      windows: structuredClone(windows),
      offersByWindow,
      envelopePlan,
      freshModelRequestDomain: protocol.startingMaterial.freshModelRequestDomain,
      outputRoot: protocol.startingMaterial.freshOutputRoot,
      bornAt: protocol.historicalPlan.bornAt,
      chronologyEndsAt: protocol.historicalPlan.chronologyEndsAt,
      timeZone: binding.timeZone,
    });
  });
  if (slots.length !== 5) fail("replacement-v2 execution plan must contain exactly five slots");
  return Object.freeze({ protocol, g2, g4, slots: Object.freeze(slots) });
}
