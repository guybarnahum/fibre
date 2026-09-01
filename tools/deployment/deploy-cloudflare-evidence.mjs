import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  createWranglerDeploymentClient,
  deployCloudflareStack,
  runCommand,
} from "./deploy-cloudflare.mjs";
import {
  createWranglerProvisionClient,
  provisionCloudflareResources,
} from "./provision-cloudflare.mjs";
import { repoRootFrom } from "./cloudflare-operator.mjs";

const execFile = promisify(execFileCallback);
export const CLOUDFLARE_DEPLOYMENT_EVIDENCE_VERSION = "fibre-cloudflare-deployment-evidence-v1";
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function gitSha(value) {
  const normalized = nonEmpty("Git SHA", value).toLowerCase();
  if (!GIT_SHA_PATTERN.test(normalized)) throw new TypeError("Git SHA must be a full 40-character hexadecimal commit SHA");
  return normalized;
}

export async function resolveCleanGitDeploymentSource(repoRoot) {
  const cwd = resolve(nonEmpty("repoRoot", repoRoot));
  const [{ stdout: head }, { stdout: status }] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }),
    execFile("git", ["status", "--porcelain", "--untracked-files=all"], { cwd, encoding: "utf8" }),
  ]);
  if (status.trim() !== "") {
    throw new Error("Cloud deployment requires a clean Git working tree so the deployed source is exactly attributable to one commit");
  }
  return Object.freeze({ gitSha: gitSha(head.trim()), workingTreeClean: true });
}

export function createCloudflareDeploymentEvidence({
  environment,
  source,
  deployment,
  recordedAt = new Date().toISOString(),
} = {}) {
  if (!source || source.workingTreeClean !== true) throw new TypeError("deployment source must prove a clean working tree");
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) throw new TypeError("deployment result is required");
  if (deployment.environment !== environment) throw new TypeError("deployment result environment mismatch");
  const sourceGitSha = gitSha(source.gitSha);
  return Object.freeze({
    contract: CLOUDFLARE_DEPLOYMENT_EVIDENCE_VERSION,
    environment,
    sourceGitSha,
    sourceTreeClean: true,
    recordedAt,
    deployments: structuredClone(deployment.deployments ?? []),
    acceptance: structuredClone(deployment.acceptance ?? null),
    viewer: structuredClone(deployment.viewer ?? null),
    externalViewerOrigin: deployment.externalViewerOrigin ?? null,
  });
}

export async function writeCloudflareDeploymentEvidence({ repoRoot, environment, evidence } = {}) {
  const path = resolve(repoRoot, ".fibre", "cloudflare", environment, "deployment.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  return path;
}

export async function deployCloudflareStackWithEvidence({
  repoRoot,
  environment,
  sourceResolver = resolveCleanGitDeploymentSource,
  deploy = deployCloudflareStack,
  writeEvidence = writeCloudflareDeploymentEvidence,
  now = () => new Date().toISOString(),
  ...deploymentOptions
} = {}) {
  const source = await sourceResolver(repoRoot);
  const providedProvision = deploymentOptions.provision;
  const options = providedProvision === undefined
    ? deploymentOptions
    : {
        ...deploymentOptions,
        provision: () => providedProvision({ sourceGitSha: source.gitSha }),
      };
  const deployment = await deploy({ repoRoot, environment, ...options });
  const evidence = createCloudflareDeploymentEvidence({
    environment,
    source,
    deployment,
    recordedAt: now(),
  });
  const evidencePath = await writeEvidence({ repoRoot, environment, evidence });
  return Object.freeze({ source, deployment, evidence, evidencePath });
}

function parseArgs(argv) {
  let environment = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  return { environment };
}

async function main() {
  const { environment } = parseArgs(process.argv.slice(2));
  const repoRoot = repoRootFrom(import.meta.url);
  const client = createWranglerDeploymentClient({ cwd: repoRoot });
  const result = await deployCloudflareStackWithEvidence({
    repoRoot,
    environment,
    client,
    validateRepository: () => runCommand("npm", ["run", "validate"], { cwd: repoRoot }),
    provision: ({ sourceGitSha } = {}) => provisionCloudflareResources({
      repoRoot,
      environment,
      client: createWranglerProvisionClient({ cwd: repoRoot }),
      sourceGitSha,
    }),
  });
  console.log(`Cloudflare deployment accepted: ${result.deployment.environment}`);
  console.log(`SOURCE  ${result.source.gitSha}`);
  for (const item of result.deployment.deployments) console.log(`HEALTH  ${item.serviceId} ${item.baseUrl}`);
  console.log(`VIEWER  ${result.deployment.externalViewerOrigin}`);
  console.log(`EVIDENCE ${result.evidencePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
