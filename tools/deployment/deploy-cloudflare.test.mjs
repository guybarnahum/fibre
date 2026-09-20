import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  CLOUDFLARE_DEPLOY_ORDER,
  assertSignerHealth,
  createWranglerDeploymentClient,
  deployCloudflareStack,
  healthBaseUrlForDeployment,
  missingRequiredSecretNames,
} from "./deploy-cloudflare.mjs";
import { CLOUDFLARE_SERVICE_CONFIGS, parseJsonc } from "./cloudflare-operator.mjs";

const sourceRoot = resolve(new URL("../..", import.meta.url).pathname);

async function fixtureRepo() {
  const root = await mkdtemp(resolve(tmpdir(), "fibre-cloud-deploy-"));
  const wranglerConfigs = {};
  for (const [serviceId, path] of Object.entries(CLOUDFLARE_SERVICE_CONFIGS)) {
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true });
    const source = await readFile(resolve(sourceRoot, path), "utf8");
    await writeFile(target, source);

    const resolved = parseJsonc(source, path);
    resolved.name = `${resolved.name}-staging`;
    resolved.vars ??= {};
    for (const binding of resolved.services ?? []) binding.service = `${binding.service}-staging`;
    if (serviceId === "thread-presentation") {
      resolved.vars.VIEWER_ORIGIN = "https://staging.insidefibre.com";
      resolved.routes[0].pattern = "api.staging.insidefibre.com";
    }
    const resolvedPath = `.fibre/cloudflare/staging/wrangler/${serviceId}.jsonc`;
    const resolvedTarget = resolve(root, resolvedPath);
    await mkdir(dirname(resolvedTarget), { recursive: true });
    await writeFile(resolvedTarget, `${JSON.stringify(resolved, null, 2)}\n`);
    wranglerConfigs[serviceId] = resolvedPath;
  }
  return {
    root,
    state: {
      environment: "staging",
      resources: {
        deployManaged: {
          workers: Object.fromEntries(CLOUDFLARE_DEPLOY_ORDER.map((serviceId) => [serviceId, `fibre-${serviceId}-staging`])),
        },
      },
      wranglerConfigs,
    },
  };
}

function allSecrets() {
  return new Set([
    "OPENAI_API_KEY", "BFL_API_KEY", "C2PA_SIGNER_TOKEN", "FIBRE_PRIVATE_TOKEN",
    "C2PA_SIGNER_CERT_BASE64", "C2PA_SIGNER_KEY_BASE64",
    "FIA_ISSUER_JWK", "FIA_CREDENTIAL_KEY_BASE64",
  ]);
}

test("Slice F deployment accepts services only after shallow and durable state health", async () => {
  const { root, state } = await fixtureRepo();
  const calls = [];
  let birthStateAttempts = 0;
  const client = {
    async assertAuthenticated() { calls.push("auth"); return { ok: true }; },
    async assertContainersAvailable() { calls.push("containers"); return { ok:true }; },
    async listSecretNames(workerName) { calls.push(`secrets:${workerName}`); return allSecrets(); },
    async checkSignerHealth(input) {
      calls.push(`signer:${input.baseUrl}`);
      assert.equal(input.signerId, "fibre-c2pa-self-v1");
      assert.equal(input.trustPolicy, "fibre_signature_only");
      return { ok: true };
    },
    async deployService({ serviceId }) {
      calls.push(`deploy:${serviceId}`);
      return { output: `Published\nhttps://${serviceId}.account.workers.dev` };
    },
    async checkServiceHealth({ serviceId, baseUrl }) {
      calls.push(`health:${serviceId}:${baseUrl}`);
      return { ok: true, service: serviceId, stateChecked: false };
    },
    async checkStateHealth({ serviceId, baseUrl }) {
      calls.push(`state-health:${serviceId}:${baseUrl}`);
      if (serviceId === "birth-center" && birthStateAttempts++ === 0) {
        throw new Error("Durable Object still initializing");
      }
      return { ok: true, service: serviceId, stateChecked: true };
    },
    async checkPresentationAcceptance({ baseUrl }) { calls.push(`accept:${baseUrl}`); return { threads: [] }; },
    async checkViewer({ origin }) { calls.push(`viewer:${origin}`); return { ok: true }; },
  };

  const result = await deployCloudflareStack({
    repoRoot: root,
    environment: "staging",
    client,
    validateRepository: async () => calls.push("validate"),
    provision: async () => { calls.push("provision"); return state; },
    wait: async () => {},
  });

  assert.deepEqual(result.deployments.map((item) => item.serviceId), CLOUDFLARE_DEPLOY_ORDER);
  assert.equal(result.deployments.find((item) => item.serviceId === "thread-presentation").baseUrl, "https://api.staging.insidefibre.com");
  assert.equal(result.externalViewerOrigin, "https://staging.insidefibre.com");
  assert.deepEqual(calls.filter((call) => call.startsWith("deploy:")), [
    "deploy:content-credential-signer",
    "deploy:asset-generator",
    "deploy:thread-presentation",
    "deploy:world-kernel",
    "deploy:fibre-identity-authority",
    "deploy:birth-center",
  ]);
  assert.deepEqual(calls.filter((call) => call.startsWith("state-health:")), [
    "state-health:world-kernel:https://world-kernel.account.workers.dev",
    "state-health:fibre-identity-authority:https://fibre-identity-authority.account.workers.dev",
    "state-health:birth-center:https://birth-center.account.workers.dev",
    "state-health:birth-center:https://birth-center.account.workers.dev",
  ]);
  assert.equal(result.deployments.find((item) => item.serviceId === "world-kernel").stateHealth.stateChecked, true);
  assert.equal(result.deployments.find((item) => item.serviceId === "fibre-identity-authority").stateHealth.stateChecked, true);
  assert.equal(result.deployments.find((item) => item.serviceId === "birth-center").stateHealth.stateChecked, true);
  assert.equal(result.deployments.find((item) => item.serviceId === "asset-generator").stateHealth, null);
  assert.deepEqual(calls.slice(0, 4), ["validate", "auth", "containers", "provision"]);
  assert.ok(calls.indexOf("deploy:content-credential-signer") > calls.findLastIndex((call) => call.startsWith("secrets:")));
  assert.ok(calls.indexOf("signer:https://content-credential-signer.account.workers.dev") > calls.indexOf("deploy:content-credential-signer"));
  assert.ok(calls.indexOf("deploy:asset-generator") > calls.indexOf("signer:https://content-credential-signer.account.workers.dev"));
  assert.equal(calls.at(-2), "accept:https://api.staging.insidefibre.com");
  assert.equal(calls.at(-1), "viewer:https://staging.insidefibre.com");
});

