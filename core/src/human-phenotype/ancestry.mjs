const clamp01 = value => Math.max(0, Math.min(1, Number(value)));

export function normalizeAncestry(ancestry, label = "ancestry") {
  if (!Array.isArray(ancestry) || ancestry.length === 0) throw Error(`${label} is required`);
  const merged = new Map();
  for (const item of ancestry) {
    const population = String(item?.population ?? "").trim(), share = Number(item?.share);
    const sourceLatitude = item?.sourceLatitude == null ? null : Number(item.sourceLatitude);\n    const referencePopulation = item?.referencePopulation == null ? null : String(item.referencePopulation).trim();
    if (!population || !Number.isFinite(share) || share <= 0) throw Error(`${label} must contain positive population shares`);
    if (sourceLatitude !== null && (!Number.isFinite(sourceLatitude) || sourceLatitude < -90 || sourceLatitude > 90)) throw Error(`${label} sourceLatitude must be -90..90`);
    const x=merged.get(population)??{share:0,latitudeWeight:0,latitudeShare:0,referencePopulation}; x.share+=share;\n    if(referencePopulation && x.referencePopulation && referencePopulation!==x.referencePopulation) throw Error(`${label} population has conflicting reference populations`);\n    if(referencePopulation)x.referencePopulation=referencePopulation;
    if(sourceLatitude!==null){x.latitudeWeight+=sourceLatitude*share;x.latitudeShare+=share} merged.set(population,x);
  }
  const total=[...merged.values()].reduce((n,x)=>n+x.share,0);
  return [...merged.entries()].sort(([x],[y])=>x.localeCompare(y)).map(([population,x])=>({population,share:clamp01(x.share/total),...(x.latitudeShare?{sourceLatitude:x.latitudeWeight/x.latitudeShare}:{}),...(x.referencePopulation?{referencePopulation:x.referencePopulation}:{})}));
}

export function inheritedAncestry(maternalAncestry, paternalAncestry) {
  const maternal=normalizeAncestry(maternalAncestry,"maternalAncestry"),paternal=normalizeAncestry(paternalAncestry,"paternalAncestry"),mixed=new Map();
  for(const item of [...maternal.map(x=>({...x,share:x.share*0.5})),...paternal.map(x=>({...x,share:x.share*0.5}))]){
    const x=mixed.get(item.population)??{share:0,latitudeWeight:0,latitudeShare:0,referencePopulation:item.referencePopulation};x.share+=item.share;\n    if(item.referencePopulation)x.referencePopulation=item.referencePopulation;
    if(item.sourceLatitude!=null){x.latitudeWeight+=item.sourceLatitude*item.share;x.latitudeShare+=item.share}mixed.set(item.population,x);
  }
  return [...mixed.entries()].sort(([x],[y])=>x.localeCompare(y)).map(([population,x])=>({population,share:x.share,...(x.latitudeShare?{sourceLatitude:x.latitudeWeight/x.latitudeShare}:{}),...(x.referencePopulation?{referencePopulation:x.referencePopulation}:{})}));
}
