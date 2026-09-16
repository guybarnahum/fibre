import test from "node:test";
import assert from "node:assert/strict";

import { readAdminThreadPopulation } from "./thread-population.mjs";

test("Activity discovers identities; World decides which are Threads and defines their state", async () => {
  const activityLog = {
    prepare() {
      return {
        bind() {
          return {
            async all() {
              return { results:[
                { thread_id:"thr_a", last_activity_at:"2026-09-16T03:00:00.000Z" },
                { thread_id:"thr_candidate", last_activity_at:"2026-09-16T02:30:00.000Z" },
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
      diagnosis:{
        exists:true,
        health:"healthy",
        identity:{ name:"A", sex:"female" },
        presentation:{ portraitObjectRef:"portrait_a" },
        findings:[],
      },
      reconciliation:{ state:"complete" },
    },
    thr_candidate:{
      diagnosis:{
        exists:false,
        health:"unrecoverable",
        identity:null,
        presentation:{ portraitObjectRef:"must_not_be_used" },
        findings:[{ code:"THREAD_NOT_FOUND", state:"unrecoverable" }],
      },
      reconciliation:null,
    },
    thr_b:{
      diagnosis:{
        exists:true,
        health:"migration_required",
        identity:{ name:"B", sex:"male" },
        findings:[{ code:"SCHEMA", state:"migration_required", migration:{ id:"schema_v1" } }],
      },
      reconciliation:{ state:"dead_letter" },
    },
  };

  const population = await readAdminThreadPopulation({
    activityLog,
    environment:"staging",
    resolveThreadHealth:async (threadId) => authoritative[threadId],
  });

  assert.deepEqual(population.threads.map((thread) => thread.threadId), ["thr_a", "thr_candidate", "thr_b"], "Activity must define observed membership");
  assert.equal(population.threads[0].identity.sex, "female", "World must define Thread facts");
  assert.equal(population.threads[0].portraitUrl, "/api/thread-assets/portrait_a", "Presentation may supply public portrait media without becoming identity authority");
  assert.equal(population.threads[1].admitted, false, "missing World identity must stay Activity-only");
  assert.equal(population.threads[1].portraitUrl, null, "Activity-only identifiers must not acquire projected personhood");
  assert.deepEqual(population.summary, {
    observed:3,
    total:2,
    activityOnly:1,
    female:1,
    male:1,
    unknownSex:0,
    healthy:1,
    attention:1,
    deadLetter:1,
    migrationsAvailable:1,
  });
});
