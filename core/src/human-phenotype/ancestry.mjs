const clamp01 = value => Math.max(0, Math.min(1, Number(value)));

export function normalizeAncestry(ancestry, label = "ancestry") {
  if (!Array.isArray(ancestry) || ancestry.length === 0) throw Error(`${label} is required`);
  const merged = new Map();

  for (const item of ancestry) {
    const population = String(item?.population ?? "").trim();
    const populationId = item?.populationId == null ? null : String(item.populationId).trim();
    const share = Number(item?.share);
    const referencePopulation = item?.referencePopulation == null
      ? null
      : String(item.referencePopulation).trim();

    if (!population || !Number.isFinite(share) || share <= 0) {
      throw Error(`${label} must contain positive population shares`);
    }

    const key = populationId ?? population;
    const current = merged.get(key) ?? {population, populationId, share: 0, referencePopulation};
    if (
      referencePopulation &&
      current.referencePopulation &&
      referencePopulation !== current.referencePopulation
    ) {
      throw Error(`${label} population has conflicting reference populations`);
    }

    current.share += share;
    if (referencePopulation) current.referencePopulation = referencePopulation;
    if (populationId && current.populationId && populationId !== current.populationId) {
      throw Error(`${label} population has conflicting population ids`);
    }
    current.population = population;
    if (populationId) current.populationId = populationId;
    merged.set(key, current);
  }

  const total = [...merged.values()].reduce((sum, item) => sum + item.share, 0);
  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, item]) => ({
      population:item.population,
      ...(item.populationId ? {populationId:item.populationId} : {}),
      share: clamp01(item.share / total),
      ...(item.referencePopulation ? {referencePopulation: item.referencePopulation} : {})
    }));
}

export function inheritedAncestry(maternalAncestry, paternalAncestry) {
  const maternal = normalizeAncestry(maternalAncestry, "maternalAncestry");
  const paternal = normalizeAncestry(paternalAncestry, "paternalAncestry");
  const mixed = new Map();

  for (const item of [
    ...maternal.map(value => ({...value, share: value.share * 0.5})),
    ...paternal.map(value => ({...value, share: value.share * 0.5}))
  ]) {
    const key = item.populationId ?? item.population;
    const current = mixed.get(key) ?? {
      population:item.population,
      populationId:item.populationId ?? null,
      share: 0,
      referencePopulation: item.referencePopulation
    };
    current.share += item.share;
    if (item.referencePopulation) current.referencePopulation = item.referencePopulation;
    mixed.set(key, current);
  }

  return [...mixed.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, item]) => ({
      population:item.population,
      ...(item.populationId ? {populationId:item.populationId} : {}),
      share: item.share,
      ...(item.referencePopulation ? {referencePopulation: item.referencePopulation} : {})
    }));
}
