import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { URGE_FAMILIES, URGE_LIBRARIES } from "#core/src/inherited-urges.mjs";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { evaluateIntrinsicRegulation } from "#core/src/intrinsic-regulation.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { applyEventToThread } from "../src/persistence-domain.mjs";
import { buildDeNovoSymbolicGenome } from "../src/symbolic-genome-domain.mjs";
import { SymbolicGenomeStore } from "../src/symbolic-genome-store.mjs";
import { ThreadGenomeExpressionStore } from "../src/thread-genome-expression-store.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));
const at = "2026-11-10T12:00:00.000Z";
const v3Projection = URGE_LIBRARIES["3"].families.map((family) => {
  const variant = family.variants[3];
  return { family:family.family, kind:family.kind, orientation:variant.orientation, positions:{ ...variant.positions } };
});

function withWorld(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genome-expression-"));
  const storage = localWorldStateStorage(join(directory, "world.sqlite"));
  const world = openWorldStore(storage);
  const genomes = new SymbolicGenomeStore(storage);
  const expression = new ThreadGenomeExpressionStore(storage);
  const born = (threadId, urgeProjection = null) => {
    const source = structuredClone(fixture);
    source.threadId = threadId;
    if (urgeProjection !== null) source.genome.urgeProjection = urgeProjection;
    const thread = world.seedThread(source).thread;
    genomes.recordGenome(buildDeNovoSymbolicGenome({ threadId, genesisId:`genesis_${threadId}`,
      values:[`a quiet way of noticing ${threadId}`, "a habit of returning to unfinished things"], createdAt:at }));
    return { thread };
  };
  try { return run({ world, genomes, expression, born }); }
  finally {
    expression.close();
    genomes.close();
    world.close();
    rmSync(directory, { recursive:true, force:true });
  }
}

test("late expression gives each Thread its never-expressed families once, from its own genome, rewriting nothing", () => {
  withWorld(({ world, genomes, expression, born }) => {
    const legacy = born("thr_legacy_body");
    const v3 = born("thr_v3_body", v3Projection);
    const genomeBefore = genomes.listThreadGenomes(v3.thread.threadId);
    const historyBefore = world.listEvents(v3.thread.threadId);
    const planned = expression.plan();

    const legacyResult = expression.express(legacy.thread.threadId, { at });
    const v3Result = expression.express(v3.thread.threadId, { at });
    assert.deepEqual(legacyResult.expressed.map((item) => item.family), URGE_FAMILIES.map((family) => family.family),
      "a Body with no urge genes must express every family");
    assert.deepEqual(v3Result.expressed.map((item) => item.family), ["social_energy", "trust", "standing", "provocation", "remorse"],
      "only families never expressed may be drawn");
    assert.deepEqual(planned.find((entry) => entry.threadId === v3.thread.threadId).receives, v3Result.expressed,
      "the draw is not determined by the genome alone");

    const body = world.getThread(v3.thread.threadId).genome.urgeProjection;
    assert.deepEqual(body.slice(0, 13), v3Projection, "an inherited locus was redrawn");
    assert.equal(body.length, 18);
    assert.deepEqual(genomes.listThreadGenomes(v3.thread.threadId), genomeBefore, "the genome or its digest was edited");
    assert.deepEqual(world.listEvents(v3.thread.threadId).slice(0, historyBefore.length), historyBefore, "history was rewritten");
    assert.deepEqual(world.replayThread(v3.thread.threadId), world.getThread(v3.thread.threadId), "expression did not survive replay");

    const again = expression.express(v3.thread.threadId, { at:"2026-11-11T12:00:00.000Z" });
    assert.equal(again.eventId, null, "a second run expressed again");
    assert.equal(world.listEvents(v3.thread.threadId).length, historyBefore.length + 1);

    const event = world.listEvents(v3.thread.threadId).at(-1);
    const chosen = { ...event, payload:{ ...event.payload, expressed:event.payload.expressed.map((item) => item.family !== "trust" ? item
      : { ...item, variantId:item.variantId === "trust_01" ? "trust_02" : "trust_01" }) } };
    assert.throws(() => applyEventToThread(v3.thread, chosen), /draw from its genome digest/,
      "replay admitted a locus not drawn from the genome");
  });
});

test("a position a newer library adds reaches a Body from its own variant, once, and nothing else changes", () => {
  withWorld(({ world, expression, born }) => {
    const v5Projection = URGE_LIBRARIES["5"].families.map((family) => {
      const variant = family.variants[3];
      return { family:family.family, kind:family.kind, orientation:variant.orientation, positions:{ ...variant.positions } };
    });
    const v5 = born("thr_v5_body", v5Projection);
    const result = expression.express(v5.thread.threadId, { at });
    assert.deepEqual(result.expressed, [], "a family already expressed was drawn again");
    assert.deepEqual(result.completed, [{ family:"standing", variantId:"standing_04", positions:["stubbornness"] }],
      "the Body did not receive the new position from its own variant");
    const body = world.getThread(v5.thread.threadId).genome.urgeProjection;
    const standing = body.find((locus) => locus.family === "standing");
    assert.deepEqual(standing, { ...v5Projection.find((locus) => locus.family === "standing"),
      positions:{ ...v5Projection.find((locus) => locus.family === "standing").positions,
        stubbornness:URGE_FAMILIES.find((family) => family.family === "standing").variants[3].positions.stubbornness } },
      "an existing position changed");
    assert.deepEqual(body.filter((locus) => locus.family !== "standing"), v5Projection.filter((locus) => locus.family !== "standing"));
    assert.deepEqual(world.replayThread(v5.thread.threadId), world.getThread(v5.thread.threadId), "completion did not survive replay");
    assert.equal(expression.express(v5.thread.threadId, { at:"2026-11-14T12:00:00.000Z" }).eventId, null, "a second run completed again");
  });
});

test("with inherited spread at zero, expressed loci act as the species default", () => {
  const percept = { asOf:at, evidenceRefs:["admitted_contact_interval"],
    contact:{ observedUnmetHours:24, evidenceRefs:["admitted_contact_interval"] } };
  withWorld(({ world, expression, born }) => {
    const { thread } = born("thr_ablation_body");
    expression.express(thread.threadId, { at });
    const expressed = world.getThread(thread.threadId).genome.urgeProjection;
    const body = (inheritedSpread, urgeProjection) => evaluateIntrinsicRegulation({ perceptFrame:percept,
      runtimeBaselines:{ regulatorSocialSensitivity:1.15 }, urgeProjection,
      organismPolicy:{ ...DEFAULT_ORGANISM_POLICY, inheritedSpread } });
    assert.deepEqual(body(0, expressed), body(0, null), "genome-off left expressed loci acting");
    assert.notDeepEqual(body(1, expressed), body(1, null), "expressed loci do not reach the Body");
  });
});
