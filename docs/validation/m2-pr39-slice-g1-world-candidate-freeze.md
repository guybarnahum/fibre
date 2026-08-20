---
id: m2-pr39-slice-g1-world-candidate-freeze
status: superseded
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G1 world candidate freeze v1

## Historical status

**SUPERSEDED after execution; preserved as G1-v1 evidence.**

The five genome-blind v1 candidates were frozen and executed through the predeclared cold familiarity probe. All five were accepted at `density=4/4`, and the emitted v1 final WorldSpecs/result remain preserved under `artifacts/validation/m2-pr39/g/`.

Subsequent human review found a separate defect: the worlds were familiar but too geographically/culturally interchangeable. They described city archetypes without making an actual country/locality and enough local cultural facts load-bearing WorldSpec context.

That finding does **not** invalidate the v1 familiarity result; it is outside what that instrument measured. It does mean v1 is not the final G1 cohort input.

Current correction and closure:

- [`m2-pr39-slice-g1-geographic-specificity-correction.md`](m2-pr39-slice-g1-geographic-specificity-correction.md)
- [`m2-pr39-slice-g1-result.md`](m2-pr39-slice-g1-result.md)

Canonical current authoring rule:

[`../architecture/world-context-specificity-v1.md`](../architecture/world-context-specificity-v1.md)

## Preserved v1 authority

```text
artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v1.json
artifacts/validation/m2-pr39/g/results/g1-world-familiarity-v1.json

artifacts/validation/m2-pr39/g/worlds/candidates/
  world-g1-01-candidate-v1.json
  world-g1-02-candidate-v1.json
  world-g1-03-candidate-v1.json
  world-g1-04-candidate-v1.json
  world-g1-05-candidate-v1.json

artifacts/validation/m2-pr39/g/worlds/
  world-g1-01.json
  world-g1-02.json
  world-g1-03.json
  world-g1-04.json
  world-g1-05.json

artifacts/validation/m2-pr39/g/worlds/presentation/v1/
  world-g1-01.presentation.json
  world-g1-02.presentation.json
  world-g1-03.presentation.json
  world-g1-04.presentation.json
  world-g1-05.presentation.json
```

The original protocol froze:

```text
cohort size               5
entry stage               young_adult
common entry age          22
common bornAt             2004-08-20T00:00:00Z
common chronology end     2026-08-20T00:00:00Z
origin composition        3 de_novo + 2 synthetic_lineage
convergent pair           slots 02 + 04
familiarity worker        openai/gpt-5.1-2025-11-13
familiarity calls         one stateless call per candidate
```

The cold familiarity HOLD rule was:

```text
densityScore <= 1
OR
at least two coverage-domain scores <= 1
```

That measurement remains valid historical evidence for the v1 inputs.

## Why v1 is not silently edited

The v1 candidate/final WorldSpecs participated in a real model run. They therefore remain frozen artifacts even though later review found the missing specificity.

The correction used new `candidates-v2/`, new final `*-v2.json` paths and a new result path. It preserved the original age/origin/comparative structure so the fix could not opportunistically tune expected personalities or H performance.

## Current boundary

```text
G1-v1    PRESERVED / SUPERSEDED
G1-v2    COMPLETE / CLEAR
G2       NEXT / AUTHORIZED TO BEGIN
H        FORBIDDEN until Gate G CLEAR
```
