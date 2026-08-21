export const INFRA_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

export function assertInfraNonEmpty(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${name} is required`);
}

export function assertInfraId(name, value) {
  assertInfraNonEmpty(name, value);
  if (!INFRA_ID_PATTERN.test(value)) throw new TypeError(`${name} has an invalid format`);
}

export function assertInfraPlainObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
}

export function assertInfraFiniteNumber(name, value, { integer = false, minimum } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (integer && !Number.isSafeInteger(value)) throw new TypeError(`${name} must be a safe integer`);
  if (minimum !== undefined && value < minimum) throw new TypeError(`${name} must be at least ${minimum}`);
}

export function assertInfraJsonValue(name, value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    assertInfraFiniteNumber(name, value);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${name} contains a non-JSON value`);
  if (seen.has(value)) throw new TypeError(`${name} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new TypeError(`${name} contains a sparse array`);
      assertInfraJsonValue(`${name}[${index}]`, value[index], seen);
    }
  } else {
    assertInfraPlainObject(name, value);
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) throw new TypeError(`${name}.${key} is undefined`);
      assertInfraJsonValue(`${name}.${key}`, item, seen);
    }
  }
  seen.delete(value);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function infraCanonicalJson(value) {
  assertInfraJsonValue("value", value);
  return JSON.stringify(canonicalize(value));
}
