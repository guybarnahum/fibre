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

## Exact command

```bash
npm run genesis:rich-life-dev -- \
  --provider openai \
  --model gpt-5.1-2025-11-13 \
  --origin-mode synthetic_lineage \
  --episodes 10 \
  --seed slice-e-dev-burned-001 \
  --out /tmp/fibre-m2-pr39-slice-e-burned-001.json \
  --overwrite
```

The evidence artifact must report `developmentOnly: true`, `burnedForFinalCohort: true`, and `admissionVerdict: null`.

## What to inspect

Inspect the generated life as a chronology, not as ten independent samples. Record without tuning:

- age spread and whether episodes actually advance through childhood/adolescence;
- ordinary/social versus higher-consequence balance;
- structure-grounded versus world-emergent episodes;
- intellectual-encounter count, kinds, access modes, and ages;
- whether access visibly shifts from caregiver/institution mediation toward peer/self-directed opportunities with age;
- whether book/text, conversation/argument, art, scientific idea, mentor/teacher, overheard discussion, and philosophical/religious possibilities are represented in the instrument and which actually instantiate;
- whether intellectual encounter metadata remains observable-history fact rather than lesson, trait, belief, significance, or adult-policy language;
- participant continuity and whether relationships/people recur rather than every episode introducing a disposable cast;
- repairs/rejections and any provider/schema failures;
- monoculture, over-articulation, moral neatness, excessive consequence, or profession/identity foreshadowing.

## Interpretation discipline

There is no richness threshold and no pass/fail score for this development run. A sparse, repetitive, bland, or overly neat life is a finding about the instrument. Do not reject or regenerate it merely to obtain a prettier result.

A mechanical contract violation may be fixed and rerun with the same burned seed, with the failure and repair recorded. A purely aesthetic or quality weakness must be recorded rather than silently tuned away.

This run does not establish genome causality, source/origin integrity, final cohort quality, M2 standing, or future behavior. Those remain owned by G/H, F, and #40/#41 respectively.