test("no-C2PA deployment skips Containers and deploys FIA without the signer binding", async () => {
  const { root, state } = await fixtureRepo();
  const calls = [];
  const client = {
    async assertAuthenticated() { calls.push("auth"); },
    async listSecretNames(workerName) {
      calls.push(`secrets:${workerName}`);
      const present = allSecrets();
      if (workerName === "fibre-identity-authority-staging") present.delete("C2PA_SIGNER_TOKEN");
      return present;
    },
    async deployService({ serviceId, resolvedConfig }) {
      calls.push(`deploy:${serviceId}`);
      if (serviceId === "fibre-identity-authority") {
        assert.equal(resolvedConfig.vars.FIA_CONTENT_CREDENTIAL_MODE, "native");
        assert.equal(resolvedConfig.services.some((binding) => binding.binding === "CONTENT_CREDENTIAL_SIGNER"), false);
        assert.equal(Object.hasOwn(resolvedConfig.vars, "C2PA_SIGNER_URL"), false);
      }
      return { output:`Published\nhttps://${serviceId}.account.workers.dev` };
    },
    async checkServiceHealth({ serviceId }) { return { ok:true, service:serviceId }; },
    async checkStateHealth({ serviceId }) { return { ok:true, service:serviceId, stateChecked:true }; },
    async checkPresentationAcceptance() { return { threads:[] }; },
    async checkViewer() { return { ok:true }; },
  };

  const result = await deployCloudflareStack({
    repoRoot:root,
    environment:"staging",
    noC2pa:true,
    client,
    validateRepository:async () => calls.push("validate"),
    provision:async () => { calls.push("provision"); return state; },
    wait:async () => {},
  });

  assert.equal(result.contentCredentialMode, "native");
  assert.deepEqual(result.deployments.map((item) => item.serviceId), [
    "asset-generator",
    "thread-presentation",
    "world-kernel",
    "fibre-identity-authority",
    "birth-center",
  ]);
  assert.equal(calls.some((call) => call.includes("content-credential-signer")), false);
  assert.deepEqual(calls.slice(0, 3), ["validate", "auth", "provision"]);
});

test("Slice F fails before deploy when Fibre signer credentials are incomplete", async () => {
  const { root, state } = await fixtureRepo();
  let signerCalls = 0;
  let deployCalls = 0;
  const client = {
    async assertAuthenticated() {},
    async assertContainersAvailable() {},
    async listSecretNames(workerName) {
      if (workerName === "fibre-content-credential-signer-staging") {
        const present = allSecrets();
        present.delete("C2PA_SIGNER_CERT_BASE64");
        return present;
      }
      return allSecrets();
    },
    async checkSignerHealth() { signerCalls += 1; },
    async deployService() { deployCalls += 1; },
  };
  await assert.rejects(deployCloudflareStack({
    repoRoot: root,
    environment: "staging",
    client,
    validateRepository: async () => {},
    provision: async () => state,
  }), /content-credential-signer is missing required Cloudflare secrets: C2PA_SIGNER_CERT_BASE64/);
  assert.equal(signerCalls, 0);
  assert.equal(deployCalls, 0);
});

test("Slice F signer health requires the configured signer identity and policy", () => {
  assert.deepEqual(assertSignerHealth({
    ok: true,
    service: "content-credential-signer",
    format: "c2pa",
    signerId: "fibre-c2pa-self-v1",
    trustPolicy: "fibre_signature_only",
  }, {
    signerId: "fibre-c2pa-self-v1",
    trustPolicy: "fibre_signature_only",
  }).ok, true);
  assert.throws(() => assertSignerHealth({
    ok: true,
    service: "content-credential-signer",
    format: "c2pa",
    signerId: "other",
    trustPolicy: "fibre_signature_only",
  }, {
    signerId: "fibre-c2pa-self-v1",
    trustPolicy: "fibre_signature_only",
  }), /unexpected signerId/);
});

