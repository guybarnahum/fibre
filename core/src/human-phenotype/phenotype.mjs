import {createHash} from "node:crypto";
import {inheritedAncestry, normalizeAncestry} from "./ancestry.mjs";

function unit(seed, locus) {
  const hex = createHash("sha256").update(`${seed}\0${locus}`).digest("hex").slice(0, 13);
  return Number.parseInt(hex, 16) / 0xfffffffffffff;
}

const clamp = value => Math.max(0, Math.min(1, value));
const centered = (seed, locus) => unit(seed, locus) * 2 - 1;
const band = (value, labels) => labels[Math.min(labels.length - 1, Math.floor(clamp(value) * labels.length))];

function correlatedLatent(seed) {
  const face = centered(seed, "face");
  const breadth = centered(seed, "breadth");
  const projection = centered(seed, "projection");
  const soft = centered(seed, "soft-tissue");
  const hair = centered(seed, "hair");
  const frame = centered(seed, "frame");
  const pigment = centered(seed, "pigment");
  const jitter = locus => centered(seed, locus) * 0.18;

  return {
    pigmentation: clamp(0.5 + pigment * 0.5),
    hair: clamp(0.5 + hair * 0.5),
    frame: clamp(0.5 + frame * 0.5),
    faceWidth: clamp(0.5 + 0.27 * breadth + 0.16 * face + jitter("face-width")),
    faceLength: clamp(0.5 - 0.18 * breadth + 0.25 * face + jitter("face-length")),
    jawWidth: clamp(0.5 + 0.28 * breadth + 0.13 * frame + jitter("jaw-width")),
    chinProjection: clamp(0.5 + 0.25 * projection + 0.10 * face + jitter("chin")),
    eyeSpacing: clamp(0.5 - 0.17 * breadth + jitter("eye-spacing")),
    browProminence: clamp(0.5 + 0.20 * projection + 0.10 * frame + jitter("brows")),
    noseWidth: clamp(0.5 + 0.22 * breadth + 0.12 * soft + jitter("nose-width")),
    noseProjection: clamp(0.5 + 0.30 * projection - 0.08 * breadth + jitter("nose-projection")),
    lipFullness: clamp(0.5 + 0.27 * soft + jitter("lips")),
    earProminence: clamp(0.5 + 0.22 * projection + jitter("ears")),
    hairDensity: clamp(0.5 + 0.28 * hair + jitter("hair-density")),
    heightTendency: clamp(0.5 + 0.25 * frame - 0.08 * breadth + jitter("height"))
  };
}

function semanticPhenotype(latent) {
  return {
    pigmentation: band(latent.pigmentation, ["very light","light","medium","deep","very deep"]),
    hairTexture: band(latent.hair, ["straight","wavy","curly","coily"]),
    hairDensity: band(latent.hairDensity, ["sparse","medium","dense"]),
    faceWidth: band(latent.faceWidth, ["narrow","medium","broad"]),
    faceLength: band(latent.faceLength, ["short","medium","long"]),
    jawWidth: band(latent.jawWidth, ["narrow","medium","broad"]),
    chinProjection: band(latent.chinProjection, ["soft","medium","prominent"]),
    eyeSpacing: band(latent.eyeSpacing, ["close","average","wide"]),
    browProminence: band(latent.browProminence, ["light","medium","strong"]),
    noseWidth: band(latent.noseWidth, ["narrow","medium","broad"]),
    noseProjection: band(latent.noseProjection, ["low","medium","high"]),
    lipFullness: band(latent.lipFullness, ["thin","medium","full"]),
    earProminence: band(latent.earProminence, ["close","medium","prominent"]),
    frame: band(latent.frame, ["slight","medium","broad"]),
    heightTendency: band(latent.heightTendency, ["shorter","middle","taller"])
  };
}

export function sampleInheritedPhenotype({maternalAncestry, paternalAncestry, seed}) {
  if (seed === undefined || seed === null || String(seed).length === 0) throw Error("seed is required");
  const maternal = normalizeAncestry(maternalAncestry, "maternalAncestry");
  const paternal = normalizeAncestry(paternalAncestry, "paternalAncestry");
  const ancestry = inheritedAncestry(maternal, paternal);

  // Correlated Phenotype Inheritance starts with ancestry-neutral overlapping
  // distributions. Population-conditioned shifts are deliberately deferred until
  // they can be calibrated; ancestry labels never become categorical phenotype switches.
  const latent = correlatedLatent(seed);

  return {
    ancestry: {maternal, paternal, inherited: ancestry},
    phenotype: {
      version: "human-phenotype-v0.2",
      traits: semanticPhenotype(latent),
      latent
    }
  };
}
