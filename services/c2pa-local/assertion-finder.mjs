function decodeAssertionData(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); }
  catch { return value; }
}

function labelMatches(observed, expected) {
  return typeof observed === "string" && observed.startsWith(expected);
}

export function activeManifestFromStore(store) {
  if (store === null || typeof store !== "object" || Array.isArray(store)) return null;
  const activeLabel = store.active_manifest ?? store.activeManifest ?? null;
  if (typeof activeLabel === "string" && store.manifests && typeof store.manifests === "object") {
    return store.manifests[activeLabel] ?? null;
  }
  return null;
}

export function describeC2paAssertions(value) {
  if (value === null || typeof value !== "object") return [];
  const assertions = Array.isArray(value.assertions) ? value.assertions : [];
  return assertions.map((item) => {
    if (!item || typeof item !== "object") return "<invalid assertion>";
    const label = typeof item.label === "string" ? item.label : "<no label>";
    const kind = typeof item.kind === "string" ? item.kind : "unknown-kind";
    const instance = Number.isInteger(item.instance) ? `#${item.instance}` : "";
    const dataType = Array.isArray(item.data) ? "array" : typeof item.data;
    return `${label}${instance} (${kind}, data=${dataType})`;
  });
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

  if (labelMatches(value.label, assertionLabel) && value.data !== undefined) {
    return decodeAssertionData(value.data);
  }

  for (const [key, candidate] of Object.entries(value)) {
    if (!labelMatches(key, assertionLabel)) continue;
    if (candidate?.data !== undefined) return decodeAssertionData(candidate.data);
    return decodeAssertionData(candidate);
  }

  for (const item of Object.values(value)) {
    const found = findC2paAssertion(item, assertionLabel, seen);
    if (found !== null) return found;
  }
  return null;
}
