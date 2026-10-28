import test from "node:test";
import assert from "node:assert/strict";

import { buildAdminInfraMonitorConfig } from "./configure-admin-infra-monitor.mjs";
import { RESOURCE_HEALTH_DEFAULT_LIMITS } from "../../infra/providers/cloudflare/resource-health.mjs";

test("Admin infra monitor secret contains only read-only analytics config and provisioned resource identities", () => {
  const config = buildAdminInfraMonitorConfig({
    operatorConfig:{
      CLOUDFLARE_ACCOUNT_ID:"account",
      FIBRE_CLOUDFLARE_ANALYTICS_TOKEN:"analytics-token",
      FIBRE_INFRA_SAMPLE_TTL_SECONDS:"1200",
      FIBRE_INFRA_D1_ROWS_READ_DAILY_WARN:"750000",
    },
    resourceState:{ resources:{ d1:[
      { binding:"PRESENTATION_CATALOG", name:"catalog-staging", id:"catalog-id" },
      { binding:"ACTIVITY_LOG", name:"activity-staging", id:"activity-id" },
    ] } },
  });
  assert.equal(config.accountId, "account");
  assert.equal(config.apiToken, "analytics-token");
  assert.equal(config.ttlSeconds, 1200);
  assert.equal(config.limits.d1RowsReadDaily, 750000);
  assert.deepEqual(config.d1Resources.map(({ binding, name, id }) => ({ binding, name, id })), [
    { binding:"PRESENTATION_CATALOG", name:"catalog-staging", id:"catalog-id" },
    { binding:"ACTIVITY_LOG", name:"activity-staging", id:"activity-id" },
  ]);
});

test("Admin monitor defaults to shared provider health limits",()=>{
  const config=buildAdminInfraMonitorConfig({
    operatorConfig:{
      CLOUDFLARE_ACCOUNT_ID:"account",
      FIBRE_CLOUDFLARE_ANALYTICS_TOKEN:"analytics-token",
    },
    resourceState:{resources:{d1:[{name:"activity",id:"d1"}]}},
  });
  assert.deepEqual(config.limits,RESOURCE_HEALTH_DEFAULT_LIMITS,
    "Admin monitor thresholds diverged from provider limits");
});

test("Admin infra monitor config requires a dedicated analytics token", () => {
  assert.throws(() => buildAdminInfraMonitorConfig({
    operatorConfig:{ CLOUDFLARE_ACCOUNT_ID:"account" },
    resourceState:{ resources:{ d1:[{ binding:"ACTIVITY_LOG", name:"activity", id:"id" }] } },
  }), /FIBRE_CLOUDFLARE_ANALYTICS_TOKEN/u);
});
