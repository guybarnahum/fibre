import assert from "node:assert/strict";
import test from "node:test";
import {
  readWorldSchemaStatus,worldSchemaStatusError,
  deferAlarmForSchemaInstall,resumeAlarmAfterSchemaInstall,
} from "../schema-lifecycle.mjs";

test("schema installation never strands a World alarm",async()=>{
  const now=Date.parse("2026-10-26T17:00:00.000Z");
  let alarm=null;
  const storage={
    async getAlarm(){return alarm;},
    async setAlarm(at){alarm=at;},
  };
  const missing=readWorldSchemaStatus(()=>null,"revision");
  assert.equal(missing.ready,false,"missing schema was mistaken for installed");
  await deferAlarmForSchemaInstall(storage,now);
  assert.equal(alarm,now+30_000,
    "an alarm before installation left the World unscheduled");

  // An alarm consumed during installation must be made due immediately.
  alarm=null;
  const installed=readWorldSchemaStatus(()=>"revision","revision");
  assert.equal(installed.ready,true,"installed World was not recognized");
  await resumeAlarmAfterSchemaInstall(storage,now);
  assert.equal(alarm,now,"installation did not wake a stranded World");

  alarm=now-61_000;
  await resumeAlarmAfterSchemaInstall(storage,now);
  assert.equal(alarm,now,"installation retained a stale alarm");

  alarm=now+30_000;
  await resumeAlarmAfterSchemaInstall(storage,now);
  assert.equal(alarm,now+30_000,"installation disturbed a pending alarm");
});

test("World schema unavailability preserves Cloudflare quota diagnosis",()=>{
  const expected="revision";
  const quota=readWorldSchemaStatus(()=>{
    throw new Error("Exceeded allowed rows read in Durable Objects free tier.");
  },expected);
  assert.equal(quota.ready,false);
  assert.equal(quota.unavailable?.code,"DURABLE_OBJECT_ROWS_READ_LIMIT",
    "schema stamp outage was misclassified as missing schema");
  assert.equal(worldSchemaStatusError(quota).code,"DURABLE_OBJECT_ROWS_READ_LIMIT",
    "World request hid the storage quota failure");

  const mismatched=readWorldSchemaStatus(()=>"previous-revision",expected);
  assert.equal(mismatched.ready,false);
  assert.equal(mismatched.installedGitSha,"previous-revision");
  assert.equal(worldSchemaStatusError(mismatched).code,"WORLD_SCHEMA_NOT_INSTALLED",
    "schema revision mismatch was not distinguished from unavailable storage");
});
