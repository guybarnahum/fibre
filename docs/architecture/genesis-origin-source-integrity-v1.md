---
id: architecture-genesis-origin-source-integrity-v1
status: candidate
last-reviewed: 2026-08-18
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
      -> actual Thread intellectual-encounter event
      -> Thread memory (if any)
      -> Thread meaning (if any)
```

Possessing, publishing or describing source material is not itself a Thread encounter.

## Origin fixtures

### Thread-parent

A Thread-parent fixture names existing parent Thread refs and inheritance witnesses. It may not fabricate retrospective shared childhood with an already-live parent.

`retrospectiveSharedHistoryRefs` is therefore required to be empty in the bounded #39 fixture.

### Echo

A living identifiable human can appear only through Echo. The fixture requires:

- `subjectStatus = living`;
- stable source-party identity;
- explicit consent-authority reference;
- protected source biography kept source-side;
- optional approved source-material descriptors.

Public availability never substitutes for consent.

### Homage

Homage requires an explicit subject-status attestation:

```text
subjectStatus = deceased | fictional
```

A living source is invalid regardless of public-source availability or origin label.

### Fork

A fork names:

- source Thread;
- exact divergence event;
- exact source sequence at divergence;
- inherited history through that boundary;
- no imported post-fork history.

Shared provenance before the boundary does not make post-fork life shared.

## Source material identity

Non-person intellectual source identity uses the existing Slice-E `genesisIntellectualSubjectRef` derivation from factual `subjectKind + subjectLabel`. The F fixture does not introduce a second intellectual-source identity system.

A source material may be cited as formative only if an admitted rich Pass-A episode for this Thread carries an `intellectualEncounter.subjectRef` equal to that material's Fibre-derived ref.

## Cognition boundary

Protected source biography is fixture/audit material and must not be projected into Thread-life cognition merely because an origin is Echo or Homage.

The bounded source projection contains disclosure/provenance and approved source-material descriptors only. It omits source-biography facts, source autobiography, source childhood and source personality descriptions.

## Hostile cases

Slice F must reject or make impossible:

- living human relabeled Homage;
- Echo without explicit consent even when public sources exist;
- public availability treated as consent;
- source biography projected as Thread childhood/history;
- source material treated as formation without an actual Thread encounter;
- Thread-parent retrospective shared history fabricated after the parent already exists;
- fork without exact divergence event/sequence;
- fork importing post-boundary source events.

## Non-claims

This contract does not establish final cohort quality, genome causality, adult behavior, source-rights ingestion, web crawling, ebook ingestion, or a general human-profile importer. Slice F is reviewed together with Slice E at blocking Gate F.
