# Runtime Name Debt

This register explains development-chronology names that still exist in active `services/*/src` code. Their presence is temporary debt, not a naming pattern to copy.

The desired end state is semantic capability names. Rename/remove each group behind its existing tests; if a name turns out to represent a true compatibility boundary, document that boundary and keep the version in contract data where possible.

## Version-labelled implementations

These names record implementation evolution rather than a currently justified public compatibility boundary:

- `world-kernel/src/dignity-guardian-v4.mjs`
- `world-kernel/src/embodiment-store-personhood-v2.mjs`
- `world-kernel/src/genesis-event-structure-pool-v1.mjs`
- `world-kernel/src/genesis-event-structure-pool-v2.mjs`
- `world-kernel/src/genesis-event-structure-pool-v3.mjs`
- `world-kernel/src/genesis-historical-envelope-v1.mjs`
- `world-kernel/src/genesis-historical-realization-v1.mjs`
- `world-kernel/src/genesis-life-continuity-v1.mjs`
- `world-kernel/src/genesis-pass-a-reliability-v3.mjs`
- `world-kernel/src/identity-domain-registry-v2.mjs`
- `world-kernel/src/identity-schema-v2-repair.mjs`

Disposition: collapse the surviving behavior into a canonical semantic module or delete superseded implementations. Do not add a next numbered file.

## Genesis pass-labelled implementations

These encode construction chronology (`Pass A/B/C`) rather than the responsibility of the module:

- `world-kernel/src/genesis-life-pass-a.mjs`
- `world-kernel/src/genesis-life-pass-b-input.mjs`
- `world-kernel/src/genesis-life-pass-b.mjs`
- `world-kernel/src/genesis-life-pass-c.mjs`
- `world-kernel/src/genesis-pass-a-cognition.mjs`
- `world-kernel/src/genesis-pass-a-consistency.mjs`
- `world-kernel/src/genesis-pass-a-domain.mjs`
- `world-kernel/src/genesis-pass-a-runner.mjs`
- `world-kernel/src/genesis-pass-b-admission.mjs`
- `world-kernel/src/genesis-pass-b-cognition.mjs`
- `world-kernel/src/genesis-pass-b-domain.mjs`
- `world-kernel/src/genesis-pass-b-prompts.mjs`
- `world-kernel/src/genesis-pass-c-cognition.mjs`
- `world-kernel/src/genesis-pass-c-domain.mjs`
- `world-kernel/src/genesis-pass-c-prompts.mjs`
- `world-kernel/src/genesis-pass-c-reinterpretation.mjs`
- `world-kernel/src/genesis-rich-pass-a-runner.mjs`

Disposition: after the Genesis closing seam is stable, rename by enduring responsibility such as historical realization, memory formation, meaning formation, admission, consistency, or orchestration. Preserve A/B/C only in historical evidence when useful.

## Slice/milestone-labelled implementations

- `world-kernel/src/genesis-slice-d-characterization.mjs`
- `world-kernel/src/genesis-slice-e-characterization.mjs`
- `world-kernel/src/m1-deterministic-actor.mjs`

Disposition: move experiment/characterization-only machinery to the appropriate gate/repro surface; if code is truly runtime, rename it for its enduring capability.

`identity-causal-influence.mjs` is the first retired item from this group: its durable identity-to-Guardian counterfactual proof is runtime-relevant, so the implementation and active regression now use the semantic capability name rather than the milestone that introduced it.

## What is not debt

Serialized values such as `thread-presentation-packet-v0.1`, `asset-generation-job-v0.1`, or a persistent workflow key can legitimately carry a version because they identify data/protocol compatibility. Their containing source files should still have semantic names.

Versioned filenames in migrations, historical fixtures, frozen gates, validation evidence, or vendor interoperability adapters are also acceptable when the version is the subject of the artifact rather than development residue.
