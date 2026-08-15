---
id: validation-m2-pr39-slice-a-review-resolution
status: accepted
last-reviewed: 2026-08-15
canonical: false
---

# #39 Slice A review resolution

This is a review record, **not a third #39 design authority**. The governing contracts remain:

- `docs/architecture/genesis-compiler-contract-v1.md`;
- `docs/validation/m2-pr39-implementation-plan.md`.

It records the non-blocking Slice-A findings that must be carried into implementation and the C/G review packets.

## F1 — Genesis life episodes are Thread events

Decision:

> **An admitted Pass-A historical episode is published as `THREAD_LIFE_EPISODE_RECORDED`.**

Rationale:

- #38 autobiographical memory requires `eventRefs` to resolve to same-Thread `thread_events`;
- cited event `occurred_at` must fall within the memory `subjectPeriod`;
- therefore a Genesis episode cannot remain only inside a seed snapshot or a Genesis-private table.

The Slice-A `THREAD_SEEDED` publication with an arbitrary first-live version is a **boundary/atomicity demonstration only**. It is not the settled full-life publication shape.

The first Slice-C persistence task must land the event shape coherently, including:

1. `THREAD_LIFE_EPISODE_RECORDED` in the central event enum / SQL CHECK and schema upgrade path;
2. a bounded Pass-A episode payload with stable episode identity and chronology;
3. replay/version/state-hash semantics for episode events;
4. one atomic birth publication containing the seed plus admitted episode sequence and, once Slice D exists, memory anchors;
5. final first-live version derived from the actual published event chain rather than preselected for aesthetics.

Do not add the enum alone without its payload/replay semantics merely to make the CHECK accept an unsupported event.

## F2 — WorldSpec prose is reviewed by humans, not lexically gated

Exact WorldSpec keys remain mechanical. The semantic prohibition on authored personality conclusions, destiny, or future-role foreshadowing is a **human authoring/review responsibility**, not a lexical admission validator.

Assigned review points:

- **Gate C:** the reviewer inspects every development WorldSpec used by Pass A and explicitly checks that allowed prose fields contain world circumstances/affordances rather than personality conclusions, destiny, or future-role hints.
- **Slice G freeze:** the independent protocol review applies the same check to all five final cohort WorldSpecs before genomes are assigned and before any H generation.

A WorldSpec that says, for example, that a household "prized independence and creative defiance" or that a child was "destined" for a profession is an authoring defect even though the schema correctly accepts the field as prose.

This semantic review must not be converted into a lexical generator gate. Human-authored WorldSpecs sit upstream of Genesis admission.

## F3 — read-only inspection on non-Genesis worlds

Resolved in implementation.

Read-only Genesis inspection now probes schema presence without creating tables. A normal Fibre world with no Genesis schema returns the empty inspection shape instead of a raw SQLite `no such table` error.

The behavior is covered by `services/world-kernel/test/genesis-readonly-inspection.test.mjs`.

## Carry note — repair sampling remains a Slice-G decision

The record-repair prompt is already a pinned fourth cognition surface.

Slice G must deliberately freeze repair sampling so the nominal repair cap corresponds to meaningful attempts. If the pinned worker is deterministic and repeated repair calls receive identical input, Fibre must either:

- use a recorded, content-independent repair sampling variation; or
- treat repair as one effective attempt and state the cap accordingly.

Do not discover this only after a final-cohort record exhausts repair.
