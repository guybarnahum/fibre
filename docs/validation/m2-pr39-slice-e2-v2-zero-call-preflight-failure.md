---
id: validation-m2-pr39-slice-e2-v2-zero-call-preflight-failure
status: recorded-mechanical-failure
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — E2-V2 zero-model-call preflight failure

## Status

The first attempted E2-V2 source-generation command did **not** reach a model call.

The frozen E2-V2 world therefore remains unused under the protocol rule:

> first model use burns the world.

The failed invocation and its artifact remain permanent mechanical evidence and must not be erased or reinterpreted as a model-generation result.

## Observed failure

The command entered E2-V2 A0 candidate 1, episode 1 and failed before provider invocation with:

```text
pass_a_structure_affordance:
offered structure ges_v2_lost_small_item requires role sibling,
which the WorldSpec does not afford
```

The same deterministic pre-call failure repeated for all three candidate attempts, after which the candidate driver reported exhaustion.

No episode was admitted and no model output was observed.

## Root cause

This was a validator-semantics mismatch, not a WorldSpec or A0 quality failure.

EventStructurePool v2 and the reviewed rich counterpart policy define `participatingRoles` as **alternative counterpart roles**. For example:

```text
ges_v2_lost_small_item
participatingRoles = [caregiver, sibling, peer]
```

means a caregiver **or** sibling **or** peer may instantiate the counterpart role.

E2-V2 affords `caregiver` and `peer`, so the structure is mechanically realizable even though the world does not afford `sibling`.

The rich episode validator already used the reviewed alternative-role semantics. However `generateRichPassAEpisode()` first called the legacy `assertPassAHistoryConsistency()` pre-call guard. That legacy Gate-C path interpreted `participatingRoles` as an all-required list and rejected an offered rich-v2 structure if **any** listed role was absent from `WorldSpec.affordedRoles`.

The failure therefore occurred before `adapter.invoke()`.

## Correction

The history-consistency affordance check is now policy-scoped:

- legacy Pass A retains its existing all-required-role affordance semantics;
- rich v2, identified by the explicit rich counterpart policy witness, treats `participatingRoles` as alternatives;
- rich `present_required` / `known_required` offers require at least one world-afforded alternative counterpart role;
- rich `present_optional` offers do not require a counterpart role merely to remain on the offer surface;
- episode-level rich validation still owns whether a selected realization actually has the required/known counterpart.

A model-free regression uses the exact frozen E2-V2 first-window offer that exposed the defect and additionally verifies that the legacy policy still rejects the same partial-role world.

## Anti-tuning statement

This correction changes none of the following:

```text
E2-V2 WorldSpec
E2-V2 seeds
E2-V2 offered schedules
A0 prompt
A0 sampling
candidate-attempt cap
source-life inclusion rule
N2 Pass-B prompt
N2 trial assignments
N2 Criterion A
N2 Criterion B
```

No model output from E2-V2 existed when the correction was made.

The correction is justified independently by an already-reviewed semantic invariant: EventStructurePool v2 `participatingRoles` are alternatives. It is therefore a mechanical doctrine-alignment fix, not an outcome-driven change.

## Burn/resume rule

Preserve the failed zero-call artifact under a distinct diagnostic name before the successful source-generation output path is reused.

The frozen E2-V2 WorldSpec may then be executed once after the model-free regression and repository validation pass, because its first model use has not yet occurred.
