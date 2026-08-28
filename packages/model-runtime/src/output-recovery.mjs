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
