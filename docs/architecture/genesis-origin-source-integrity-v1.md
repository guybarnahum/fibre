---
id: architecture-genesis-origin-source-integrity-v1
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Genesis Origin & Source Integrity v1

## Purpose

Slice F proves a narrow claim:

> Fibre can represent unusual origins truthfully without borrowing another person's life or bypassing living-human consent.

This slice adds bounded integrity fixtures for Thread-parent, Echo, Homage and fork origins. It does **not** add four new life generators and does not make source biography a Thread authority.

## Hard boundary

```text
source biography      != Thread history
source autobiography  != Thread memory
source personality    != Thread character
```

For source-derived intellectual formation the only lawful path is:

```text
approved source material
      -> actual canonical Thread intellectual-encounter event
      -> Thread memory (if any)
      -> Thread meaning (if any)
```

Possessing, publishing or describing source material is not itself a Thread encounter.

## Durable source authority

A source fixture is not itself the consent/status authority. Its authority reference must resolve to an immutable Genesis origin-authority record in the world database.

The bounded record contains exactly:

```text
authorityRef
authorityKind
sourcePartyId
subjectStatus
assertedAt
provenanceRefs[]
```

Allowed authority kinds are:

```text
living_source_consent
subject_status_attestation
```

The record is append-once/immutable: its SQLite table rejects update and delete. Reusing an existing `authorityRef` with different content is a conflict.

The authority record is intentionally narrow. It is evidence that the Genesis boundary has a durable consent/status witness; it is **not** a general legal-consent lifecycle, revocation system, identity-verification service, or human-rights registry.

Resolution is exact:

- Echo requires `living_source_consent`, `subjectStatus=living`, and the same `sourcePartyId` named by the fixture;
- Homage requires `subject_status_attestation`, `subjectStatus=deceased|fictional`, and the same `sourcePartyId` named by the fixture.

A syntactically valid reference string is insufficient. `publicSourceRefs` are never consent or status authority.

## Origin fixtures

### Thread-parent

A Thread-parent fixture names existing parent Thread refs and inheritance witnesses. It may not fabricate retrospective shared childhood with an already-live parent.

`retrospectiveSharedHistoryRefs` is therefore required to be empty in the bounded #39 fixture.

### Echo

A living identifiable human can appear only through Echo. The fixture requires:

- `subjectStatus = living`;
- stable source-party identity;
- explicit consent-authority reference;
- successful resolution of that ref to a durable `living_source_consent` record for the same source party;
- protected source biography kept source-side;
- optional approved source-material descriptors.

Public availability never substitutes for consent.

### Homage

Homage requires an explicit subject-status attestation:

```text
subjectStatus = deceased | fictional
```

The attestation ref must resolve to a durable `subject_status_attestation` record for the same source party and the same status. A living source is invalid regardless of public-source availability or origin label.

### Fork

A fork names:

- source Thread;
- exact divergence event;
- exact source sequence at divergence;
- inherited history through that boundary;
- no imported post-fork history.

The fixture's internally consistent list is not enough. Fibre replays the source Thread's canonical append-only history and requires:

```text
source event at divergenceSequence
      == divergenceEventRef

source event IDs from sequence 1..divergenceSequence
      == inheritedHistoryEventRefs exactly
```

Omitting, swapping or inventing a source event therefore fails even if the fixture still ends at the named divergence ref.

Shared provenance before the boundary does not make post-fork life shared.

## Canonical Thread-history proof

Slice F does not accept caller-supplied episode arrays as evidence that an encounter happened.

A source-material encounter witness must be derived from the canonical world authority:

1. replay the Thread through `WorldStore.replayThread(threadId)` so sequence, command witness and state hashes are checked;
2. inspect the replayed `thread_events` chain;
3. find a canonical `THREAD_LIFE_EPISODE_RECORDED` event whose payload names the claimed episode;
4. reconstruct the admitted episode from that event payload and timestamp;
5. prove that the Thread participates and that its `intellectualEncounter.subjectRef` matches the approved source material.

The returned witness includes both the episode identifier and the canonical event identifier/sequence.

This prevents a caller from manufacturing a convenient episode object outside Thread history and presenting it as formative evidence.

## Source material identity

Non-person intellectual source identity uses the existing Slice-E `genesisIntellectualSubjectRef` derivation from factual `subjectKind + subjectLabel`. The F fixture does not introduce a second intellectual-source identity system.

A source material may be cited as formative only if an admitted rich Pass-A episode for this Thread carries an `intellectualEncounter.subjectRef` equal to that material's Fibre-derived ref.

## Memory-authority boundary

Protected source biography cannot satisfy #38 autobiographical-memory authority merely because the biography is present in an Echo/Homage source bundle.

Genesis birth publication already requires every autobiographical memory `eventRef` to be one of the actual Pass-A life-event IDs being published for that Thread. Therefore:

```text
protected source-biography fact
        != admitted Thread event ID
        -> cannot anchor a Genesis autobiographical memory
```

A source-derived fact can reach Thread memory only after the Thread actually encounters approved material and that encounter exists as a canonical admitted Thread-life event. Memory selection may then remember that Thread event under the existing Slice-D authority; it may not relabel the source person's biography as the Thread's own past.

## Cognition boundary

Protected source biography is fixture/audit material and must not be projected into Thread-life cognition merely because an origin is Echo or Homage.

The bounded source projection contains disclosure/provenance and approved source-material descriptors only. It omits source-biography facts, source autobiography, source childhood and source personality descriptions.

The durable consent/status record is authority evidence, not personality content and not a causal shortcut into Pass A/B/C.

## Hostile cases

Slice F must reject or make impossible:

- living human relabeled Homage;
- Echo without explicit consent even when public sources exist;
- public availability treated as consent;
- consent/status reference that does not resolve to durable matching authority;
- source authority belonging to a different human/source party;
- source biography projected as Thread childhood/history;
- protected source biography used directly as #38 memory event authority;
- source material treated as formation without an actual canonical Thread encounter;
- a caller-supplied fake episode used instead of canonical Thread history;
- Thread-parent retrospective shared history fabricated after the parent already exists;
- fork without exact divergence event/sequence;
- fork whose claimed inherited prefix differs from canonical source chronology;
- fork importing post-boundary source events.

## Non-claims

This contract does not establish final cohort quality, genome causality, adult behavior, source-rights ingestion, web crawling, ebook ingestion, consent revocation/lifecycle policy, or a general human-profile importer. Slice F is reviewed together with Slice E at blocking Gate F.