test("Slice F Wrangler client verifies secret names, shallow health and deep state health", async () => {
  const calls = [];
  const runner = async (args) => {
    calls.push(args);
    if (args[0] === "whoami") return { stdout: '{"accounts":[{"id":"acct"}]}', stderr: "", exitCode: 0 };
    if (args[0] === "containers") return { stdout: "[]", stderr: "", exitCode: 0 };
    if (args[0] === "secret") return { stdout: '[{"name":"FIBRE_PRIVATE_TOKEN","type":"secret_text"}]', stderr: "", exitCode: 0 };
    if (args[0] === "deploy") return { stdout: "https://worker.account.workers.dev", stderr: "", exitCode: 0 };
    throw new Error(`unexpected command ${args.join(" ")}`);
  };
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    async json() {
      if (String(url).endsWith("/internal/health/state")) {
        return { ok: true, service: "world-kernel", stateChecked: true };
      }
      if (String(url).endsWith("/healthz")) {
        return { ok: true, service: "world-kernel", stateChecked: false };
      }
      return { threads: [] };
    },
  });
  const client = createWranglerDeploymentClient({ runner, cwd: "/repo", fetchImpl });
  await client.assertAuthenticated();
  assert.deepEqual(await client.assertContainersAvailable(), { ok:true });
  assert.deepEqual(await client.listSecretNames("fibre-world-kernel-staging"), new Set(["FIBRE_PRIVATE_TOKEN"]));
  await client.deployService({ configPath: "/repo/.fibre/world.jsonc" });
  assert.deepEqual(calls.at(-1), [
    "deploy", "--config", "/repo/.fibre/world.jsonc",
    "--experimental-provision=false",
    "--experimental-auto-create=false",
  ]);
  assert.equal((await client.checkServiceHealth({
    serviceId: "world-kernel",
    baseUrl: "https://world.example",
  })).stateChecked, false);
  assert.equal((await client.checkStateHealth({
    serviceId: "world-kernel",
    baseUrl: "https://world.example",
  })).stateChecked, true);
  assert.deepEqual(missingRequiredSecretNames(["FIBRE_PRIVATE_TOKEN", "OTHER"], new Set(["FIBRE_PRIVATE_TOKEN"])), ["OTHER"]);
  assert.equal(healthBaseUrlForDeployment({
    serviceId: "world-kernel",
    resolvedConfig: {},
    deploymentOutput: "Published https://fibre-world-kernel-staging.account.workers.dev",
  }), "https://fibre-world-kernel-staging.account.workers.dev");
});

test("deep health failures surface the Fibre state diagnostic", async () => {
  const client = createWranglerDeploymentClient({
    runner: async () => { throw new Error("runner should not be used"); },
    cwd: "/repo",
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      async json() {
        return {
          error: {
            detail: "Birth Center state could not be opened",
          },
        };
      },
    }),
  });

  await assert.rejects(
    client.checkStateHealth({ serviceId: "birth-center", baseUrl: "https://birth.example" }),
    /HTTP 503: Birth Center state could not be opened/,
  );
});
test("deployment fails before provisioning when Cloudflare Containers access is unavailable", async () => {
  const { root } = await fixtureRepo();
  let provisionCalls = 0;
  let deployCalls = 0;
  await assert.rejects(deployCloudflareStack({
    repoRoot: root,
    environment: "staging",
    client: {
      async assertAuthenticated() {},
      async assertContainersAvailable() {
        throw new Error("Cloudflare Containers access is required for the Fibre C2PA signer");
      },
      async deployService() { deployCalls += 1; },
    },
    validateRepository: async () => {},
    provision: async () => {
      provisionCalls += 1;
      throw new Error("provision should not run");
    },
  }), /Cloudflare Containers access is required/);
  assert.equal(provisionCalls, 0);
  assert.equal(deployCalls, 0);
});

test("deployment rejects FIA binding that does not target the declared Fibre signer", async () => {
  const { root, state } = await fixtureRepo();
  const fiaPath = resolve(root, state.wranglerConfigs["fibre-identity-authority"]);
  const fia = JSON.parse(await readFile(fiaPath, "utf8"));
  fia.services.find((binding) => binding.binding === "CONTENT_CREDENTIAL_SIGNER").service = "wrong-signer-staging";
  await writeFile(fiaPath, JSON.stringify(fia));

  const client = {
    async assertAuthenticated() {},
    async assertContainersAvailable() {},
    async listSecretNames() { return allSecrets(); },
  };
  await assert.rejects(deployCloudflareStack({
    repoRoot: root,
    environment: "staging",
    client,
    validateRepository: async () => {},
    provision: async () => state,
  }), /CONTENT_CREDENTIAL_SIGNER must target the deployed Fibre signer/);
});
