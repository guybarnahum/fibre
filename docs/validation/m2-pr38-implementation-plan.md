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

#38 remains non-causal by default. #39 will own the first identity-projection/causal-consumption cutover, and #40 must earn M2 standing.

## Non-negotiable entry condition

Before #38 authors identity assertions at scale, it must close #37's deferred S4 boundary:

> **Each durable identity assertion must carry one independently falsifiable, independently ablatable material proposition.**

A byte limit is not semantic decomposition. #38 must either enforce one-material-proposition admission mechanically or constrain every #38 writer through a mechanically testable one-claim discipline before it can persist lineage, geography, culture, or embodiment meaning.

No immutable biography blob is allowed to enter the ledger and become #39's causal debt.

## Scope

#38 has four implementation slices. They should remain independently reviewable even if they land in one PR.

### A. Claim discipline + Identity Domain Registry v2

Add a frozen registry v2 rather than mutating v1.

Expected new/expanded domains include claim-level forms of:

```text
lineage_relation
family_role
ancestral_origin
cultural_formation
language_formation
geography_residence
geography_work
place_meaning
intellectual_formation
embodiment_visual
embodiment_voice
memory_interpretation
```

Requirements:

- every new immutable assertion pins `registry_version=2`;
- v1 rows continue validating against frozen v1;
- one-material-proposition admission is explicit and tested;
- relationship/lineage identity facts never imply personality or values by ancestry alone;
- cultural labels never imply competence, politics, morality, temperament, or willingness;
- professional role remains a situated layer, never root identity;
- #38 writers keep `acceptedCausalAssertions=0` and `endogenousEvidenceAssertions=0` unless a separately frozen standing process later earns otherwise.

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

Every relation needs:

- exact parties;
- relation kind;
- provenance/evidence;
- temporal validity where applicable;
- visibility;
- correction/dispute/supersession;
- whether the relation is inheritance-relevant, socially relevant, both, or historical-only.

Lineage is never itself behavioral evidence.

#### Geography

Geography is a timeline, not a `city` field.

Support claim-level records for:

```text
birth/creation place
childhood/formative residence
later residence
work location
migration/displacement
place with enduring personal meaning
```

A place fact and the Thread's meaning of that place are separate assertions with separate provenance.

#### Culture and language formation

Represent lived formation rather than demographic inference:

- household/family culture;
- migration story;
- language by setting/code-switching;
- ritual/tradition where explicitly evidenced;
- regional/professional/intellectual cultural formation;
- current self-authored embrace/rejection/reinterpretation remains future #41 unless already externally/genesis authored.

#### Embodiment

Add versioned portrait/visual and voice identity records with exact provenance:

```text
embodimentId
threadId
kind                 portrait | voice
sourceAssertionRefs[]
generation/acquisition method
generationSpec/model/tool where generated
assetRef
assetHash
createdAt
visibility
truth/provenance class
consent/permission refs where human-derived
supersedesEmbodimentId?
```

Old embodiment remains historical. A portrait/voice swap cannot imply capability, values, temperament, nationality, gendered behavior, class, dignity, or willingness.

Context/presentation-only embodiment is legitimate and should be labeled honestly.

### C. Autobiographical memory epistemics: memory is not history

#34 proved that a durable episodic record can causally change later judgment, but that record remains a deliberately limited descriptive memory. #38 must now build the epistemic substrate required by #36 without pretending rich self-authored development has already been earned.

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

Required cases:

```text
historical event exists + no autobiographical memory
  -> history remains true; memory absence is explicit

autobiographical memory exists with imperfect/partial meaning
  -> historical event remains independently inspectable

later memory reinterpretation
  -> append/supersede memory meaning; historical event unchanged

memory contradicts contemporaneous evidence
  -> contradiction is inspectable; neither side is silently laundered into the other
```

#38 does **not** claim human-like forgetting, confabulation, or self-authored Development merely because these fields exist.

### D. Every memory actually gets a photo + durable media completion

ADR-0011's product rule becomes operational in #38:

> **Every Thread memory should actually have a photo.**

#37 established the append-only photo companion lineage and outstanding obligation. #38 owns completion.

