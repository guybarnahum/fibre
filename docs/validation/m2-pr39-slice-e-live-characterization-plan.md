---
id: m2-pr39-slice-e-live-characterization-plan
status: candidate
last-reviewed: 2026-08-18
canonical: false
---

# Milestone #39 — Slice E burned rich-life characterization

## Purpose

Characterize whether the Slice-E rich-life instrument actually produces developmentally varied prior lives with ordinary social texture and first-class intellectual encounters. This is development evidence, not an admission gate and not a causal test.

The run must not tune against the final Slice-G/H cohort. The world and seed below are therefore permanently burned once used.

The Fibre-level meaning of **rich life** is defined in [`../foundations/rich-life.md`](../foundations/rich-life.md): experiential fertility for later individuality, not merely long prose, event variety, drama, or a quota of intellectual encounters.

## Frozen run

```text
implementation head before live evidence: 02432cf88e928c0a7398a59d381a8b550833cbde
origin mode: synthetic_lineage
provider: openai
model: gpt-5.1-2025-11-13
seed: slice-e-dev-burned-001
episodes: 10
world: world_slice_e_dev_burned_001
developmental span: age 6 through 17.999
EventStructurePool: genesis-event-structure-pool-v2
```

The model choice follows the repository's configured OpenAI reasoning model. The synthetic lineage is a real deterministic crossover of two synthetic-ancestor symbolic genomes, but the lineage/genome witness is discarded before Pass-A cognition.

## Attempt 1 — mechanical instrument failure

The first invocation of the frozen run reached episode 1 and produced a candidate using `ges_v2_lost_small_item` with the subject and one caregiver. It was rejected by the inherited Gate-C structure-participation validator because Pool v2 had authored `participatingRoles: [caregiver, sibling, peer]` to mean alternatives while the legacy contract correctly interprets that field as requiring every listed role.

This is an instrument-contract defect, not a richness/quality observation and not a reason to choose another seed. No episode was admitted and no evidence artifact was completed.

The repair is deliberately scoped to rich Pool-v2 semantics:

- legacy/v1 Pass A retains the Gate-C rule that every listed `participatingRole` must be represented;
- rich Pool v2 treats a multi-valued `participatingRoles` list as allowed counterpart alternatives and requires at least one listed counterpart role to participate;
- all other structureRef, developmental-range, chronology, age, subject-participation, participant-grounding and duplicate-ID checks continue through the existing Pass-A validators;
- the exact failed `lost_small_item` shape is a regression control, including proof that legacy Pass A still rejects it.

Implementation fix head before rerun verification: `7b7e1522a02bc8a4bb213d6d5474142158e4bb69`.

Per the frozen protocol, the same burned world and seed remain in force for the rerun. This prevents the failure from becoming a reason to search for a more flattering sample.

## Attempt 2 — record-form repair exhaustion

After the role-semantics repair, the full mechanical suite was green at 530/530 and `npm run check` passed. The second invocation used the same frozen world and seed.

Episode 1 completed with no repair. Episode 2 failed only the existing `pass_a_observable_action_bounds` form gate. Two model-authored record-form repairs were attempted, but both again exceeded the authoritative 1200 UTF-8-byte ceiling, so the third generated version correctly terminated with `record_repair_exhausted`.

This is another mechanical runner defect rather than a quality judgment about the generated life. The validator and 1200-byte authority are not relaxed. Instead the repair protocol is narrowed:

- repair cognition may author only one field: replacement `observableAction`;
- Fibre mechanically preserves episode ID, chronology, age, place, participant refs, structure ref, participant introductions, and all intellectual-encounter facts from the rejected episode;
- repair output has a dedicated one-field structured-output schema, so a model cannot reauthor event identity while ostensibly repairing form;
- byte-bound repair instructions target 600 UTF-8 bytes, leaving a 2x margin under the unchanged authoritative 1200-byte ceiling;
- each rejected version and repair remains counted in repair evidence; exhaustion remains legal if the narrowed repair still cannot satisfy the gate.

Implementation repair-protocol head: `697ff74e2e3df67a10599ca4cd4b5ec179e5c877`.

The same burned world and seed remain mandatory for Attempt 3.

## Attempt 3 — hidden developmental-range constraint

After the narrowed repair protocol, the full mechanical suite was green at 531/531 and `npm run check` passed. The third invocation again used the same frozen world and seed.

The first generated episode selected `ges_v2_drawing_or_making_seen` in the first age stratum (6–7.1999). That structure's reviewed developmental range begins at age 7. The v2 sampler had inherited the legacy overlap rule, so the structure was eligible because part of its range overlapped the stratum. But Pass-A cognition intentionally does not receive structure developmental-range policy labels, so the model could legally choose an age below 7 and then be rejected by the authoritative structure-range validator.

This is a hidden-constraint defect in offer construction, not a generated-life quality failure and not a reason to expose range policy labels to cognition. The repair preserves the Gate-C information boundary:

- legacy/v1 EventStructure sampling remains overlap-based and unchanged;
- rich Pool-v2 sampling now offers a structure only when its reviewed developmental range fully contains the entire current developmental stratum;
- the rich Pass-A builder independently rejects a manually supplied partial-stratum offer, so bypassing the sampler cannot recreate the hidden constraint;
- the model still does not receive consequence labels or developmental-range policy labels;
- the authoritative episode range validator remains unchanged.

Implementation full-stratum-offer head: `498e9724e555091f25580db5e3b9de78e10ac0a9`.

The same burned world and seed remain mandatory for Attempt 4.

## Attempt 4 — repeated isolated-field repair still failed to converge

