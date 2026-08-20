---
id: m2-pr39-pre-g-seam-status
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G seam status

## Purpose

The Pre-G seam closes known doctrine, authority, regression and evidence-hygiene obligations from Slices A–F **before** Slice G freezes the final #39 cohort and protocol.

G's methodological boundary remains:

> **The test exists before the people.**

Therefore no Slice-G cohort output, cohort genome, or G model execution may occur until this seam closes.

This seam is cleanup/preflight work, not an additional milestone gate and not a new claim of causal standing.

## Entry state

Gate status at seam entry:

```text
Gate C  CLEAR
Gate D  CLEAR
Gate F  CLEAR
```

Gate-F closure record:

[`m2-pr39-slice-ef-gate-f-result.md`](m2-pr39-slice-ef-gate-f-result.md)

Gate-F hostile-review implementation/evidence head:

`f960e8851ac0eeb2d03b1830740e813beeb10184`

Repository comparison at Stage-0 start:

```text
main             d413e5f8f59ec7da8448784a6143cff6b6fec558
branch status    ahead 296, behind 0
```

Gate-F hostile-review verification baseline:

```text
full tests                     569/569 pass
repository/world-seed check    green
```

That verification baseline applies to the reviewed Gate-F head. Every seam stage that changes code/tests must establish its own current verification before the seam closes.

## Stage ledger

| Stage | Work | Status | Exit condition |
| --- | --- | --- | --- |
| 0 | Seal Gate F | **COMPLETE** | Gate-F verdict, evidence, negative runs, selectivity finding and carry-forwards are durably recorded |
| 1 | Pass-C doctrine audit | **COMPLETE** | Pass-C contract/prompts/tests consistently express meaning formation; `no_durable_meaning` remains genuinely legal; local full verification green |
| 2 | Memory/meaning instrumentation | **COMPLETE** | citation share and meaning-rate characterization exist without becoming admission gates; local full verification green |
| 3 | Slice-F canonical delegation | **COMPLETE** | publication uses one semantic authority for source/origin integrity and known mutation gaps are protected; local full verification green |
| 4 | Older C/D carry-forwards | **COMPLETE** | long Thread-ID Genesis publication and historical-memory read-policy drift are closed with load-bearing regressions; local full verification green |
| 5 | Test-value audit | **IN PROGRESS / INVENTORY REVIEW** | tests are inventoried by invariant; keep/consolidate/retain/delete decisions and coverage gaps are explicit |
| 6 | Retired experiment/artifact hygiene | PENDING | current mechanism, retained scientific evidence and dead scaffolding are clearly separated without erasing failed evidence |
| 7 | Documentation/plan reconciliation | PENDING | canonical #39 docs/context packs describe the current architecture and no retired mechanism appears current |
| 8 | Branch/repository hygiene | PENDING | latest main reconciled, full check green, evidence hashes stable, clean tree, exact seam-closing head recorded |
| 9 | Narrow Pre-G readiness review | PENDING | cleanup is reviewed for regressions; no known unsafe carry-forward remains before G |

## Stage 0 — sealed evidence

Stage 0 deliberately changed **documentation only**. It did not alter Pass A/B/C, Slice-F publication logic, tests, schemas, worlds, genomes, assignments, raters, or any Slice-G material.

The retained Gate-F evidence includes both successful and failed development work. A later positive result does not authorize deletion or reinterpretation of negative evidence merely to simplify the story.

The central sealed N2 witnesses are:

```text
reviewed preflight digest
sha256:714f0b6579ec670c58a5e26661604f28d0ab8673c375cd8361c9e65b05f7050f

E2-V1 source byte SHA-256
e6f59d1e62e7856914598b8f10424f778bef0ed6256ad771385af67f2e4cc720

E2-V2 source byte SHA-256
77329efbbf85777e359393787fe05e41119a24a560adec8a49ed9902cc80d890

N2 result Git commit
f960e8851ac0eeb2d03b1830740e813beeb10184

N2 result Git blob
a46fdc5fa8695080071a34ec0838003ac7b429f2
```

N2 result:

```text
memory formation             18/18
blind source attribution     18/18
exact chance tail            0.000003814697265625
Gate-F downstream fertility  PASS
```

The Gate-F closure record also seals the memory-selectivity characterization and the scope limitations on this development evidence. Stage 2 later corrected one arithmetic error in the hostile review's printed horizon-6 breakdown without changing the sealed artifact or Gate-F verdict.

## Stage 1 — Pass-C doctrine audit

Audit record:

[`m2-pr39-pass-c-meaning-formation-semantics-audit.md`](m2-pr39-pass-c-meaning-formation-semantics-audit.md)

Finding:

- the canonical compiler contract is already constitutive: Pass C creates what one remembered experience durably came to mean;
- the Pass-C domain already makes `no_durable_meaning` first-class and keeps `revised`, `unchanged`, and `none` distinct for reinterpretation;
- the burned N1/N2 development prompt is epistemically worded (`Decide whether this memory has durable meaning`) and remains unchanged historical evidence;
- there is no production Pass-C model runner under `services/` using that historical prompt;
- canonical future-facing constitutive initial/reinterpretation prompts and frozen hashable schemas now live in `services/world-kernel/src/genesis-pass-c-prompts.mjs`;
- a seam regression explicitly prevents the historical prompt from becoming the canonical future prompt.

Stage 1 deliberately does **not** rerun N1/N2 or claim that their 37/37 durable-meaning outcomes were produced by the new prompt.

Local maintainer verification after Stage 1:

```text
full tests                     573/573 pass
repository/world-seed check    green
```

Stage 1 is therefore **COMPLETE**.

## Stage 2 — memory/meaning characterization

Characterization record:

[`m2-pr39-memory-meaning-characterization.md`](m2-pr39-memory-meaning-characterization.md)

Implementation:

- `services/world-kernel/src/genesis-memory-meaning-characterization.mjs` defines one shared pure characterization over visible-history count, memory outcome, cited episode refs, and initial meaning outcome;
- citation share is `citedEpisodeCount / visibleEpisodeCount` for remembered observations;
- aggregate and by-visible-count reporting include cited-episode count and citation-share mean/min/max;
- the funnel explicitly reports remembered/not-remembered and durable/no-durable meaning rates;
- every result carries `admissionVerdict: null` and explicitly prohibits use as an admission gate or regeneration trigger;
- `tools/genesis-memory-meaning-n2-characterization.mjs` adapts the sealed N2 artifact without rewriting it;
- the Stage-2 regression uses both synthetic arithmetic and the sealed N2 artifact to prove the measurement operates at the intended resolution.

The maintainer ran the characterization against the sealed N2 artifact. Machine-derived baseline:

```text
observations                  18
remembered                    18
not remembered                 0
durable meaning               18
no durable meaning              0

cited episodes total          27
mean cited / memory             1.50
mean citation share             0.19074074074074074

horizon 6 mean share            0.2222222222222222
horizon 8 mean share            0.16666666666666666
horizon 10 mean share           0.18333333333333332
```

This exposed one arithmetic error in the prior hostile-review narrative: horizon 6 was printed there as `1.00` cited / `0.167` share; the sealed artifact gives `1.333...` cited / `0.222...` share. The aggregate review values (`1.50` cited and about `0.191` share) were correct. The Stage-2 machine-derived record is authoritative for the numerical breakdown; no N2 evidence or verdict changed.

Stage 2 does not define a healthy citation-share target or a healthy durable-meaning rate. Those remain characterization evidence only.

The maintainer subsequently reported the Stage-2 full suite and repository check passed. Stage 2 is therefore **COMPLETE**.

## Stage 3 — Slice-F canonical publication delegation

Delegation record:

[`m2-pr39-slice-f-canonical-publication-delegation.md`](m2-pr39-slice-f-canonical-publication-delegation.md)

Implementation:

- `genesis-origin-source-integrity.mjs` now exports pure authority-witness and canonical-fork-event assertions;
- the existing store-backed Slice-F proof APIs delegate to those pure semantic assertions;
- `genesis-store.mjs` continues to resolve authority records and replay source history transaction-locally during atomic birth publication;
- after resolution, publication delegates source-party/status matching and exact fork-prefix matching to the same canonical Slice-F semantic functions;
- publication no longer independently reimplements those three semantic comparisons;
- a new publication integration regression makes wrong source party, wrong subject status and a noncanonical fork prefix load-bearing through `GenesisStore.publishBirth()` itself.

Stage 3 does not reopen Gate F or change any accepted origin/source rule. It removes a future semantic-drift path while preserving the already-cleared transaction boundary.

The maintainer reported the Stage-3 targeted tests, full suite and repository check all passed. Stage 3 is therefore **COMPLETE**.

## Stage 4 — older C/D carry-forwards

Carry-forward record:

[`m2-pr39-pre-g-stage4-carry-forwards.md`](m2-pr39-pre-g-stage4-carry-forwards.md)

### C: long Thread-ID Genesis publication

The initial Stage-4 implementation closed the known 120-byte identity claim-predicate overflow. Its first local full-suite run then failed exactly where a load-bearing regression should fail: the synthetic 256-character Thread reached seed normalization, where the derived seed event ID embedded the complete Thread ID and exceeded Fibre's separate 256-character general ID contract.

That failure exposed a second real composition bug rather than a bad test expectation.

Stage 4 therefore closed the complete **Genesis birth path** required before G:

