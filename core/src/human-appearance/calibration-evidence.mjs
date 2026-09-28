// Offline calibration provenance for Human Appearance.
//
// Deliberately NOT imported by founder sampling or rendering. Runtime only needs
// the calibrated prior values; research provenance stays inspectable without
// adding work to birth, inheritance, or portrait generation.

export const HUMAN_APPEARANCE_CONFIDENCE=Object.freeze([
  "low",
  "moderate",
  "high",
]);

export const humanAppearanceCalibrationSources=Object.freeze({
  "buck-2012-polynesia":Object.freeze({
    title:"Craniofacial evolution in Polynesia: a geometric morphometric study of population diversity",
    year:2012,
    cohort:"multiple Oceanic / Polynesian population samples",
    method:"3D geometric morphometrics",
    doi:"10.1002/ajhb.22315",
  }),
  "antoun-2014-maori":Object.freeze({
    title:"A three-dimensional evaluation of Māori and New Zealand European faces",
    year:2014,
    cohort:"30 Māori and 30 New Zealand European young adults, age/gender matched",
    method:"3D white-light facial scanning with anthropometric landmarks",
    doi:"10.2478/aoj-2014-0014",
    pmid:"25549519",
  }),
  "schendel-1980-hawaiian":Object.freeze({
    title:"Hawaiian craniofacial morphometrics: average Mokapuan skull, artificial cranial deformation, and the rocker mandible",
    year:1980,
    cohort:"79 adult Hawaiian skulls from Mokapu, Oahu",
    method:"computer craniofacial morphometrics / cephalometry",
    doi:"10.1002/ajpa.1330520406",
    pmid:"7386611",
  }),
  "kean-houghton-1982-polynesian":Object.freeze({
    title:"The Polynesian head: growth and form",
    year:1982,
    cohort:"adult Polynesian craniofacial material",
    method:"craniofacial growth and morphology analysis",
    pmid:"7174512",
    pmcid:"PMC1168245",
  }),
  "sullivan-1922-tongan":Object.freeze({
    title:"A contribution to Tongan somatology",
    year:1922,
    cohort:"225 adult and adolescent Tongans",
    method:"direct anthropometry plus categorical skin, hair, eye and nasal observations",
  }),
  "coltman-2000-maori":Object.freeze({
    title:"Craniofacial form and obstructive sleep apnea in Polynesian and Caucasian men",
    year:2000,
    cohort:"New Zealand Māori (Polynesian) and European men with matched OSA severity",
    method:"lateral and postero-anterior cephalometric radiography",
    doi:"10.1093/sleep/23.7.1h",
    pmid:"11083603",
  }),
  "kean-houghton-1990-polynesian":Object.freeze({
    title:"Polynesian face and dentition: functional perspective",
    year:1990,
    cohort:"Polynesian craniofacial and dentofacial material",
    method:"craniofacial anthropometry / functional morphology synthesis",
    doi:"10.1002/ajpa.1330820311",
    pmid:"2375384",
  }),
});

const claim=(direction,confidence,sources,notes)=>Object.freeze({
  direction,
  confidence,
  sources:Object.freeze([...sources]),
  notes,
});

// Confidence is per Fibre-locus mapping, not per population.
// A source can support several overlapping nodes; a node can use several
// partially overlapping sources. Do not collapse that into one population score.
export const humanAppearanceVariationProfiles=Object.freeze({
  "oceania.polynesia":Object.freeze({
    confidence:"low",
    sources:Object.freeze(["buck-2012-polynesia"]),
    familyFactorMultiplier:1.12,
    structuralResidualMultiplier:.90,
    notes:"Buck et al. report considerable diversity within a coherent Polynesian craniofacial grouping. Fibre represents that with slightly stronger shared family factors and slightly less independent structural noise. The multiplier values are model calibration choices, not measured biological effect sizes.",
  }),
});

export const humanAppearanceCalibrationEvidence=Object.freeze({
  "oceania.polynesia":Object.freeze({
    pigmentation:claim(
      "centered on medium-brown rather than light or very-deep extremes",
      "moderate",
      ["sullivan-1922-tongan"],
      "The Tongan series directly records unexposed skin around medium-brown categories. Mapping the historical color scale into Fibre's normalized pigmentation coordinate remains approximate.",
    ),
    hairForm:claim(
      "straight-to-low-waved center",
      "moderate",
      ["sullivan-1922-tongan"],
      "The Tongan series reports straight and low-waved hair as the two dominant forms, together covering the large majority of observed subjects; deeper waves and curls remain part of the tail rather than the center.",
    ),
    faceBreadth:claim(
      "broad",
      "moderate",
      ["buck-2012-polynesia","antoun-2014-maori","coltman-2000-maori","sullivan-1922-tongan"],
      "Modern Māori 3D/cephalometric studies and historical Tongan measurements consistently support a broad/large craniofacial skeleton.",
    ),
    faceLength:claim(
      "slightly above neutral",
      "low",
      ["schendel-1980-hawaiian","kean-houghton-1982-polynesian","sullivan-1922-tongan"],
      "Several craniofacial sources support substantial facial height, but skeletal/cephalometric height maps only indirectly to Fibre faceLength.",
    ),
    eyeShape:claim(
      "slightly narrower than neutral, not East-Asian-template narrow",
      "low",
      ["sullivan-1922-tongan"],
      "The historical Tongan description reports eye openings less wide than European comparison subjects and somewhat oblique; this supports only a small shift.",
    ),
    epicanthicFold:claim(
      "low-frequency / slight expression",
      "low",
      ["sullivan-1922-tongan"],
      "The same Tongan series describes only a suggestion of an epicanthic fold in common types and summarizes the fold as low-frequency. Fibre therefore centers on slight rather than present/pronounced expression.",
    ),
    noseBreadth:claim(
      "moderately broad",
      "moderate",
      ["sullivan-1922-tongan","coltman-2000-maori"],
      "Tongan nasal indices and absolute width support a moderately broad nose; Māori/Polynesian cephalometry also identifies a broad bony nasal aperture.",
    ),
    nasalBridgeHeight:claim(
      "medium-to-low",
      "low",
      ["sullivan-1922-tongan"],
      "The Tongan series describes the nasal bridge as prevailing at medium or low elevation. Mapping that qualitative observation to Fibre's bridge-height coordinate is conservative.",
    ),
    jawBreadth:claim(
      "broad / robust lower face",
      "moderate",
      ["sullivan-1922-tongan","coltman-2000-maori","kean-houghton-1990-polynesian"],
      "Large bigonial width, a larger craniofacial skeleton and a large robust mandible all support a broader lower-face center.",
    ),
    chinProjection:claim(
      "more anterior / prominent",
      "moderate",
      ["antoun-2014-maori","coltman-2000-maori"],
      "Māori 3D data reports a more anterior chin position and Polynesian cephalometry reports larger, more prognathic mandibles.",
    ),
  }),
});
