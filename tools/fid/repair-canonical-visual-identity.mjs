import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function options(argv) {
  const parsed = { threadId:null, specFile:null, reason:null };
  for (const arg of argv) {
    if (arg.startsWith("--thread-id=")) parsed.threadId = arg.slice("--thread-id=".length);
    else if (arg.startsWith("--spec-file=")) parsed.specFile = arg.slice("--spec-file=".length);
    else if (arg.startsWith("--reason=")) parsed.reason = arg.slice("--reason=".length);
    else throw new TypeError(`unsupported visual repair option ${arg}`);
  }
  return {
    threadId:required("--thread-id", parsed.threadId),
    specFile:required("--spec-file", parsed.specFile),
    reason:required("--reason", parsed.reason),
  };
}

function deployment() {
  const path = resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json");
  const record = JSON.parse(readFileSync(path, "utf8"));
  if (record?.environment !== "staging") throw new Error("deployment evidence is not staging");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd:REPO_ROOT, encoding:"utf8" }).trim();
  if (record.sourceGitSha !== head) {
    throw new Error(`staging deployment ${record.sourceGitSha} does not match current checkout ${head}`);
  }
  const matches = (record.deployments ?? []).filter((entry) => entry?.serviceId === "world-kernel");
  if (matches.length !== 1) throw new Error("deployment evidence must contain exactly one world-kernel");
  return required("world-kernel baseUrl", matches[0].baseUrl).replace(/\/$/u, "");
}

async function main() {
  const { threadId, specFile, reason } = options(process.argv.slice(2));
  const privateToken = required("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
  const specification = JSON.parse(readFileSync(resolve(process.cwd(), specFile), "utf8"));
  const operationKey = `visual_identity_repair_${createHash("sha256")
    .update(JSON.stringify({ threadId, specification }))
    .digest("hex")
    .slice(0, 24)}`;

  const response = await fetch(
    `${deployment()}/internal/threads/${encodeURIComponent(threadId)}/repair`,
    {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-fibre-private-token":privateToken,
      },
      body:JSON.stringify({
        action:"canonical_visual_identity",
        operationKey,
        correctedSpecification:specification,
        reason,
      }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`canonical visual identity repair failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }

  const correction = body?.visualIdentityCorrection;
  process.stdout.write(`${JSON.stringify({
    event:"canonical-visual-identity-repaired",
    threadId,
    operationKey,
    previous:correction?.previous ?? null,
    correctedRevision:correction?.embodiment?.revision ?? null,
    correctedSpecificationDigest:correction?.embodiment?.specificationDigest ?? null,
    status:correction?.embodiment?.status ?? null,
    reconciliation:body?.reconciliation ?? null,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    event:"canonical-visual-identity-repair-failed",
    message:error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exitCode = 1;
});
