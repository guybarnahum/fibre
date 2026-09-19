import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

import {
  loadCloudflareWranglerConfigs,
  normalizeCloudflareEnvironment,
  parseJsonc,
  repoRootFrom,
  runWrangler,
  secretInventory,
} from "./cloudflare-operator.mjs";
import {
  createWranglerProvisionClient,
  provisionCloudflareResources,
} from "./provision-cloudflare.mjs";
import {
  createCloudflareWorkerDomainClient,
  ensureCloudflareWorkerDomain,
} from "./cloudflare-worker-domains.mjs";

export const CLOUDFLARE_DEPLOY_ORDER = Object.freeze([
  "content-credential-signer",
  "asset-generator",
  "thread-presentation",
  "world-kernel",
  "fibre-identity-authority",
  "birth-center",
]);

export function selectedCloudflareDeployOrder({ noC2pa = false } = {}) {
  return Object.freeze(noC2pa
    ? CLOUDFLARE_DEPLOY_ORDER.filter((serviceId) => serviceId !== "content-credential-signer")
    : [...CLOUDFLARE_DEPLOY_ORDER]);
}

export function configureFiaForNoC2pa(config) {
  const resolved = structuredClone(config);
  resolved.vars ??= {};
  resolved.vars.FIA_CONTENT_CREDENTIAL_MODE = "disabled";
  delete resolved.vars.C2PA_SIGNER_URL;
  delete resolved.vars.C2PA_SIGNER_ID;
  delete resolved.vars.C2PA_TRUST_POLICY;
  resolved.services = (resolved.services ?? []).filter((binding) => binding?.binding !== "CONTENT_CREDENTIAL_SIGNER");
  return resolved;
}

const STATEFUL_DO_SERVICES = new Set(["world-kernel", "fibre-identity-authority", "birth-center"]);
const HEALTH_RETRY_ATTEMPTS = 20;
const CUSTOM_DOMAIN_HEALTH_RETRY_ATTEMPTS = 60;
const HEALTH_RETRY_DELAY_MS = 1500;
const DEFAULT_C2PA_SIGNER_ID = "fibre-c2pa-production-v1";
const DEFAULT_C2PA_TRUST_POLICY = "c2pa_trust_list";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

export function extractHttpUrls(text) {
  if (typeof text !== "string") return Object.freeze([]);
  const matches = text.match(/https:\/\/[^\s)\]}>,]+/gu) ?? [];
  return Object.freeze([...new Set(matches.map((value) => value.replace(/[.;]+$/u, "")))]);
}

export function healthBaseUrlForDeployment({ serviceId, resolvedConfig, deploymentOutput }) {
  nonEmpty("serviceId", serviceId);
  if (!resolvedConfig || typeof resolvedConfig !== "object" || Array.isArray(resolvedConfig)) {
    throw new TypeError("resolved Wrangler config is required");
  }
  if (serviceId === "thread-presentation") {
    const route = (resolvedConfig.routes ?? []).find((candidate) => candidate?.custom_domain === true);
    if (!route?.pattern) throw new Error("Thread Presentation deployment requires a custom-domain route for health acceptance");
    return `https://${route.pattern}`;
  }
  const workerUrl = extractHttpUrls(deploymentOutput).find((value) => {
    try { return new URL(value).hostname.endsWith(".workers.dev"); }
    catch { return false; }
  });
  if (!workerUrl) throw new Error(`${serviceId} deploy output did not expose a workers.dev URL for health acceptance`);
  const parsed = new URL(workerUrl);
  return `${parsed.protocol}//${parsed.host}`;
}

function secretNames(value) {
  if (!Array.isArray(value)) throw new TypeError("Wrangler secret list must be an array");
  return new Set(value.map((item) => nonEmpty("secret name", item?.name)));
}

export function missingRequiredSecretNames(required, remote) {
  if (!Array.isArray(required)) throw new TypeError("required secret names must be an array");
  const actual = remote instanceof Set ? remote : new Set(remote);
  return Object.freeze(required.filter((name) => !actual.has(name)));
}

