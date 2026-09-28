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
  "kayser-2008-polynesian-autosomal":Object.freeze({
    title:"Genome-wide analysis indicates more Asian than Melanesian ancestry of Polynesians",
    year:2008,
    cohort:"47 Pacific Islanders including Cook Islanders, Tongans, Samoans, Tokelau Islanders and Niue Islanders",
    method:"377 autosomal STR loci with East-Asian and Papua-New-Guinea comparison samples",
    doi:"10.1016/j.ajhg.2007.09.010",
    pmid:"18179899",
    pmcid:"PMC2253960",
  }),
  "gill-2015-east-polynesian-synthesis":Object.freeze({
    title:"East Polynesian and Paleoindian parallels and contrasts in skeletal morphology",
    year:2015,
    cohort:"East Polynesian comparative synthesis",
    method:"comparative biological anthropology / skeletal morphology review",
  }),
});

const claim=(direction,confidence,sources,notes)=>Object.freeze({
  direction,
  confidence,
  sources:Object.freeze([...sources]),
  notes,
});

export const humanAppearanceCalibrationBases=Object.freeze({
  "oceania.polynesia":Object.freeze({
    confidence:"low",
    sources:Object.freeze(["kayser-2008-polynesian-autosomal","buck-2012-polynesia"]),
    basis:Object.freeze([
      Object.freeze({referencePopulation:"east_asia",share:.79}),
      Object.freeze({referencePopulation:"oceania",share:.21}),
    ]),
    notes:"This is a population-history-informed whole-profile starting prior, not a claim that visible phenotype is a linear 79/21 ancestry mixture. Kayser et al. estimate about 79% East-Asian-related and 21% Melanesian-related autosomal ancestry in their Polynesian sample; Buck et al. independently show a coherent Polynesian craniofacial grouping with substantial internal diversity. Direct anatomical evidence must still override individual Fibre loci.",
  }),
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
    faceBreadth:claim(
      "higher than current broad oceania parent",
      "moderate",
      ["buck-2012-polynesia","antoun-2014-maori"],
      "Māori 3D data directly supports a broader overall face; multi-population Polynesian geometric morphometrics supports real craniofacial size/shape structure across Polynesia.",
    ),
    faceLength:claim(
      "slightly higher than current broad oceania parent",
      "low",
      ["schendel-1980-hawaiian","kean-houghton-1982-polynesian"],
      "Historical craniofacial samples support greater facial height, but mapping skeletal/cephalometric height into Fibre faceLength is indirect and therefore deliberately low-confidence.",
    ),
    chinProjection:claim(
      "higher than current broad oceania parent",
      "moderate",
      ["antoun-2014-maori"],
      "Māori 3D facial data directly reports a more anterior chin position after BMI adjustment.",
    ),
  }),
});
