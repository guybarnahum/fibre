function decodeAssertionData(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); }
  catch { return value; }
}

export function findC2paAssertion(value, assertionLabel, seen = new Set()) {
  if (typeof assertionLabel !== "string" || assertionLabel.length === 0) {
    throw new TypeError("assertionLabel must be non-empty");
  }
  if (value === null || typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findC2paAssertion(item, assertionLabel, seen);
      if (found !== null) return found;
    }
    return null;
  }

  if (typeof value.label === "string"
    && value.label.startsWith(assertionLabel)
    && value.data !== undefined) {
    return decodeAssertionData(value.data);
  }

  for (const [key, candidate] of Object.entries(value)) {
    if (!key.startsWith(assertionLabel)) continue;
    if (candidate?.data !== undefined) return decodeAssertionData(candidate.data);
    return decodeAssertionData(candidate);
  }

  for (const item of Object.values(value)) {
    const found = findC2paAssertion(item, assertionLabel, seen);
    if (found !== null) return found;
  }
  return null;
}