function assertHealthPayload(payload, serviceId) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(`${serviceId} health response must be an object`);
  if (payload.ok !== true || payload.service !== serviceId) {
    throw new Error(`${serviceId} health response did not confirm the expected service`);
  }
  return payload;
}

function assertStateHealthPayload(payload, serviceId) {
  const checked = assertHealthPayload(payload, serviceId);
  if (checked.stateChecked !== true) throw new Error(`${serviceId} state health did not confirm Durable Object state`);
  return checked;
}

export function assertSignerHealth(payload, expected) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("C2PA signer health response must be an object");
  if (payload.ok !== true || payload.service !== "content-credential-signer") throw new Error("C2PA signer health did not confirm content-credential-signer");
  if (payload.format !== "c2pa") throw new Error(`C2PA signer health returned unexpected format ${String(payload.format)}`);
  if (payload.signerId !== expected.signerId) throw new Error(`C2PA signer health returned unexpected signerId ${String(payload.signerId)}`);
  if (payload.trustPolicy !== expected.trustPolicy) throw new Error(`C2PA signer health returned unexpected trustPolicy ${String(payload.trustPolicy)}`);
  return payload;
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { Accept: "application/json" }, redirect: "follow" });
  let payload = null;
  try { payload = await response.json(); }
  catch { throw new Error(`health endpoint returned non-JSON response: ${url}`); }
  if (!response.ok) {
    const detail = payload?.error?.detail ?? payload?.detail ?? payload?.error;
    const diagnostic = typeof detail === "string" && detail.trim() !== "" ? `: ${detail.trim()}` : "";
    throw new Error(`health endpoint failed with HTTP ${response.status}${diagnostic}: ${url}`);
  }
  return payload;
}

