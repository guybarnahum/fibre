import {
  assertInfraFiniteNumber,
  assertInfraPlainObject,
} from "./internal.mjs";

export const SCHEDULER_VERSION = "scheduler-v0.1";

export function assertScheduledTimeMs(name, value) {
  assertInfraFiniteNumber(name, value, { integer: true, minimum: 0 });
  return value;
}

export function assertSchedulerPort(port) {
  assertInfraPlainObject("infra scheduler", port);
  if (port.schedulerVersion !== SCHEDULER_VERSION) {
    throw new TypeError(`unsupported scheduler version ${String(port.schedulerVersion)}`);
  }
  for (const method of ["get", "schedule", "cancel"]) {
    if (typeof port[method] !== "function") {
      throw new TypeError(`infra scheduler.${method} must be a function`);
    }
  }
  return port;
}
