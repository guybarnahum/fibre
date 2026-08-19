---
id: validation-m2-pr39-slice-e2-a0-h6-participation-finding
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — E2 A0 failure and H6 participation finding

## Status

The fresh E2 A0 baseline is **frozen as a failed mechanical baseline**. It must not be rerun after the H6 correction and relabeled as A0.

The failure revealed a concrete H6 mechanism before H1-H4 were touched:

> **EventStructurePool v2 described several experiences as self-directed while the rich participation validator mechanically required a listed counterpart to participate. Fibre was therefore rejecting valid independent realizations of affordances it had explicitly authored as independent.**

A second instrumentation/architecture defect was also exposed:

> **Record-local mechanical invalidity was escalating to whole-candidate retry instead of first regenerating the one invalid record from the same frozen Pass-A input.**

Neither finding is a Rich-Life quality judgment. Both are mechanical affordance/retry-contract findings.

## Evidence preceding A0

The blind H6-b realization probe found no broad realization-degeneracy failure:

```text
                         low-scene     household-dominant
E1                           0.0%             18.8%
E2-D1                        0.0%             12.5%
E2-D2                        0.0%             15.6%
```

All thirteen intellectual-context structures were rated above the low-scene warning band. Some structures were semantic neighbors, but the pool was not generally collapsing to one or two realizable scenes.

Static preflight also showed that a fixed >=12 wider-offer arm is not available under the already-cleared 8-10 Pass-A offer contract: full-stratum eligible counts across the ten windows are:

```text
9, 12, 14, 15, 16, 13, 18, 15, 13, 11
```

A materially wider all-eligible arm would therefore reopen Gate-C policy merely to make a diagnostic convenient. E2 does not do that.

## A0 first execution

The first pre-instrumentation A0 execution reached D1 seed 1 episode 10 and failed after an observable-action form repair exposed a second defect: `ges_v2_religious_or_philosophical_text` lacked any allowed counterpart participant.

Before that mechanical failure, the provisional candidate had produced three non-null `book` encounters, including one `ges_v2_library_browse_with_adult` and two world-emergent book encounters. This is not a completed-life result, but it falsifies the strongest claim that the encounter schema makes non-null intellectual encounters effectively impossible.

That first CLI lacked a failure-artifact path. The missing rejected payload is not reconstructed.

## A0 instrumented execution

After adding the existing Genesis whole-candidate attempt cap and failure-artifact path, the exact same A0 protocol was run again. D1 seed 1 exhausted all three candidate attempts before one life completed.

```text
attempt 1
  episodes 1-4 valid candidate history
  episode 5 -> ges_v2_choose_text_self_directed
  rejected: pass_a_structure_participation
  reason: no librarian / teacher / peer participated

attempt 2
  episodes 1-4 valid candidate history
  episode 5 -> ges_v2_choose_text_self_directed
  rejected: pass_a_structure_participation
  reason: no librarian / teacher / peer participated

attempt 3
  episodes 1-3 valid candidate history
  episode 4 -> ges_v2_peer_joke_or_reference_missed
  rejected: pass_a_structure_participation
  reason: no peer participated
```

The repeated `choose_text_self_directed` failure is the load-bearing finding. The third failure is different: a peer joke genuinely requires a peer and is an ordinary invalid record candidate.

## H6 participation contradiction

Pool-v2 currently contains several structures whose authored access semantics permit a self-directed realization while `participatingRoles` had been interpreted as a mandatory present-counterpart set.

Examples:

```text
ges_v2_mundane_errand_independence
  situation: completes a familiar local errand with less adult direction
  access: self_directed
  prior validator: caregiver | shopkeeper | neighbor must participate

ges_v2_choose_text_self_directed
  situation: independently chooses a text/information source
  access: self_directed | institution_mediated
  prior validator: librarian | teacher | peer must participate

ges_v2_scientific_claim_test
  access includes self_directed
  prior validator: teacher | mentor | peer must participate

ges_v2_text_conflicts_with_expectation
  access includes self_directed
  prior validator: teacher | librarian | peer | mentor must participate

ges_v2_religious_or_philosophical_text
  access includes self_directed
  prior validator: caregiver | teacher | mentor | peer must participate

ges_v2_art_unsettles_expectation
  access includes self_directed
  prior validator: teacher | peer | mentor must participate
```

