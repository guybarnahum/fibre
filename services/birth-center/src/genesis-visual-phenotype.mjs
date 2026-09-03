import { sha256 } from "./genesis-development-contracts.mjs";
import { GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY } from "fibre/world-kernel/genesis-authority-contracts";

const LOCI = Object.freeze({
  face: Object.freeze([
    "softly angular oval face with a slightly broader upper face than jaw",
    "long oval face with gently tapered cheeks and a compact lower face",
    "rounded-rectangular face with moderate cheek width and a softly defined jaw",
    "heart-leaning oval face with wider cheekbones and a narrow rounded chin",
  ]),
  eyes: Object.freeze([
    "wide-set deep-brown almond-shaped eyes with a slight downward tilt at the outer corners",
    "medium-set hazel almond-shaped eyes with mildly hooded upper lids and visible lower-lid contour",
    "close-to-medium-set dark-brown round-almond eyes with a subtle upward outer-corner tilt",
    "medium-set green-brown almond eyes with a deeper right upper-lid fold than left",
  ]),
  brows: Object.freeze([
    "straight medium-width brows with the left arch slightly higher than the right",
    "dense gently arched brows with a shorter right tail",
    "fine mostly straight brows with a subtle break over the left pupil",
    "broad low arches with mild natural asymmetry between the inner corners",
  ]),
  nose: Object.freeze([
    "narrow straight nasal bridge with a rounded tip and modest nostril width",
    "medium-width bridge with a slight convexity in profile and softly defined tip",
    "short straight bridge with a broader rounded tip and compact alar width",
    "long narrow bridge with a faint leftward deviation and a tapered tip",
  ]),
  mouth: Object.freeze([
    "defined cupid's bow with a medium upper lip and fuller lower lip",
    "wide mouth with a shallow cupid's bow and nearly even upper-to-lower lip volume",
    "compact mouth with a pronounced central upper-lip peak and softly fuller lower lip",
    "medium-width mouth with an asymmetric smile line, the right corner resting slightly higher",
  ]),
  jaw: Object.freeze([
    "tapered lower face with moderately defined jaw corners and a rounded slightly projecting chin",
    "soft jawline with a compact rounded chin and mild left-right asymmetry",
    "moderately square jaw with softened angles and a broad rounded chin",
    "narrow jaw with a longer chin and a slight rightward chin-point offset",
  ]),
  skin: Object.freeze([
    "medium warm-beige skin with ordinary visible texture and scattered fine freckles across the upper cheeks",
    "light-medium neutral-olive skin with visible pores and a small concentration of freckles near the nose",
    "deep neutral-brown skin with ordinary visible texture and subtle tonal variation across the cheeks",
    "light warm skin with ordinary visible texture, faint cheek redness, and a few small sun freckles",
  ]),
  hair: Object.freeze([
    "thick dark-brown wavy hair with a subtly uneven natural hairline and a small left temple recession",
    "dense near-black loosely curled hair with a rounded hairline and a slight right-side cowlick",
    "medium-brown straight-to-wavy hair with a high natural hairline and a pronounced left frontal cowlick",
    "dark-blond coarse wavy hair with a low irregular hairline and slightly thinner density at the right temple",
  ]),
  ears: Object.freeze([
    "attached earlobes with the left ear sitting marginally higher",
    "small detached earlobes with a slightly more prominent right helix",
    "medium attached earlobes and a subtle outward flare of the left upper ear",
    "detached earlobes with the right ear marginally closer to the head",
  ]),
  build: Object.freeze([
    "lean-to-average skeletal frame with relaxed shoulders and a relatively long neck",
    "compact average frame with level shoulders and a medium-length neck",
    "slender frame with narrow shoulders and a long neck",
    "average-to-broad frame with gently sloped shoulders and a shorter neck",
  ]),
  marks: Object.freeze([
    "small pale diagonal scar above the outer left eyebrow",
    "small dark mole below the right cheekbone",
    "faint narrow scar near the left side of the chin",
    "two small freckles close together below the outer right eye",
  ]),
});

const ORDER = Object.freeze(Object.keys(LOCI));
const encoder = new TextEncoder();

function indexFor(seed, domain, length) {
  const digest = sha256(`${seed}:${domain}`);
  return Number.parseInt(digest.slice(0, 8), 16) % length;
}

export function deNovoVisualPhenotypeLoci({ threadId } = {}) {
  if (typeof threadId !== "string" || threadId.trim() === "") throw new TypeError("threadId is required");
  return Object.freeze(ORDER.map((domain) => Object.freeze({
    domain,
    value: LOCI[domain][indexFor(threadId, domain, LOCI[domain].length)],
    provenance: Object.freeze({ kind: "de_novo", sourceLocusRef: null, mutationRef: null }),
  })));
}

export function buildDeNovoCanonicalVisualIdentity({ threadId } = {}) {
  const loci = deNovoVisualPhenotypeLoci({ threadId });
  const subjectDescription = loci.map((locus) => locus.value).join("; ");
  if (encoder.encode(subjectDescription).byteLength < 500) {
    throw new Error("canonical visual phenotype is too thin for durable cross-age identity");
  }
  return Object.freeze({
    policyRef: GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY,
    specification: Object.freeze({
      subject: Object.freeze({ partyId: threadId, description: subjectDescription }),
      method: "canonical synthetic portrait specification from deterministic textual phenotype loci",
      description: "Preserve the listed geometry, proportions, stable marks, asymmetries, hairline, and other identity cues across age transformations. Treat age, grooming, hairstyle, clothing, expression, weight variation, and temporary injury as time-local appearance rather than replacements for canonical identity. Render a neutral head-and-shoulders reference at normalized age 25, mostly frontal, both ears and hairline visible, ordinary skin texture, even daylight-balanced illumination, and ordinary perspective without glamour or stylization drift.",
      model: "replaceable-renderer",
    }),
  });
}
