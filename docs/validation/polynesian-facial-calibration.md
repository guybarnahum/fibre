---
id: polynesian-facial-calibration
status: active
last-reviewed: 2026-09-28
---

# Polynesian facial calibration

## Purpose

This note records the evidence behind Fibre's first Oceania / Polynesia calibration.

The goal is not to make a stereotypically recognizable Polynesian face. The goal is narrower: when Fibre must instantiate a missing biological parent from explicit Polynesian physical-lineage evidence, the founder distribution should reflect measured craniofacial tendencies while preserving substantial individual overlap and variation.

Population labels never cross the rendering boundary.

## Current hierarchy

~~~text
oceania
  polynesia
    native_hawaiian
    samoan
    tongan
    maori
    other
  micronesia
  melanesia
~~~

The island-specific Polynesian children currently inherit the shared oceania.polynesia prior. This preserves lineage specificity without inventing island-specific morphology.

## Source and confidence model

Confidence is attached to the mapping from evidence to a Fibre locus, not to the whole population.

A source can support several overlapping nodes, and a node can draw from several partially overlapping cohorts.

The reusable source records live in core/src/human-appearance/calibration-evidence.mjs.

### faceBreadth — moderate confidence

Current direction: higher than the broad oceania parent.

Evidence:

- Antoun et al., "A three-dimensional evaluation of Māori and New Zealand European faces" (2014), DOI 10.2478/aoj-2014-0014, PMID 25549519. Thirty Māori and thirty NZ European young adults were age/gender matched and scanned in 3D. Māori faces were significantly larger overall and broader, including after BMI adjustment.
- Buck, "Craniofacial evolution in Polynesia: a geometric morphometric study of population diversity" (2012), DOI 10.1002/ajhb.22315. Three-dimensional geometric morphometrics across Oceanic population samples supports real craniofacial size/shape structure within Polynesia and cautions against one homogeneous island template.

Why only moderate: the Māori study is small, the Buck study spans multiple Oceanic samples, and Fibre's normalized coefficient is a conservative relative coordinate rather than a direct millimeter conversion.

### faceLength — low confidence

Current direction: slightly higher than the broad oceania parent.

Evidence:

- Schendel et al., "Hawaiian craniofacial morphometrics: average Mokapuan skull, artificial cranial deformation, and the rocker mandible" (1980), DOI 10.1002/ajpa.1330520406, PMID 7386611. Seventy-nine adult Hawaiian skulls from Mokapu, Oahu showed larger facial heights than the comparison sample.
- Kean & Houghton, "The Polynesian head: growth and form" (1982), PMID 7174512, PMCID PMC1168245, describes large upper facial height in adult Polynesian craniofacial material.

Why low: both are historical skeletal/craniofacial sources, one Hawaiian sample includes culturally modified crania, and mapping skeletal facial height into Fibre's soft-tissue-oriented faceLength coordinate is indirect. The coefficient is therefore deliberately small.

### chinProjection — moderate confidence

Current direction: higher than the broad oceania parent.

Evidence:

- Antoun et al. (2014), DOI 10.2478/aoj-2014-0014. Māori participants showed a more anterior chin position than NZ European participants after BMI adjustment.

Why moderate: the anatomical mapping is direct, but the sample is modest and Māori-specific. It supports the shared Polynesian parent conservatively, not a categorical requirement for every individual.

## Whole-profile Polynesian calibration basis — low confidence

The first 48-person v0.3 visual cohort falsified the assumption that Polynesia could safely inherit the broad `oceania` prior and patch only a few visible traits. The follow-up cohort improved hair/pigmentation but still oscillated between European-looking and African-descended-looking renderer defaults rather than producing one coherent Polynesian distribution.

Fibre now uses a **whole-profile calibration basis** for `oceania.polynesia`:

```text
79% east_asia calibration prior
21% oceania calibration prior
+ direct Polynesian facial overrides
```

The 79/21 ratio comes from Kayser et al. (2008), whose 377-autosomal-STR analysis estimated about 79% East-Asian-related and 21% Melanesian-related ancestry in its Polynesian sample. This is used only as a **low-confidence population-history-informed starting prior**. It is not a claim that visible facial phenotype is a linear 79/21 ancestry mixture, and it must be replaced or refined whenever direct modern Polynesian anthropometry supports better locus-specific values.

This whole-profile basis causes hair form, pigmentation, eye/orbit, nose and other currently uncalibrated axes to resolve to one integrated Pacific center rather than inherit an effectively Melanesian broad-Oceania template or rely on the renderer to fill missing gestalt.

Direct evidence still wins. The current explicit overrides remain:

- `faceBreadth` — moderate confidence;
- `faceLength` — low confidence;
- `chinProjection` — moderate confidence.

## Coherent within-population variation

Buck & Viđarsdóttir (2012) found a Polynesian craniofacial grouping relative to neighboring regions while also finding considerable diversity within Polynesian samples.

Fibre represents that with the existing compact founder factor model rather than a new covariance engine:

- family-factor variation is increased slightly (`1.12x`);
- independent structural residual noise is reduced slightly (`0.90x`).

This is a **modeling profile**, not an anthropometric measurement. Its purpose is to make individual Polynesian variation more coherent—whole faces/families vary together—instead of creating diversity mainly by independently perturbing facial sliders.

## Deliberately not directly calibrated

The current Polynesian child still does not add direct locus-specific overrides for:

- nose width/projection;
- orbital/eye anatomy;
- zygomatic projection;
- jaw breadth;
- soft tissue/lip fullness;
- frame;
- muscularity;
- adiposity.

Those axes now receive the whole-profile calibration basis, but they are not claimed as directly measured Polynesian coefficients. New direct evidence should override the basis one locus at a time.

Current body mass or body-composition prevalence must not be converted into inherited population morphology. Those belong to reference/lived physical state, not ancestry.

## Overlapping groups

The evidence intentionally overlaps.

Māori are Polynesian and may support a shared Polynesian parent while also potentially supporting a future Māori child override. Historical Hawaiian samples may support a Native Hawaiian child for a narrow claim while also contributing cautiously to a shared Polynesian direction. Multi-island Polynesian samples support shared structure but should not erase island-specific diversity.

Fibre should preserve this overlap rather than force every paper into one mutually exclusive racial or ethnic bucket.

## Acceptance boundary

This calibration succeeds only if:

- Polynesian founders shift modestly in the supported dimensions;
- Native Hawaiian, Samoan, Tongan and Māori lineage identifiers remain specific even while they share the current parent prior;
- within-population variation remains broad;
- family resemblance and mixed-parent inheritance remain healthy;
- population labels never enter renderer prompts;
- ordinary-human physical state remains independent of Polynesian lineage.

The calibration should be revised whenever better 3D or anthropometric evidence supports a more precise mapping.
