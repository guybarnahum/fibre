---
id: fibre-thread-passport-identity-provenance-v1
status: proposed
last-reviewed: 2026-08-13
canonical: true
---

# Thread Passport & Identity Provenance v1

PR #37 implements the first durable substrate required by the merged M2 Identity & Embodiment constitution.

It does **not** claim that identity is already behaviorally causal. That belongs to #39/#40. It does **not** claim endogenous self-authored growth. That belongs to #41. It also does **not** claim that the #36 `memory != history` standing gate is complete; ADR-0011 assigns the missing autobiographical-memory epistemic envelope to #38 before #40.

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

The persisted row separately pins the `registry_version` under which that immutable assertion was admitted. Registry version is admission metadata, not mutable view state.

Revision 1 has no predecessor. Later revisions must be contiguous and supersede the immediate prior assertion. A claim may change meaning, visibility, authoring disposition, evidence, or interpretation without deleting the earlier assertion.

The owning Thread, domain, and kind are stable across a claim history. Moving a claim to a different identity slot requires a different claim rather than rewriting its semantic identity.

## Currency is derived, not persisted

Persisted `status` is an **authoring disposition**, not a currency selector. Values such as `current`, `disputed`, `corrected`, `historical`, and `revoked_for_use` describe the disposition recorded with that immutable assertion. Append-only storage therefore never rewrites an older row from `status=current` merely because a later revision supersedes it.

Currentness is derived from lineage ordinality:

- full claim history exposes exactly one `isCurrentRevision=true`: the highest valid contiguous revision;
- an identity view exposes the one revision selected for each claim at that view's `asOf` and marks that selected revision `isCurrentRevision=true` **for that view**;
- consumers must never filter persisted `status === "current"` to derive current identity.

This distinction is load-bearing: historical truth and current identity are intentionally different views.

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

The registry itself has a deterministic digest. Every immutable assertion row also pins the registry version under which it was admitted. Read-side validation must revalidate that row against its **pinned historical registry**, not whatever registry happens to be current when it is read. Future registry versions therefore add a new frozen registry entry rather than retroactively changing the semantics of v1 history.

# IV. Claim-level anti-blob rule

#36 requires identity to remain independently addressable and ablatable rather than collapsing back into one biography/persona blob.

#37 supplies two mechanical foundations now:

- every assertion has its own stable claim lineage and assertion ID;
- `meaning` has a hard 2,048 UTF-8 byte upper bound.

A 5,000-word biography record cannot therefore enter the ledger as one assertion. The byte bound, however, is **not** a complete semantic proposition detector: materially independent propositions can still fit below 2,048 bytes.

That hostile-review finding is deferred only while #37 has no authoring-at-scale surface. The hardening deadline is **before any PR authors identity assertions at scale**. #38 must therefore either land semantic one-claim enforcement before its lineage/geography/culture writers emit durable assertions, or mechanically constrain every #38 writer to a provisional one-material-proposition-per-assertion discipline. It may not defer the problem until #39 after an immutable corpus already exists.

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

A named migration policy may also preserve an observed legacy projection as `fibre_derived` / `fibre_policy_derived` **without claiming authority for the underlying change**. That exceptional classification is a migration observation, not a normal public authoring permission.

# VI. Evidence classification: #37 cannot steal later credit

Every admitted assertion records:

```text
exogenous | endogenous
```

#37's public write path accepts **exogenous only**. It also rejects `accepted_causal` behavioral status. Internal persistence defaults to the same guards; later milestones must opt into stronger evidence only after earning it.

This is deliberate:

- #37 may prove persistence, history, provenance, supersession, privacy, migration, and inspection;
- #39/#40 must earn `accepted_causal` through standing behavioral evidence;
- #41 must earn `endogenous` by showing a Thread actually authored/proposed durable identity through a Fibre runtime path.

A fixture may carry semantic authorship `thread_self_authored` while the evidence remains Exogenous. The semantic statement and the milestone evidence classification are not allowed to collapse into one field.

# VII. Legacy identity migration

Existing Threads are not discarded, and migration must not rewrite their origin.

For a pre-#37 Thread, revision-1 genesis assertions are derived **only from the immutable `THREAD_SEEDED.payload.snapshot`** and cite that exact seed event as source evidence. Current mutable `threads.state_json` is not allowed to masquerade as birth evidence.

If the current legacy projection differs from its seed-time value, migration preserves seed truth as revision 1 and appends the observed projection state as revision 2. That revision is deliberately **not** called an administrator's factual correction:

```text
provenanceClass   fibre_derived
authorship.kind   fibre_policy_derived
status            disputed
sourceMode         fibre_derivation
```

Its dispute metadata says that Fibre observed a mutable pre-#37 projection differing from genesis, but **does not know who authorized the change or when it became effective**. The source reference binds the observation to the seed assertion it differs from. The public identity authoring surface cannot impersonate this migration policy.