For synthetic reconstruction:

- canonical photo prompt + exact bound evidence remain durable authority;
- rendered image is replaceable cache;
- generated reconstruction is always labeled `synthetic_representation_not_historical_evidence`;
- current unbound identity/embodiment must not be used to invent an earlier appearance;
- regeneration may replace cache bytes but may not rewrite the historical truth class or source evidence.

For captured/historical photographs:

- captured provenance must remain distinct from reconstruction;
- losing a captured asset cannot be repaired by generating a synthetic image and retaining captured-photo truth status.

Completion mechanics must cover:

```text
pending_generation
available
unavailable_with_reason
retry/regeneration
asset loss
hash mismatch
provider failure
idempotent completion
```

A pending or unavailable photo is an explicit unsatisfied obligation, not a legitimate permanent "memory with no photo" state.

Voice assets follow equivalent provenance/version/hash rules but are not mandatory for every memory.

## Persistence and integrity posture

Prefer additive append-only tables/records over expanding mutable Thread projection blobs.

The implementation must preserve:

- exact replay after restart;
- append-only or explicit supersession;
- currentness derived from verified history rather than attractive mutable status flags;
- frozen historical registry validation;
- read-only + SQLite `query_only` inspection;
- independent digest/cross-record tamper detection;
- privacy/visibility boundaries;
- no editor-side identity-authoring bypass;
- no caller-authored private identity selection.

If schema changes, migration must be atomic, idempotent, and provenance-preserving. Same-version reopen may repair schema objects but must never synthesize missing identity evidence behind inspection.

## Human-facing inspection target

By the end of #38, an inspector should be able to answer, for a Thread, without reading raw JSON:

- Who are they and where did each identity claim come from?
- What family/lineage relationships are part of their life?
- Where have they lived/worked, and which place meanings are separately evidenced?
- What cultural/language formation is actually evidenced rather than inferred?
- What portrait and voice currently represent them, and what are the previous versions?
- Which memories exist, what historical evidence they refer to, and where memory meaning diverges from history?
- Does every memory currently have an available photo?
- Which media are captured evidence versus synthetic reconstruction?
- Are there any identity assertions that violate one-material-proposition discipline?
- Are causal or endogenous credits still zero?

## Predeclared adversarial review

Hostile review should explicitly try to prove:

1. a #38 writer can persist a multi-proposition biography blob;
2. a cultural/lineage label can smuggle stereotype semantics;
3. a v2 registry change makes v1 history unreadable;
4. currentness can again be misread from authoring `status`;
5. a place fact and place meaning are collapsed into one unverifiable claim;
6. a portrait/voice swap silently changes identity facts or behavioral standing;
7. synthetic media can be mistaken for captured historical evidence;
8. memory can overwrite history or history can overwrite memory;
9. a contradiction between memory and evidence disappears instead of remaining inspectable;
10. a photo-less memory can become steady state without an explicit outstanding obligation;
11. regeneration changes provenance/truth rather than cache state;
12. caller/editor surfaces can author or privately select identity outside the accepted authority boundary;
13. #38 accidentally awards #39 causal standing or #41 endogenous self-authorship.

## Completion criteria

#38 is merge-ready only when all of the following are true:

```text
[ ] registry v2 is frozen and v1 remains independently readable
[ ] one-material-proposition discipline is enforced before bulk writers
[ ] lineage/family records are durable, provenance-rich, and stereotype-safe
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

## Boundary with #39

#38 may make identity rich and inspectable. It must **not** solve causal individuality by stuffing all of it into cognition.

#39 still owns Fibre-owned bounded identity relevance/selection, Identity Context Capsules, exact evidence citation, privacy-safe projection, and causal-consumption tests.

That separation matters: #38 builds a real life worth projecting; #39 proves specific parts of that life can matter.

## Vision test

At #38 completion, a Thread should no longer look like "an agent with a profile." It should look like a persistent person-shaped world object with an origin, family/lineage, places, culture, embodiment, memories, and explicit uncertainty/provenance — while Fibre still refuses to claim those representations make the Thread behaviorally non-interchangeable until #39/#40 earn it.
