import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeGenesisWorldSpec } from "../../services/world-kernel/src/genesis-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V3,
  sampleEventStructuresV3,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import { buildHistoricalEnvelopePlan } from "../../services/world-kernel/src/genesis-historical-envelope-v1.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import { symbolicGenomeDigest } from "../../services/world-kernel/src/symbolic-genome-domain.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const PR39_DEVELOPMENT_COHORT_PATH = "fixtures/genesis/pr39/development-cohort-v1.json";

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function pad(value) { return String(value).padStart(2, "0"); }
function fail(message) { throw new Error(message); }

function loadWorld(slot) {
  const worldSpec = normalizeGenesisWorldSpec(readJson(slot.worldSpecPath));
  if (digest(worldSpec) !== slot.worldSpecDigest) fail(`PR39 slot ${slot.slot} WorldSpec digest drift`);
  return worldSpec;
}

function loadGenome(slot) {
  const genome = readJson(slot.genomePath);
  const computed = symbolicGenomeDigest({
    header: genome.header,
    loci: genome.loci,
    mutations: genome.mutations ?? [],
  });
  if (computed !== slot.genomeDigest || genome.genomeDigest !== slot.genomeDigest) {
    fail(`PR39 slot ${slot.slot} genome digest drift`);
  }
  if (genome.header.owner?.ownerId !== slot.threadId || genome.header.genesisId !== slot.genesisId) {
    fail(`PR39 slot ${slot.slot} genome identity drift`);
  }
  return genome;
}

export function buildGenesisDevelopmentPlans({ fixturePath = PR39_DEVELOPMENT_COHORT_PATH } = {}) {
  const fixture = readJson(fixturePath);
  if (fixture.fixtureVersion !== "pr39-development-cohort-v1") fail("unexpected PR39 development fixture version");
  if (!Array.isArray(fixture.slots) || fixture.slots.length !== 5) fail("PR39 development fixture must contain five slots");
  if (!Array.isArray(fixture.historicalPlan?.windows) || fixture.historicalPlan.windows.length !== 14) {
    fail("PR39 development fixture must contain fourteen historical windows");
  }

  const windows = fixture.historicalPlan.windows.map((item) => structuredClone(item));
  const slots = fixture.slots.map((slot) => {
    const worldSpec = loadWorld(slot);
    const genome = loadGenome(slot);
    const offersByWindow = new Map();
    for (const window of windows) {
      const seed = `${fixture.generation.eventOfferSeedDomain}:slot:${pad(slot.slot)}:structures:${window.windowId}`;
      offersByWindow.set(window.windowId, sampleEventStructuresV3(
        GENESIS_EVENT_STRUCTURE_POOL_V3,
        window,
        { seed, count: fixture.generation.structuresPerWindow },
      ));
    }
    const roster = Object.freeze({
      slot: slot.slot,
      worldSpecId: worldSpec.worldSpecId,
      threadId: slot.threadId,
      participants: structuredClone(slot.participants),
    });
    const envelopePlan = buildHistoricalEnvelopePlan({
      subject: { provisionalThreadId: slot.threadId, bornAt: fixture.entry.bornAt },
      worldSpec,
      windows,
      offersByWindow,
      initialRoster: roster.participants,
      placeAffordances: slot.placeAffordances,
      timeZone: slot.timeZone,
      seedDomain: `${fixture.generation.historicalEnvelopeSeedDomain}:slot:${pad(slot.slot)}`,
    });
    return Object.freeze({
      slot: slot.slot,
      threadId: slot.threadId,
      genesisId: slot.genesisId,
      originMode: slot.originMode,
      worldSpec,
      worldSpecPath: slot.worldSpecPath,
      worldSpecDigest: slot.worldSpecDigest,
      genome,
      genomePath: slot.genomePath,
      genomeDigest: slot.genomeDigest,
      roster,
      windows: structuredClone(windows),
      offersByWindow,
      envelopePlan,
      freshModelRequestDomain: fixture.generation.modelRequestDomain,
      bornAt: fixture.entry.bornAt,
      chronologyEndsAt: fixture.entry.chronologyEndsAt,
      timeZone: slot.timeZone,
    });
  });

  return Object.freeze({
    fixture,
    slots: Object.freeze(slots),
    sampling: Object.freeze({
      creativeTemperature: fixture.generation.creativeTemperature,
      mechanicalRepairTemperature: fixture.generation.mechanicalRepairTemperature,
      topP: fixture.generation.topP,
      reasoningEffort: fixture.generation.reasoningEffort,
    }),
  });
}
