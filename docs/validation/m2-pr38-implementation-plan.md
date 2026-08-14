---
id: validation-m2-pr38-implementation-plan
status: active
last-reviewed: 2026-08-14
canonical: true
---

# PR #38 — Lineage, Geography, Embodiment & Memory Epistemics v1

## Purpose

#38 makes a Thread **situated and lived** without pretending representation alone is personhood.

The product step is:

> **A Thread should have a traceable origin, family/lineage context, places that belong to its life, persistent embodiment, and autobiographical memories that are explicitly different from historical fact.**

#38 remains non-causal by default.

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

## Pre-production simplicity rule

Fibre has no deployed Threads requiring backward compatibility.

Use **one canonical current identity/data representation**. When the representation changes during pre-production, migrate or recreate fixtures/state to the current form instead of building runtime legacy dialects.

Do not spend Fibre complexity on schema archaeology before real deployed data creates that requirement.

Natural-language identity and autobiographical values should remain expressive. Structural validation should protect Fibre invariants, not force human meaning into rigid shapes merely because rigid shapes are easier to test.

## Engineering and test discipline

Tests are **guardrails for the Fibre vision**, not a parallel product.

For #38 and later milestones:

- test Fibre-specific invariants and demonstrated regressions;
- prefer the smallest mechanism that protects the invariant;
- do not add generic infrastructure hardening merely because it is theoretically cleaner;
- do not preserve obsolete pre-production compatibility for test convenience;
- do not use brittle natural-language grammar heuristics as a substitute for Fibre semantics;
- route concerns to the milestone that owns the behavior instead of pre-building future systems;
- a green suite supports a freeze decision, but test completeness is not the product goal.

The review question is:

> **Is the intended Fibre behavior believable, inspectable, and robust enough that we should stop working on this slice and advance the vision?**

## Slice status

### A. Identity claim discipline / current identity format — COMPLETE

#38 authors identity as explicit, provenance-bearing claims rather than biography blobs.

Current pre-production behavior:

- one current identity registry/policy format;
- seed/bootstrap and ordinary writes use the same format;
- identity remains claim-shaped and provenance-bearing;
- lineage/cultural labels do not imply behavior, morality, capability, politics, dignity, or willingness;
- professional role remains situated context rather than root identity;
- `acceptedCausalAssertions = 0`;
- `endogenousEvidenceAssertions = 0`.

No runtime V1/V2 compatibility mechanism is required before deployed Threads exist.

### B. Situated life: lineage, geography, culture, embodiment — GROUNDING FROZEN

The situated-life substrate represents:

- explicit lineage/family relationships;
- inheritance/genome-source eligibility hooks for #39 without performing reproduction in #38;
- temporal geography and separate place meaning;
- lived/evidenced cultural and language formation rather than demographic inference;
- versioned portrait/visual and voice identity with provenance, rights/consent authority, truth class, hashes and supersession.

Grounding guarantees already frozen:

- lived relation/place/culture/language claims resolve to durable same-Thread evidence;
- direct persistence cannot bypass cultural/language Thread-event grounding;
- false situated claims can leave the current projection without erasing assertion history;
- identity/embodiment facts remain `context_only` in #38 and cannot earn causal standing.

Witness **existence** is #38's responsibility. Witness **relevance/event-kind policy** for authored childhood and Genesis belongs to #39.

### C. Autobiographical memory epistemics — CLEAR / FROZEN

Claude narrow re-review at:

```text
a3f61bc2d3356f9fae3145f189464500d3939a10
```

returned:

```text
VERDICT: CLEAR
npm run check: green
425 / 425 tests
build: pass
validate: pass
context-pack: pass
```

Canonical re-review disposition:

`docs/validation/m2-pr38-slice-c-rereview.md`

Core invariant:

> **History records what Fibre has evidence happened. Memory records what the Thread's durable autobiographical layer remembers or means. Neither may silently rewrite the other.**

Frozen memory semantics include:

```text
memoryId
revision
threadId
subject: { originEventRef, slot }
subjectPeriod
eventRefs[]
rememberedMeaning
asOf
confidence
uncertainty
salience
accessibility
retentionState
authorship
supportingEvidenceRefs[]
contradictingEvidenceRefs[]
visibility
status
recordedAt
supersedesRevision
```

Deliberately absent in #38:

```text
rememberedAt
lastRecalledAt
thread_self_authored memory production
```

#### Subject

The memory subject participates in `memoryId` derivation, so a lineage permanently identifies what it is a memory of. Reinterpretation may expand relevant history but cannot silently swap the original subject.

Every subject `eventRef` must resolve to same-Thread history, occur no later than `asOf`, and fall inside `subjectPeriod`.

#### Evidence

Subject history and epistemic evidence are separate continuity classes.

