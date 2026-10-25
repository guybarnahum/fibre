import test from "node:test";
import assert from "node:assert/strict";
import {criticalInfrastructureState} from "./infra-critical-state.mjs";

const observedAt="2026-10-25T22:10:00.000Z";
const check=(service,code,detail="Provider operation failed")=>({
  kind:"service",level:"critical",service,
  error:{code,detail},
});
const critical=(checks,at=observedAt)=>({sample:{
  level:"critical",observedAt:at,checks,
}});

test("Cloudflare daily exhaustion has a classified reason without a hardcoded account limit",()=>{
  const state=criticalInfrastructureState(critical([
    check("world-kernel","DURABLE_OBJECT_ROWS_READ_LIMIT",
      "Exceeded allowed rows read in Durable Objects free tier."),
  ]),Date.parse("2026-10-25T22:11:00.000Z"));
  assert.equal(state?.code,"DURABLE_OBJECT_ROWS_READ_LIMIT");
  assert.equal(state?.reason,"Durable Objects daily read quota exhausted.");
  assert.equal(state?.resetAt,"2026-10-26T00:00:00.000Z");
  assert.ok(!/5 million|5,000,000/u.test(state.reason),
    "outage copy silently assumed the account's quota");
  const later=criticalInfrastructureState(critical([
    check("world-kernel","DURABLE_OBJECT_ROWS_READ_LIMIT"),
  ]),Date.parse("2026-10-26T01:00:00.000Z"));
  assert.equal(later.resetAt,"2026-10-26T00:00:00.000Z",
    "old outage acquired an invented second reset day");
});

test("one ancillary failure or an analytics warning must not stop the entire dashboard",()=>{
  assert.equal(criticalInfrastructureState(critical([
    check("asset-generator","SERVICE_UNAVAILABLE"),
  ])),null,"isolated ancillary outage blocked all Admin functionality");
  assert.equal(criticalInfrastructureState({sample:{level:"critical",checks:[{
    kind:"durable_object_rows_read",level:"critical",value:5_000_001,limit:5_000_000,
  }]}}),null,"measured usage alone was confused with denied operations");
  assert.equal(criticalInfrastructureState({error:{message:"monitor unavailable"}}),null,
    "monitor failure masqueraded as a known infrastructure diagnosis");
});

test("core or multiple infrastructure failures stop Admin without inventing free-tier recovery",()=>{
  const broken=criticalInfrastructureState(critical([
    check("world-kernel","SERVICE_UNAVAILABLE","World health probe failed"),
  ]));
  assert.equal(broken?.reason,"World health probe failed");
  assert.equal(broken?.resetAt,null,
    "unknown provider failure was assigned a free-tier reset");
  assert.ok(criticalInfrastructureState(critical([
    check("birth-center","SERVICE_UNAVAILABLE"),
    check("thread-presentation","SERVICE_UNAVAILABLE"),
  ])),"multiple independent failures did not stop nonfunctional Admin");
  assert.equal(criticalInfrastructureState({sample:{level:"normal",checks:[]}}),null,
    "actual recovery was still blocked");
});
