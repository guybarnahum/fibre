import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function parseArgs(argv) {
  const result = { environment:null, threadId:null, repairKey:null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") result.environment = argv[++index] ?? null;
    else if (value === "--thread-id") result.threadId = argv[++index] ?? null;
    else if (value === "--key") result.repairKey = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${value}`);
  }
  result.environment = nonEmpty("--env", result.environment);
  if (!["staging", "production"].includes(result.environment)) throw new TypeError("--env must be staging or production");
  result.threadId = nonEmpty("--thread-id", result.threadId);
  if (result.repairKey !== null) result.repairKey = nonEmpty("--key", result.repairKey);
  return result;
}

function deploymentEvidence(environment) {
  const path = resolve(REPO_ROOT, ".fibre", "cloudflare", environment, "deployment.json");
  return { path, record:JSON.parse(readFileSync(path, "utf8")) };
}

function worldBaseUrl(record) {
  const matches = (record.deployments ?? []).filter((entry) => entry?.serviceId === "world-kernel");
  if (matches.length !== 1) throw new Error("deployment evidence must contain exactly one world-kernel deployment");
  return nonEmpty("world-kernel baseUrl", matches[0].baseUrl);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { path, record } = deploymentEvidence(args.environment);
  if (record.environment !== args.environment) throw new Error("deployment evidence environment mismatch");
  const url = new URL(worldBaseUrl(record));
  url.pathname = `/internal/threads/${encodeURIComponent(args.threadId)}/repair`;
  url.search = "";
  url.hash = "";

  const token = nonEmpty("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
  const repairing = args.repairKey !== null;
  console.log(`THREAD ${repairing ? "REPAIR" : "DIAGNOSE"} env=${args.environment} thread=${args.threadId}`);
  console.log(`DEPLOYMENT ${record.sourceGitSha ?? "unknown"} evidence=${path}`);

  const response = await fetch(url, {
    method:repairing ? "POST" : "GET",
    headers:{
      "x-fibre-private-token":token,
      ...(repairing ? { "content-type":"application/json" } : {}),
    },
    ...(repairing ? { body:JSON.stringify({ repairKey:args.repairKey }) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Thread ${repairing ? "repair" : "diagnosis"} failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  console.log(JSON.stringify(payload, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
