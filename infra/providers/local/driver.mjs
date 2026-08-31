import {
  INFRA_DRIVER_VERSION,
  assertInfraDriver,
} from "../../infra-driver.mjs";
import { createLocalSchedulerPort } from "./scheduler.mjs";
import { createSqliteTransactionalStatePort } from "./sqlite-state.mjs";

export function createLocalInfraDriver({
  stateScopes = {},
  schedulerScopes = {},
  busyTimeoutMs = 5_000,
} = {}) {
  const driver = {
    driverId: "local-v1",
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: [],
  };
  if (Object.keys(stateScopes).length > 0) {
    driver.state = createSqliteTransactionalStatePort({
      scopes: stateScopes,
      busyTimeoutMs,
    });
    driver.capabilities.push("state");
  }
  if (Object.keys(schedulerScopes).length > 0) {
    driver.scheduler = createLocalSchedulerPort({ scopes: schedulerScopes });
    driver.capabilities.push("scheduler");
  }
  return Object.freeze(assertInfraDriver(driver));
}

export * from "./memory-driver.mjs";
export {
  createSqliteStateInfraDriver,
  createSqliteTransactionalStatePort,
} from "./sqlite-state.mjs";
export { createLocalSchedulerPort } from "./scheduler.mjs";
