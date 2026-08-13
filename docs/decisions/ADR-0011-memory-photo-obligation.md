---
id: adr-0011
status: accepted
date: 2026-08-13
---

# ADR-0011: Every autobiographical memory carries a photo-completion obligation

## Context

The four M2 constitutional documents merged in PR #36 distinguish durable history, autobiographical memory, identity, embodiment, past selves, and current interpretation. They do **not** require a photo for every memory.

During PR #37, the product requirement was strengthened:

> **Every Thread memory should actually have a photo. `pending_generation` may be transitional, but it must not become a legitimate permanent photo-less memory.**

That requirement is useful to Fibre's long-term vision of a lived, inspectable life, but it is a new architectural/product decision. It must not be presented as though PR #36 had already required it.

At the same time, image generation and object storage are fallible external mechanisms. Fibre must not make world progress depend on a renderer being available, and must not let a particular renderer or storage vendor become memory truth.

PR #36 also already requires an epistemic distinction between **history** and **autobiographical memory**. The M2 memory envelope must eventually represent salience, accessibility, retention state, recall timing, supporting and contradicting evidence, temporal perspective, authorship, visibility, and supersession. The photo requirement does not replace that work.

## Decision

### 1. A photo is an explicit completion obligation for every Thread memory

Every durable Thread memory reference must have an append-only memory-photo companion lineage. A lineage alone does not satisfy the requirement.

Only a current companion revision with `status = available` satisfies the memory-photo obligation.

`pending_generation` and `unavailable_with_reason` are operational states that keep the obligation **outstanding**. They are never success states and never a waiver.

The world kernel may still commit a memory while its photo is pending. Renderer availability is therefore **not** a freeze precondition. Fibre inspection must expose the outstanding count and exact memory references so a completion worker or operator can close them.

### 2. Synthetic photo truth is prompt-and-evidence truth; the render is cache

For a synthetic reconstruction, Fibre durably stores a rich, layered canonical `photoPrompt`, its digest, and immutable source references. Those records are the reconstruction authority.

The rendered image is a replaceable cache. Losing or invalidating the cached object does not rewrite the memory and does not authorize a new interpretation of the past. Regeneration must use the same authoritative prompt and bound evidence unless Fibre appends a new prompt revision with new admitted evidence.

A renderer implementation such as Nano Banana and a cache implementation such as S3 are operational choices, not domain authority. Domain records must therefore treat the cached asset location as an opaque versioned locator rather than encode one storage vendor as the meaning of a valid memory photo.

### 3. Synthetic reconstruction and historical photographic evidence remain different truth classes

A synthetic reconstruction must remain explicitly non-historical photographic evidence.

A captured historical photograph is source evidence. If the captured source is lost, Fibre may record that loss; it may not synthesize a look-alike and preserve `captured_source_evidence` status.

### 4. Visual continuity may use only explicitly bound evidence

A renderer may use identity, embodiment, relationship, geography, or historical detail only when the exact relevant evidence is bound into the companion revision. If v1 binds none of a category, the render must remain visually noncommittal rather than consulting mutable current identity or inventing detail.

### 5. M2 ownership is amended explicitly

This ADR amends the implementation sequence after PR #36 without changing the standing claim PR #36 itself established:

- **#37 — Thread Passport & Identity Provenance v1** owns the durable photo-obligation record, prompt/digest/source-reference lineage, historical truth classification, atomic pending companion creation for new memories, and read-only observability of outstanding photo obligations.
- **#38 — Lineage, Geography, Embodiment & Memory Epistemics v1** owns actual renderer integration, cached asset completion/regeneration, richer embodiment evidence binding, and the PR #36 autobiographical-memory envelope required to make `memory != history` explicit in storage and inspection (`rememberedAt/asOf`, salience, accessibility, retention state, `lastRecalledAt`, supporting/contradicting evidence, visibility/status, and supersession semantics).
- **#39** remains the bounded identity projection and causal-consumption cutover.
- **#40** may not close M2 until Scenario V (`autobiographical memory is not history`) and the other standing gates assigned by #36 are actually demonstrated.

This is a sequence amendment, not permission to award #37 credit for memory epistemics it does not implement.

## Consequences

- A permanently pending photo becomes operational debt that Fibre can enumerate, not a silently valid steady state.
- Thread life-history persistence remains available during renderer or object-store outages.
- Photo generation can change providers or storage systems without changing memory truth.
- Regeneration is append-only and evidence-bound rather than an opportunity to project the current self backward into the past.
- The photo requirement cannot substitute for the epistemic architecture that distinguishes remembering from historical fact.
- #37 remains an identity/provenance milestone rather than absorbing all of #38 embodiment or #41 endogenous development.

## Deferred implementation

PR #38 must supply the completion mechanism that turns outstanding photo obligations into `available` revisions and must define the operational retry/backoff/repair behavior for unavailable caches.

PR #38 must also land the memory epistemic envelope described above before #40 standing. Human-like forgetting, rehearsal, decay, or differential retention remain causal claims that require later evidence; representing those states does not itself earn such claims.
