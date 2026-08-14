---
id: validation-m2-pr38-implementation-plan
status: active
last-reviewed: 2026-08-14
canonical: true
---

# PR #38 — Lineage, Geography, Embodiment & Memory Epistemics v1

## Why #38 exists

#38 makes a Thread **situated and lived** without pretending representation alone is personhood.

> **A Thread should have a traceable origin, family/lineage context, places that belong to its life, persistent embodiment, autobiographical memories that are distinct from historical fact, and a photo for every memory.**

#38 remains non-causal.

```text
#37  Thread Passport & Identity Provenance v1                         MERGED
#38  Lineage, Geography, Embodiment & Memory Epistemics v1          THIS PR
#39  Genesis, Childhood & Thread Birth v1
#40  Identity Projection & Causal Consumption
#41  M2 Standing Gate / M2 closure
#42  Self-authored Development v1
#43  Reciprocal Relationships v1
#44  Economic Consequence / M3 foundation
```

> **#38 makes a life representable. #39 gives a Thread a past. #40 proves specific parts of that life can matter.**

## Fibre engineering rule

Fibre has no deployed Threads requiring backward-compatible runtime schema dialects.

Use **one current pre-production representation**. Migrate or recreate fixtures/state when it changes.

Tests are **guardrails for Fibre-specific behavior**, not a parallel product. Prefer the smallest mechanism that protects an important Fibre invariant. Do not add generic infrastructure, compatibility machinery, rigid natural-language schemas, or exhaustive test matrices merely because they are conventional computer-science hardening.

The review question is:

> **Is the Fibre behavior believable, inspectable and robust enough that we should stop working on this slice and advance the vision?**

## Slice A — identity substrate — COMPLETE

Identity is explicit, provenance-bearing and claim-shaped rather than a biography blob.

Frozen outcome:

- seed/bootstrap and ordinary writes use one current pre-production format;
- lineage/culture/profession remain context rather than inferred behavior;
- no identity claim earns causal or endogenous standing in #38.

## Slice B — situated life — GROUNDING FROZEN

A Thread can durably carry:

- lineage/family relationships and parent-genome eligibility hooks for #39;
- temporal geography and separately evidenced place meaning;
- lived/evidenced culture and language formation;
- versioned visual/voice embodiment with provenance and rights/consent authority.

Frozen outcome:

- lived claims require durable same-Thread evidence;
- direct persistence cannot bypass cultural/language event grounding;
- false situated claims can leave the current projection without erasing history;
- situated/embodiment context remains non-causal in #38.

#39 owns **witness relevance/event-kind policy** when Genesis begins authoring childhood and formative history.

## Slice C — autobiographical memory epistemics — CLEAR / FROZEN

Claude narrow re-review at:

```text
a3f61bc2d3356f9fae3145f189464500d3939a10
```

returned **VERDICT: CLEAR** after independent hostile reproduction.

Canonical review record:

`docs/validation/m2-pr38-slice-c-rereview.md`

Core invariant:

> **History records what Fibre has evidence happened. Memory records what the Thread's durable autobiographical layer remembers or means. Neither may silently rewrite the other.**

Frozen outcome:

- each memory lineage permanently names its subject through `subject: { originEventRef, slot }`, bound into `memoryId`;
- subject history and supporting/contradicting epistemic evidence are separate axes;
- evidence cannot silently disappear;
- `rememberedAt`, `lastRecalledAt` and Thread-self-authored memory production remain outside #38;
- accessibility/retention changes require new resolved evidence;
- each memory revision is externally anchored in canonical Thread history using only `{memoryId, revision,memoryDigest}`;
- history records that Fibre wrote down a memory without endorsing its remembered meaning;
- matched-pair truncation and whole-lineage erasure leave canonical integrity contradictions;
- memory meaning remains expressive natural-language prose rather than a rigid machine biography schema.

Carry-forward, not blockers:

- **#39:** pre-runtime childhood periods require Genesis authority; filter/qualify bookkeeping event witnesses;
- **#42:** add witnessed recall/decay/development semantics for natural fading;
- **future disclosure authority:** reason about subject/content permission rather than lineage identity alone.

## Slice D — every memory gets a photo — IMPLEMENTED / REVIEW READY

Product rule:

> **Every Thread memory should actually have a photo.**

Existing #37/#38 substrate already provides an append-only visual companion per memory with:

- `pending_generation`, `available`, `unavailable_with_reason`;
- `synthetic_reconstruction` versus `captured_photo`;
- `synthetic_representation_not_historical_evidence` versus `captured_source_evidence`;
- durable rich photo prompt + digest;
- exact bound source references;
- inspector-visible outstanding-photo obligation.

Slice D adds the missing execution path without building a generic media platform.

### Complete one memory

`completeMemoryPhoto(...)`:

- invokes a renderer with the exact durable prompt, digest, source references and truth class;
- appends an `available` revision with the renderer's cache locator;
- leaves an already-available photo alone unless explicit regeneration is requested;
- records renderer failure as explicit `provider_failure` rather than losing the obligation;
- retries/regenerates from the same durable prompt/evidence;
- refuses to regenerate captured historical evidence as synthetic media.

### Complete the Thread's outstanding photos

`completeOutstandingMemoryPhotos(...)` is intentionally just a loop:

- attempt every outstanding synthetic memory-photo obligation;
- leave already-available photos alone;
- leave outstanding captured-photo evidence alone rather than silently replacing it synthetically;
- return simple completion/failure counts.

There is no queue, scheduler, provider registry, worker framework or generic media workflow engine in #38.

### Asset loss/corruption

`reportMemoryPhotoAssetIssue(...)` reopens an available photo obligation for:

```text
asset_missing
hash_mismatch
```

The new unavailable revision clears the cache locator but does **not** change the memory, durable prompt, bound evidence, representation kind or truth status.

A subsequent completion regenerates synthetic cache from the same durable authority.

### Slice D validation

Implementation SHA:

```text
6851db95e02165c36a8efce0db7bb0fa70a1f023
```

passed full `npm run check` in GitHub Actions run `31826980397`.

Two focused Slice-D tests protect the product behavior:

1. fulfill all outstanding fixture memory photos and observe the Thread-level obligation become satisfied;
2. provider failure -> recovery -> hash mismatch -> regeneration while prompt/evidence/truth remain unchanged.

That is intentionally the test surface. More permutations are not a product goal.

Narrow review request:

`docs/validation/m2-pr38-slice-d-review-request.md`

## Standing boundary

Throughout #38:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

#38 represents a life. It does not yet prove that identity or memory causally changes decisions, that a Thread autonomously develops itself, or that representation alone establishes personhood.

## #38 completion gate

```text
[x] one current pre-production identity format
[x] lineage/family substrate durable and inheritance-ready
[x] temporal geography and separate place meaning
[x] lived/evidenced culture and language formation
[x] versioned provenance/rights-aware embodiment
[x] autobiographical memory distinct from history
[x] durable memory subject and evidence semantics
[x] memory ledger externally anchored without endorsing content
[x] Slice C Claude CLEAR
[x] operational memory-photo completion and regeneration
[x] synthetic and captured truth classes remain structurally distinct
[x] every current memory has a satisfied or explicitly outstanding photo obligation
[x] full repository gate green on Slice D implementation SHA
[ ] Slice D narrow vision review CLEAR
[ ] final exact #38 head green after closure documentation
```

## Vision test

At #38 completion, a Thread should no longer look like **an agent with a profile**.

It should look like a persistent person-shaped world object with lineage, places, lived culture, embodiment, autobiographical memories, uncertainty/provenance, and visual memories whose truth status is explicit — ready for #39 Genesis to create a coherent origin and childhood rather than inventing an adult persona blob.

The implementation should remain **as simple as possible while making that Fibre claim true**.
