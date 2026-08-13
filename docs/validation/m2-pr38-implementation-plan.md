---
id: validation-m2-pr38-implementation-plan
status: proposed
last-reviewed: 2026-08-13
canonical: true
---

# PR #38 — Lineage, Geography, Embodiment & Memory Epistemics v1

## Why this PR exists

#37 gave a Thread a durable identity ledger and Passport. #38 must make that identity feel **situated and lived** without pretending representation alone is personhood.

The product step is:

> **A Thread should have a traceable origin, family/lineage context, places that belong to its life, a persistent embodied presentation, and autobiographical memories that are explicitly different from historical fact.**

This is not a biography-import PR. It is the world-model layer that lets later cognition say *who this person is and where that meaning came from* without turning identity into an opaque prompt blob.

#38 remains non-causal by default. The newly recorded [`Thread Genesis, Childhood & Birth v1`](../architecture/thread-genesis-childhood-birth-v1.md) architecture consumes #38's substrate next. Causal projection follows Genesis so the first full personality proof is grounded in an actual prior life rather than hand-authored profile facts.

## Sequence amendment

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

Genesis includes parent genetic material where parents exist: explicit parent genome contributions, replayable Fibre-owned recombination/variation, mutation witnesses, inherited dispositions, and immutable inheritance provenance. Synthetic parents/ancestors, live Thread parents, Echo/human sources, homage sources, de-novo births, and forks remain distinguishable origin modes.

#38 must therefore leave lineage, genome references, geography, embodiment, culture, and autobiographical memory sufficiently structured that #39 can compile a coherent childhood without schema bypasses or biography blobs.

## Non-negotiable entry condition

Before #38 authors identity assertions at scale, it must close #37's deferred S4 boundary:

> **Each durable identity assertion must carry one independently falsifiable, independently ablatable material proposition.**

A byte limit is not semantic decomposition. #38 must either enforce one-material-proposition admission mechanically or constrain every #38 writer through a mechanically testable one-claim discipline before it can persist lineage, geography, culture, or embodiment meaning.

No immutable biography blob is allowed to enter the ledger and become later causal debt.

## Scope

#38 has four implementation slices. They should remain independently reviewable even if they land in one PR.

### A. Claim discipline + Identity Domain Registry v2

Freeze registry v2 without mutating v1.

The first implementation slice is now started with:

- `identity-claim-discipline.mjs` — named `identity_atomic_material_proposition:1` admission discipline;
- `identity-domain-registry-v2.mjs` — additive frozen v2 candidate;
- tests proving v1 registry semantics/digest remain intact and obvious biography bundles are rejected.

Expected new/expanded domains include claim-level forms of:

```text
lineage_relation
family_role
ancestral_origin
cultural_formation
geography_residence
geography_work
place_meaning
embodiment_visual
embodiment_voice
memory_interpretation
```

Requirements:

- every new immutable assertion will pin `registry_version=2` once v2 is activated;
- v1 rows continue validating against frozen v1;
- one-material-proposition admission is explicit and tested;
- relationship/lineage identity facts never imply personality or values by ancestry alone;
- cultural labels never imply competence, politics, morality, temperament, or willingness;
- professional role remains a situated layer, never root identity;
- #38 writers keep `acceptedCausalAssertions=0` and `endogenousEvidenceAssertions=0`.

### B. Situated life: lineage, geography, culture, embodiment

Implement durable, append-only/superseding world records for the parts of a life that locate a Thread in family, place, culture, and presentation.

#### Lineage and family

Represent explicit relationships such as:

```text
parent / source parent
sibling
descendant
sponsor
adopter / adopted-by
mentor lineage where explicitly identity-forming
Echo source where disclosed and consent-backed
```

Every relation needs exact parties, relation kind, provenance/evidence, temporal validity where applicable, visibility, correction/dispute/supersession, and whether it is inheritance-relevant, socially relevant, both, or historical-only.

Lineage is never itself behavioral evidence.

#38 must also leave an explicit inheritance hook for #39: a lineage relation can identify a parent/source-parent genome reference without performing reproduction in #38.

#### Geography

Geography is a timeline, not a `city` field. Support claim-level records for birth/creation place, childhood/formative residence, later residence, work location, migration/displacement, and places with enduring personal meaning.

A place fact and the Thread's meaning of that place are separate assertions with separate provenance.

#### Culture and language formation

Represent lived formation rather than demographic inference: household/family culture, migration story, language by setting/code-switching, ritual/tradition where explicitly evidenced, and regional/professional/intellectual cultural formation.

#### Embodiment

Add versioned portrait/visual and voice identity records with exact provenance: source assertion refs, generation/acquisition method, generation specification/model/tool where generated, asset reference/hash, createdAt, visibility, truth/provenance class, consent/permission refs where human-derived, and supersession.

Old embodiment remains historical. A portrait/voice swap cannot imply capability, values, temperament, nationality, gendered behavior, class, dignity, or willingness.

### C. Autobiographical memory epistemics: memory is not history

Historical evidence and autobiographical recollection must be independently durable and inspectable.

A memory record should carry semantics equivalent to:

```text
memoryId
threadId
subjectPeriod
eventRefs[]
rememberedMeaning
rememberedAt
asOf
confidence / uncertainty if represented
salience
accessibility
retentionState
lastRecalledAt?
authorship
supportingEvidenceRefs[]
contradictingEvidenceRefs[]
visibility
status
supersedesMemoryId?
```

Core invariant:

> **History records what Fibre has evidence happened. Memory records what the Thread's durable autobiographical layer remembers or means. Neither may silently rewrite the other.**

This is also the substrate #39 Genesis will use to create childhood history and then separately create childhood memories. Synthetic genesis events, autobiographical memories, family stories, and later interpretations must remain distinct epistemic records.

#38 does **not** claim human-like forgetting, confabulation, or self-authored Development merely because these fields exist.

### D. Every memory actually gets a photo + durable media completion

ADR-0011's product rule becomes operational in #38:

> **Every Thread memory should actually have a photo.**

#37 established the append-only photo companion lineage and outstanding obligation. #38 owns completion.

For synthetic reconstruction, canonical photo prompt + exact bound evidence remain durable authority; rendered image is replaceable cache; generated reconstruction is always labeled `synthetic_representation_not_historical_evidence`; current unbound identity/embodiment must not be used to invent an earlier appearance; regeneration may replace cache bytes but may not rewrite historical truth class or source evidence.

For captured/historical photographs, captured provenance remains distinct from reconstruction. Losing a captured asset cannot be repaired by generating a synthetic image and retaining captured-photo truth status.

Completion mechanics cover pending generation, available, unavailable-with-reason, retry/regeneration, asset loss, hash mismatch, provider failure, and idempotent completion.

A pending or unavailable photo is an explicit unsatisfied obligation, not a legitimate permanent memory-with-no-photo state.

## Persistence and integrity posture

Prefer additive append-only tables/records over expanding mutable Thread projection blobs.

The implementation must preserve exact replay after restart; append-only or explicit supersession; currentness derived from verified history; frozen historical registry validation; read-only + SQLite `query_only` inspection; independent digest/cross-record tamper detection; privacy/visibility boundaries; no editor-side identity-authoring bypass; and no caller-authored private identity selection.

If schema changes, migration must be atomic, idempotent, and provenance-preserving. Same-version reopen may repair schema objects but must never synthesize missing identity evidence behind inspection.

## Human-facing inspection target

By the end of #38, an inspector should be able to answer:

- Who are they and where did each identity claim come from?
- What family/lineage relationships are part of their life?
- Which lineage relations can later provide inheritance/genome sources to Genesis?
- Where have they lived/worked, and which place meanings are separately evidenced?
- What cultural/language formation is actually evidenced rather than inferred?
- What portrait and voice currently represent them, and what are the previous versions?
- Which memories exist, what historical evidence they refer to, and where memory meaning diverges from history?
- Does every memory currently have an available photo?
- Which media are captured evidence versus synthetic reconstruction?
- Are there any identity assertions that violate one-material-proposition discipline?
- Are causal or endogenous credits still zero?

## Predeclared adversarial review

Hostile review should explicitly try to prove that a #38 writer can persist a multi-proposition biography blob; a cultural/lineage/genetic label can smuggle stereotype semantics; a v2 registry change makes v1 history unreadable; currentness can again be misread from authoring status; a place fact and place meaning are collapsed; a portrait/voice swap changes behavioral standing; synthetic media can be mistaken for captured evidence; memory can overwrite history or vice versa; contradiction disappears; a photo-less memory becomes steady state; regeneration changes truth rather than cache state; caller/editor surfaces author identity outside accepted authority; or #38 accidentally awards later causal/endogenous standing.

## Completion criteria

```text
[ ] registry v2 is activated/frozen and v1 remains independently readable
[ ] one-material-proposition discipline is enforced before bulk writers
[ ] lineage/family records are durable, provenance-rich, inheritance-ready, and stereotype-safe
[ ] geography is temporal and place facts are distinct from place meaning
[ ] culture/language formation is lived/evidenced, not inferred from labels
[ ] portrait + voice embodiment records are versioned with hashes/provenance
[ ] autobiographical memory and historical evidence are distinct stores/views
[ ] contradiction/reinterpretation survives append-only history
[ ] every memory has an observable photo obligation
[ ] actual photo completion/regeneration is implemented and truth-safe
[ ] captured vs synthetic media remain impossible to confuse structurally
[ ] restart/replay/read-only inspection is complete
[ ] adversarial tampering is independently detected
[ ] acceptedCausalAssertions = 0
[ ] endogenousEvidenceAssertions = 0
[ ] full repository validation green on exact head
```

## Boundary with Genesis and causal projection

#38 builds the substrate. #39 Genesis uses it to create origin, inherited parent genetic material, childhood history, childhood memories, and a developmental-stage handoff into the live Fibre world.

#40 then owns Fibre-owned bounded identity relevance/selection, Identity Context Capsules, exact evidence citation, privacy-safe projection, and causal-consumption tests.

That separation matters:

> **#38 makes a life representable. #39 gives a Thread a past. #40 proves specific parts of that life can matter.**

## Vision test

At #38 completion, a Thread should no longer look like "an agent with a profile." It should look like a persistent person-shaped world object with lineage, places, culture, embodiment, memories, and explicit uncertainty/provenance — ready for Genesis to create a coherent childhood and inherited origin without inventing an adult persona blob.