Pre-#37 storage did not retain a trustworthy valid-time witness for projection drift. The migration therefore uses the observation/recording timestamp as the required `effectiveAt` placeholder but explicitly does not treat it as known valid time. V1 view derivation does not consume that field.

If the current legacy projection contains a claim with no seed-time counterpart, migration does not fabricate provenance for it. Such post-seed additions are counted as `droppedPostSeedAdditions` by the migration report rather than silently being converted into genesis evidence.

For the canonical Mina fixture, seed decomposition creates separate claims for:

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

# VIII. Thread Passport v1 and temporal derivation

The Passport is a readable digestible view over derived current claim revisions, not a mutable document.

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
derivationPolicy
registryVersion
registryDigest
passportDigest
```

The Passport intentionally does **not** lead with profession. Professional identity remains one situated layer.

A name change adds a revision. Prior names remain reconstructible. A current Passport can change while an `asOf` identity view still returns the earlier self from immutable evidence.

Passport slots that must be singular in v1—including `canonical_name`, `origin_orientation`, `birth_place`, and `self_description`—are registered as singleton kinds so arbitrary claim-ID ordering cannot choose between competing claims.

## V1 temporal axis

Identity view v1 is explicitly **transaction-time**:

```text
derivationPolicy.id      identity_view_transaction_time
derivationPolicy.version 1
selection axis           recordedAt
```

`getIdentityViewAsOf(T)` chooses the highest contiguous revision with `recordedAt <= T`. `effectiveAt` is stored semantic valid-time metadata but is **reserved/non-authoritative for v1 selection**. A future policy may introduce valid-time derivation, but doing so requires a new `derivationPolicy.version`; it may not silently change the meaning of an existing digest.

The complete `derivationPolicy` is part of the canonical view object before `viewDigest` is computed. Therefore:

> same persisted snapshot + same `asOf` + same derivation-policy version => same identity-view digest.

# IX. Memory-photo obligation and source-of-truth contract

The photo requirement is **not retroactively attributed to PR #36**. It is a post-#36 product/architecture amendment ratified by accepted [`ADR-0011`](../decisions/ADR-0011-memory-photo-obligation.md):

> **Every Thread memory should actually have a photo.**

A visual lineage is necessary but not sufficient. Every current or migrated Thread memory must have an append-only memory-photo lineage, and only an `available` current revision satisfies the completion obligation. `pending_generation` and `unavailable_with_reason` remain explicitly outstanding operational states rather than successful permanent photo-less states.

This includes both current `thread_memories` records and migrated legacy `memoryRefs`.

#37 does not invoke an image model. It establishes the durable source from which a synthetic image may later be rendered. On migration or memory creation it creates revision 1 with semantics equivalent to:

```text
status             pending_generation
representationKind synthetic_reconstruction
photoPrompt         <rich layered canonical textual prompt>
photoPromptDigest   sha256:<digest of exact prompt text>
assetRef            null
truthStatus          synthetic_representation_not_historical_evidence
visibility           private
```

The prompt is deliberately rich and layered rather than a one-line caption. The v1 canonical prompt contains distinct sections for:

```text
MEMORY MOMENT
THREAD CONTINUITY
SCENE
EMOTIONAL TEXTURE
COMPOSITION
GROUNDING
TRUTH BOUNDARY
REGENERATION
```

For a synthetic reconstruction, **the exact `photoPrompt` plus its immutable source references is the source of truth for that photo revision**. The rendered image is not. `photoPromptDigest` binds the exact text into the append-only companion record and the companion digest protects the whole canonical record.

When an image is rendered, `assetRef` is an **opaque regenerable cache locator**, not durable memory truth. The domain layer supports a small versioned cache-locator scheme boundary; a concrete renderer, object store, bucket layout, image format, or retention policy is replaceable operational machinery owned by #38.

If a cached image disappears, a later revision may return the lineage to `pending_generation` while retaining the same authoritative prompt and prompt digest where the evidence has not changed, then append a new `available` revision with a new cache locator. Earlier cache locations and prompt revisions are never rewritten.

Visual continuity may use only identity/embodiment evidence whose exact assertion references are explicitly bound into the companion lineage. If v1 binds none, the prompt requires appearance to remain visually noncommittal rather than consulting mutable current identity or inventing an earlier appearance.

Legacy opaque memory references are not an excuse to hallucinate history. If a legacy memory has no admitted narrative summary, #37 creates a conservative layered prompt that explicitly records the missing context and forbids invented historical specifics. That memory remains visibly outstanding until a later append-only revision admits enough grounded context to render a meaningful photo.

The companion ID is deterministic from `(threadId, memoryRef)` and the lineage is append-only.

A synthetic reconstruction **never** changes its truth status into historical photographic evidence. A captured photograph must explicitly carry `captured_source_evidence` truth status. For captured photographs, the captured source remains evidentiary authority; a textual prompt may describe or index it but can never recreate historical photographic truth if the captured source is lost.

# X. Atomic memory creation

When the canonical freeze path persists a new autobiographical memory, the initial memory-photo companion must be created in the **same database transaction**.

There must be no committed state in which a newly persisted Thread memory exists without its photo lineage, canonical layered prompt, prompt digest, source references, and explicit completion obligation.

Schema migration also backfills companions for pre-#37 memories before advancing the world-store schema version.

The atomic transaction does **not** wait on external image generation. It commits the memory plus the authoritative prompt-bearing pending revision. #38 owns asynchronous rendering and the later append-only `available` revision. This keeps external model/storage failures from blocking life-history persistence.

The distinction is intentional:

```text
structural integrity: memory has a coherent prompt/evidence lineage
photo completion:     current lineage revision is available
```

A pending photo may therefore coexist with structural integrity `ok`, but inspection must enumerate it as an outstanding obligation rather than allowing it to disappear into a successful steady state.

# XI. Inspection

#37 provides a read-only `query_only` inspection surface capable of answering:

```text
What is the current Passport?
What are all current identity claims?
What was identity as of time T under which derivation policy?
What is the full revision history of this claim?
Which revision is current by ordinality, independent of persisted status?
Under which registry version was each immutable assertion admitted?
Who authored each assertion?
What provenance class and evidence classification does it carry?
Which assertions are private?
How many assertions claim accepted-causal standing?
How many claim endogenous evidence?
Does every memory have a photo lineage?
What is the canonical photo prompt and prompt digest for each revision?
Is the current photo synthetic/captured/pending, and what truth status does it carry?
Does the current revision actually satisfy the mandatory photo requirement?
How many memories still have an outstanding photo obligation, and which exact memory refs are they?
Which asset locator is merely the current regenerable cache?
```

The intended #37 standing answer for the two credit-sensitive identity counters is:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

Any nonzero value from #37 bootstrap data is evidence inflation and fails review.

A pending photo does **not** make the identity ledger corrupt; it makes the separate photo-completion obligation unsatisfied. `verifyThreadIdentityIntegrity` therefore reports both structural integrity and `memoriesMissingPhotoCount` / exact `memoriesMissingPhoto` references.

# XII. Integrity rules

#37 fails if any of these become possible:

- updating or deleting an identity assertion revision;
- updating or deleting a memory visual revision;
- non-contiguous claim history;
- a revision superseding anything but its immediate predecessor;
- one claim changing Thread owner, domain, or kind;
- treating persisted `status` as revision currency instead of deriving currentness from ordinality;
- an immutable identity row being reinterpreted under a different registry version than the one that admitted it;
- an identity view digest omitting its derivation-policy version;
- two independent claims occupying a singleton Passport slot instead of revising one lineage;
- current Passport erasing prior names/self views;
- migration deriving revision-1 genesis identity from current mutable projection state rather than immutable `THREAD_SEEDED.payload.snapshot`;
- later legacy projection drift being mislabeled as known administrator authority or known valid-time history;
- post-seed legacy projection additions disappearing without being counted by migration;
- an assertion larger than the hard anti-blob byte bound;
- #37 writing `accepted_causal` evidence;
- #37 claiming endogenous Thread-authorship evidence;
- a Thread memory lacking a visual companion lineage;
- a memory-photo revision lacking a rich canonical prompt or carrying a mismatched prompt digest;
- a photo-less `pending_generation` or `unavailable_with_reason` state being reported as satisfying the photo-completion obligation;
- an `available` memory photo using anything other than a registered opaque cache locator;
- losing a cached object forcing mutation of prior memory/photo truth instead of append-only regeneration;
- unbound current identity/embodiment being silently consulted to invent an earlier self;
- a synthetic image labeled as historical captured evidence;
- a captured historical photograph being treated as reproducible historical evidence from a synthetic prompt alone;
- a read-only Inspector mutating the source database.

# XIII. PR boundaries

#37 intentionally does **not** implement:

- full lineage/family relationship structures — #38;
- geography timeline mechanics — #38;
- the #36 autobiographical-memory epistemic envelope (`salience`, `accessibility`, retention/recall state, supporting/contradicting evidence, temporal perspective, supersession) — explicitly rescheduled by ADR-0011 to #38 before #40 Scenario V;
- actual portrait/memory-image generation — #38;
- renderer invocation, object-store upload, cache invalidation workers, or regeneration scheduling — #38;
- voice asset generation — #38;
- Identity Context Capsule selection — #39;
- Dignity/Actor causal consumption of structured identity — #39;
- A-Z standing gate closure — #40;
- endogenous self-authored Development — #41;
- reciprocal relationship mechanics — #42.

The hostile-review finding that the 2,048-byte limit is not a complete semantic anti-blob detector remains unclaimed in #37, but its deferral expires **before #38 begins authoring identity assertions at scale**. #38 must not create an immutable multi-proposition corpus and leave #39 to discover that Scenario E cannot ablate it.

#37 earns persistence/provenance infrastructure only. The rubric remains at the pre-M2 checkpoint until later PRs earn causal standing.
