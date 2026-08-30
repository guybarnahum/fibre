import { assertInfraNonEmpty, assertInfraPlainObject } from "./internal.mjs";
import {
  FIBRE_BIRTH_STATE_REQUIREMENTS,
  FIBRE_WORLD_STATE_REQUIREMENTS,
  assertTransactionalStatePort,
  requireTransactionalStateGuarantees,
} from "./transactional-state.mjs";

export {
  FIBRE_BIRTH_STATE_REQUIREMENTS,
  FIBRE_WORLD_STATE_REQUIREMENTS,
  requireTransactionalStateGuarantees,
};

export const INFRA_DRIVER_VERSION = "infra-driver-v0.1";

export class InfraSequenceConflictError extends Error {}
export class InfraIdempotencyConflictError extends Error {}
export class InfraImmutableObjectConflictError extends Error {}
export class InfraWorkflowConflictError extends Error {}

export const INFRA_CAPABILITIES = Object.freeze([
  "state",
  "streams",
  "objects",
  "catalog",
  "realtime",
  "queues",
  "scheduler",
  "workflows",
  "coordination",
  "secrets",
  "cache",
  "telemetry",
]);

const CAPABILITY_SET = new Set(INFRA_CAPABILITIES);
const REQUIRED_METHODS = Object.freeze({
  streams: ["getHead", "append", "readAfter", "publishSnapshot", "getSnapshotPointer"],
  objects: ["putImmutable", "get", "head"],
  catalog: ["upsert", "get", "remove", "list"],
  realtime: ["publish"],
  queues: ["send"],
  workflows: ["start", "get"],
});

export function assertInfraDriver(driver, { required = [] } = {}) {
  assertInfraPlainObject("infra driver", driver);
  assertInfraNonEmpty("infra driver.driverId", driver.driverId);
  if (driver.driverVersion !== INFRA_DRIVER_VERSION) {
    throw new TypeError(`unsupported infra driver version ${driver.driverVersion}`);
  }
  if (!Array.isArray(driver.capabilities)) throw new TypeError("infra driver.capabilities must be an array");
  const declared = new Set();
  for (const [index, capability] of driver.capabilities.entries()) {
    if (!CAPABILITY_SET.has(capability)) throw new TypeError(`infra driver.capabilities[${index}] is unsupported`);
    if (declared.has(capability)) throw new TypeError("infra driver.capabilities must be unique");
    declared.add(capability);
    if (driver[capability] === undefined) throw new TypeError(`infra driver declares ${capability} without a port`);
  }
  for (const capability of required) {
    if (!CAPABILITY_SET.has(capability)) throw new TypeError(`unknown required infra capability ${capability}`);
    if (!declared.has(capability)) throw new TypeError(`infra driver lacks required capability ${capability}`);
  }
  if (declared.has("state")) assertTransactionalStatePort(driver.state);
  for (const [capability, methods] of Object.entries(REQUIRED_METHODS)) {
    if (!declared.has(capability)) continue;
    assertInfraPlainObject(`infra driver.${capability}`, driver[capability]);
    for (const method of methods) {
      if (typeof driver[capability][method] !== "function") {
        throw new TypeError(`infra driver.${capability}.${method} must be a function`);
      }
    }
  }
  return driver;
}

export function requireInfraCapabilities(driver, ...capabilities) {
  return assertInfraDriver(driver, { required: capabilities.flat() });
}
