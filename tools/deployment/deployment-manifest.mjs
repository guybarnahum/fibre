import { readFile } from "node:fs/promises";

export {
  FIBRE_DEPLOYMENT_SCHEMA,
  normalizeDeploymentManifest,
  parseDeploymentManifest,
  parseDeploymentYaml,
  resolveServiceDeployment,
} from "../../infra/deployments/manifest.mjs";

import { parseDeploymentManifest } from "../../infra/deployments/manifest.mjs";

export async function loadDeploymentManifest(path) {
  if (typeof path !== "string" || path.trim() === "") throw new TypeError("deployment manifest path must be a non-empty string");
  return parseDeploymentManifest(await readFile(path, "utf8"));
}
