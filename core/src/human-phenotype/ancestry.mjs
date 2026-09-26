const clamp01 = value => Math.max(0, Math.min(1, Number(value)));

export function normalizeAncestry(ancestry, label = "ancestry") {
  if (!Array.isArray(ancestry) || ancestry.length === 0) throw Error(`${label} is required`);
  const merged = new Map();
  for (const item of ancestry) {
    const population = String(item?.population ?? "").trim();
    const share = Number(item?.share);
    if (!population || !Number.isFinite(share) || share <= 0) throw Error(`${label} must contain positive population shares`);
    merged.set(population, (merged.get(population) ?? 0) + share);
  }
  const total = [...merged.values()].reduce((a, b) => a + b, 0);
  return [...merged.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([population, share]) => ({
    population,
    share: clamp01(share / total)
  }));
}

export function inheritedAncestry(maternalAncestry, paternalAncestry) {
  const maternal = normalizeAncestry(maternalAncestry, "maternalAncestry");
  const paternal = normalizeAncestry(paternalAncestry, "paternalAncestry");
  const mixed = new Map();
  for (const item of maternal) mixed.set(item.population, (mixed.get(item.population) ?? 0) + item.share * 0.5);
  for (const item of paternal) mixed.set(item.population, (mixed.get(item.population) ?? 0) + item.share * 0.5);
  return [...mixed.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([population, share]) => ({population, share}));
}
