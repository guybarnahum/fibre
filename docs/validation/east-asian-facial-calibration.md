---
id: east-asian-facial-calibration
status: active
last-reviewed: 2026-09-27
---

# East Asian facial calibration

## Purpose

This note records the evidence used by Fibre's provisional `physical-genome-v0.2` East-Asian facial priors.

The goal is not to classify a rendered face by race or to encode one stereotyped face per population. The goal is narrower: when Fibre must instantiate a missing biological parent from explicit physical-lineage evidence, the founder distribution should preserve measured population-linked facial morphology while retaining large within-population individual variation.

Population labels never cross the rendering boundary. The renderer receives only the resulting inherited anatomy.

## Calibration rule

A child reference population may override a parent value only when the available evidence supports that anatomical direction.

If evidence establishes that a subgroup exists but does not expose a trustworthy mapping into a Fibre locus, the child inherits the parent prior unchanged. **No coefficient is invented merely to make neighboring labels look different.**

This is why the northern/central/southern Han identifiers currently inherit the same Han-Chinese prior even though their regional facial structure is real and measurable.

## Evidence anchors

### Shared East Asian / Han Chinese ocular proportions

Jayaratne et al., *Normative Findings for Periocular Anthropometric Measurements among Chinese Young Adults in Hong Kong* (2013), PMCID PMC3730197, measured 3D periocular anatomy in 103 Chinese young adults.

Reported means included:

- male intercanthal width 40.61 mm, biocular width 93.00 mm, eye fissure length about 27 mm;
- female intercanthal width 38.27 mm, biocular width 88.39 mm, eye fissure length about 25–26 mm;
- Chinese participants had larger intercanthal widths and shorter eye fissures than several comparison populations discussed by the authors.

Fibre uses this evidence for:
- positive `eyeSpacing`;
- negative `eyeShape` (shorter palpebral opening relative to intercanthal spacing).

Jayaratne et al., *Are Neoclassical Canons Valid for Southern Chinese Faces?* (2012), DOI 10.1371/journal.pone.0052593, found the intercanthal distance greater than eye-fissure length in 100% of their Southern Chinese sample and documented strong East-Asian departures from white neoclassical horizontal proportions.

Fibre uses this as corroboration for ocular spacing/opening and nasal-width relationships, not as an aesthetic standard.

### Eyelid structure

Chen/Sim measurements summarized in Ngeow et al., *The Prevalence of Double Eyelid and the 3D Measurement of Orbital Soft Tissue in Malays and Chinese* (2017), PMCID PMC5665901, report Chinese young-adult upper-eyelid crease heights around 4–6 mm and pretarsal skin heights around 2.4–2.6 mm.

Hwang et al., *The Asian Eyelid: Relevant Anatomy* (2015), PMCID PMC4536062, describes common epicanthal folds, lower/less-apparent upper-eyelid creases and wider intercanthal distance in Chinese-descended populations.

Fibre uses this evidence for:
- positive `epicanthicFold`;
- negative `upperEyelidExposure`.

These are distribution means, not hard phenotype requirements for every individual.

### Malar/zygomatic, nasal-root and chin projection

Kim et al., *Three-dimensional Analysis of Normal Facial Morphologies of Asians and Whites* (2016), DOI 10.1097/GOX.0000000000000853, compared average 3D shells from 138 Korean adults, 71 Chinese adults and 100 Houston white adults.

The study reports:
- Korean male/female averages wider with more prominent malar/zygomatic regions than white averages;
- white averages more protrusive at glabella, nasion, rhinion and soft-tissue pogonion;
- Korean male averages with more nasal-tip and lip projection than Chinese male averages;
- Korean female averages narrower than Chinese female averages but with more periorbital, nasal-tip and malar projection.

Fibre uses these directions for:
- positive `zygomaticProjection`;
- negative shared East-Asian `nasalBridgeHeight` / `noseProjection` relative to the European comparison direction;
- lower `chinProjection`;
- Korean child overrides toward greater malar, periorbital and nasal-tip projection than Han Chinese;
- Han-Chinese child override toward somewhat greater masseteric/jaw breadth than Korean.

The study also reports substantial Korean/Chinese shell similarity. Fibre therefore keeps Korean and Han priors close rather than forcing categorical separation.

### Han Chinese regional structure

Qiao et al., *De Novo Dissecting the Three-Dimensional Facial Morphology of 2379 Han Chinese Individuals* (2024), DOI 10.1007/s43657-023-00109-x, analyzed 2,379 Han Chinese from Zhengzhou, Taizhou and Nanning using 26 manually placed 3D landmarks plus dense segmented phenotypes.

The study found:
- 1,560 homogeneous facial features across the three regional samples;
- statistically separable northern, central and southern Han facial structure;
- central Han generally intermediate and closer to northern Han;
- regional geography explained only a small part of total facial variance.

This justifies the hierarchy:

```text
east_asia.han_chinese
  northern
  central
  southern
```

It does **not** yet justify Fibre-locus deltas for those three children. Until the source measurements can be mapped directly into Fibre's compact coordinates, all three intentionally inherit the Han-Chinese prior.

### Japanese breadth reference

Ogawa et al., *Photo anthropometric variations in Japanese facial features* (2015), DOI 10.1016/j.forsciint.2015.07.046, reports a 3D anthropometric reference dataset of 1,126 Japanese adults with facial breadth, bigonial breadth, nasal breadth and related indices.

Lee & Park, *Comparison of Korean and Japanese Head and Face Anthropometric Characteristics* (2008), DOI 10.3378/1534-6617-80.3.313, reports generally larger head/face measurement values in Japanese samples than Korean samples, with sex/age effects.

A Japanese nasal-dimension study also reports adult soft-tissue nasal width around 42.4 mm in males and 41.6 mm in females, compared with published Korean means around 41.15 mm and 37.62 mm respectively.

Fibre therefore currently applies only conservative Japanese `faceBreadth` and `noseBreadth` overrides. Other Japanese facial loci inherit the shared East-Asian prior until direct quantitative mapping is available.

## Current calibrated hierarchy

```text
east_asia                         shared facial anchor
  han_chinese                     ocular + facial breadth + projection overrides
    northern                      inherits Han until direct locus mapping exists
    central                       inherits Han until direct locus mapping exists
    southern                      inherits Han until direct locus mapping exists
  korean                          malar/periorbital/nasal-tip + jaw overrides
  japanese                        breadth-only overrides
  mongolian                       parent fallback; no invented delta
  tibetan                         parent fallback; no invented delta
```

## What remains provisional

- Pigmentation and hair coefficients were not recalibrated in this facial-morphology slice.
- Slice 3 now uses a compact zero-mean factor sampler: one shared founder factor per anatomical system plus smaller allele-specific residuals. The factors preserve coherent family morphology without changing the population center or adding runtime covariance machinery.
- The northern/central/southern Han hierarchy is structurally real but currently fully shrunk to the Han prior.
- Japanese child calibration is intentionally sparse.
- Mongolian and Tibetan child deltas are intentionally absent.
- Renderer fidelity is unproven until Population Lab visual calibration.

## Acceptance boundary

This slice is successful if it improves the **causal physical model** without turning population labels into prompt shortcuts.

It does not claim visual success yet. Slices 3–5 must still prove:
- believable within-population spread;
- family resemblance and mixed-parent inheritance;
- the shared renderer faithfully expressing the inherited anatomy;
- visually convincing East-Asian cohorts without demographic labels in the image prompt.
