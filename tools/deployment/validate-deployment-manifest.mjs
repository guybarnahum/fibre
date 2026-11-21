import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDeploymentManifest, resolveServiceDeployment } from "./deployment-manifest.mjs";
import { CERTIFICATIONS_PATH, uncertifiedRoutes } from "../../infra/deployments/model-certifications.mjs";
import { PROMPTS } from "../../services/world-kernel/src/generated/prompts.mjs";

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

// A job moved to a model of its own must be certified for that model at its
// current prompt version (model:quality writes the certifications).
const record = JSON.parse(await readFile(resolve(repoRoot, CERTIFICATIONS_PATH), "utf8"));
const services = Object.fromEntries(Object.keys(manifest.services)
  .map((serviceId) => [serviceId, resolveServiceDeployment(manifest, serviceId).integrations]));
const uncertified = uncertifiedRoutes({ services, record, promptVersion: (job) => PROMPTS[job]?.version ?? null });
if (uncertified.length > 0) {
  for (const route of uncertified) {
    console.error(`${route.service}: ${route.prompt}@${route.promptVersion} is routed to ${route.provider}:${route.model}, which has not passed model:quality for it`);
  }
  process.exit(1);
}
