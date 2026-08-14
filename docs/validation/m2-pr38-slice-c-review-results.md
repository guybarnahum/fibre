# PR #38 Slice C — Claude Narrow Hostile Review Results

**Reviewed head:** `d0792f7bf90889798c766ae5ac39d042e61bb6ed`  
**Verdict:** **HOLD**  
**Review scope:** Slice C — autobiographical memory epistemics only.

This document records the first narrow Claude hostile review disposition for Slice C. Slice C is not closed until the blocking findings below are fixed, repository validation is green on the exact reviewed replacement SHA, and Claude re-runs the narrow attacks.

## Measured baseline

At the reviewed SHA, in Claude's review environment:

```text
npm install       pass
npm run build     pass
npm run validate  pass
npm run context-pack pass
npm test          414 tests · 226 pass · 188 fail
```

Control at previous head `a0278b60`, in the same environment: **416 / 416, 0 fail**.

The dominant regression was `WorldStore.seedThread`: legacy identity bootstrap was swept into current claim-discipline validation after the current registry was renumbered to `"1"`, while bootstrap admission did not carry a claim-discipline witness.

## What survived hostile review

Claude could not break the following properties:

- memory writes do not mutate historical `thread_events.payload_json`;
- `eventRefs` must resolve to the same Thread and may not post-date `asOf`;
- opaque evidence references are rejected;
- memory-on-memory evidence bootstrap is rejected;
- revision skips, forks, wrong predecessors, backwards `recordedAt`, and cross-Thread lineage changes are rejected;
- visibility cannot widen within a lineage;
- retraction preserves memory history while removing the current projection;
- read-only inspection cannot author memory;
- `lastRecalledAt` and `thread_self_authored` are rejected;
- standing remains `acceptedCausalAssertions=0` / `endogenousEvidenceAssertions=0` through the attacks.

The HOLD is therefore about the epistemic floor and ledger integrity, not the already-working history/memory separation ceiling.

## S1 blockers

### S1-1 — Reviewed SHA cannot build a world

`npm test` fails broadly because `WorldStore.seedThread` throws during legacy identity bootstrap. The pre-production registry collapse changed `IDENTITY_DOMAIN_REGISTRY_V2_VERSION` to `"1"`, causing registry-1 bootstrap rows to enter current claim-discipline validation even though `bootstrapAdmission()` does not emit `claimDiscipline`.

Closure requirement:

- restore an unambiguous legacy/current registry discriminator;
- restore historical claim validation under the policy witness that admitted the row;
- make the normal validation command fail if a basic Thread cannot be seeded.

### S1-1a — Contradictory claim-discipline implementations

The live `identity-claim-discipline.mjs` had collapsed to one policy and aliased:

```text
assertRecordedClaimDiscipline = assertCurrentClaimDiscipline
```

while a newly added but effectively dead `identity-claim-discipline-base.mjs` retained the correct V1/V2 historical-dispatch model. The live alias reintroduced the Slice-A defect where future policy changes can retroactively invalidate admitted history.

Closure requirement: one canonical claim-discipline implementation with immutable historical dispatch; remove contradictory dead paths once the baseline is restored and verified.

### S1-2 — Coherent memory forgery plus matched-pair tail truncation

The record-digest chain plus lineage-head chain catches ordinary coherent forgery while successors remain. It does **not** detect an attacker who:

1. rewrites an early memory revision coherently;
2. recomputes that record digest and its matching head digest; and
3. deletes all later record/head pairs.

After matched-pair truncation, every current memory integrity check can pass and the forged earlier memory becomes the only surviving autobiographical past. An entire memory lineage can likewise be removed from both memory tables without residue.

Closure requirement: externally anchor memory ledger progression outside the memory ledger itself, in immutable Thread history, so tail truncation or whole-lineage deletion leaves an integrity contradiction.

## S2 blockers

### S2-1 — Memory lineage does not durably pin its subject

`memoryId` is derived from `{threadId, originReference, slot}`, but `originReference` and `slot` are not durable fields and are never checked against later `eventRefs`. A later revision can replace its subject event while preserving the same lineage identity by moving the old event into another reference class.

Closure requirement: make the subject identity durable and immutable across revisions; changing the subject creates a new memory lineage rather than silently reinterpreting the old lineage.

### S2-2 — `subjectPeriod` is not grounded to the subject history

A memory can declare a period unrelated to the events it cites. The current checks only order `subjectPeriod`, `rememberedAt`, `asOf`, and `recordedAt`; they do not establish that the cited subject history occurred in the period the memory claims to describe.

Closure requirement: mechanically bind the durable subject event/history to the claimed subject period.

### S2-3 — Unwitnessed interior-state claims remain writable

Although `lastRecalledAt` is excluded, caller-writable `rememberedAt` acts as a recall timestamp. `accessibility` and `retentionState` can change without any new witness, and an allowed non-self-authored kind can still name the Thread itself as `authorship.entityId`.

Closure requirement:

- remove or rename/redefine `rememberedAt` so Slice C does not mint a recall event;
- require new resolved evidence for material accessibility/retention changes;
- prevent the Thread from self-attributing a memory through a non-self-authored authorship class.

### S2-4 — Evidence non-erasure check is class-blind

The current monotonicity check flattens `eventRefs`, supporting evidence, and contradicting evidence into one set. A supporting citation can therefore disappear silently if the same reference remains as a subject event. This contradicts the committed hostile test.

Closure requirement: keep subject references distinct from epistemic evidence and require prior evidence to remain explicitly cited, allowing deliberate support/contradiction reclassification rather than silent disappearance.

## S3 hardening accepted into closure

### S3-1 — `rememberedMeaning` has no useful floor, cap, or atomicity discipline

Slice C should reject empty/trivial, unbounded, or multi-proposition biography-style meanings before #40 can consume them as one memory unit.

### S3 carry-forward

The narrow review also recorded two non-blocking residuals:

- a new lineage can currently republish equivalent private content publicly; disclosure authority must eventually gate by subject/content rather than lineage identity alone;
- the autobiographical memory ledger is not yet composed into the full situated-person inspector.

These are not Slice C closure blockers unless closure work materially changes their risk.

## Re-review gate

Claude should re-review only the prior S1/S2 attack surfaces after the closure patch proves:

```text
world seed baseline restored
full repository tests green
memory subject identity pinned
subject period grounded
explicit evidence-transition discipline
no caller-minted recall/self-authorship path
external memory-ledger anchoring detects matched-pair truncation and lineage deletion
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

Slice D remains out of scope until this gate clears.
