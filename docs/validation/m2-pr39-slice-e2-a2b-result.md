---
id: validation-m2-pr39-slice-e2-a2b-result
status: superseded
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 A2b result

## Superseded completion record

This file previously stated that `A2b_plausibility_surface_seeded_contingency` had completed on both E2 diagnostic worlds. That statement is **superseded and must not be used as evidence**.

Subsequent user-run evidence on 2026-08-19 established that the evidence-preserving continuation still fails mechanically on E2-D1 / `slice-e2-a0-seed-02`, slot 4, with frozen selected opportunity:

```text
ges_v2_drawing_or_making_seen
```

Repository verification immediately before that run was user-run and green:

```text
563 tests
563 pass
0 fail
repository validation passed with generated context packs
```

The continuation correctly reused:

- the completed E2-D1 / seed-01 life from the earlier failure artifact; and
- the frozen E2-D1 / seed-02 plausibility/draw schedule `sha256:94a64d7b086c7c69f7cb4d91fb322d3ed91adeee701c4cf6162dd697a65b633c`.

It did not reroll the frozen opportunity schedule.

## Second continuation failure

All three whole-candidate attempts failed at the same selected slot.

```text
attempt 1
  slot 4 drawing_or_making_seen
  -> pass_a_structure_participation
  -> record retry
  -> pass_a_structure_participation
  -> record retry
  -> record_repair_exhausted

attempt 2
  slot 4 drawing_or_making_seen
  -> pass_a_structure_participation
  -> record retry
  -> pass_a_structure_participation
  -> record retry
  -> record_repair_exhausted

attempt 3
  slot 4 drawing_or_making_seen
  -> pass_a_structure_participation
  -> record retry
  -> pass_a_observable_action_bounds
  -> form repair
  -> record_repair_exhausted
```

The CLI wrote the failed continuation artifact:

```text
fibre-m2-pr39-slice-e2-a2b-v2.json
```

That artifact is development-only, burned evidence. It is **not** a completed A2b result.

## Diagnosis

The first retry correction exposed the selected structure's counterpart mode and allowed roles, but the live model still repeatedly failed the authoritative participation gate.

For `present_required`, the validator does not infer participation from prose. A qualifying known or same-episode-introduced participant must be represented by ID in `episode.participantRefs`.

E2-D1 already has known caregivers that can satisfy `ges_v2_drawing_or_making_seen`. The remaining defect is therefore a retry-interface mismatch: the retry constraint says that an allowed counterpart must participate, but does not state the exact record representation that the validator checks or identify the already-visible known participant IDs that satisfy the role contract.

The next correction must remain mechanical only:

- expose the exact `episode.participantRefs` requirement for `present_required`;
- provide a deterministic projection of already-visible eligible known participant IDs and matching roles;
- retain legal same-episode introduction as an alternative, with the introduced provisional ID also required in `episode.participantRefs`;
- expose no rejected episode, rejected prose, richness signal, novelty signal, place preference, or quality feedback;
- do not change the frozen A2b opportunity schedule.

## Interpretation

Current state:

```text
H2 selection/realization coupling:          strongly supported by A2
A2 deterministic single winner:             rejected
A2b seeded contingency:                     promising but mechanically incomplete
A2b plausibility filtering on observed D1:  non-discriminating
A2b completed result:                       NOT ESTABLISHED
N1 downstream fertility:                   FROZEN BUT BLOCKED
production mechanism freeze:                NOT YET
```

The predeclared N1 protocol remains useful, but it must not run until A2b can complete mechanically under its already-frozen evidence-preserving schedule.

No admission verdict is earned by the current A2b evidence.
