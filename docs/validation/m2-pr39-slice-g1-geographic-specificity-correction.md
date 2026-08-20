---
id: m2-pr39-slice-g1-geographic-specificity-correction
status: complete
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — G1 geographic/cultural specificity correction

## Finding

The first G1 candidate set passed the predeclared cold familiarity screen (`4/4` density for all five), but subsequent human review found a distinct defect that the familiarity screen was not designed to detect:

> the Worlds were familiar but too geographically interchangeable.

The v1 WorldSpecs described a river-delta city, inland rail/manufacturing city, highland regional city, tropical coastal city and northern lake city without making an actual country/locality and enough specific cultural context load-bearing world facts.

This was not a familiarity failure. It was a **world-authoring specificity failure**.

## Evidence discipline

The v1 candidates, accepted v1 final WorldSpecs, familiarity result and generic presentations remain preserved. They were not silently rewritten.

No G2 cohort genome had been authored or assigned and no final-cohort life had been generated when this defect was found. Therefore G1 could be corrected without contaminating genome/world independence.

## Canonical authoring rule

See [`../architecture/world-context-specificity-v1.md`](../architecture/world-context-specificity-v1.md).

> **A World must be particular enough to produce a particular past without writing a particular personality.**

The correction deliberately uses existing WorldSpec authorities—places, languages, mobility, schooling/community, cultural context, institutions, intellectual environment and authorship witnesses—rather than introducing a parallel geography truth.

Concrete geography may change lived affordances. It may not imply personality, morality, politics, religion, ethnicity, competence, dignity, willingness or future profession.

## Corrected G1-v2 settings

| Slot | Concrete World | Origin mode |
| --- | --- | --- |
| 1 | Cần Thơ, Vietnam | `de_novo` |
| 2 | Łódź, Poland | `synthetic_lineage` |
| 3 | Cusco, Peru | `de_novo` |
| 4 | Accra, Ghana | `de_novo` |
| 5 | Greater Sudbury, Ontario, Canada | `synthetic_lineage` |

The convergent pair remains Łódź and Accra. The age/chronology, origin composition and comparative household structure remain unchanged from v1; this correction was not used to tune expected personality or H performance.

## Frozen authority and result

```text
artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v2.json
artifacts/validation/m2-pr39/g/worlds/candidates-v2/
artifacts/validation/m2-pr39/g/results/g1-world-familiarity-v2.json
```

The same already-frozen familiarity instrument and HOLD thresholds were reused. Concrete city/country and cultural context were intentionally visible to the cold familiarity worker; Fibre/Genesis identity, world IDs, genomes, personality targets and downstream diagnostics remained hidden.

Maintainer result:

```text
Cần Thơ          4/4
Łódź             4/4
Cusco            4/4
Accra            4/4
Greater Sudbury  4/4
```

All five v2 candidates were accepted and the exact final WorldSpecs were preserved in commit:

```text
b7153417cfd083a0623c476c352675f775f616a2
Freeze geographically specific G1 worlds
```

Final digests:

```text
Cần Thơ          sha256:6e88b0bd8aba69894ae5583603a841d139687d57cea9bfb8c05086e1be118c7d
Łódź             sha256:291aa0255fa9d70c4dc30f26c442606d4e03245bcb1b843a889ddc082f081a0a
Cusco            sha256:bbf23626457d9f93ff2cf70c129c4d549f998a228bd67852450879b1e70f6290
Accra            sha256:02e52c82398b87cfcecee31651d81dbb223d00e2da8a7410c4553bd0514547db
Greater Sudbury  sha256:a2ce5453912040c78561bafaceb21d1cded8f05f84aaf9bc10e831d4288098d0
```

## Presentation follow-through

The generic v1 presentation records are preserved under:

```text
artifacts/validation/m2-pr39/g/worlds/presentation/v1/
```

The canonical per-World presentation files now derive from the accepted v2 Worlds, carry exact `worldSpecDigest` bindings and include richer concrete and temporal visual grounding for website/editor/asset-generation use.

Presentation remains derived and non-cognitive.

## Resolution

**RESOLVED / CLEAR.**

See [`m2-pr39-slice-g1-result.md`](m2-pr39-slice-g1-result.md) for the final G1 closure record.

```text
G1-v1  PRESERVED — familiarity CLEAR; geographic specificity insufficient
G1-v2  COMPLETE / CLEAR — concrete final Worlds frozen
G2      NEXT
H       FORBIDDEN until Gate G CLEAR
```
