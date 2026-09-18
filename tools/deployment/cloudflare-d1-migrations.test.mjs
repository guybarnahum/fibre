import assert from "node:assert/strict";
import test from "node:test";

import { ensureCloudflareD1Migrations } from "./cloudflare-d1-migrations.mjs";

test("D1 migration runner visibly applies missing migrations once and then skips them", async () => {
  const applied = new Set();
  const files = [];
  const printed = [];
  let ledgerExists = false;

  async function runner(args) {
    if (args.includes("--command")) {
      const sql = args[args.indexOf("--command") + 1];
      if (sql.includes("SELECT migration_id")) {
        if (!ledgerExists) {
          throw Object.assign(new Error("D1_ERROR: no such table: fibre_schema_migrations: SQLITE_ERROR"), {
            stderr:"no such table: fibre_schema_migrations",
          });
        }
        return {
          stdout:JSON.stringify([{ results:[...applied].map((migration_id) => ({ migration_id })) }]),
          stderr:"",
        };
      }
      if (sql.includes("CREATE TABLE IF NOT EXISTS fibre_schema_migrations")) {
        ledgerExists = true;
        return { stdout:"[]", stderr:"" };
      }
      if (sql.includes("SELECT type,name FROM sqlite_master")) {
        return {
          stdout:JSON.stringify([{ results:[
            { type:"table", name:"fibre_activity_log" },
            { type:"table", name:"fibre_admin_entitlements" },
            { type:"table", name:"fibre_activity_thread_heads" },
            { type:"index", name:"fibre_activity_request_idx" },
            { type:"index", name:"fibre_activity_genesis_idx" },
            { type:"index", name:"fibre_activity_thread_idx" },
            { type:"index", name:"fibre_activity_service_stage_idx" },
            { type:"trigger", name:"fibre_activity_thread_head_insert" },
          ] }]),
          stderr:"",
        };
      }
      const match = /VALUES \('ACTIVITY_LOG','([^']+)'/u.exec(sql);
      if (match) applied.add(match[1]);
      return { stdout:"[]", stderr:"" };
    }
    if (args.includes("--file")) {
      files.push(args[args.indexOf("--file") + 1].split("/").at(-1));
      return { stdout:"", stderr:"" };
    }
    throw new Error(`unexpected Wrangler call: ${args.join(" ")}`);
  }

  const input = {
    repoRoot:"/repo",
    databases:[{ binding:"ACTIVITY_LOG", name:"fibre-activity-log-staging" }],
    runner,
    print:(line) => printed.push(line),
  };

  await ensureCloudflareD1Migrations(input);
  assert.deepEqual(files, [
    "0001_activity_log.sql",
    "0002_admin_entitlements.sql",
    "0003_activity_thread_heads.sql",
  ]);
  assert.ok(printed.includes("D1 APPLY  ACTIVITY_LOG 0003_activity_thread_heads.sql"));
  assert.ok(printed.includes("D1 READY  ACTIVITY_LOG -> fibre-activity-log-staging migrations=3"));

  files.length = 0;
  printed.length = 0;
  await ensureCloudflareD1Migrations(input);
  assert.deepEqual(files, [], "already-recorded migrations must not execute again");
  assert.ok(printed.includes("D1 OK     ACTIVITY_LOG 0003_activity_thread_heads.sql"));
  assert.ok(printed.includes("D1 VERIFIED ACTIVITY_LOG -> fibre-activity-log-staging"));
});

test("D1 migration dry-run is explicit without touching remote D1", async () => {
  const printed = [];
  let calls = 0;
  await ensureCloudflareD1Migrations({
    repoRoot:"/repo",
    databases:[{ binding:"ACTIVITY_LOG", name:"fibre-activity-log-staging" }],
    dryRun:true,
    async runner() {
      calls += 1;
      throw new Error("dry-run must not reach Cloudflare");
    },
    print:(line) => printed.push(line),
  });

  assert.equal(calls, 0);
  assert.ok(printed.includes("D1 PLAN   ACTIVITY_LOG 0003_activity_thread_heads.sql"));
  assert.ok(printed.includes("D1 DRY READY ACTIVITY_LOG -> fibre-activity-log-staging migrations=3"));
});
