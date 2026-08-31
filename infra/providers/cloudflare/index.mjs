import {
  assertInfraDriver,
} from "../../infra-driver.mjs";
import {
  createCloudflareInfraDriver as createBaseCloudflareInfraDriver,
} from "./driver.mjs";
import { createCloudflareSchedulerPort } from "./scheduler.mjs";

export function createCloudflareInfraDriver({ schedulerScopes = {}, ...options } = {}) {
  const driver = createBaseCloudflareInfraDriver(options);
  if (Object.keys(schedulerScopes).length > 0) {
    driver.scheduler = createCloudflareSchedulerPort({ scopes: schedulerScopes });
    driver.capabilities.push("scheduler");
  }
  return Object.freeze(assertInfraDriver(driver));
}

export * from "./driver.mjs";
export { createCloudflareSchedulerPort } from "./scheduler.mjs";
