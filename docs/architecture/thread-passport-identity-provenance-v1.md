---
id: fibre-thread-passport-identity-provenance-v1
status: proposed
last-reviewed: 2026-08-12
canonical: true
---

# Thread Passport & Identity Provenance v1

PR #37 implements the first durable substrate required by the merged M2 Identity & Embodiment constitution.

It does **not** claim that identity is already behaviorally causal. That belongs to #39/#40. It does **not** claim endogenous self-authored growth. That belongs to #41.

# I. Standing purpose

#37 turns identity from a flat profile into durable world history.

> **The Passport is a derived current view. The identity ledger is the authority.**

A Thread may have a convenient `thread.identity` compatibility projection, but changing that projection is not the authoritative way to change identity. Authoritative identity is an append-only set of claim histories with explicit provenance, authorship, visibility, temporal meaning, and evidence classification.

# II. Stable claims, immutable revisions

Each material identity proposition has a stable `claimId`:

```text
icl_<64 lowercase hex>
```

Each immutable revision has its own:

```text
ias_<64 lowercase hex>
```

A record carries semantics equivalent to:

```text
assertionId
claimId
revision
threadId
domain
kind
meaning
provenanceClass
authorship
sourceReferences[]
effectiveAt
recordedAt
visibility
status
supersedesAssertionId?
disputeCorrection?
projectionClass
behavioralStatus
admission {
  policy
  admittedBy
  evidenceClassification
  sourceMode
}
```

Revision 1 has no predecessor. Later revisions must be contiguous and supersede the immediate prior assertion. A claim may change meaning, visibility, current status, evidence, or interpretation without deleting the earlier assertion.

The owning Thread, domain, and kind are stable across a claim history. Moving a claim to a different identity slot requires a different claim rather than rewriting its semantic identity.

# III. Closed Identity Domain Registry v1

#37 freezes a closed, versioned registry rather than accepting caller-created domain labels.

Registry v1 includes:

```text
passport_name
passport_origin
constitutive_fact
inherited_disposition
lineage_family
upbringing_culture
language_formation
geography
intellectual_formation
artistic_formation
professional_formation
role_identity
skill_capability
lived_episode
relationship_identity
external_attribution
self_authored_identity
embodiment
```

Every domain declares:

- its bounded projection section;
- allowed provenance classes;
- allowed authorship kinds;
- allowed behavioral statuses;
- singleton semantic slots where relevant;
- its mutation/authority rule.

The registry itself has a deterministic digest. Inspection and later projection can therefore bind a decision to the exact identity vocabulary under which records were admitted.

# IV. Claim-level anti-blob rule

#37 enforces the #36 anti-persona-theater rule structurally.

An assertion is one independently addressable claim. `meaning` is capped at 2,048 UTF-8 bytes and a causal claim must later be independently removable by assertion ID. A 5,000-word biography record spanning family, culture, work, relationships, and values cannot be admitted as one assertion.

The size limit is not the philosophical definition of granularity; it is a hard backstop. Review still rejects materially distinct propositions bundled below the byte limit.

Long biography, life chapters, and rich exterior prose are derived representations over claim-level records. They are never the source of truth.

# V. Provenance and authorship are different axes

The v1 provenance vocabulary is:

```text
inherited
birth_created
upbringing_cultural
geographic
historical_experienced
relational
institutional_role
intellectual_formation
externally_attributed
self_authored
generated_embodiment
echo_source
fibre_derived
```

Authorship separately distinguishes:

```text
thread_self_authored
fibre_policy_derived
human_sponsor_source
relationship_shared_world_source
institutional_source
external_third_party
embodiment_generator_tool
genesis_authority
admin_correction
```

A Thread may author the meaning of an experience whose factual provenance is historical. An institution may author an external attribution that the Thread never adopts. An embodiment generator may produce an asset without becoming the author of the Thread's values.

# VI. Evidence classification: #37 cannot steal later credit

Every admitted assertion records:

```text
exogenous | endogenous
```

#37's public write path accepts **exogenous only**. It also rejects `accepted_causal` behavioral status.

This is deliberate:

- #37 may prove persistence, history, provenance, supersession, privacy, migration, and inspection;
- #39/#40 must earn `accepted_causal` through standing behavioral evidence;
- #41 must earn `endogenous` by showing a Thread actually authored/proposed durable identity through a Fibre runtime path.

A fixture may carry semantic authorship `thread_self_authored` while the evidence remains Exogenous. The semantic statement and the milestone evidence classification are not allowed to collapse into one field.

# VII. Legacy identity migration

