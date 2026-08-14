# PR #38 Slice C — Claude narrow re-review

**Reviewed head:** `a3f61bc2d3356f9fae3145f189464500d3939a10`  
**Verdict:** **CLEAR**  
**Scope:** Slice C — autobiographical memory epistemics only.  
**Validation reproduced by reviewer:** `npm run check` green, **425 / 425**, build pass, validate pass, context-pack pass, clean tree.

## Disposition

Slice C is **FROZEN**.

Claude reproduced the prior hostile attacks independently and found no surviving S1 or S2 blocker. The important result is conceptual, not merely test-count green:

> A Thread can preserve a personal, mutable, uncertain autobiographical account of its past without Fibre confusing that account with objective history.

The reviewer exercised one memory across multiple revisions — uncertain, contradicted, faded, then retracted — while the historical event remained byte-unchanged and causal/endogenous standing remained zero.

## What is now frozen

### Memory subject identity

A memory lineage permanently names what it is a memory of:

```text
subject: {
  originEventRef,
  slot
}
```

The subject participates in `memoryId` derivation. Reinterpretation may add relevant history, but cannot silently swap the lineage to a different subject.

### Memory != history

History records **that Fibre recorded a memory revision**, not that the remembered content is true.

`AUTOBIOGRAPHICAL_MEMORY_RECORDED` anchors only:

```text
memoryId
revision
memoryDigest
```

`rememberedMeaning` is not copied into the historical event.

### Evidence semantics

Subject history (`eventRefs`) and epistemic evidence (`supportingEvidenceRefs` / `contradictingEvidenceRefs`) are separate axes.

A citation cannot silently disappear. A change from support to contradiction is represented as an explicit reclassification.

### No fake interior events

Slice C deliberately does not mint unwitnessed cognition:

- no `rememberedAt`;
- no `lastRecalledAt`;
- no `thread_self_authored` memory production;
- Fibre/imported authorship cannot name the owning Thread as author;
- accessibility/retention changes require newly resolved evidence.

This is intentionally conservative until #42 owns witnessed self-development/decay/recall semantics.

### Ledger integrity

Memory revision progression is externally anchored in canonical Thread history. Claude reproduced the prior forge + matched-pair truncation attack and found the canonical Thread unreadable once an attacker tries to coherently rewrite both memory and anchor history.

Whole-lineage erasure likewise leaves history/projection residue.

### Standing remains zero

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

Slice C represents autobiographical perspective. It does not claim causal individuality, consciousness, autonomous reflection, or self-authored Development.

## Non-blocking carry-forward

These are design inputs, not conditions on Slice C:

### #39 Genesis

- `subjectPeriod` may extend before runtime Thread creation. #39 should allow this only through Genesis-authored childhood/origin semantics rather than introducing a generic lower bound in #38.
- Memory-anchor events are currently ordinary `thread_events` and can satisfy generic lived-event witness existence. #39 must constrain **witness relevance/event kinds** so Genesis cannot compile childhood from Fibre bookkeeping events.

### #42 Development

Natural unwitnessed fading is intentionally not representable in #38 because accessibility/retention changes require new evidence. #42 should introduce a witnessed recall/decay/development path when Fibre can legitimately own that interior transition.

### Disclosure authority

Visibility narrowing is lineage-local. Future disclosure authority should reason about subject/content authority rather than assuming a new lineage implies new permission.

## Engineering/review discipline carried forward

Tests are guardrails for the Fibre vision, not a parallel product.

For future slices:

- add tests where they protect a Fibre-specific invariant or prevent a demonstrated regression;
- prefer the smallest mechanism that protects the invariant;
- do not add legacy/runtime compatibility before deployed data requires it;
- do not rigidify expressive natural-language identity or memory merely to make validation easier;
- do not block a slice for speculative hardening, exhaustive mutation coverage, or generic infrastructure elegance;
- route future concerns to the milestone that owns the behavior rather than pre-building them early.

The completion question is: **is Fibre's intended behavior believable and robust enough to move forward?** Not: **can we produce more tests?**

## Freeze result

**Slice C: CLEAR / FROZEN.**

Slice D remains separate and is the next #38 slice. No Slice D implementation is implied by this freeze.