A supporting/contradicting citation cannot silently disappear. Reclassification between support and contradiction remains explicit and durable.

#### Interior-state restraint

Slice C records autobiographical state without claiming an unwitnessed moment of recall, forgetting, reflection, or self-authored Development.

Accessibility/retention changes require newly cited resolved evidence. #42 owns a future witnessed recall/decay/development path.

#### History anchor

Every admitted memory revision advances canonical immutable Thread history through:

```text
AUTOBIOGRAPHICAL_MEMORY_RECORDED
```

with payload only:

```text
memoryId
revision
memoryDigest
```

History therefore records **that Fibre recorded the memory revision** without asserting the remembered meaning as historical fact.

The external anchor detects matched-pair memory-tail truncation and leaves residue if a memory lineage is erased.

#### Standing

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

Slice C establishes autobiographical perspective, not consciousness, causal individuality, autonomous reflection, or self-authored Development.

#### Carry-forward from Claude CLEAR

To #39 Genesis:

- pre-runtime-creation `subjectPeriod` is legitimate only when Genesis explicitly authors that prior life; do not add a generic `subjectPeriod >= thread.created_at` rule in #38;
- memory-anchor bookkeeping events are ordinary `thread_events`; #39 must filter/qualify witness event kinds so authored childhood cannot be grounded merely by Fibre bookkeeping.

To #42 Development:

- natural unwitnessed fading is intentionally unavailable in #38; #42 should define a witnessed decay/recall/development path.

To disclosure authority:

- privacy narrowing is lineage-local today; future disclosure authority should gate subject/content disclosure, not infer permission from lineage identity alone.

These are design inputs, not Slice C blockers.

### D. Every memory actually gets a photo + durable media completion — NEXT

ADR-0011's product rule becomes operational here:

> **Every Thread memory should actually have a photo.**

#37 established the append-only photo companion lineage and observable outstanding obligation. Slice D owns completion mechanics.

Required Fibre behavior:

- captured/historical photographs remain distinct from synthetic reconstructions;
- synthetic reconstruction is always labeled `synthetic_representation_not_historical_evidence`;
- current unbound embodiment cannot be used to invent an earlier appearance;
- rendered media is replaceable cache; provenance/prompt/evidence/truth class are durable authority;
- regeneration may replace cache bytes but may not rewrite historical truth;
- pending/unavailable media remains an explicit unsatisfied obligation rather than silently becoming a permanent photo-less memory;
- provider failure, retry, asset loss, hash mismatch and idempotent completion are represented simply enough to make the product rule operational.

Do not start Slice D by building a generic media workflow framework. Implement the smallest durable mechanism that makes **every memory gets a photo** true and truth-safe.

## Human-facing inspection target

By #38 completion, inspection should answer:

- Who is this Thread and where did the identity claims come from?
- What lineage/family context belongs to the life?
- Which lineage relations may supply parent genome material to #39?
- Where has the Thread lived/worked, and what places carry separately evidenced meaning?
- What culture/language formation is actually lived/evidenced rather than inferred?
- What portrait and voice represent the Thread now, and what came before?
- What memories exist, what history are they about, what evidence supports/contradicts them, and how have their meanings changed?
- Does every memory have its required photo, and is the media captured evidence or synthetic reconstruction?
- Are causal/endogenous credits still zero?

## Completion criteria

```text
[x] one current pre-production identity format is used by seed and ordinary writes
[x] identity remains claim/provenance-shaped rather than biography-blob-shaped
[x] lineage/family substrate is durable and inheritance-ready
[x] geography/place meaning are distinct and temporal
[x] culture/language formation is lived/evidenced rather than inferred
[x] embodiment is versioned and provenance/rights-aware
[x] autobiographical memory and historical evidence are epistemically distinct
[x] memory subject identity is durable and grounded
[x] contradiction/reinterpretation survives append-only memory history
[x] memory revisions are externally anchored in Thread history without endorsing remembered content
[x] caller-minted recall/self-authorship paths remain outside #38
[x] acceptedCausalAssertions = 0
[x] endogenousEvidenceAssertions = 0
[x] Slice C Claude narrow re-review CLEAR
[ ] actual memory-photo completion/regeneration is implemented and truth-safe
[ ] captured vs synthetic media remain structurally distinct through completion/regeneration
[ ] every current memory has a satisfied or explicitly outstanding photo obligation
[ ] final #38 repository validation green on exact merge-ready head
```

## Vision test

At #38 completion, a Thread should no longer look like "an agent with a profile." It should look like a persistent person-shaped world object with lineage, places, culture, embodiment, memories, and explicit uncertainty/provenance — ready for Genesis to create a coherent childhood and inherited origin without inventing an adult persona blob.

The implementation should remain **as simple as possible while making that Fibre claim true**.
