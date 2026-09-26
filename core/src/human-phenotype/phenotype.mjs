import {createHash} from "node:crypto";
import {inheritedAncestry, normalizeAncestry} from "./ancestry.mjs";

function unit(seed, locus) {
  const hex = createHash("sha256").update(`${seed}\0${locus}`).digest("hex").slice(0, 13);
  return Number.parseInt(hex, 16) / 0xfffffffffffff;
}

const clamp = value => Math.max(0, Math.min(1, value));
const centered = (seed, locus) => unit(seed, locus) * 2 - 1;
const band = (value, labels) => labels[Math.min(labels.length - 1, Math.floor(clamp(value) * labels.length))];

const REFERENCE_POPULATIONS = {
  afr_west:{pigmentation:.72,hair:.72,breadth:.18,projection:.02,soft:.28,frame:.04},
  afr_east:{pigmentation:.62,hair:.58,breadth:.02,projection:.12,soft:.20,frame:.02},
  eur_north:{pigmentation:-.70,hair:-.34,breadth:-.08,projection:.10,soft:-.08,frame:.08},
  eur_south:{pigmentation:-.42,hair:-.10,breadth:-.04,projection:.16,soft:.02,frame:.02},
  west_asia:{pigmentation:-.20,hair:-.06,breadth:-.02,projection:.22,soft:.04,frame:.02},
  south_asia:{pigmentation:.08,hair:-.12,breadth:-.02,projection:.10,soft:.08,frame:0},
  east_asia:{pigmentation:-.28,hair:-.62,breadth:.14,projection:-.24,soft:-.08,frame:-.02},
  southeast_asia:{pigmentation:-.02,hair:-.48,breadth:.12,projection:-.18,soft:.02,frame:-.04},
  indigenous_america:{pigmentation:-.02,hair:-.50,breadth:.12,projection:-.14,soft:.02,frame:-.02},
  oceania:{pigmentation:.46,hair:.28,breadth:.14,projection:.04,soft:.12,frame:.04}
};
const AXES=["pigmentation","hair","breadth","projection","soft","frame"];

function ancestryBasis(ancestry) {
  const total=Object.fromEntries(AXES.map(x=>[x,0]));
  let weight=0;
  for(const item of ancestry){
    const ref=item.referencePopulation&&REFERENCE_POPULATIONS[item.referencePopulation];
    if(!ref)continue;
    weight+=item.share;
    for(const axis of AXES)total[axis]+=ref[axis]*item.share;
  }
  if(weight)for(const axis of AXES)total[axis]/=weight;
  return total;
}

function parentalPrior(maternal,paternal,seed) {
  const m=ancestryBasis(maternal),p=ancestryBasis(paternal),result={};
  for(const axis of AXES){
    const maternalWeight=.25+unit(seed,`parental-${axis}`)*.5;
    result[axis]=m[axis]*maternalWeight+p[axis]*(1-maternalWeight);
  }
  return result;
}

function correlatedLatent(seed, prior) {
  const face = centered(seed, "face");
  const breadth = centered(seed, "breadth");
  const projection = centered(seed, "projection");
  const soft = centered(seed, "soft-tissue");
  const hair = centered(seed, "hair");
  const frame = centered(seed, "frame");
  const pigment = centered(seed, "pigment");
  const jitter = locus => centered(seed, locus) * 0.18;

  // Priors shift broad overlapping distributions; individual inherited variation
  // remains deliberately larger than any population shift.
  return {
    pigmentation: clamp(0.5 + pigment * 0.40 + prior.pigmentation * 0.10),
    hair: clamp(0.5 + hair * 0.40 + prior.hair * 0.10),
    frame: clamp(0.5 + frame * 0.42 + prior.frame * 0.08),
    faceWidth: clamp(0.5 + 0.23 * breadth + 0.13 * face + 0.08 * prior.breadth + jitter("face-width")),
    faceLength: clamp(0.5 - 0.16 * breadth + 0.22 * face - 0.05 * prior.breadth + jitter("face-length")),
    jawWidth: clamp(0.5 + 0.24 * breadth + 0.11 * frame + 0.07 * prior.breadth + jitter("jaw-width")),
    chinProjection: clamp(0.5 + 0.22 * projection + 0.09 * face + 0.07 * prior.projection + jitter("chin")),
    eyeSpacing: clamp(0.5 - 0.15 * breadth - 0.05 * prior.breadth + jitter("eye-spacing")),
    browProminence: clamp(0.5 + 0.18 * projection + 0.09 * frame + 0.05 * prior.projection + jitter("brows")),
    noseWidth: clamp(0.5 + 0.19 * breadth + 0.10 * soft + 0.07 * prior.breadth + 0.05 * prior.soft + jitter("nose-width")),
    noseProjection: clamp(0.5 + 0.26 * projection - 0.07 * breadth + 0.08 * prior.projection + jitter("nose-projection")),
    lipFullness: clamp(0.5 + 0.23 * soft + 0.08 * prior.soft + jitter("lips")),
    earProminence: clamp(0.5 + 0.19 * projection + 0.05 * prior.projection + jitter("ears")),
    hairDensity: clamp(0.5 + 0.24 * hair + 0.06 * prior.hair + jitter("hair-density")),
    heightTendency: clamp(0.5 + 0.22 * frame - 0.07 * breadth + 0.06 * prior.frame + jitter("height"))
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
  const prior = parentalPrior(maternal, paternal, seed);
  const latent = correlatedLatent(seed, prior);

  return {
    ancestry: {maternal, paternal, inherited: ancestry},
    phenotype: {
      version: "human-phenotype-v0.5",
      traits: semanticPhenotype(latent),
      latent,
      experimentalPopulationPrior: prior
    }
  };
}
