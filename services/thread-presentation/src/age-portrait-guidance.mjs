/**
 * Age-specific anatomical guidance for portraits of one continuous person.
 * Boundaries organize the prompt; they are not biological discontinuities.
 */
const stages=[
  {min:3,max:6,name:"early childhood",
    anatomy:"Reconstruct early-childhood craniofacial proportions: relatively short lower face and jaw, developing nose and midface, fuller cheeks and age-appropriate facial volume. This must look like an actual young child, never an adult face with softened skin."},
  {min:7,max:12,name:"late childhood / preteen",
    anatomy:"Reconstruct a real school-age child or preteen: child-appropriate facial height, shorter and less mature jaw and chin, developing nose and midface, naturally youthful cheeks and soft tissue. Do not retain the canonical adult skull and jaw proportions or create an adult-looking teenager."},
  {min:13,max:17,name:"adolescence",
    anatomy:"Show gradual, individually variable adolescent craniofacial maturation, including evolving jaw, chin, nose, midface and skin characteristics. A young teenager must not look like a mature 17-year-old or a smoothed adult. Do not assume puberty progresses on a fixed schedule."},
  {min:18,max:29,name:"young adulthood",
    anatomy:"Depict realistic transition into adult facial proportions and possible continued maturation during the early adult years. Preserve individual variation, natural skin texture and developing contours, without beautifying or freezing the canonical age-25 face."},
  {min:30,max:59,name:"adulthood",
    anatomy:"Depict gradual, individually variable adult maturation: subtle to increasing changes in facial volume, skin texture, eyelids and contours as appropriate to the exact age. Neither exaggerate decade stereotypes nor preserve a frozen age-25 face."},
  {min:60,max:74,name:"older adulthood",
    anatomy:"Allow realistic older-adult changes in facial fat distribution, skin elasticity and texture, eyelids, cheek and jaw contours, and neck. Keep the person's distinctive likeness and individual aging variation; avoid caricature or cosmetic smoothing."},
  {min:75,max:95,name:"advanced age",
    anatomy:"Reconstruct credible advanced old age, allowing substantial but individually variable facial-volume loss, skin laxity and folds, eyelid and neck aging, changing cheeks and lower-face contours, and naturally aged hair. Do not merely gray the hair or preserve digitally youthful skin; avoid exaggerated frailty."},
];

/** Compose one identity anchor, one biological stage and the exact requested age. */
export function agePortraitBrief(targetAgeYears){
  if(!Number.isSafeInteger(targetAgeYears)||targetAgeYears<3||targetAgeYears>95
    ||targetAgeYears===25)throw new TypeError("portrait age must be 3–95, excluding canonical age 25");
  const i=stages.findIndex(stage=>targetAgeYears>=stage.min&&targetAgeYears<=stage.max);
  const stage=stages[i];
  // Only a continuity reminder near a boundary, not a contradictory second
  // anatomy template; age 12 must not be pulled forward to a mature teen.
  const neighbor=targetAgeYears===stage.min?stages[i-1]
    :targetAgeYears===stage.max?stages[i+1]:null;
  const transition=neighbor
    ?`Development near the ${neighbor.name} / ${stage.name} boundary is gradual and varies by individual. Do not make a sudden anatomical leap; the target is exactly age ${targetAgeYears}.`
    :"";
  return {
    description:[
      `Generate a natural head-and-shoulders portrait of this SAME individual at exactly age ${targetAgeYears}, not merely someone within a broad age category.`,
      "The canonical first image shows the individual at age 25 and establishes identity, not immutable adult facial geometry. Other supplied reference images, if any, show this same person at different admitted ages.",
      `Developmental guidance (${stage.name}): ${stage.anatomy}`,
      transition,
      "Keep recognizable individual facial characteristics while allowing realistic anatomical development or aging. The person need not retain the adult portrait's hairstyle, pose or expression.",
    ].filter(Boolean).join(" "),
    constraints:[
      "The canonical age-25 reference remains identity authority; other age-local references guide development only.",
      "Preserve distinctive features and natural asymmetry while letting bone proportions and soft tissue change plausibly with age.",
      "Do not cosmetically de-age, apply superficial wrinkle filters, impose fixed gendered maturation, or beautify.",
      "Use ordinary neutral portrait lighting and a simple background; avoid copying a reference image's exact pose or hairstyle.",
      "No text, labels, cards, graphics or watermark.",
    ],
  };
}
