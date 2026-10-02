import {
  INFRA_DRIVER_VERSION,
  InfraServiceCallError,
  assertInfraDriver,
} from "../../infra-driver.mjs";
import {
  assertInfraId,
  assertInfraJsonValue,
  assertInfraPlainObject,
} from "../../internal.mjs";
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
  serviceHandlers = {},
  busyTimeoutMs = 5_000,
} = {}) {
  assertInfraPlainObject("serviceHandlers",serviceHandlers);
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
  if(Object.keys(serviceHandlers).length>0){
    driver.services=Object.freeze({
      async call(serviceName,operation,input){
        assertInfraId("serviceName",serviceName);
        assertInfraId("service operation",operation);
        assertInfraJsonValue("service input",input);
        const handler=serviceHandlers[serviceName];
        if(typeof handler!=="function"){
          throw new InfraServiceCallError(`local service ${serviceName} is unavailable`,{
            serviceName,
            operation,
            retryable:false,
          });
        }
        const result=await handler(operation,structuredClone(input));
        assertInfraJsonValue("service result",result);
        return structuredClone(result);
      },
    });
    driver.capabilities.push("services");
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

export { createLocalArtifactInfraDriver } from "./artifact-driver.mjs";
