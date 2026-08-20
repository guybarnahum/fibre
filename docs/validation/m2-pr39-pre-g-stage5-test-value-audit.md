---
id: m2-pr39-pre-g-stage5-test-value-audit
status: complete
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 5: test-value audit

## Purpose

Stage 5 asked whether Fibre's growing test suite protects distinct invariants and load-bearing boundaries, or whether historical development had accumulated executable duplication that only inflated the headline count.

The governing rule was deliberately stronger than “fewer tests is better”:

> **Treat the suite as an invariant portfolio, not a score to minimize or maximize.**

A normalizer rule, durable-store rule, replay/integrity rule, transaction rule, API/process rule and hostile mutation can protect the same concept at materially different boundaries. Similar setup or wording is not duplication when removing one layer would make a production wiring failure invisible.

## Mechanical inventory

The Stage-5 inventory, before the Stage-6 lifecycle relocation, reported:

```text
test files                    139
static declared test calls    573
test source bytes             1,087,516

scope                 files   static calls
------------------------------------------
domain                    3             34
world-kernel             91            389
tools                    45            150
```

The static declared-call count was explicitly not treated as the Node runtime test count; table-driven and generated tests can make those differ.

After correcting an audit-fixture false positive in the import-keyword scanner, the mechanical findings were:

```text
exact duplicate bodies     0
zero-declaration files      0
comment-only test files     0
duplicate literal titles    0
import-another-test aliases 0
```

Two already-obsolete comment-only identity `*.test.mjs` tombstones were removed. Neither contained an assertion. **No semantic test was deleted in Stage 5.**

## Value dispositions

### KEEP — portable domain and world-kernel boundaries

The audit found no justified broad reduction of the domain or world-kernel suite. Fibre intentionally protects distinct normalizer, store, replay, transaction, API/process, concurrency/idempotency and hostile-mutation boundaries.

Recent Pre-G work demonstrated why this layering matters:

- Slice-F canonical semantics existed before publication-level mutations made the live call path load-bearing;
- the Stage-4 max-length Thread regression found a second derived-event-ID overflow after the originally known identity-predicate overflow was fixed;
- historical autobiographical-memory reads needed a policy boundary distinct from current-write validation.

### KEEP — current repository/operator tooling

Current editor, inspection, repository validation, context-pack, model-adapter and development-tool regressions remain part of the everyday active suite.

### RETAIN AS SCIENTIFIC/PROOF EVIDENCE

The #39 E2 lineage, symbolic-genome control, selected M1 proof runners and retired Guardian/standing instruments were not valueless tests. They preserve failed as well as successful experimental/proof instruments.

Stage 5 therefore handed them to Stage 6 for explicit lifecycle separation instead of deleting them to reduce `npm test`.

### DELETE only mechanical non-tests

Deletion remains appropriate for byte-identical duplicate files, comment-only tombstones, or same-runner compatibility aliases whose only effect is importing another independently discovered `*.test.mjs`.

A duplicate title by itself is never a deletion criterion.

## Coverage gaps carried forward

The audit also recorded what the suite does **not** prove merely by being large:

1. **Max-length Thread IDs outside Genesis.** Stage 4 proves the Genesis birth path at the 256-character Thread-ID limit, not every future runtime-derived identifier.
2. **Test lifecycle topology.** Active regression and retained reproducibility evidence needed mechanical separation; Stage 6 owned and closed this gap.
3. **Invariant-family labels are heuristic.** Filename-derived families are review aids, not architecture or lifecycle authority.
4. **Test count is not mutation coverage.** Authority-, consent-, obligation-, identity-, ledger-, lifecycle- and Genesis-critical guards still require live-call-path evidence and targeted hostile mutation where consequential.

## Final verification

The maintainer's final Pre-G verification on 2026-08-20 included the corrected Stage-5 audit and reported:

```bash
npm run test:audit -- --check
npm test
npm run check
```

green. Stage 6 subsequently moved the retained scientific/proof tests into their explicit lifecycle and the maintainer also reported `test:repro` and `test:all` green.

Stage 5 is therefore **COMPLETE**.

Its conclusion remains:

> **Do not reduce Fibre's semantic regression portfolio merely to lower a test count. Improve suite topology and remove only demonstrated redundancy.**