`ges_v2_mentor_absence_or_unavailability` exposes a related contradiction: the event concerns a previously available mentor/teacher being unavailable, but the old rule required a mentor/teacher to participate in the current episode.

This is a real H6 affordance-surface bias. It systematically makes independent/autonomous/world-facing experiences harder to admit than familiar mediated experiences.

## Correction — counterpart mode

Rich EventStructure participation now uses a narrow reviewed policy with three modes:

```text
present_required
  one listed alternative counterpart role must participate

present_optional
  subject-only realization is mechanically legal;
  any participants actually used must still be grounded normally

known_required
  one listed role must already exist in roster/history,
  but need not participate in the current episode
```

Only seven reviewed structures override the default:

```text
present_optional
  ges_v2_mundane_errand_independence
  ges_v2_choose_text_self_directed
  ges_v2_scientific_claim_test
  ges_v2_text_conflicts_with_expectation
  ges_v2_religious_or_philosophical_text
  ges_v2_art_unsettles_expectation

known_required
  ges_v2_mentor_absence_or_unavailability
```

Every other Pool-v2 structure remains `present_required`.

The mode is exposed to rich Pass-A cognition with each offered structure. Legacy Gate-C Pass A remains unchanged.

This policy does **not** require self-directed events, intellectual encounters, new places, new people, novelty, conflict or any other richness category. It only makes the validator faithful to the affordance already offered.

## Correction — retry scope

The accepted Genesis compiler contract distinguishes:

```text
record-local mechanical invalidity
  -> regenerate that record from the same frozen semantic input

cross-record / whole-candidate invalidity or exhausted record generation
  -> whole-candidate retry
```

Rich Pass A had only a one-field `observableAction` form repair and otherwise escalated to its caller. E2 A0 therefore threw away four or nine otherwise-valid candidate episodes because one episode omitted a required counterpart.

The correction keeps two record mechanisms distinct:

### Form repair

For `pass_a_observable_action_bounds` or `pass_a_interiority_form`:

- model sees only rejected observableAction + failed form constraint;
- Fibre preserves all other episode facts mechanically.

### Full record retry

For a record-local structural/reference/chronology/intellectual-encounter failure:

- rejected episode is discarded and witnessed;
- replacement cognition receives the **same frozen Pass-A cognition input** plus only `failedGate`;
- rejected scene is not shown;
- no Rich-Life/quality signal is shown;
- replacement may choose any legal offered structure or a legal world-emergent episode.

The existing v1 cap remains **three generated versions of one record total**. A sequence such as:

```text
initial -> form repair -> record retry
```

uses the entire record budget. Exhaustion remains `record_repair_exhausted` and can then trigger the already-bounded whole-candidate attempt discipline.

Every form repair and full record retry remains visible in evidence.

## Experimental consequence

The failed A0 execution is the baseline. Do not rerun it under corrected semantics.

The next arm is:

```text
H6_counterpart_participation_correction
```

It intentionally reuses:

```text
D1 and D2
same three Fibre seeds
same ten developmental strata
same nine-offer schedules
same EventStructurePool-v2 content
same genome/memory/meaning blindness
same no-quality-admission rule
```

Its explicit changes are limited to:

1. truthful rich-v2 counterpart participation modes;
2. record-local mechanical retry before whole-candidate retry.

Because these changes are required to make the affordance and Genesis retry contracts internally coherent, they are not treated as post-hoc quality tuning. Their effect on Rich Life remains an empirical result.

If the corrected arm completes, characterize within-life breadth, intellectual selection/encounters, rejection/retry profile and same-world between-life overlap exactly as planned. Do not proceed to H1-H4 until this H6 result is read.
