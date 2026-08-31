import { createHash } from "node:crypto";

function assertPlainObject(name, value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${name} must be a plain object`);
  }
}

function assertFiniteNumber(name, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function assertJsonValue(name, value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    assertFiniteNumber(name, value);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${name} contains a non-JSON value`);
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

export function canonicalDigest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

export function rawTextDigest(value) {
  return `sha256:${sha256(value)}`;
}
