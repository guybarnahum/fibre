import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDeploymentManifest } from "./deployment-manifest.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const requested = process.argv[2] ?? "deployments/environments/local.json";
const manifestPath = resolve(repoRoot, requested);
const manifest = await loadDeploymentManifest(manifestPath);

console.log(`Deployment manifest valid: ${manifest.environment}`);
for (const [serviceId, service] of Object.entries(manifest.services)) {
  console.log(`${serviceId}: runtime=${service.runtime} infra=${service.infra} requires=${service.requires.join(",")}`);
}
