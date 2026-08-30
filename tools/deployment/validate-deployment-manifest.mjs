import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDeploymentManifest } from "./deployment-manifest.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const requested = process.argv[2] ?? "infra/deployments/environments/local.yaml";
const manifestPath = resolve(repoRoot, requested);
const manifest = await loadDeploymentManifest(manifestPath);

console.log(`Deployment manifest valid: ${manifest.environment}`);
for (const [serviceId, service] of Object.entries(manifest.services)) {
  const integrationPorts = Object.keys(service.integrations);
  console.log([
    `${serviceId}: runtime=${service.runtime}`,
    service.infra === null ? "infra=none" : `infra=${service.infra}`,
    `integrations=${integrationPorts.length === 0 ? "none" : integrationPorts.join(",")}`,
  ].join(" "));
}
