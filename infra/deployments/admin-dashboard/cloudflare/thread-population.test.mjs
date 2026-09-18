import test from "node:test";
import assert from "node:assert/strict";

import { readAdminThreadPopulation } from "./thread-population.mjs";

test("World Registry defines admitted population while Activity remains observational", async () => {
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
  const registry = [
    {
      threadId:"thr_a",
      fibreIdentityNumber:"FIN-A",
      displayName:"A",
      sex:"female",
      status:"active",
      originOrientation:"original",
      birthDate:"2004-03-18",
      birthPlace:"Valparaíso, Chile",
      culture:["Valparaíso formative context"],
      languages:["Spanish", "English"],
      raisedAs:{ culturalContext:"Chilean coastal household" },
      version:9,
      stateHash:"sha256:a",
      updatedAt:"2026-09-17T13:00:00Z",
      reconciliation:{ state:"pending", lastError:null, updatedAt:"2026-09-18T17:20:54.081Z" },
    },
    {
      threadId:"thr_b",
      fibreIdentityNumber:"FIN-B",
      displayName:"B",
      sex:"male",
      status:"active",
      originOrientation:"original",
      birthDate:null,
      birthPlace:null,
      culture:[],
      languages:["English"],
      raisedAs:null,
      version:4,
      stateHash:"sha256:b",
      updatedAt:"2026-09-17T12:00:00Z",
    },
  ];

  const population = await readAdminThreadPopulation({
    activityLog,
    environment:"staging",
    readRegistry:async (limit) => {
      assert.ok(limit > 0 && limit <= 200, "population must use a bounded World Registry read");
      return registry;
    },
  });

  assert.deepEqual(population.threads.map((thread) => thread.threadId), ["thr_a", "thr_b"]);
  assert.deepEqual(population.stillborn.map((thread) => thread.threadId), ["thr_candidate"]);
  assert.equal(population.threads[0].admitted, true, "World Registry membership must define admitted Threads");
  assert.equal(population.threads[0].lastActivityAt, "2026-09-16T03:00:00.000Z", "Activity may annotate lived observation without becoming authority");
  assert.deepEqual(population.threads[0].identity.culture, ["Valparaíso formative context"]);
  assert.deepEqual(population.threads[0].identity.raisedAs, { culturalContext:"Chilean coastal household" });
  assert.equal(population.threads[0].reconciliation.state, "pending", "World reconciliation state must remain actionable in Threads");
  assert.equal(population.threads[0].findings.find((finding) => finding.code === "NAME").identityAction.id, "change_name");
  assert.equal(population.threads[0].health, "healthy", "healthy identity actions must not degrade health");
  assert.equal(population.threads[1].findings.find((finding) => finding.code === "BIRTH_DATE_MISSING").identityAction.id, "set_birth_date");
  assert.equal(population.threads[1].health, "operator_decision_required", "missing canonical birth date must require explicit input");
  assert.equal(population.stillborn[0].admitted, false, "Stillborn Activity identifiers must remain explicitly unadmitted");
  assert.equal(population.stillborn[0].health, "unrecoverable");
  assert.equal(population.stillborn[0].identity, null, "Stillborn identifiers must not acquire projected personhood");
  assert.deepEqual(population.summary, {
    observed:3,
    total:2,
    activityOnly:1,
    female:1,
    male:1,
    unknownSex:0,
    healthy:1,
    attention:1,
    deadLetter:0,
    migrationsAvailable:0,
    stillborn:1,
  });
});
