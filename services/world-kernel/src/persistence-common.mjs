import { createHash } from "node:crypto";

export const WORLD_STORE_SCHEMA_VERSION = 6;
export const MAX_COMMAND_PAYLOAD_BYTES = 64 * 1024;

export const THREAD_STATUSES = new Set([
  "frozen",
  "thawing",
  "active",
  "freezing",
  "dormant",
  "retired",
]);
export const UPDATE_SELF_MODEL_STATUSES = new Set(["frozen", "dormant"]);
export const COMMAND_TYPES = new Set(["UPDATE_SELF_MODEL"]);
export const EVENT_TYPES = new Set([
  "THREAD_SEEDED",
  "THREAD_LIFE_EPISODE_RECORDED",
  "SELF_MODEL_UPDATED",
  "THREAD_FROZEN",
  "COMPELLED_EPISODE_INTERRUPTED",
  "AUTOBIOGRAPHICAL_MEMORY_RECORDED",
]);
export const UNCOMMANDED_EVENT_TYPES = new Set([
  "THREAD_SEEDED",
  "THREAD_LIFE_EPISODE_RECORDED",
]);
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

export class ThreadNotFoundError extends Error {}
export class ThreadAlreadyExistsError extends Error {}
export class StaleThreadVersionError extends Error {}
export class IdempotencyConflictError extends Error {}
export class LifecycleCommandError extends Error {}
export class IntegrityError extends Error {}
export class StorageBusyError extends Error {}
export class PrivateRequestNotFoundError extends Error {}
export class PrivateRequestConflictError extends Error {}
export class PrivateStanceConflictError extends Error {}
export class StaleAppraisalError extends Error {}

export function assertNonEmpty(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} is required`);
  }
}

export function assertId(name, value) {
  assertNonEmpty(name, value);
  if (!ID_PATTERN.test(value)) throw new TypeError(`${name} has an invalid format`);
}

export function assertPlainObject(name, value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${name} must be a plain object`);
  }
}

export function assertExactKeys(name, value, allowedKeys) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${name}.${key} is not allowed`);
  }
}

export function assertStringArray(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  value.forEach((item, index) => assertNonEmpty(`${name}[${index}]`, item));
}

export function assertFiniteNumber(name, value, { integer = false, minimum } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (integer && !Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be a safe integer`);
  }
  if (minimum !== undefined && value < minimum) {
    throw new TypeError(`${name} must be at least ${minimum}`);
  }
}

export function assertIsoTimestamp(name, value) {
  assertNonEmpty(name, value);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${name} must be an ISO timestamp`);
}

export function assertJsonValue(name, value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    assertFiniteNumber(name, value);
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${name} contains a non-JSON value`);
  }
  if (seen.has(value)) throw new TypeError(`${name} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new TypeError(`${name} contains a sparse array`);
      assertJsonValue(`${name}[${index}]`, value[index], seen);
    }
  } else {
    assertPlainObject(name, value);
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) throw new TypeError(`${name}.${key} is undefined`);
      assertJsonValue(`${name}.${key}`, item, seen);
    }
  }
  seen.delete(value);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  assertJsonValue("value", value);
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function threadStateHash(thread) {
  return `sha256:${sha256(canonicalJson(thread))}`;
}
