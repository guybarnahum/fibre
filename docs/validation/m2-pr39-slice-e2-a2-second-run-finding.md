---
id: validation-m2-pr39-slice-e2-a2-second-run-finding
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 A2 second-run finding

## Status

The resumed A2 execution from `fibre-m2-pr39-slice-e2-a2-v1.json` is **frozen as failed mechanical evidence**.

It reused the already-frozen D1 / seed-01 selector schedule exactly:

```text
sha256:417231b0538e8e904fc095ab157c35c18ce6bf276fa934b75ec42f63e79a2a30
```

No opportunity was reselected because of the first A2 failure.

The continuation again failed before completing the first life, but the failure is no longer ambiguous: all three whole-candidate attempts reached the same final selected opportunity and exhausted record generation on the intellectual-encounter representation.

## Repeated A2 result before failure

The frozen selector schedule remained:

```text
01  peer_invitation
02  peer_invitation
03  peer_invitation
04  small_public_mistake
05  mundane_errand_independence
06  mundane_errand_independence
07  mundane_errand_independence
08  choose_text_self_directed
09  choose_text_self_directed
10  mentor_optional_path
```

Across all three candidate attempts, the selector/realization split continued to demonstrate the H2 mechanism:

- episode 1 carried `new-counterpart-pressure` and introduced a new legal participant on every attempt;
- later selected public/ordinary opportunities also produced new participant introductions in several attempts;
- the realization stage did not substitute an easier caregiver/family structure for the frozen peer opportunities;
- the same opportunity schedule survived whole-candidate retry unchanged.

This is already qualitatively different from the H6 corrected control, which introduced zero people across sixty completed episodes.

This remains partial evidence because no A2 life completed.

## Mechanical failure

All three candidate attempts failed on slot 10:

```text
selected opportunity: ges_v2_mentor_optional_path
failure family: pass_a_intellectual_encounter
terminal record gate: record_repair_exhausted
```

Observed paths:

```text
attempt 1
  mentor_optional_path
  -> pass_a_intellectual_encounter record retry
  -> pass_a_intellectual_encounter record retry
  -> record_repair_exhausted

attempt 2
  mentor_optional_path
  -> observableAction form repair
  -> pass_a_intellectual_encounter record retry
  -> record_repair_exhausted

attempt 3
  mentor_optional_path
  -> observableAction form repair
  -> pass_a_intellectual_encounter record retry
  -> record_repair_exhausted
```

The selected structure is not itself contradictory. Its authored situation is:

> a teacher or mentor makes one optional path, practice, text, or community available without assigning it as a requirement

The teacher/mentor is therefore often the **mediator of access**, while the encountered intellectual subject can be a text, practice, lecture, idea, community, or other non-person subject.

## Root cause — model-facing reference ambiguity

Canonical `GenesisIntellectualEncounter.participantRef` has a narrow meaning:

```text
subjectKind == person
  -> participantRef identifies the encountered subject person

subjectKind != person
  -> participantRef must be null
```

It does **not** identify the person who merely mediated access to a non-person subject. That mediator is already grounded by the episode's normal `participantRefs`.

The model-facing field name `participantRef` is therefore misleading in exactly the `mentor_optional_path` case. A teacher/mentor is visibly participating in the scene, and repeated generations attached that participant to an encounter whose subject was non-person.

The v2 retry mechanism then supplied only:

```text
failedGate: pass_a_intellectual_encounter
```

It did not reveal rejected content, which is correct, but it also supplied no fixed gate-level rule that could distinguish subject identity from mediation. The retries therefore had no new mechanical information with which to stop repeating the same representation error.

## Correction

The correction deliberately leaves canonical encounter authority unchanged.

### Model-facing field

Rich Pass-A cognition now emits:

```text
subjectPersonRef
```

instead of model-facing `participantRef`.

Its meaning is explicit:

```text
subjectKind == person
  -> subjectPersonRef may identify that encountered episode participant

subjectKind != person
  -> subjectPersonRef must be null
```

A teacher, mentor, caregiver, librarian or peer who merely mediates access to a book/path/practice/idea/event/community stays in ordinary episode `participantRefs` and is not placed in `subjectPersonRef`.

Fibre deterministically translates model-facing `subjectPersonRef` to the existing canonical `participantRef` before authoritative encounter validation. Persisted/normalized encounters therefore retain the existing canonical representation and `subjectRef` derivation.

### Retry constraint

For `pass_a_intellectual_encounter` only, record retry now receives one fixed generic `failedConstraint` stating the subject-vs-mediator rule.

It still receives:

- no rejected episode;
- no rejected observable prose;
- no rejected subject label;
- no richness/quality signal;
- the same frozen Pass-A input;
- the same frozen A2 selected opportunity.

Other record gates remain unchanged unless separately justified.

## Experimental consequence

Do not rerun A2 from scratch.

The next continuation must resume from the failed v2 artifact so the already-frozen D1 / seed-01 selector schedule remains unchanged. The generator prompt/schema hashes will differ because the model-facing encounter interface was mechanically corrected; the selector prompt/schema/schedule remain the same.

Interpretation after completion must keep these distinct:

```text
H2 opportunity-selection / realization coupling
  already strongly supported by partial evidence

intellectual encounter model interface
  mechanical blocker, corrected before continuation

Rich Life success
  still unjudged until complete A2 lives and between-life evidence exist
```

No failed A2 artifact may be overwritten or discarded.
