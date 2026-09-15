import {
  assertInfraDriver,
} from "../../infra-driver.mjs";
import {
  createCloudflareInfraDriver as createBaseCloudflareInfraDriver,
} from "./driver.mjs";
import { createCloudflareHealthPort } from "./health.mjs";
import { createCloudflareSchedulerPort } from "./scheduler.mjs";

export function createCloudflareInfraDriver({ schedulerScopes = {}, ...options } = {}) {
  const driver = createBaseCloudflareInfraDriver(options);
  driver.health = createCloudflareHealthPort(options);
  if (Object.keys(schedulerScopes).length > 0) {
    driver.scheduler = createCloudflareSchedulerPort({ scopes: schedulerScopes });
    driver.capabilities.push("scheduler");
  }
  return Object.freeze(assertInfraDriver(driver));
}

export * from "./driver.mjs";
export { createCloudflareHealthPort, classifyCloudflareInfraError, extendCloudflareHealth, normalCloudflareCheck, probeCloudflareHealth } from "./health.mjs";
export { createCloudflareSchedulerPort } from "./scheduler.mjs";
export { sampleCloudflareResourceHealth } from "./resource-health.mjs";
