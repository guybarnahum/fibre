---
id: validation-m2-pr39-slice-bc-blocking-review
status: draft
last-reviewed: 2026-08-16
canonical: false
---

# #39 Slice B+C blocking review packet

This is a review packet, **not a third #39 design authority**. The governing contracts remain:

- `docs/architecture/genesis-compiler-contract-v1.md`;
- `docs/validation/m2-pr39-implementation-plan.md`.

Requested verdict:

```text
CLEAR
or
HOLD
```

Do not score aesthetic quality. Attack whether the implementation preserves the scientific boundary claimed by Slices B and C, and whether the development evidence exposes rather than gates generator tendencies.

## Implementation under review

Slice-C implementation code head:

```text
abd6b3b037e2246021f20e6132942e3a34eb4d62
Tighten Slice C cognition affordance boundary
```

The review-packet commit is documentation-only and follows that implementation head.

At the implementation head, the GitHub `validate` workflow completed successfully with `npm run check` green.

## Slice B claim

> Fibre can inherit specific textual possibilities with exact provenance without converting inheritance into numeric personality authority or a finished character.

Primary evidence:

- `docs/architecture/symbolic-thread-genome-v1.md`
- `docs/validation/symbolic-thread-genome-implementation-plan.md`
- `docs/validation/m2-pr39-slice-b-genome-control-result.md`

Live positive-control results already recorded:

```text
OpenAI generator / OpenAI blind rater   20/24  p=0.000771939754486084
Gemini generator / OpenAI blind rater   19/24  p=0.003305375576019287
```

The cross-provider result satisfies the predeclared `17-19/24` detectable-moderate ceiling. This is an instrument ceiling only, not personhood evidence, causal standing, or an admission gate.

## Slice C claim

> A particular life can happen before Fibre knows what personality or future decision it is supposed to produce.

Pass A sees world/chronology/factual people/current EventStructure affordances. It does **not** see genome, parent/ancestor loci, remembered meaning, future role/benchmark/request, source-instance identity, prior EventStructure provenance, or consequence-class policy labels.

Output remains observable history only. There is no meaning/significance/trait/impact/inner-state/future-policy field.

## Mechanical boundary now implemented

Pass A internally validates against full provenance-bearing candidate state, but cognition receives a projection:

```text
prior episode cognition:
  episodeId
  occurredAt
  ageAtEvent
  placeRef
  participantRefs
  observableAction
  introducedParticipants
  # structureRef intentionally absent

current offered affordance cognition:
  structureId
  abstractSituation
  participatingRoles
  # consequenceClass intentionally absent
  # developmentalRange policy metadata intentionally absent
```

A non-null generated `structureRef` must name one of the structures offered in the **current** Pass-A call. Full `structureRef`, consequence class, range, offer-selection digest, and pool provenance remain available to Fibre for validation/evidence.

Record-form repair receives the same cognition projection. Repair cannot regain hidden policy/provenance metadata.

## Development characterization

All worlds below are development-only and permanently burned for the final cohort.

Raw JSON artifacts are generated evidence and are not promoted into canonical source. This packet records the concise results needed for review.

### dev-001 — single broad chronology window

Artifact:

```text
artifacts/generated/pr39-slice-c-pass-a-dev-001.json
```

Result:

```text
8/8 episodes admitted
4 structure-grounded / 4 world-emergent
0 repairs
0 memories / 0 meanings
```

Finding: chronology collapsed toward the end of the six-year span. Five of eight events occurred near age 11.8-11.99, with the final three within about an hour. The output began to resemble a continuous domestic scene rather than sparse childhood history.

Correction: development generation now uses deterministic chronology strata across the developmental span. This is scheduler structure, not a semantic quality gate.

### dev-002 through dev-004 — chronology fixed, policy-label bias exposed

Each run used eight deterministic strata and completed with:

```text
8/8 historical episodes
6 structure-grounded / 2 world-emergent
0 repairs
0 memories / 0 meanings
```

Across these three complete runs, all `18/18` structure-grounded selections were low consequence despite broader offered sets.

This was recorded as a generator/cognition finding, not used as an admission failure.

### dev-005 — current-offer reference failure

Artifact:

```text
artifacts/generated/pr39-slice-c-pass-a-dev-005.json
```

The run failed mechanically at episode 5:

```text
GENESIS_PASS_A_VALIDATION_ERROR:
episode structure ges_small_help_request was not offered to Pass A
```

The failure artifact was preserved.

Root cause found during diagnosis:

1. prior episodes were returned to cognition with their historical `structureRef`, allowing an old structure ID to prime a later call even when not currently offered;
2. current offers exposed `consequenceClass: low | moderate | formative_capable`, policy metadata not needed to instantiate an affordance and plausibly coupled to the instruction not to author significance.

Correction: hide both prior `structureRef` and current consequence/range policy labels from cognition while retaining them internally for validation/evidence.

### dev-006 — same-seed replay after cognition-boundary correction

Artifact:

```text
artifacts/generated/pr39-slice-c-pass-a-dev-006.json
seed: slice-c-structure-probe-005
```

This deliberately reuses the failed dev-005 sampling seed under the corrected cognition boundary.

Result:

```text
8/8 historical episodes
8 chronology strata
6 structure-grounded / 2 world-emergent
3 unique instantiated structures
0 repairs
0 memories / 0 meanings
```

Grounded structures:

```text
ges_small_help_request                 3
ges_familiar_person_temporarily_absent 2   # moderate
ges_routine_plan_shift                 1
```

