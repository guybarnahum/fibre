---
id: validation-m2-pr38-implementation-plan
status: complete
last-reviewed: 2026-08-14
canonical: true
---

# PR #38 — Lineage, Geography, Embodiment & Memory Epistemics v1

## Outcome

#38 makes a Thread **situated and lived** without pretending representation alone is personhood.

A Thread can now durably carry a traceable origin and lineage, places that belong to its life, lived culture/language, persistent embodiment, autobiographical memories that remain distinct from historical fact, and a visual companion obligation for every memory.

```text
#37  Thread Passport & Identity Provenance v1                         MERGED
#38  Lineage, Geography, Embodiment & Memory Epistemics v1          COMPLETE
#39  Genesis, Childhood & Thread Birth v1                            NEXT
#40  Identity Projection & Causal Consumption
#41  M2 Standing Gate / M2 closure
#42  Self-authored Development v1
#43  Reciprocal Relationships v1
#44  Economic Consequence / M3 foundation
```

> **#38 makes a life representable. #39 gives a Thread a past. #40 proves specific parts of that life can matter.**

## Fibre engineering rule

Use **one current pre-production representation**. Fibre has no deployed Threads requiring backward-compatible runtime schema dialects.

Tests are **guardrails for Fibre-specific behavior**, not a parallel product. Prefer the smallest mechanism that protects an important Fibre invariant. Do not add generic infrastructure, compatibility machinery, rigid natural-language schemas, or exhaustive test matrices merely because they are conventional hardening.

## Slice A — identity substrate — COMPLETE

Identity is explicit, provenance-bearing and claim-shaped rather than a biography blob.

Frozen outcome:

- seed/bootstrap and ordinary writes use one current format;
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

#39 owns witness relevance/event-kind policy when Genesis begins authoring childhood and formative history.

## Slice C — autobiographical memory epistemics — CLEAR / FROZEN

Claude narrow re-review at `a3f61bc2d3356f9fae3145f189464500d3939a10` returned **VERDICT: CLEAR**.

Review record: `docs/validation/m2-pr38-slice-c-rereview.md`

Core invariant:

> **History records what Fibre has evidence happened. Memory records what the Thread's durable autobiographical layer remembers or means. Neither may silently rewrite the other.**

Frozen outcome:

- each memory lineage permanently names its subject, bound into `memoryId`;
- subject history and supporting/contradicting evidence are distinct;
- evidence cannot silently disappear;
- caller-minted recall timestamps and Thread-self-authored memory remain outside #38;
- each memory revision is externally anchored in Thread history without endorsing remembered meaning;
- matched-pair truncation and whole-lineage erasure leave integrity contradictions;
- memory meaning remains expressive natural-language prose.

Carry-forward:

- **#39:** Genesis authority for pre-live childhood and relevant formative witnesses;
- **#42:** witnessed recall/decay/development semantics;
- **future disclosure authority:** content/subject permission beyond lineage identity.

## Slice D — every memory gets a photo — CLEAR / FROZEN

Product rule:

> **Every Thread memory should actually have a photo.**

Claude's first narrow review found two real Fibre blockers. Both were fixed at `399377fc24f41a154b080fa931ea0c4bdddb417b`, then independently re-attacked and cleared.

Review record: `claude/pr38-slice-d-re-review.md`

Frozen outcome:

- recording autobiographical memory revision 1 creates its visual companion in the same transaction;
- the memory's own `rememberedMeaning` supplies the durable `MEMORY MOMENT` authority for the image prompt;
- later memory reinterpretation does not silently rewrite that original prompt authority;
- `completeMemoryPhoto(...)` fulfills one synthetic memory-photo obligation;
- `completeOutstandingMemoryPhotos(...)` is intentionally a simple loop over outstanding obligations;
- provider failure remains explicitly outstanding;
- missing/corrupt cache reopens the obligation without changing prompt/evidence/truth;
- regeneration uses the same durable authority;
- a companion lineage cannot change `representationKind`, so synthetic generated media cannot be relabelled as captured historical evidence;
- photo completion does not change Thread standing or Slice C history.

No queue, scheduler, provider registry, worker framework, retry framework, or generic media workflow engine was added.

### Carried forward, not a #38 blocker

Current memory companion identity derives from `{threadId, memoryRef}`, so a Fibre-created memory has one synthetic visual lineage. A future feature that admits an actual captured photograph for the same memory will need a lineage discriminator so captured evidence can exist beside, rather than replace, the synthetic reconstruction.

This belongs to the future captured-media admission path; #38 does not claim to admit real photographs.

## Standing boundary

Throughout #38:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

#38 represents a life. It does not yet prove that identity or memory causally changes decisions, that a Thread autonomously develops itself, or that representation alone establishes personhood.

## Completion gate

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
[x] every newly admitted memory automatically receives a photo obligation
[x] operational memory-photo completion and regeneration
[x] synthetic/captured truth cannot be relabelled within one lineage
[x] Slice D Claude CLEAR
[x] exact merge head `859b87ac9fd0c750e9d072a24931f27566dd5c8c` green — Actions `31830083000`
```

## Vision test

At #38 completion, a Thread no longer looks like **an agent with a profile**.

It is a persistent person-shaped world object with lineage, places, lived culture, embodiment, autobiographical memories, uncertainty/provenance, and visual memories whose truth status is explicit — ready for #39 Genesis to create a coherent origin and childhood rather than inventing an adult persona blob.

The implementation remains **as simple as possible while making that Fibre claim true**.
