import {
  INFRA_DRIVER_VERSION,
  assertInfraDriver,
} from "../../infra-driver.mjs";
import { createLocalSchedulerPort } from "./scheduler.mjs";
import { createSqliteTransactionalStatePort } from "./sqlite-state.mjs";
import { createLocalActivityTelemetryPort } from "./telemetry.mjs";

function localHealth(driver) {
  return Object.freeze({
    async check() {
      return Object.freeze({
        contract:"fibre-infra-driver-health-v0.1",
        driverId:driver.driverId,
        provider:"local",
        observedAt:new Date().toISOString(),
        level:"normal",
        checks:Object.freeze(driver.capabilities.map((kind) => Object.freeze({
          kind,
          resource:"local",
          provider:"local",
          level:"normal",
        }))),
      });
    },
  });
}

export function createLocalInfraDriver({
  stateScopes = {},
  schedulerScopes = {},
  telemetry = false,
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
  if (telemetry === true) {
    driver.telemetry = createLocalActivityTelemetryPort();
    driver.capabilities.push("telemetry");
  } else if (telemetry !== false) {
    throw new TypeError("local infra telemetry must be true or false");
  }
  driver.health = localHealth(driver);
  return Object.freeze(assertInfraDriver(driver));
}

export * from "./memory-driver.mjs";
export {
  createSqliteStateInfraDriver,
  createSqliteTransactionalStatePort,
} from "./sqlite-state.mjs";
export { createLocalSchedulerPort } from "./scheduler.mjs";
export { createLocalActivityTelemetryPort } from "./telemetry.mjs";
