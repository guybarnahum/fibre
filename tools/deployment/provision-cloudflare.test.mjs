import test from "node:test";
import assert from "node:assert/strict";

import { formatCloudflareProvisionFailure } from "./provision-cloudflare.mjs";

function wranglerFailure({ message = "Wrangler command failed (1): d1 list --json", stdout = "", stderr = "" } = {}) {
  return Object.assign(new Error(message), { stdout, stderr });
}

test("Cloudflare provisioning reports an invalid API token without a Wrangler stack", () => {
  const error = wranglerFailure({
    stderr: "Authentication error [code: 10000]\nInvalid access token [code: 9109]",
  });
  assert.equal(
    formatCloudflareProvisionFailure(error, { environment: "staging" }),
    "Cloudflare provisioning failed for staging: CLOUDFLARE_API_TOKEN is invalid or expired.\nUpdate CLOUDFLARE_API_TOKEN in .env, then rerun: npm run cloud:provision -- --env staging",
  );
});

test("Cloudflare provisioning reports a missing API token with the exact recovery command", () => {
  const error = wranglerFailure({
    stderr: "In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work.",
  });
  assert.equal(
    formatCloudflareProvisionFailure(error, { environment: "staging" }),
    "Cloudflare provisioning failed for staging: CLOUDFLARE_API_TOKEN is missing.\nAdd CLOUDFLARE_API_TOKEN to .env, then rerun: npm run cloud:provision -- --env staging",
  );
});

test("Cloudflare provisioning distinguishes resource authorization from an invalid token", () => {
  const error = wranglerFailure({ stderr: "Authentication error [code: 10000]" });
  assert.equal(
    formatCloudflareProvisionFailure(error, { environment: "staging" }),
    "Cloudflare provisioning failed for staging: the API token was rejected for the requested Cloudflare resources.\nVerify the token permissions and account scope, then rerun: npm run cloud:provision -- --env staging",
  );
});
