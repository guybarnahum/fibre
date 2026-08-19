---
id: validation-m2-pr39-slice-e2-a2-selection-realization-protocol
status: proposed
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 A2 selection / realization diagnostic protocol

## Purpose

A2 tests H2 from the E2 Rich-Life development plan:

> **Does asking one cognition call both to choose what kind of event happens and to realize a mechanically grounded scene bias Genesis toward already-known people, places and situations because they are easier to instantiate?**

This is a diagnostic arm. It is not a production architecture decision and has no admission verdict.

The corrected H6 participation arm is the comparison control. H6 repaired truthful counterpart semantics and record-local retry but still produced:

```text
60 admitted episodes
0 introduced participants
participant-role Jaccard = 1.0 for every same-world pair
2 / 60 world-emergent episodes
one D2 life with 9 / 10 episodes at home
```

H6 therefore remains necessary mechanical infrastructure but does not explain the remaining Rich-Life failure by itself.

## A2 causal intervention

A2 separates two jobs that H6/current rich Pass A performs in one model call:

```text
stateless opportunity selection
        ↓
frozen selected opportunity
        ↓
stateful scene realization using canonical factual continuity
```

Everything else remains paired to H6 where mechanically possible.

## Selector information boundary

Each developmental window gets one independent selector call.

The selector receives exactly:

```text
selector input version
public-world projection
developmental window
chronology ordinal + total
current nine offered EventStructures
opaque Pass-A policy witness
```

The public-world projection contains only:

```text
timeFrame
places
languages
schoolingOrCommunityContext
culturalContext
availableInstitutions
intellectualEnvironment
affordedRoles
```

It intentionally excludes subject/household-specific continuity:

```text
subject identity / bornAt
householdShape
familyRelations
materialCircumstances
mobilityPattern
initial roster
known participants
previously introduced participants
prior episodes
prior observableAction prose
prior selector choices
relationship state
genome
memory / meaning
conditions / semantic needs
richness diagnostics
future benchmark / role
```

The selector's offered structures contain only:

```text
structureId
abstractSituation
participatingRoles
```

It does not see:

```text
counterpartMode
contextKinds / intellectual labels
consequenceClass
range labels
instantiation witnesses
```

This prevents mechanical realization cost or Rich-Life category labels from becoming selector targets.

## Selector output

The selector returns exactly:

```text
selectionKind: offered_structure | world_emergent
structureRef: offered structure ID | null
```

Rules:

- `offered_structure` requires a structureRef present in the current nine offers;
- `world_emergent` requires structureRef = null;
- no free-text intent, plot description, significance, desired participant, desired place or desired encounter is permitted.

The selector prompt explicitly forbids optimizing for novelty, diversity, intellectual value, drama, maturity, consequence, personality or future usefulness.

## Selection freeze

For one Thread candidate:

1. run all ten selector calls independently before any scene is realized;
2. no selector call sees another selector output;
3. freeze the resulting ten-choice schedule and its input/output digests;
4. reuse exactly that schedule across any bounded whole-candidate retry.

A mechanical scene failure must therefore not cause Fibre to select a different, easier opportunity.

Provider operational retries remain ordinary transport evidence and do not change the semantic selector input.

## Scene realization

Scene realization receives:

```text
current canonical/factual Pass-A cognition input
+ frozen selected opportunity for this window
```

It retains the H6-corrected rich participation policy, current 10 developmental strata, current nine-offer schedules, current EventStructurePool-v2 content, observable-history boundary, current form repair and current record-local retry discipline.

The selected opportunity is a mechanical constraint:

```text
offered_structure -> admitted episode.structureRef must equal selected structureRef
world_emergent    -> admitted episode.structureRef must be null
```

A different structure is a record-local mechanical rejection, not a quality rejection.

The realizer may introduce a new participant only through the existing Pass-A introduction contract and a role already afforded by the WorldSpec. A2 does not tell it to introduce anyone.

## New-participant pressure witness

Before each scene realization, Fibre computes a mechanical witness from canonical known roles and the selected structure:

```text
counterpartMode
selected participatingRoles
known allowed counterpart exists before episode? yes/no
selected opportunity requires a new counterpart to realize? yes/no
known-required precondition currently satisfiable? yes/no
```

This witness is evidence only and is not shown to selector cognition.

Interpretation:

- if the stateless selector chooses `present_required` opportunities for which no allowed counterpart is known, the realization stage must either introduce a legal new participant or fail mechanically;
- if such selections never occur, the selector itself is not exerting new-cast pressure;
- if they occur and are consistently realized through introductions, H2 receives direct support;
- if they occur but fail despite legal world roles, the remaining bottleneck is realization/participant-introduction mechanics rather than opportunity choice;
- a `known_required` selection whose precondition is absent is recorded as an impossible stateless selection. It is not silently replaced by another opportunity.

## Frozen development cells

Use exactly the already-burned E2 diagnostic worlds and Fibre seeds:

```text
E2-D1
E2-D2

slice-e2-a0-seed-01
slice-e2-a0-seed-02
slice-e2-a0-seed-03
```

For each life:

```text
10 developmental strata
9 EventStructure offers per stratum
10 independent selector calls
10 sequential scene realizations
max 3 generated versions per record
max 3 whole-candidate attempts per Thread
```

The offer schedule is the same deterministic schedule used by A0/H6 for the same world+seed.

Do not rerun a completed A2 cell for quality.

## Required characterization

Preserve all H6 characterization plus:

```text
selector input/output digests
selected opportunity per window
selected structure distribution
world-emergent selector count
new-counterpart-pressure count
known-required-impossible selection count
introduced participants per life
which selected opportunities caused introductions
selected-opportunity mismatch rejections
record retry / whole-candidate rejection profile
same-world place / participant-role / structure / intellectual-source Jaccard
```

## Predeclared H2 reading

H2 is **supported** only if the separation creates evidence that the coupled mechanism suppressed mechanically available life causes. Strong evidence includes:

- stateless selections that require currently unknown counterpart roles and are legally realized by introducing people;
- a material increase from H6's 0/60 introductions without a prompt quota or direct request for new people;
- new participant-role/cast differentiation across same-world lives;
- greater access to world institutions/people without checklist-like convergence on the same selections.

H2 is **not established** merely because:

- more unique structures appear;
- more intellectual encounters appear;
- more places appear;
- prose becomes more varied;
- the selector produces random novelty.

If selector schedules converge strongly across seeds, or all lives introduce the same role/template, record between-life template pressure rather than calling the arm rich.

If A2 completes but residual narrative blocks remain after opportunity choice has been decoupled, H1 prior-prose inertia becomes the next direct diagnostic.

## Hard no-cheat rule

Neither selector nor realizer may receive or be optimized against:

```text
Rich-Life scores
between-life overlap
number of introduced participants
number of places
number of intellectual encounters
prior A0/H6 outcomes
desired personality
future benchmark
```

A2 asks only whether **choice and realization should be separate operations**, not whether Fibre can instruct a model to manufacture a more varied childhood.
