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

---

## Closure disposition — 2026-08-14

The HOLD above remains the authoritative first-review record. The implementation has now addressed each blocking attack surface. **Claude re-review is still required before Slice C closes.**

### S1-1 / S1-1a disposition — repaired by one current pre-production format

The reviewed-SHA failure was valid: `d0792f7...` could not reliably seed a Thread.

The proposed remediation of preserving a legacy/current registry and historical policy-dispatch runtime is superseded by an explicit owner decision: **Fibre has no deployed Threads yet, so pre-production uses one canonical current identity format.** Seed/bootstrap and new writes use the same current format; obsolete pre-production data is recreated or migrated rather than interpreted through runtime legacy branches.

This changes the remediation, not the finding that the reviewed SHA was broken.

Current evidence:

- Thread seed/bootstrap authors the same structured current identity format as ordinary writes;
- the registry/policy runtime has one supported current pre-production format;
- ordinary natural-language identity is not rejected by brittle grammar heuristics;
- lived culture/language grounding is enforced at the persistence boundary, so direct `IdentityStore` writes cannot bypass same-Thread event grounding.

### S1-2 disposition — CLOSED FOR RE-ATTACK

Every admitted autobiographical memory revision is now externally anchored in immutable Thread history through:

```text
AUTOBIOGRAPHICAL_MEMORY_RECORDED
```

The anchor payload contains only:

```text
memoryId
revision
memoryDigest
```

The memory record, memory lineage head, Thread-history anchor, command witness, and Thread projection/version advance are committed atomically.

Consequences:

- matched-pair memory record/head tail truncation leaves a contradictory Thread-history anchor;
- whole-lineage deletion leaves historical anchor residue;
- the anchor records **that Fibre recorded a memory revision**, not that the memory interpretation was historically true;
- `rememberedMeaning` is deliberately absent from the historical anchor payload.

A hostile regression now performs matched-pair tail truncation and requires integrity failure.

### S2-1 disposition — CLOSED FOR RE-ATTACK

Memory subject identity is now durable:

```text
subject: {
  originEventRef,
  slot
}
```

`memoryId` must recompute from `{threadId, originEventRef, slot}`. The subject is immutable across revisions, the origin event must remain a subject event, and previous subject-history references cannot silently disappear.

Changing the subject means creating a different memory lineage rather than reinterpreting the old one.

### S2-2 disposition — CLOSED FOR RE-ATTACK

Every `eventRef` must:

- resolve to the same Thread's immutable history;
- occur no later than the memory's `asOf`;
- fall within the declared `subjectPeriod`.

The former “1998–2004 childhood witnessed only by a 2026 event” path is mechanically rejected.

### S2-3 disposition — CLOSED FOR RE-ATTACK

The fake-interiority paths have been narrowed deliberately:

- `rememberedAt` was removed;
- `lastRecalledAt` remains rejected;
- `thread_self_authored` remains unavailable for Slice C memory;
- an allowed Fibre/imported authorship class may not set `authorship.entityId` to the owning Thread;
- changing `accessibility` or `retentionState` between revisions requires at least one newly cited **resolved epistemic evidence reference**.

Slice C therefore records memory state/perspective without claiming an unwitnessed moment of recall, forgetting, reflection, or self-authored Development.

### S2-4 disposition — CLOSED FOR RE-ATTACK

Subject history and epistemic evidence are now separate continuity classes.

Evidence continuity is computed over:

```text
supportingEvidenceRefs ∪ contradictingEvidenceRefs
```

`eventRefs` cannot satisfy that continuity requirement. A prior supporting or contradicting citation cannot silently disappear merely because it remains part of the memory subject.

Explicit support ↔ contradiction reclassification remains allowed because the evidence reference stays durably cited.

### S3-1 disposition — bounded without brittle natural-language parsing

`rememberedMeaning` now has:

- a material-content floor rejecting trivial values;
- a 2048-byte upper bound.

The closure patch deliberately does **not** attempt to infer semantic atomicity from generic English grammar such as counting conjunctions. Fibre depends on expressive, differentiated natural-language identity and autobiographical text; consumer-specific semantic constraints belong with the future consumer if #40 needs them.

### Additional closure hardening

During closure work, a direct-store bypass was found in the already-frozen situated-life substrate: service-level cultural/language event checks could be bypassed by writing directly through `IdentityStore`.

The persistence boundary now requires `cultural_formation` and `language_formation` assertions to include a resolved same-Thread `thread_event` witness. This is adjacent hardening, not a reopening of Slice B.

The anti-inflation boundary remains:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

### Validation evidence

Implementation baseline:

```text
ae8e8638c511b248cba6c61e8cf534b224c460cd
```

GitHub Actions run:

```text
31824559697
```

That run passed all decomposed repository gates:

- Markdown projections;
- build;
- domain package tests;
- Slice C autobiographical-memory tests;
- identity tests;
- situated-life tests;
- embodiment tests;
- remaining world-kernel tests;
- repository tooling tests;
- AI context-pack generation;
- generated-repository validation.

The targeted Slice C suite is **11 / 11 green**, including subject pinning, period grounding, evidence reclassification, fresh-evidence requirements for accessibility/retention, no fake interior authorship, Thread-history anchoring, and matched-pair truncation detection.

The final Claude handoff commit restores the normal `npm run check` workflow and updates review documentation only. Its exact SHA must also be green before it is handed to Claude.

## Re-review posture

All prior S1/S2 findings are **closed for re-attack, not self-cleared**.

Claude should use `docs/validation/m2-pr38-slice-c-review-request.md` for the narrow re-review and either CLEAR Slice C or identify a concrete remaining S1/S2 attack.

Slice D remains untouched until Claude clears this gate.
