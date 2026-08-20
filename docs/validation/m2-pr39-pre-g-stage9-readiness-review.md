---
id: m2-pr39-pre-g-stage9-readiness-review
status: hold
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 9 readiness review

## Verdict

**HOLD — mechanical closure only.**

The hostile Pre-G review found and closed one substantive integration defect, then found no remaining semantic/design blocker to entering Slice G. The seam must nevertheless remain closed until the exact local E2-V2 zero-call failure artifact is preserved in Git and the final verification envelope is green at the resulting head.

This is not a request to change the compiler, cohort design, Gate C/D/F evidence, or #39 doctrine.

## Reviewed boundary

Stage 9 reviewed the post-Stage-8 branch after the audit-table readability cleanup and after the Stage-8 birth-path fixture corrections.

The latest reviewed implementation commits are:

```text
595901e98096f9f3cdd32f1b2259174a2d3ba09e  Align test audit markdown tables
040f0523fd46ef9dde24c28f8d4848c8b46d42b5  Make birth lineage relation order non-semantic
07ad5e8f35090970e62c817c196daf99e7ce34bc  Preserve Stage 8 lineage rejection surface
5628bab3c6a4ee36ff95bd61ae8b1c0c73ed269a  Test birth lineage order independence
```

Repository comparison during review:

```text
main    d413e5f8f59ec7da8448784a6143cff6b6fec558
behind  0
```

## Hostile finding closed during Stage 9

### S1 — incidental relation-array order had become publication authority

The Stage-8 adapter originally matched `lifeRelationCandidates[index]` to `sourceOwners[index]`.

That was too strong. The symbolic-genome source-owner sequence is ordered and the manifest must match it exactly, but #38 life relations are identity-addressed records. Reversing two otherwise correct parent relation candidates must not change whether the same two relations are admissible.

Resolution:

- manifest `parentOrAncestorRefs` remains ordered and must exactly match genome source-owner order;
- each birth relation now matches a source owner by `relatedParty.partyId`, not candidate-array position;
- duplicate relation IDs remain rejected;
- duplicate parent-genome-source relations for the same source owner are rejected;
- substitution by an unknown source owner remains rejected;
- the positive Stage-8 publication regression now deliberately submits the two valid relations in reverse order.

This removes an incidental representation dependency without weakening provenance.

## Readiness attacks

### A. Did any G subject/protocol evidence already leak into the repository?

No final Slice-G cohort material was found.

The retained #39 artifact tree currently contains development evidence under `artifacts/validation/m2-pr39/e2/`; there is no G cohort artifact directory. The validation-document inventory contains no Slice-G protocol/result document. The active Genesis tooling remains development/current-mechanism tooling rather than a generated final cohort.

Therefore the methodological boundary still holds:

> **The test exists before the people.**

### B. Are the previously cleared gates still the correct entry authority?

Yes.

```text
Gate C  CLEAR
Gate D  CLEAR
Gate F  CLEAR
```

The Pre-G work does not reinterpret those results or turn cleanup into new scientific evidence.

### C. Is EventStructurePool v2 actually developmentally non-flat?

Yes at the mechanism boundary.

`normalizeEventStructurePoolV2()` requires at least 24 reviewed affordances and at least eight distinct developmental-range signatures. It also requires ordinary-practical, social-conversation, intellectual-encounter and transition/access contexts, plus caregiver-, peer- and self-directed access modes. Sampling only offers structures that cover the complete active developmental window.

This does not prove the final cohort will use the breadth well; that remains an H characterization rather than an admission quota.

### D. Do the A/B/C epistemic boundaries remain separable enough to freeze G?

Yes.

- Pass A remains genome blind and authors observable history.
- Pass B records `life_only_unexposed`, `life_only_exposed` and `life_plus_genome` distinctly.
- Pass-B genome exposure remains whole-genome or deterministic ordinal-prefix exposure rather than content/relevance-selected loci.
- `priorTreatmentMemoryExposure` must agree with the visible prior remembered-memory history.
- Pass C remains genome blind and one-memory scoped under the already-audited contract.
- Fibre-computed mechanical-condition values and Fibre-authored semantic-need conclusions remain outside the #39 cognition contract.

G still must freeze the exact treatment proportion, assignment method, position stratification and minimum analyzable cell arithmetic before H.

### E. Has Stage 8 made synthetic lineage publication load-bearing without inventing a second authority?

Yes, subject to the final green verification below.

The child genome is read and verified through the shared symbolic-genome persistence verifier. Synthetic parent relations are appended through the shared #38 situated-life persistence primitive. Genesis owns only the cross-domain birth-binding rule.

The publication boundary rejects missing genome, wrong child, wrong Genesis, source substitution and missing lineage, and rolls back the live child/lineage/manifest on failure while leaving the frozen pre-birth genome intact.

### F. Is source/origin integrity still intact?

Yes. Stage 9 found no route around the Gate-F rules:

```text
living identifiable human -> documented-consent Echo
Homage -> attested deceased | fictional
source biography != Thread autobiography
```

No G work may relax these rules.

### G. Did cleanup erase or normalize embarrassing development evidence?

No remote retained E2 evidence was rewritten during Stage 8/9 implementation. The known E1 monoculture and later failed/successful development records remain part of the evidence history.

One evidence-preservation defect remains local and is the reason for this HOLD: the E2-V2 zero-model-call preflight failure artifact exists in the maintainer working tree but is not present in Git.

## Sole remaining blockers

### 1. Preserve the exact zero-call artifact

Required path:

```text
artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v2-a0-zero-call-preflight-failure-v1.json
```

Do not regenerate or synthesize it. Commit the exact bytes already present in the maintainer working tree. The companion record explicitly classifies the failed invocation/artifact as permanent mechanical evidence.

### 2. Verify the final seam head

After preserving that artifact and pulling the Stage-9 relation-order fix, run:

```bash
node --disable-warning=ExperimentalWarning --test \
  services/world-kernel/test/genesis-pre-g-stage8-genome-lineage-binding.test.mjs

npm test
npm run test:repro
npm run test:all
npm run test:audit -- --check
npm run includes:check
npm run context-pack
npm run validate
npm run check

git status --short
git rev-parse HEAD
git rev-parse origin/main
git merge-base --is-ancestor origin/main HEAD
```

Required outcome:

```text
targeted Stage-8 regression green
active/repro/all green
audit/document/context/repository checks green
working tree clean
origin/main ancestor check succeeds
```

## Stage-9 readiness judgment after those two mechanical closures

If the exact artifact is preserved and the envelope above is green, Stage 9 requires no further semantic redesign or new hostile-review cycle. The reviewed state is ready to flip directly from this mechanical HOLD to **CLEAR** and open Slice G.

Slice G must then begin by freezing the experiment before generating people:

1. author five fresh WorldSpecs without seeing cohort genomes;
2. freeze worlds;
3. freeze/assign genomes and synthetic parents;
4. freeze content-independent Pass-B assignment/position stratification and cell arithmetic;
5. run/freeze familiarity handling before life generation;
6. freeze provider/model, prompts, schemas, sampling, policies, EventStructurePool v2 digest, repair/retry caps and publication-validator witness;
7. freeze independent raters, D1-D5 diagnostics, secondary characterizations, thresholds/uncertainty and exact CLEAR/HOLD/REDESIGN rule;
8. only then permit first G/H cohort model use.

No Whole-Person score movement or #40/#41 causal/standing claim is earned by this review.