- ordinary short Thread IDs preserve their historical deterministic IDs byte-for-byte;
- only a derived Thread-scoped ID that would exceed the 256-character contract compacts the embedded Thread-ID segment into a deterministic hash reference;
- seed event IDs are bounded;
- Genesis Pass-A life-event IDs are bounded;
- ordinary command event IDs use the same compatibility-preserving helper;
- identity seed claim predicates remain within their independent 120-byte canonical-JSON budget;
- the full Thread ID remains authoritative in Thread state, history, identity assertions and publication.

The regression now publishes a real 256-character Thread with a Pass-A life episode, replays it, and verifies the generated event IDs and identity predicates remain valid.

This does **not** claim every future runtime-derived identifier has been exhaustively tested at max Thread-ID length. Stage 5 records that adjacent coverage limitation explicitly rather than inflating the Genesis result into a runtime-wide claim.

### D: historical-memory policy drift

Current memory content limits are admission-time policy, not a reason to make already admitted history unreadable after software policy changes.

Stage 4 separates:

```text
normalizeAutobiographicalMemory(...)
    current admission; content policy enforced by default

rehydrateAutobiographicalMemory(...)
    historical read; moving content-size policy not re-applied
```

Historical mode still enforces the durable memory structure, subject identity, chronology, evidence shape, format and lineage semantics.

Digest verification and `autobiographicalMemoryIsCurrent()` use historical rehydration. History-vs-history revision validation uses historical mode on both sides. A new write against an old predecessor still validates the new record under current content policy.

The regression creates a mechanically complete synthetic historical ledger record that exceeds today's V2 `rememberedContent` limit, proves current admission rejects it, and proves read-only history/current-memory inspection still verifies and returns it.

Local maintainer verification after the long-ID follow-up:

```text
full tests                     579/579 pass
repository check               green
```

Stage 4 is therefore **COMPLETE**.

## Stage 5 — test-value audit

Audit record:

[`m2-pr39-pre-g-stage5-test-value-audit.md`](m2-pr39-pre-g-stage5-test-value-audit.md)

Stage 5 treats the suite as an invariant portfolio, not a score to minimize or maximize.

The first implementation pass adds `tools/test-value-audit.mjs`, which inventories exactly the three `npm test` source globs and reports per-file scope, heuristic invariant family, source digest/size, static declared test calls, literal test titles, imports of other `*.test.mjs`, zero-declaration status and comment-only status.

Repository-wide mechanical signals include:

```text
byte-identical duplicate test files
test files importing other test files
test-path tombstones with no executable test
duplicate test titles across files
```

Only the first three can become automatic mechanical cleanup findings. A duplicate title is a review signal only because similar wording at domain/store/replay/API/transaction/hostile boundaries may protect materially different failure paths.

Two already-obsolete comment-only identity `*.test.mjs` tombstones were removed in this first pass; neither contained an assertion, and no semantic test was deleted.

`tools/test-value-audit.test.mjs` protects the audit's own distinction between executable tests, comment-only tombstones, test-import aliases, exact duplicate bodies and merely duplicated titles.

Stage 5 remains **IN PROGRESS** until the maintainer runs the machine inventory on the current branch, we review every mechanical finding, major invariant families receive an explicit value disposition, coverage gaps are recorded, and the full suite/check remains green after any chosen cleanup.

## Hard seam rules

Until this ledger reaches `status: complete`:

- do not author the five final Slice-G cohort WorldSpecs;
- do not assign final cohort genomes;
- do not run the G familiarity probe on cohort candidates;
- do not generate a G cohort life;
- do not execute a G/H model call;
- do not change an A–F experimental result because a later result is preferable;
- do not treat cleanup as permission to weaken an already-cleared authority boundary.

Model-free code/test/doc work required to close the seam remains allowed.

## Seam exit checklist

```text
[x] Pass-C semantics audited and contract-conformant
[x] no_durable_meaning remains genuinely possible
[x] citation-share selectivity diagnostic available and locally verified
[x] Slice-F duplicated semantic authority removed and locally verified
[x] known Slice-F mutation gaps killed by tests and locally verified
[x] long Thread-ID Genesis publication risk closed and locally verified
[x] historical-memory read-policy drift closed and locally verified
[~] tests inventoried by protected invariant and coverage gaps — machine audit landed; local inventory pending
[~] redundant/obsolete tests deliberately handled — two empty tombstones removed; full disposition pending
[ ] retained experiments separated from current mechanism
[ ] canonical docs/context packs reconciled
[ ] latest main reconciled
[ ] full test/check green after all seam changes
[ ] clean tree and exact seam-closing HEAD recorded
[ ] no Slice-G cohort/model use occurred before seam closure
```

Only after these conditions hold does work cross into Slice G.
