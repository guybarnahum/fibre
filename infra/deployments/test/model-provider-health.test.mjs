import assert from "node:assert/strict";
import test from "node:test";

import { modelProviderChecks, withModelProviders } from "../model-provider-health.mjs";
import { criticalInfrastructureState } from "../../../apps/admin-dashboard/infra-critical-state.mjs";

const reasoning = (provider, model) => ({ kind:"ai.reasoning", provider, config:{ model }, secrets:{ apiKey:"KEY" } });
const failing = (code) => () => ({ invoke:async () => { throw Object.assign(new Error(code), { code }); } });

test("infrastructure health probes the model providers a service is configured with, once each, whatever they are", async () => {
  const probed = [];
  const select = (value) => ({ invoke:async () => { probed.push(`${value.provider} ${value.config.model}`); return {}; } });
  const checks = await modelProviderChecks({ service:"world-kernel", select, environment:{}, integrations:{
    livedNow:reasoning("openai", "health-a"), encounter:reasoning("openai", "health-a"),
    creative:reasoning("google", "health-b"), image:{ kind:"ai.image", provider:"openai", config:{ model:"img" } },
  } });
  assert.deepEqual(probed.sort(), ["google health-b", "openai health-a"], "a configured provider was not probed, or probed twice");
  assert.deepEqual(checks.find((check) => check.provider === "openai").ports, ["livedNow", "encounter"]);
  assert.ok(checks.every((check) => check.kind === "model_provider" && check.level === "normal"));
  await modelProviderChecks({ service:"world-kernel", select, environment:{}, integrations:{ livedNow:reasoning("openai", "health-a") } });
  assert.equal(probed.length, 2, "the provider was probed again within the quarter hour");
});

test("an unpaid provider is critical in infrastructure health, yet the World's storage and the dashboard stay usable", async () => {
  const [unpaid] = await modelProviderChecks({ service:"world-kernel", environment:{},
    select:failing("MODEL_BILLING_QUOTA_EXHAUSTED"), integrations:{ livedNow:reasoning("openai", "health-c") } });
  const [busy] = await modelProviderChecks({ service:"world-kernel", environment:{},
    select:failing("MODEL_HTTP_ERROR"), integrations:{ livedNow:reasoning("openai", "health-d") } });
  assert.equal(unpaid.level, "critical");
  assert.equal(unpaid.error.code, "MODEL_BILLING_QUOTA_EXHAUSTED");
  assert.equal(busy.level, "elevated", "a passing provider error was reported as needing the operator");
  const health = withModelProviders({ level:"normal", checks:[{ kind:"storage", level:"normal" }] }, [unpaid]);
  assert.equal(health.level, "critical");
  assert.equal(criticalInfrastructureState({ sample:{ level:"critical", observedAt:"2026-11-14T16:00:00.000Z",
    checks:health.checks.map((check) => ({ ...check, service:"world-kernel" })) } }), null,
    "a model provider locked the dashboard as if the World were down");
});
