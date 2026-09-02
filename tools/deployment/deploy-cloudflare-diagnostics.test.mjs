import assert from "node:assert/strict";
import test from "node:test";

import { WranglerCommandError } from "./cloudflare-operator.mjs";
import { formatCloudflareDeploymentFailure } from "./deploy-cloudflare-evidence.mjs";

test("cloud deployment diagnostics surface the failing service and Cloudflare error without Wrangler boilerplate", () => {
  const error = new WranglerCommandError([
    "deploy",
    "--config", "/repo/.fibre/cloudflare/staging/wrangler/asset-generator.jsonc",
    "--experimental-provision=false",
    "--experimental-auto-create=false",
  ], {
    exitCode: 1,
    stdout: "\n ⛅️ wrangler 4.126.0 (update available 4.128.0)\n────────────────────\n",
    stderr: [
      "\u001b[31m✘ [ERROR] A request to the Cloudflare API (/accounts/acct/workers/scripts/fibre-asset-generator-staging) failed.\u001b[0m",
      "Binding target does not exist. [code: 10007]",
      "If you think this is a bug, please open an issue at: https://github.com/cloudflare/workers-sdk/issues/new/choose",
      "🪵 Logs were written to /tmp/wrangler.log",
    ].join("\n"),
  });

  const message = formatCloudflareDeploymentFailure(error, { environment: "staging" });
  assert.match(message, /failed for staging while deploying asset-generator/u);
  assert.match(message, /Cloudflare API/u);
  assert.match(message, /code: 10007/u);
  assert.match(message, /Retry: npm run cloud:deploy -- --env staging/u);
  assert.doesNotMatch(message, /workers-sdk\/issues/u);
  assert.doesNotMatch(message, /Logs were written/u);
  assert.doesNotMatch(message, /wrangler 4\.126\.0/u);
});

test("cloud deployment diagnostics retain useful non-Wrangler failures", () => {
  const message = formatCloudflareDeploymentFailure(
    new Error("Cloud deployment requires a clean Git working tree"),
    { environment: "staging" },
  );
  assert.match(message, /Cloud deployment requires a clean Git working tree/u);
  assert.doesNotMatch(message, /while deploying/u);
});

test("cloud deployment diagnostics retain nested health failure causes", () => {
  const dns = new Error("getaddrinfo ENOTFOUND api.staging.insidefibre.com");
  const fetch = new TypeError("fetch failed", { cause: dns });
  const health = new Error("thread-presentation did not become healthy after deployment", { cause: fetch });

  const message = formatCloudflareDeploymentFailure(health, { environment: "staging" });
  assert.match(message, /thread-presentation did not become healthy after deployment/u);
  assert.match(message, /Caused by: fetch failed/u);
  assert.match(message, /Caused by: getaddrinfo ENOTFOUND api\.staging\.insidefibre\.com/u);
});
