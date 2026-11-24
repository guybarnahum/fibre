function isSchemaObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function canonicalKey(value) {
  return JSON.stringify(canonicalize(value));
}

function propertyPath(path, key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function recoverString(value, schema, path, recoveries) {
  if (!Number.isSafeInteger(schema.maxLength) || schema.maxLength < 0) return value;
  const codePoints = [...value];
  if (codePoints.length <= schema.maxLength) return value;
  const recovered = codePoints.slice(0, schema.maxLength).join("");
  recoveries.push(Object.freeze({
    kind: "deterministic_normalization",
    constraint: "maxLength",
    path,
    action: "truncate_codepoints_preserve_prefix",
    beforeLength: codePoints.length,
    afterLength: schema.maxLength,
    removedCodePoints: codePoints.length - schema.maxLength,
  }));
  return recovered;
}

function recoverValue(value, schema, path, recoveries) {
  if (!isSchemaObject(schema)) return structuredClone(value);

  if (typeof value === "string") {
    return recoverString(value, schema, path, recoveries);
  }

  if (Array.isArray(value)) {
    const recoveredItems = value.map((item, index) =>
      recoverValue(item, schema.items, `${path}[${index}]`, recoveries));

    if (schema.uniqueItems !== true) return recoveredItems;

    const seen = new Set();
    const deduplicated = [];
    for (const item of recoveredItems) {
      const key = canonicalKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      deduplicated.push(item);
    }

    const removedItems = recoveredItems.length - deduplicated.length;
    if (removedItems > 0) {
      recoveries.push(Object.freeze({
        kind: "deterministic_normalization",
        constraint: "uniqueItems",
        path,
        action: "deduplicate_preserve_first",
        beforeCount: recoveredItems.length,
        afterCount: deduplicated.length,
        removedItems,
      }));
    }
    return deduplicated;
  }

  if (value !== null && typeof value === "object" && isSchemaObject(schema.properties)) {
    const recovered = structuredClone(value);
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      if (!Object.hasOwn(value, key)) continue;
      recovered[key] = recoverValue(value[key], propertySchema, propertyPath(path, key), recoveries);
    }
    return recovered;
  }

  return structuredClone(value);
}

export function recoverModelOutput({ output, responseSchema } = {}) {
  if (!isSchemaObject(responseSchema)) throw new TypeError("model output recovery requires a responseSchema object");
  const recoveries = [];
  const recovered = recoverValue(output, responseSchema, "$", recoveries);
  return Object.freeze({
    output: recovered,
    recoveries: Object.freeze(recoveries.map((item) => structuredClone(item))),
  });
}

// Where an answer misses its schema — a type, an enumerated value, a required
// or unknown field, too many or too few items — as a path, or null when it
// meets it. For providers that honour a schema only on a best-effort basis:
// an answer that misses it is a mechanical failure, asked again, never judged.
export function schemaMiss(value, schema, path = "$") {
  if (!isSchemaObject(schema)) return null;
  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf.some((branch) => schemaMiss(value, branch, path) === null) ? null : `${path} (no allowed form)`;
  }
  const types = schema.type === undefined ? null : [schema.type].flat();
  const typeOf = value === null ? "null" : Array.isArray(value) ? "array"
    : Number.isInteger(value) ? "integer" : typeof value;
  if (types !== null && !types.includes(typeOf) && !(typeOf === "integer" && types.includes("number"))) {
    return `${path} (${typeOf}, not ${types.join(" or ")})`;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => canonicalKey(item) === canonicalKey(value))) return `${path} (not an allowed value)`;
  if (Array.isArray(value)) {
    if (Number.isSafeInteger(schema.minItems) && value.length < schema.minItems) return `${path} (too few items)`;
    if (Number.isSafeInteger(schema.maxItems) && value.length > schema.maxItems) return `${path} (too many items)`;
    for (let index = 0; index < value.length; index += 1) {
      const miss = schemaMiss(value[index], schema.items, `${path}[${index}]`);
      if (miss !== null) return miss;
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    const properties = isSchemaObject(schema.properties) ? schema.properties : {};
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) return `${propertyPath(path, key)} (missing)`;
    for (const [key, item] of Object.entries(value)) {
      if (!Object.hasOwn(properties, key)) {
        if (schema.additionalProperties === false) return `${propertyPath(path, key)} (not asked for)`;
        continue;
      }
      const miss = schemaMiss(item, properties[key], propertyPath(path, key));
      if (miss !== null) return miss;
    }
  }
  return null;
}
