import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function parseArgs(argv) {
  const result = { environment: null, threadId: null, recoveryKey: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") result.environment = argv[++index] ?? null;
    else if (value === "--thread-id") result.threadId = argv[++index] ?? null;
    else if (value === "--key") result.recoveryKey = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${value}`);
  }
  result.environment = nonEmpty("--env", result.environment);
  if (result.environment !== "staging" && result.environment !== "production") {
    throw new TypeError("--env must be staging or production");
  }
  result.threadId = nonEmpty("--thread-id", result.threadId);
  result.recoveryKey = nonEmpty("--key", result.recoveryKey);
  return result;
}

function deploymentEvidence(environment) {
  const path = resolve(REPO_ROOT, ".fibre", "cloudflare", environment, "deployment.json");
  return { path, record: JSON.parse(readFileSync(path, "utf8")) };
}

function worldBaseUrl(record) {
  const matches = (record.deployments ?? []).filter((entry) => entry?.serviceId === "world-kernel");
  if (matches.length !== 1) throw new Error("deployment evidence must contain exactly one world-kernel deployment");
  return nonEmpty("world-kernel baseUrl", matches[0].baseUrl);
}

function privateToken() {
  return nonEmpty("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { path, record } = deploymentEvidence(args.environment);
  if (record.environment !== args.environment) throw new Error("deployment evidence environment mismatch");
  const baseUrl = new URL(worldBaseUrl(record));
  baseUrl.pathname = `/internal/threads/${encodeURIComponent(args.threadId)}/visual-publication/recover`;
  baseUrl.search = "";
  baseUrl.hash = "";

  console.log(`THREAD RECOVERY env=${args.environment} thread=${args.threadId}`);
  console.log(`DEPLOYMENT ${record.sourceGitSha ?? "unknown"} evidence=${path}`);
  console.log(`RECOVERY KEY ${args.recoveryKey}`);

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": privateToken(),
    },
    body: JSON.stringify({ recoveryKey: args.recoveryKey }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true) {
    throw new Error(`Thread visual recovery failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  console.log(`RECOVERY ${JSON.stringify(payload.result)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