After aligning the stale overlapping-range test, the full mechanical suite was green at 532/532 and `npm run check` passed. Attempt 4 again used the same frozen world and seed.

Episodes 1–3 completed. Episode 1 required no repair; episodes 2 and 3 each required one `pass_a_observable_action_bounds` repair and then admitted. Episode 4 failed the same byte gate, and both permitted one-field model repairs again exceeded the authoritative 1200 UTF-8-byte ceiling, ending in `record_repair_exhausted`.

The one-field output boundary therefore removed event-field rewriting but did not yet make repair cognition reliably convergent. The remaining defect was that repair cognition still received the full Pass-A input plus the complete rejected episode, and every retry received the same 600-byte target. That gave a form-only repair call unnecessary scene/world context and no progressively stronger instruction after it had already ignored the first bound.

The repair is tightened without truncating or otherwise mechanically rewriting the historical prose:

- repair cognition now receives only `rejectedObservableAction`, `failedGate`, and the exact failed constraint; it receives no world, roster, structure, event ID, chronology, participant metadata, lineage, or intellectual-encounter metadata;
- Fibre still carries every non-`observableAction` field forward mechanically;
- the first repair target is 600 UTF-8 bytes / 80 words;
- if that replacement itself fails the byte gate, the second and final repair target tightens to 300 UTF-8 bytes / 40 words and sees only the immediately prior replacement;
- a regression reproduces Attempt 4 exactly: initial action over 1200 bytes, first repair still over 1200, second repair concise, with the repair input proved free of event/world identity fields;
- deterministic prefix truncation was explicitly rejected because `observableAction` is historical content and truncation could silently delete event facts;
- the authoritative 1200-byte gate and three-generated-version exhaustion rule remain unchanged.

Implementation and regression head: `fcdc1955ea93bc4e1c2a0781f5f07aafa76cfd44`.

The same burned world and seed remain mandatory for Attempt 5.

## Attempt 5 — completed; substantive rich-life miss

After the progressive isolated repair fix, the full mechanical suite was green at 533/533 and repository validation/context packs passed. Attempt 5 used the same frozen world, seed, origin mode and model.

All ten chronology strata completed. Five episodes required one `pass_a_observable_action_bounds` repair; none exhausted repair and there were no provider/protocol failures. The completed evidence artifact reports `developmentOnly: true`, `burnedForFinalCohort: true`, and `admissionVerdict: null`.

The completed life is preserved as the canonical negative development sample for this compiler state. Its key characterization is:

```text
historical episodes:           10
structure-grounded:            10
world-emergent:                 0
distinct instantiated structures: 5
home episodes:                  9
same caregiver present:        10
same sibling present:           9
introduced participants:        0
intellectual encounters:        0
```

Every stratum offered intellectual affordances; 41 of the 90 offered slots carried `intellectual_encounter` context, yet none instantiated. The chronology also developed strong motif inertia from pencils/bus drawings into chips/budget and finally an art-club decision folded back into that same established motif.

Under Fibre's stronger `Rich Life` foundation this is a **substantive Slice-E miss**, not merely an aesthetically weak sample. The mechanism produced a valid and coherent life but did not demonstrate enough experiential fertility for later differentiation. See `m2-pr39-slice-e-live-characterization-result.md` for the full reading.

Do not rerun this seed/world for quality. The artifact has served its diagnostic purpose.

## E2 — next development protocol

E2 must address the mechanism exposed by Attempt 5 before the combined E+F Gate F and before G.

The correction target is narrative inertia, not the absence of a particular content category. Fibre must preserve enough prior history for chronology, people, relationships and consequences to remain coherent while preventing prior episode prose from becoming a literary template that monopolizes later generation.

Do not add quotas for books, places, people, adversity, intellectual encounters, novelty, or supposedly formative events. Pass A remains unable to know what later personality or point of view should emerge.

Use **fresh throwaway development worlds/seeds**, burned on first use, to characterize the revised mechanism. Inspect:

- world/place reach relative to affordances;
- recurring versus newly encountered people;
- relationship continuity versus cast collapse;
- structure diversity and repetition concentration;
- world-emergent events;
- intellectual/source encounters and access modes;
- recurring object/motif concentration;
- whether later events merely elaborate earlier motifs;
- ordinary/non-formative historical excess;
- record-form repair profile.

There is still no per-Thread richness admission threshold. Weak fresh runs remain evidence. Repeated collapse across fresh worlds is a generator-architecture finding, not a reason to reroll until a prettier life appears.

## Historical command

The completed Attempt-5 invocation used:

```bash
npm run genesis:rich-life-dev -- \
  --provider openai \
  --model gpt-5.1-2025-11-13 \
  --origin-mode synthetic_lineage \
  --episodes 10 \
  --seed slice-e-dev-burned-001 \
  --out ./fibre-m2-pr39-slice-e-burned-001.json \
  --overwrite
```

This command is historical evidence. **Do not run it again to improve quality.**

## Interpretation discipline

A mechanical contract violation may be fixed and rerun with the same burned seed while no complete artifact exists, with every failure and repair recorded. Once a complete artifact exists, a purely behavioral/quality weakness is preserved as evidence and correction moves to fresh development worlds.

Richness does not mean forcing more visible variety. It means giving later personhood enough non-interchangeable lived material to work with while preserving the possibility that some events are mundane, forgotten, misunderstood, or never become formative.

This run does not establish genome causality, source/origin integrity, final cohort quality, M2 standing, or future behavior. Those remain owned by G/H, F, and #40/#41 respectively.