The same Fibre seed fixes the structure-offer schedule but does **not** make the OpenAI generator deterministic. The replay therefore provides comparative evidence, not causal proof about one prompt field. Under the corrected boundary, the stale-reference failure disappeared and the previous `18/18` all-low pattern did not persist: two moderate structures were instantiated. This is consistent with the removed policy/provenance cues having influenced earlier selection, but does not establish that `consequenceClass` alone caused the earlier bias.

The eight admitted observable episodes were:

1. **Age 6.32 — `ges_small_help_request`**: caregiver asks the child to carry a small trash bag downstairs to the shared dumpster; the child does so and returns upstairs.
2. **Age 7.06 — `ges_small_help_request`**: caregiver asks the child to match clean socks from a laundry basket while the caregiver folds them.
3. **Age 7.84 — `ges_small_help_request`**: caregiver asks the child to carry one lighter grocery bag upstairs from the building entrance.
4. **Age 8.43 — `ges_familiar_person_temporarily_absent`**: with the usual bedtime-story caregiver away visiting a relative, the other caregiver washes dishes while the child sits with the younger sibling watching television.
5. **Age 9.34 — world-emergent**: child and younger sibling bounce a small rubber ball against a courtyard wall and retrieve it in turns.
6. **Age 10.07 — `ges_familiar_person_temporarily_absent`**: both caregivers are temporarily away; the child remains with the younger sibling, answers a question about where the caregiver went, and suggests lining up toy cars until the caregiver returns.
7. **Age 10.85 — `ges_routine_plan_shift`**: a bus route is temporarily suspended after school, so the child reads the notice and walks toward home instead of waiting.
8. **Age 11.41 — world-emergent**: child arranges school notebooks while the younger sibling enters with a blanket; the child makes space on the couch and lowers the television volume when footsteps sound in the hallway.

## Known uncomfortable result — preserve, do not tune away before review

The dev-006 life still has a strong cooperative/responsibility attractor. Several events depict the child helping caregivers, attending to a younger sibling, acting carefully, or adapting without conflict.

This may arise from some combination of:

- OpenAI generator prior/tendency;
- the factual WorldSpec itself (`younger sibling`, two-caregiver household, walking/transit, ordinary household routines);
- the EventStructurePool low-consequence affordances;
- ordinary narrative priors around children in domestic settings.

The implementation currently does **not** reject, rewrite, rebalance, or quota this tendency. A quiet/cooperative childhood is allowed to exist. The compiler contract explicitly says to gate form and measure tendency; plot-shapedness, stereotype tendency, funnel proportions, and offered-versus-used ratios are measured rather than gated.

Reviewer should decide whether this remaining pattern is merely a visible generator finding, or whether some still-hidden authoring mechanism means the pool/world/compiler is actually constructing a predetermined character.

## Claimed

- Pass A is genome-blind.
- Pass A has no future adult/benchmark/request target.
- Pass A history is chronologically sparse across the development span in the development harness.
- history is observable-event shaped rather than explicit meaning/personality shaped;
- EventStructures are optional affordances and world-emergent episodes occur;
- current-offer structure references are mechanically enforced;
- prior structure provenance and consequence-class policy labels no longer reach cognition;
- record repair is mechanical and witnessed;
- no memory or durable meaning exists in Slice C.

## Not claimed

- that generated childhoods are aesthetically balanced;
- that moderate/formative events must occur;
- that every life must contain conflict, error, adversity, or rebellion;
- that the remaining helper/responsibility attractor is solved;
- that genome affects history, memory, or meaning;
- that the final five-Thread cohort is frozen;
- Whole-Person causal standing or M2 movement.

## Hostile review request

Please attack at least these questions:

1. Can any genome, inherited personality, future-role, benchmark, source-instance, or remembered-meaning information reach Pass A directly or indirectly?
2. Does hiding prior `structureRef` from cognition preserve factual continuity while avoiding stale structure-ID priming?
3. Is removing `consequenceClass` / developmental-range metadata from cognition consistent with the contract's requirement that Fibre sample the offer distribution, rather than making those labels part of the creative stimulus?
4. Can Pass A cite an unoffered current structure through any path that bypasses `pass_a_structure_ref` validation?
5. Can record repair change event facts or select a different life rather than repairing bounded observable wording?
6. Do chronology strata create a legitimate sparse-history schedule, or do they accidentally become a hidden semantic authoring constraint?
7. Does the dev-006 helper/responsibility pattern indicate a remaining compiler/world/pool authoring defect, or is it correctly preserved as an admitted generator tendency?
8. Are world-emergent episodes genuinely permitted without a ratio floor/target?
9. Is any development world or artifact capable of leaking into the later final cohort despite the burned-world rule?
10. Does Slice B still provide a meaningful textual-genome specificity ceiling without becoming a finished-character authority that contaminates Slice C?

### False CLEAR examples

Return `HOLD` if, among other things, you find:

- hidden genome/future/source-person information reaches Pass A;
- consequence/policy labels still reach creative cognition through another field;
- prior structure provenance still primes or constrains current affordance selection;
- a stale/unoffered structure can be admitted;
- chronology scheduling selects for a desired personality or quality result rather than time coverage;
- repair can materially change the event;
- the development evidence was curated by rejecting quiet, repetitive, cooperative, or otherwise uninteresting lives;
- the helper/responsibility pattern is mechanically authored by hidden policy rather than merely observed in admitted output.

If no blocking defect is found, return `CLEAR` and identify residual risks that should be carried into Slice G/H rather than converted into Slice-C gates.
