---
id: validation-m2-pr39-slice-e2-a2-first-run-finding
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — E2 A2 first-run finding

## Status

The first live A2 execution is frozen as a **failed mechanical execution with useful partial H2 evidence**.

It is not a completed A2 result and must not be treated as establishing the Rich-Life claim.

Artifact retained locally by the operator:

```text
./fibre-m2-pr39-slice-e2-a2-v1.json
```

Protocol:

```text
pr39-slice-e2-a2-selection-realization-v1
```

Provider/model:

```text
openai / gpt-5.1-2025-11-13
```

## Frozen selector schedule reached before failure

For E2-D1 / `slice-e2-a0-seed-01`, the selector completed all ten stateless choices before realization began:

```text
01 peer_invitation
02 peer_invitation
03 peer_invitation
04 small_public_mistake
05 mundane_errand_independence
06 mundane_errand_independence
07 mundane_errand_independence
08 choose_text_self_directed
09 choose_text_self_directed
10 mentor_optional_path
```

These selections are burned evidence. A corrected execution must reuse this exact selector schedule rather than asking the model to choose again.

## Partial H2 signal

Before the mechanical failure, realization reached all ten episode slots for the first candidate life.

Most importantly:

```text
episode 01
  selected peer_invitation
  new-counterpart-pressure = true
  realized peer_invitation
  introducedParticipants = 1

episode 02
  selected peer_invitation
  realized peer_invitation
  introducedParticipants = 0

episode 03
  selected peer_invitation
  realized peer_invitation
  introducedParticipants = 0

episode 04
  selected small_public_mistake
  realized small_public_mistake
  introducedParticipants = 1
```

The H6 control had introduced **zero people across sixty completed episodes**. A2 therefore immediately demonstrated that, when abstract opportunity selection is separated from scene-grounding cost, the existing Pass-A realization machinery can introduce a legal new participant without any instruction to increase cast breadth.

This materially strengthens H2:

> **coupling opportunity selection to immediate scene realization suppresses some experiences whose legal realization requires a new person.**

It does not yet establish how general or sufficient that mechanism is. The full two-world / three-life evidence remains required.

## Mechanical failure

Episode 10 selected `ges_v2_mentor_optional_path`.

The first generated record required an `observableAction` bounds repair. The repaired record then contained a second independent defect: a non-person intellectual encounter carried a non-null `participantRef`.

The intended authority path was:

```text
observable-action bounds failure
  -> prose-only form repair
  -> authoritative rich validation
  -> pass_a_intellectual_encounter
  -> record-local retry under the same frozen selected opportunity
```

Instead, `assertRichRepairPreservesEpisodeFacts` normalized the preserved encounter while checking fact equality. That normalization threw the raw error:

```text
non-person intellectual encounter must use participantRef=null
```

The raw `TypeError` escaped before authoritative rich validation could classify the defect as the already-retryable `pass_a_intellectual_encounter` gate.

## Correction

Form-repair fact preservation now compares raw non-`observableAction` fields without validating them.

This preserves the authority order:

1. form repair may change only prose;
2. every other model field remains byte/canonical-value equivalent;
3. authoritative validation runs immediately afterward;
4. any independent mechanical defect is classified by its owning gate;
5. record-local retry receives the same frozen semantic input and same A2 selected opportunity, not the rejected scene.

No selector rule, opportunity choice, EventStructurePool content, WorldSpec, richness signal, participant quota or scene-generation policy changed.

## Resume discipline

The A2 tool now accepts a failed artifact as resume evidence.

For a previously frozen selector schedule it reconstructs the deterministic offer windows and refuses resume unless:

```text
world + seed match
every selector ordinal matches
every offered-structure set matches
every stateless selector-input digest matches
the complete selection schedule digest matches
```

Completed lives in a later failed artifact may also be reused rather than regenerated.

New selector calls occur only for world/seed cells that never received a frozen selector schedule in the source artifact.

The corrected continuation uses a new evidence version (`pr39-slice-e2-a2-v2`) while retaining protocol version `pr39-slice-e2-a2-selection-realization-v1` because the experimental mechanism itself did not change.

## Standing

Current interpretation before continuation:

```text
H6 participation correction necessary                supported
H6 complete explanation                              contradicted
H2 selection/realization coupling                    materially strengthened
H1 prior-prose inertia                               still live
H3 static-world pressure                             unresolved
H4 historical sparsity                               unresolved
```

Do not tune the A2 selector or regenerate its already-frozen first-life choices based on this partial result.