export function createWranglerDeploymentClient({
  runner = runWrangler,
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  workerDomainClient = null,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  let domains = workerDomainClient;
  function domainClient() {
    domains ??= createCloudflareWorkerDomainClient({ accountId, apiToken, fetchImpl });
    return domains;
  }
  return Object.freeze({
    async assertAuthenticated() {
      const { stdout } = await runner(["whoami", "--json"], { cwd });
      const account = JSON.parse(stdout);
      if (!account || typeof account !== "object" || Array.isArray(account)) throw new Error("Wrangler whoami returned invalid JSON");
      return account;
    },
    async assertContainersAvailable() {
      try {
        await runner(["containers", "images", "list", "--json"], { cwd });
      } catch (error) {
        throw new Error(
          "Cloudflare Containers access is required for the Fibre C2PA signer. Ensure the account is on Workers Paid and CLOUDFLARE_API_TOKEN has Account > Containers > Edit.",
          { cause:error },
        );
      }
      return Object.freeze({ ok:true });
    },
    async listSecretNames(workerName) {
      const { stdout } = await runner(["secret", "list", "--name", workerName, "--format", "json"], { cwd });
      return secretNames(JSON.parse(stdout));
    },
    async checkSignerHealth({ baseUrl, signerId, trustPolicy }) {
      const payload = await fetchJson(fetchImpl, `${nonEmpty("C2PA signer URL", baseUrl).replace(/\/$/u, "")}/healthz`);
      return assertSignerHealth(payload, { signerId, trustPolicy });
    },
    async deployService({ configPath, workerName, resolvedConfig = null }) {
      const result = await runner([
        "deploy",
        "--config", configPath,
        "--experimental-provision=false",
        "--experimental-auto-create=false",
      ], { cwd });
      const customRoute = (resolvedConfig?.routes ?? []).find((route) => route?.custom_domain === true);
      const customDomain = customRoute?.pattern
        ? await ensureCloudflareWorkerDomain({ client: domainClient(), hostname: customRoute.pattern, service: workerName })
        : null;
      return Object.freeze({ ...result, customDomain, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` });
    },
    async checkServiceHealth({ serviceId, baseUrl }) {
      return assertHealthPayload(await fetchJson(fetchImpl, `${baseUrl.replace(/\/$/u, "")}/healthz`), serviceId);
    },
    async checkStateHealth({ serviceId, baseUrl }) {
      return assertStateHealthPayload(
        await fetchJson(fetchImpl, `${baseUrl.replace(/\/$/u, "")}/internal/health/state`),
        serviceId,
      );
    },
    async checkPresentationAcceptance({ baseUrl }) {
      const payload = await fetchJson(fetchImpl, `${baseUrl.replace(/\/$/u, "")}/api/threads?limit=1`);
      if (!Array.isArray(payload?.threads)) throw new Error("Thread Presentation acceptance endpoint did not return a threads array");
      return payload;
    },
    async checkViewer({ origin }) {
      const response = await fetchImpl(nonEmpty("Viewer origin", origin), { redirect: "follow" });
      if (!response.ok) throw new Error(`Viewer health failed with HTTP ${response.status}`);
      return Object.freeze({ ok: true, status: response.status });
    },
  });
}

async function retryHealth({ serviceId, check, attempts, wait, kind }) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await check(); }
    catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(HEALTH_RETRY_DELAY_MS);
    }
  }
  const detail = lastError instanceof Error ? `: ${lastError.message}` : "";
  throw new Error(`${serviceId} ${kind} did not become healthy after deployment${detail}`, { cause: lastError });
}

export function retryServiceHealth({ client, serviceId, baseUrl, attempts = HEALTH_RETRY_ATTEMPTS, wait = delay } = {}) {
  return retryHealth({
    serviceId,
    attempts,
    wait,
    kind: "service",
    check: () => client.checkServiceHealth({ serviceId, baseUrl }),
  });
}

export function retryStateHealth({ client, serviceId, baseUrl, attempts = HEALTH_RETRY_ATTEMPTS, wait = delay } = {}) {
  return retryHealth({
    serviceId,
    attempts,
    wait,
    kind: "state",
    check: () => client.checkStateHealth({ serviceId, baseUrl }),
  });
}

export async function deployCloudflareStack({
  repoRoot,
  environment,
  validateRepository,
  provision,
  client,
  wait = delay,
  noC2pa = false,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (typeof validateRepository !== "function") throw new TypeError("validateRepository callback is required");
  if (typeof provision !== "function") throw new TypeError("provision callback is required");
  if (!client) throw new TypeError("Cloudflare deployment client is required");

  await validateRepository();
  await client.assertAuthenticated();
  if (!noC2pa) {
    if (typeof client.assertContainersAvailable !== "function") {
      throw new TypeError("Cloudflare deployment client must verify Containers access");
    }
    await client.assertContainersAvailable();
  }
  const resourceState = await provision();
  if (resourceState?.environment !== env) throw new Error(`provisioned Cloudflare state environment mismatch: ${String(resourceState?.environment)}`);

  const configs = await loadCloudflareWranglerConfigs(repoRoot);
  const requiredSecrets = secretInventory(configs);
  const deployOrder = selectedCloudflareDeployOrder({ noC2pa });
  for (const serviceId of deployOrder) {
    const workerName = resourceState.resources.deployManaged.workers[serviceId];
    const remote = await client.listSecretNames(workerName);
    const required = noC2pa && serviceId === "fibre-identity-authority"
      ? requiredSecrets[serviceId].filter((name) => name !== "C2PA_SIGNER_TOKEN")
      : requiredSecrets[serviceId];
    const missing = missingRequiredSecretNames(required, remote);
    if (missing.length > 0) throw new Error(`${serviceId} is missing required Cloudflare secrets: ${missing.join(", ")}`);
  }

  const resolvedConfigs = {};
  for (const serviceId of deployOrder) {
    const relativePath = resourceState.wranglerConfigs?.[serviceId];
    if (!relativePath) throw new Error(`resolved Wrangler config is missing for ${serviceId}`);
    const configPath = resolve(repoRoot, relativePath);
    resolvedConfigs[serviceId] = {
      path: configPath,
      config: parseJsonc(await readFile(configPath, "utf8"), configPath),
    };
  }

  let signerId = null;
  let trustPolicy = null;
  if (noC2pa) {
    const fia = resolvedConfigs["fibre-identity-authority"];
    fia.config = configureFiaForNoC2pa(fia.config);
    await writeFile(fia.path, `${JSON.stringify(fia.config, null, 2)}\n`, { mode:0o600 });
  } else {
    const signerConfig = resolvedConfigs["content-credential-signer"].config;
    signerId = nonEmpty("C2PA signer ID", signerConfig.vars?.C2PA_SIGNER_ID);
    trustPolicy = nonEmpty("C2PA trust policy", signerConfig.vars?.C2PA_TRUST_POLICY);
    if (!["fibre_signature_only", "c2pa_trust_list"].includes(trustPolicy)) {
      throw new Error(`unsupported cloud C2PA trust policy ${trustPolicy}`);
    }
    const fiaSigner = (resolvedConfigs["fibre-identity-authority"].config.services ?? [])
      .find((binding) => binding?.binding === "CONTENT_CREDENTIAL_SIGNER");
    if (fiaSigner?.service !== signerConfig.name) {
      throw new Error("FIA CONTENT_CREDENTIAL_SIGNER must target the deployed Fibre signer");
    }
  }

  const deployments = [];
  for (const serviceId of deployOrder) {
    const workerName = resourceState.resources.deployManaged.workers[serviceId];
    const resolved = resolvedConfigs[serviceId];
    const deployed = await client.deployService({
      serviceId,
      workerName,
      configPath: resolved.path,
      resolvedConfig: resolved.config,
    });
    const baseUrl = healthBaseUrlForDeployment({ serviceId, resolvedConfig: resolved.config, deploymentOutput: deployed.output });
    const customDomain = deployed.customDomain ?? null;
    const attempts = customDomain === null ? HEALTH_RETRY_ATTEMPTS : CUSTOM_DOMAIN_HEALTH_RETRY_ATTEMPTS;
    const health = serviceId === "content-credential-signer"
      ? await retryHealth({
          serviceId,
          attempts,
          wait,
          kind:"signer",
          check:() => client.checkSignerHealth({ baseUrl, signerId, trustPolicy }),
        })
      : await retryServiceHealth({ client, serviceId, baseUrl, attempts, wait });
    const stateHealth = STATEFUL_DO_SERVICES.has(serviceId)
      ? await retryStateHealth({ client, serviceId, baseUrl, wait })
      : null;
    deployments.push(Object.freeze({ serviceId, workerName, baseUrl, health, stateHealth, customDomain }));
  }

  const presentation = deployments.find((item) => item.serviceId === "thread-presentation");
  const acceptance = await client.checkPresentationAcceptance({ baseUrl: presentation.baseUrl });
  const viewerOrigin = resolvedConfigs["thread-presentation"].config.vars?.VIEWER_ORIGIN;
  const viewer = await client.checkViewer({ origin: viewerOrigin });

  return Object.freeze({
    environment: env,
    contentCredentialMode: noC2pa ? "disabled" : "c2pa",
    deployments: Object.freeze(deployments),
    acceptance,
    viewer,
    externalViewerOrigin: viewerOrigin,
  });
}

export async function runCommand(command, args, { cwd = process.cwd() } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", rejectPromise);
    child.on("close", (code) => code === 0 ? resolvePromise() : rejectPromise(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`)));
  });
}

function parseArgs(argv) {
  let environment = null;
  let noC2pa = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else if (argv[index] === "--no-c2pa") noC2pa = true;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  return { environment, noC2pa };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const { environment, noC2pa } = parseArgs(process.argv.slice(2));
  const repoRoot = repoRootFrom(import.meta.url);
  const client = createWranglerDeploymentClient({ cwd: repoRoot });
  const result = await deployCloudflareStack({
    repoRoot,
    environment,
    noC2pa,
    client,
    validateRepository: () => runCommand("npm", ["run", "validate"], { cwd: repoRoot }),
    provision: () => provisionCloudflareResources({
      repoRoot,
      environment,
      client: createWranglerProvisionClient({ cwd: repoRoot }),
    }),
  });
  console.log(`Cloudflare deployment accepted: ${result.environment}`);
  for (const deployment of result.deployments) console.log(`HEALTH  ${deployment.serviceId} ${deployment.baseUrl}`);
  console.log(`VIEWER  ${result.externalViewerOrigin}`);
}
export const assertProductionSignerHealth = assertSignerHealth;
