---
id: m2-pr39-slice-g1-geographic-specificity-correction
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — G1 geographic/cultural specificity correction

## Finding

The first G1 candidate set passed the predeclared cold familiarity screen (`4/4` density for all five), but subsequent human review found a distinct defect that the familiarity screen was not designed to detect:

> the Worlds were familiar but too geographically interchangeable.

The v1 WorldSpecs described a river-delta city, inland rail/manufacturing city, highland regional city, tropical coastal city and northern lake city without making an actual country/locality and enough specific cultural context load-bearing world facts.

The v1 familiarity result itself exposed the distinction: the model could recognize the general setting while remaining uncertain about exact city and fine-grained local practice.

This is not a familiarity failure. It is a **world-authoring specificity failure**.

## Evidence discipline

The v1 candidates, accepted v1 final WorldSpecs, familiarity result and v1 presentations remain preserved. They are not silently rewritten.

No G2 cohort genome had been authored or assigned and no final-cohort life had been generated when this defect was found. Therefore G1 can be corrected without contaminating genome/world independence.

G2 remains BLOCKED.

## Canonical authoring rule

See [`../architecture/world-context-specificity-v1.md`](../architecture/world-context-specificity-v1.md).

The correction intentionally uses the existing WorldSpec authority rather than introducing a second geography record:

```text
places[].description
languages[]
mobilityPattern
schoolingOrCommunityContext
culturalContext
availableInstitutions[]
intellectualEnvironment
worldAuthorship.sourcesConsulted[]
```

For current authoring, those fields must name and describe a real locality/country and its factual ordinary context. Specific geography is allowed to change lived affordances; it may not imply personality, morality, politics, competence, religion, ethnicity, dignity, willingness or future profession.

## G1-v2 frozen settings

The five corrected candidates retain the original slot/origin structure but are now situated in actual places:

| Slot | Concrete World | Origin mode |
| --- | --- | --- |
| 1 | Cần Thơ, Vietnam | `de_novo` |
| 2 | Łódź, Poland | `synthetic_lineage` |
| 3 | Cusco, Peru | `de_novo` |
| 4 | Accra, Ghana | `de_novo` |
| 5 | Greater Sudbury, Ontario, Canada | `synthetic_lineage` |

The convergent pair remains slots 2 and 4, now Łódź and Accra. Its protocol-only broad question remains unchanged.

The household shapes, age/chronology policy and comparative structure are intentionally retained from v1. This correction is not permission to redesign the cohort for more interesting personalities or better expected H performance.

## Frozen machine-readable authority

```text
artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v2.json

artifacts/validation/m2-pr39/g/worlds/candidates-v2/
  world-g1-01-candidate-v2.json
  world-g1-02-candidate-v2.json
  world-g1-03-candidate-v2.json
  world-g1-04-candidate-v2.json
  world-g1-05-candidate-v2.json
```

The v2 manifest records exact candidate digests, factual source witnesses, the unchanged 3/2 origin composition, unchanged age/chronology, unchanged convergent-pair hypothesis and the no-genome/no-life precondition.

The manifest reuses the already-frozen familiarity **instrument v1** and thresholds. `protocolVersion` therefore remains the probe-compatible v1 schema identifier while `manifestRevision=g1-geographic-specificity-v2` identifies this new frozen candidate set.

## Familiarity rerun

The familiarity screen must be rerun because its model-visible input has materially changed. The exact city/country and cultural context are intentionally visible to this cold setting-familiarity assessment; Fibre/Genesis identity, world IDs, genomes, personality targets and downstream diagnostics remain hidden.

Run exactly once after pulling and testing:

```bash
npm test

npm run genesis:world-familiarity -- \
  --provider openai \
  --model gpt-5.1-2025-11-13 \
  --manifest artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v2.json \
  --out artifacts/validation/m2-pr39/g/results/g1-world-familiarity-v2.json
```

If all five clear, the existing probe emits:

```text
artifacts/validation/m2-pr39/g/worlds/world-g1-01-v2.json
artifacts/validation/m2-pr39/g/worlds/world-g1-02-v2.json
artifacts/validation/m2-pr39/g/worlds/world-g1-03-v2.json
artifacts/validation/m2-pr39/g/worlds/world-g1-04-v2.json
artifacts/validation/m2-pr39/g/worlds/world-g1-05-v2.json
```

The predeclared HOLD rule is unchanged:

```text
densityScore <= 1
OR
at least two coverage-domain scores <= 1
```

No quality/aesthetic replacement is permitted.

## Presentation follow-through

The existing `world-g1-0X.presentation.json` records describe the preserved v1 generic worlds. Do not silently repoint them.

After G1-v2 familiarity clears and exact final v2 digests are preserved, derive **new v2 per-World presentations** from the accepted v2 WorldSpecs. Those records should contain the actual architecture, signage, climate, transport and cultural visual anchors supported by the concrete WorldSpec. Presentation still remains non-cognitive.

## Exit

G1 is not COMPLETE until the v2 familiarity result and all five final v2 WorldSpecs are preserved and reviewed.

```text
G1-v1       PRESERVED — familiarity CLEAR, geographic specificity insufficient
G1-v2       FROZEN CANDIDATES — familiarity rerun pending
G2          BLOCKED
G3-G6       BLOCKED on prior G steps
H           FORBIDDEN until Gate G CLEAR
```
