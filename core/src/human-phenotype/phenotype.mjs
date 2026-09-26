import {createHash} from "node:crypto";
import {inheritedAncestry, normalizeAncestry} from "./ancestry.mjs";

function unit(seed, locus) {
  const hex = createHash("sha256").update(`${seed}\0${locus}`).digest("hex").slice(0, 13);
  return Number.parseInt(hex, 16) / 0xfffffffffffff;
}

export function sampleInheritedPhenotype({maternalAncestry, paternalAncestry, seed}) {
  if (seed === undefined || seed === null || String(seed).length === 0) throw Error("seed is required");
  const maternal = normalizeAncestry(maternalAncestry, "maternalAncestry");
  const paternal = normalizeAncestry(paternalAncestry, "paternalAncestry");
  const ancestry = inheritedAncestry(maternal, paternal);

  // The Physical Inheritance Contract proves the inheritance boundary, not calibrated morphology.
  // These latent coordinates remain ancestry-neutral until Correlated Phenotype Inheritance
  // supplies reviewed population-conditioned priors and correlations.
  const latent = {
    craniofacial: unit(seed, "craniofacial"),
    pigmentation: unit(seed, "pigmentation"),
    hair: unit(seed, "hair"),
    frame: unit(seed, "frame")
  };

  return {
    ancestry: {maternal, paternal, inherited: ancestry},
    phenotype: {version: "human-phenotype-v0.1", latent}
  };
}
