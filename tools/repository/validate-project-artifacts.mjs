import { spawnSync } from "node:child_process";

// The full suite needs one success receipt; each existing check retains its
// detailed standalone output. On failure, expose the originating diagnostic.
const checks = [
  ["context packs", ["tools/repository/build-context-pack.mjs"]],
  ["repository and generated context packs", ["tools/repository/validate-repo.mjs", "--generated"]],
  ["World seed", ["--disable-warning=ExperimentalWarning", "tools/repository/validate-world-seed.mjs"]],
  ["local deployment manifest", ["tools/deployment/validate-deployment-manifest.mjs"]],
  ["cloudflare deployment manifest", ["tools/deployment/validate-deployment-manifest.mjs", "infra/deployments/environments/cloudflare.yaml"]],
];

let failed = false;
for (const [label, args] of checks) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    console.error(`Validation failed: ${label}${result.error ? ` — ${result.error.message}` : ""}`);
    process.exitCode = result.status || 1;
    failed = true;
    break;
  }
}
if (!failed) {
  console.log("Validation passed: context packs, repository, World seed, deployment manifests (local, cloudflare).");
}
