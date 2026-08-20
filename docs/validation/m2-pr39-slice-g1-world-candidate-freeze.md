---
id: m2-pr39-slice-g1-world-candidate-freeze
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G1 world candidate freeze

## Status

**G1 IN PROGRESS — five genome-blind candidate WorldSpecs are frozen; cold familiarity execution remains.**

No cohort genome has been authored, assigned or inspected. No final-cohort life has been generated.

## Frozen before familiarity output

The machine-readable authority is:

```text
artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v1.json
```

It freezes before the first familiarity call:

```text
cohort size               5
entry stage               young_adult
common entry age          22
common bornAt             2004-08-20T00:00:00Z
common chronology end     2026-08-20T00:00:00Z
origin composition        3 de_novo + 2 synthetic_lineage
convergent pair           world 02 + world 04
familiarity worker        openai/gpt-5.1-2025-11-13
familiarity calls         one stateless call per candidate
```

The five candidates are frozen under:

```text
artifacts/validation/m2-pr39/g/worlds/candidates/
```

They are fresh structural worlds rather than renamed E/E2 worlds. Existing E/E2 material was consulted only for the accepted WorldSpec schema/mechanical shape, not for setting or plot content.

## Cold familiarity boundary

The probe implementation is:

```text
tools/genesis/genesis-world-familiarity-probe.mjs
```

The model-visible surface contains only an anonymized ordinary-setting projection. It omits:

```text
worldSpecId
placeId
worldAuthorship
Fibre / Genesis experiment identity
genomes
personality targets
future roles
convergent-pair hypothesis
downstream diagnostics
```

The predeclared HOLD rule is:

```text
densityScore <= 1
OR
at least two coverage-domain scores <= 1
```

Coverage domains are household, schooling, mobility, institutions, language context, everyday economy and intellectual access.

A materially under-represented candidate is preserved as burned G1 evidence and replaced under a new protocol version. It may not be replaced because its expected life looks less interesting, attributable or likely to pass H.

If all five candidates clear the rule, the tool emits the five final WorldSpec JSON files under `artifacts/validation/m2-pr39/g/worlds/`, each carrying its non-null `worldAuthorship.familiarityProbe`, plus the exact result artifact and final digests.

## Required execution

First pull the candidate/probe freeze and run the active regression envelope for the new tool:

```bash
git pull --ff-only
npm test
```

Then execute the frozen five-call probe exactly once:

```bash
npm run genesis:world-familiarity -- \
  --provider openai \
  --model gpt-5.1-2025-11-13 \
  --manifest artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v1.json \
  --out artifacts/validation/m2-pr39/g/results/g1-world-familiarity-v1.json
```

The probe refuses to overwrite an existing result or final WorldSpec file.

## Exit

G1 becomes COMPLETE only when:

```text
[ ] new active regression envelope green
[ ] exactly five cold familiarity calls completed
[ ] result artifact preserved
[ ] no candidate triggered the predeclared under-representation HOLD
[ ] five final WorldSpecs emitted with familiarity witnesses
[ ] final WorldSpec digests recorded
[ ] no cohort genome existed before final world freeze
[ ] final artifacts committed with clean tree
```

Until those conditions hold:

```text
G2 genomes   BLOCKED
G3-G6        BLOCKED
H            FORBIDDEN
```
