import assert from "node:assert/strict";
import test from "node:test";

import {
  attachAdminMigrationSummary,
  optionalAdminThreadMigration,
  optionalAdminThreadMigrations,
  readAdminThreadMigration,
  readAdminThreadMigrations,
} from "./thread-migrations.mjs";

test("Threads migration enrichment is fail-open when World summary is unavailable", async () => {
  const worldKernel={
    async fetch(){ return Response.json({ error:{ code:"NOT_FOUND" } }, { status:404 }); },
  };
  assert.deepEqual(
    await optionalAdminThreadMigrations({ worldKernel, privateToken:"token" }),
    [],
  );
  assert.equal(
    await optionalAdminThreadMigration({ worldKernel, privateToken:"token", threadId:"thr_1" }),
    null,
  );
});

test("migration summary marks only affected Thread as migration_required", async () => {
  const worldKernel={
    async fetch(request){
      const path=new URL(request.url).pathname;
      if(path==="/internal/thread-migrations"){
        return Response.json({
          contract:"fibre-thread-migration-summary-v0.1",
          threads:[{
            threadId:"thr_morocco",
            domains:["appearance"],
            reasons:{ appearance:["calibration_dependencies_changed"] },
          }],
        });
      }
      if(path==="/internal/thread-migrations/thr_morocco"){
        return Response.json({
          contract:"fibre-thread-migration-summary-entry-v0.1",
          migration:{
            threadId:"thr_morocco",
            domains:["appearance"],
            reasons:{ appearance:["calibration_dependencies_changed"] },
          },
        });
      }
      return Response.json({ error:{ code:"THREAD_NOT_FOUND" } }, { status:404 });
    },
  };

  const list=await readAdminThreadMigrations({ worldKernel, privateToken:"token" });
  assert.equal(list.length,1);
  const entry=await readAdminThreadMigration({ worldKernel, privateToken:"token", threadId:"thr_morocco" });
  assert.equal(entry.threadId,"thr_morocco");

  const healthy={ threadId:"thr_korea", health:"healthy", findings:[] };
  assert.equal(attachAdminMigrationSummary(healthy,null).health,"healthy");

  const affected=attachAdminMigrationSummary(
    { threadId:"thr_morocco", health:"healthy", findings:[] },
    entry,
  );
  assert.equal(affected.health,"migration_required");
  assert.deepEqual(affected.migrationDomains,["appearance"]);
});
