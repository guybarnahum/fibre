import { readFileSync } from "node:fs";

import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "./manifest.mjs";
import { selectReasoningIntegration } from "./integration-selection.mjs";

const LOCAL_MANIFEST = parseDeploymentManifest(
  readFileSync(new URL("./environments/local.yaml", import.meta.url), "utf8"),
);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function reasoningSelection({ serviceId = "world-kernel", port = "dignityGuardian", model = null } = {}) {
  const deployment = resolveServiceDeployment(LOCAL_MANIFEST, nonEmpty("serviceId", serviceId));
  const selected = deployment.integrations[nonEmpty("reasoning port", port)];
  if (!selected || selected.kind !== "ai.reasoning") {
    throw new TypeError(`deployment service ${serviceId} does not select ai.reasoning at port ${port}`);
  }
  const modelId = model === null || model === undefined
    ? selected.config.model
    : nonEmpty("reasoning model override", model);
  return Object.freeze({
    ...selected,
    config: Object.freeze({ ...selected.config, model: nonEmpty("reasoning model", modelId) }),
  });
}

export function localReasoningSelection(options = {}) {
  const selected = reasoningSelection(options);
  return Object.freeze({ provider: selected.provider, modelId: selected.config.model });
}

export function createLocalReasoningAdapter({
  environment = process.env,
  serviceId = "world-kernel",
  port = "dignityGuardian",
  model = null,
  fetchImpl = globalThis.fetch,
  observer = null,
} = {}) {
  return selectReasoningIntegration(
    reasoningSelection({ serviceId, port, model }),
    { environment, fetchImpl, observer },
  );
}
