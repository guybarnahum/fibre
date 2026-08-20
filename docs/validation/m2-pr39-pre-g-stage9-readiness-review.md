---
id: m2-pr39-pre-g-stage9-readiness-review
status: clear
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 9 readiness review

## Verdict

**CLEAR.**

The hostile Pre-G review found and closed one substantive integration defect, then found no remaining semantic/design blocker to entering Slice G. The two mechanical closure conditions from the provisional HOLD are now satisfied:

1. the exact E2-V2 zero-call failure artifact is preserved in Git without regeneration;
2. the maintainer reported the final verification envelope green at the resulting tested head.

No further Pre-G semantic review cycle is required.

## Tested closure head

```text
a956c86b1392636988ee4ffc67b8630460c63c6d
Retain E2-V2 zero-call preflight failure evidence
```

This remains the exact tested code/evidence head. Later Stage-8/9 closure commits are documentation-only.

Repository comparison at closure:

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
- each birth relation matches a source owner by `relatedParty.partyId`, not candidate-array position;
- duplicate relation IDs remain rejected;
- duplicate parent-genome-source relations for the same source owner are rejected;
- substitution by an unknown source owner remains rejected;
- the positive Stage-8 publication regression deliberately submits the two valid relations in reverse order.

This removes an incidental representation dependency without weakening provenance.

Reviewed implementation commits:

```text
595901e98096f9f3cdd32f1b2259174a2d3ba09e  Align test audit markdown tables
040f0523fd46ef9dde24c28f8d4848c8b46d42b5  Make birth lineage relation order non-semantic
07ad5e8f35090970e62c817c196daf99e7ce34bc  Preserve Stage 8 lineage rejection surface
5628bab3c6a4ee36ff95bd61ae8b1c0c73ed269a  Test birth lineage order independence
```

## Readiness attacks

### A. Did any G subject/protocol evidence leak before the seam closed?

No.

Before closure, the retained #39 artifact tree contained development evidence under `artifacts/validation/m2-pr39/e2/`; there was no G cohort artifact directory, no Slice-G protocol/result document, no final cohort genome assignment and no G/H model result.

Therefore the methodological boundary held through closure:

> **The test exists before the people.**

Slice G may now begin protocol/world freezing, but no final-cohort life generation may occur until G's complete pre-execution freeze is itself reviewed CLEAR.

### B. Are the previously cleared gates still the correct entry authority?

Yes.

```text
Gate C  CLEAR
Gate D  CLEAR
Gate F  CLEAR
```

Pre-G cleanup does not reinterpret those results or turn cleanup into new scientific evidence.

### C. Is EventStructurePool v2 actually developmentally non-flat?

Yes at the mechanism boundary.

`normalizeEventStructurePoolV2()` requires at least 24 reviewed affordances and at least eight distinct developmental-range signatures. It also requires ordinary-practical, social-conversation, intellectual-encounter and transition/access contexts, plus caregiver-, peer- and self-directed access modes. Sampling only offers structures that cover the complete active developmental window.

This does not prove the final cohort will use the breadth well; that remains H characterization rather than an admission quota.

### D. Do the A/B/C epistemic boundaries remain separable enough to freeze G?

Yes.

- Pass A remains genome blind and authors observable history.
- Pass B records `life_only_unexposed`, `life_only_exposed` and `life_plus_genome` distinctly.
- Pass-B genome exposure remains whole-genome or deterministic ordinal-prefix exposure rather than content/relevance-selected loci.
- `priorTreatmentMemoryExposure` must agree with visible prior remembered-memory history.
- Pass C remains genome blind and one-memory scoped under the audited contract.
- Fibre-computed mechanical-condition values and Fibre-authored semantic-need conclusions remain outside the #39 cognition contract.

Slice G must now freeze the exact treatment proportion, assignment method, position stratification and analyzable-cell arithmetic before H.

### E. Has Stage 8 made synthetic lineage publication load-bearing without inventing a second authority?

Yes.

The child genome is read and verified through the shared symbolic-genome persistence verifier. Synthetic parent relations are appended through the shared #38 situated-life persistence primitive. Genesis owns only the cross-domain birth-binding rule.

The publication boundary rejects missing genome, wrong child, wrong Genesis, source substitution and missing lineage, and rolls back the live child/lineage/manifest on failure while leaving the frozen pre-birth genome intact.

### F. Is source/origin integrity still intact?

Yes. Stage 9 found no route around the Gate-F rules:

```text
living identifiable human -> documented-consent Echo
Homage -> attested deceased | fictional
source biography != Thread autobiography
```

Slice G may not relax these rules.

### G. Did cleanup erase or normalize embarrassing development evidence?

No.

The known E1 monoculture and failed/successful E2 development records remain part of the evidence history. The previously untracked zero-call artifact is now preserved exactly at:

```text
artifacts/validation/m2-pr39/e2/
  fibre-m2-pr39-slice-e2-v2-a0-zero-call-preflight-failure-v1.json
```

Its Git blob at closure is `17dec7f59c9751db05c45eb1884cbe23846d3354`.

## Final verification

The maintainer reported green at `a956c86` for:

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

Remote follow-up confirmed the pushed artifact exists and `main` remains an ancestor of the tested head.

## Slice-G entry contract

Slice G is now authorized to begin, in this order:

1. freeze the G protocol shell and execution order;
2. author five fresh WorldSpecs without seeing cohort genomes;
3. freeze the worlds;
4. only then freeze/assign genomes and synthetic parents;
5. freeze content-independent Pass-B assignment/position stratification and cell arithmetic;
6. run and record the cold world-familiarity handling before life generation;
7. freeze provider/model, prompts, schemas, sampling, policies, EventStructurePool v2 digest, repair/retry caps and publication-validator witness;
8. freeze independent raters, D1–D5 diagnostics, secondary characterizations, thresholds/uncertainty and exact CLEAR/HOLD/REDESIGN rule;
9. obtain the blocking Slice-G review;
10. only after Gate G is CLEAR may the first final-cohort life be generated in Slice H.

No Whole-Person score movement or #40/#41 causal/standing claim is earned by this review.