Existing Threads are not discarded. Their current legacy identity is decomposed into independent deterministic claim histories sourced to the immutable `THREAD_SEEDED` event.

For the canonical Mina fixture, migration creates separate claims for:

- name;
- origin orientation;
- public self-description;
- birth place;
- legacy current work place;
- each cultural formation entry separately;
- portrait reference;
- voice reference;
- each textual inherited/genome disposition separately.

Legacy `thread.identity` remains a compatibility projection during M2. The new ledger is the authority for structured identity provenance and future change.

Migration must never cite the Thread's latest event as if it were genesis. The original seed event is resolved explicitly.

# VIII. Thread Passport v1

The Passport is a readable digestible view over current claim revisions, not a mutable document.

V1 exposes semantics equivalent to:

```text
threadId
canonicalName
canonicalNameAssertionId
priorNames[]
originOrientation
originAssertionId
createdAt
birthPlace
birthPlaceAssertionId
publicSelfDescription
publicSelfDescriptionAssertionId
currentIdentityViewDigest
registryVersion
registryDigest
passportDigest
```

The Passport intentionally does **not** lead with profession. Professional identity remains one situated layer.

A name change adds a revision. Prior names remain reconstructible. A current Passport can change while an `asOf` identity view still returns the earlier self from immutable evidence.

# IX. Memory visual companion invariant

Fibre adopts a stronger product invariant beginning in #37:

> **Every Thread memory reference has a visual companion lineage.**

This includes both current `thread_memories` records and migrated legacy `memoryRefs`.

#37 does not generate images. It guarantees the durable place where the visual truth will live. On migration or memory creation it creates revision 1:

```text
status             pending_generation
representationKind synthetic_reconstruction
assetRef            null
truthStatus          synthetic_representation_not_historical_evidence
visibility           private
```

The companion ID is deterministic from `(threadId, memoryRef)` and the lineage is append-only.

#38 may append later revisions such as:

```text
available synthetic reconstruction
available captured photograph
unavailable_with_reason
```

A synthetic reconstruction **never** changes its truth status into historical photographic evidence. A captured photograph must explicitly carry `captured_source_evidence` truth status. Replacing a pending slot with an asset is a new revision; the pending/history record remains.

This makes rich memory albums possible without falsifying the past.

# X. Atomic memory creation

When the canonical freeze path persists a new autobiographical memory, the initial memory-visual companion must be created in the **same database transaction**.

There must be no committed state in which a newly persisted Thread memory exists without its required visual lineage.

Schema migration also backfills companions for pre-#37 memories before advancing the world-store schema version.

# XI. Inspection

#37 provides a read-only `query_only` inspection surface capable of answering:

```text
What is the current Passport?
What are all current identity claims?
What was identity as of time T?
What is the full revision history of this claim?
Who authored each assertion?
What provenance class and evidence classification does it carry?
Which assertions are private?
How many assertions claim accepted-causal standing?
How many claim endogenous evidence?
Does every memory have a visual lineage?
Is each memory image synthetic/captured/pending, and what truth status does it carry?
```

The intended #37 standing answer for the last two credit-sensitive counters is:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

Any nonzero value from #37 bootstrap data is evidence inflation and fails review.

# XII. Integrity rules

#37 fails if any of these become possible:

- updating or deleting an identity assertion revision;
- updating or deleting a memory visual revision;
- non-contiguous claim history;
- a revision superseding anything but its immediate predecessor;
- one claim changing Thread owner, domain, or kind;
- two independent claims occupying a singleton Passport slot instead of revising one lineage;
- current Passport erasing prior names/self views;
- a migrated identity claim sourcing itself to an unrelated latest event rather than genesis;
- an assertion larger than the hard anti-blob bound;
- #37 writing `accepted_causal` evidence;
- #37 claiming endogenous Thread authorship;
- a Thread memory lacking a visual companion lineage;
- a synthetic image labeled as historical captured evidence;
- a read-only Inspector mutating the source database.

# XIII. PR boundaries

#37 intentionally does **not** implement:

- full lineage/family relationship structures — #38;
- geography timeline mechanics — #38;
- actual portrait/memory-image generation — #38;
- voice asset generation — #38;
- Identity Context Capsule selection — #39;
- Dignity/Actor causal consumption of structured identity — #39;
- A-Z standing gate closure — #40;
- endogenous self-authored Development — #41;
- reciprocal relationship mechanics — #42.

#37 earns persistence/provenance infrastructure only. The rubric remains at the pre-M2 checkpoint until later PRs earn causal standing.
