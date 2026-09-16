import test from "node:test";
import assert from "node:assert/strict";

import { readAdminThreadPopulation } from "./thread-population.mjs";

test("Thread population uses Activity for membership and World for person state", async () => {
  const activityLog = {
    prepare() {
      return {
        bind() {
          return {
            async all() {
              return { results:[
                { thread_id:"thr_a", last_activity_at:"2026-09-16T03:00:00.000Z" },
                { thread_id:"thr_b", last_activity_at:"2026-09-16T02:00:00.000Z" },
              ] };
            },
          };
        },
      };
    },
  };
  const authoritative = {
    thr_a:{
      diagnosis:{ health:"healthy", identity:{ name:"A", sex:"female" }, findings:[] },
      reconciliation:{ state:"complete" },
    },
    thr_b:{
      diagnosis:{
        health:"migration_required",
        identity:{ name:"B", sex:"male" },
        findings:[{ code:"LEGACY", state:"migration_required", migration:{ id:"legacy_v1" } }],
      },
      reconciliation:{ state:"dead_letter" },
    },
  };

  const population = await readAdminThreadPopulation({
    activityLog,
    environment:"staging",
    resolveThreadHealth:async (threadId) => authoritative[threadId],
  });

  assert.deepEqual(population.threads.map((thread) => thread.threadId), ["thr_a", "thr_b"], "Activity must define population membership");
  assert.equal(population.threads[0].identity.sex, "female", "World must define Thread facts");
  assert.deepEqual(population.summary, {
    total:2,
    female:1,
    male:1,
    unknownSex:0,
    healthy:1,
    attention:1,
    deadLetter:1,
    migrationsAvailable:1,
  });
});
