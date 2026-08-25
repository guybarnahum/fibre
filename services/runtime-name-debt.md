# Runtime Name Debt

This register explains development-chronology names that still exist in active `services/*/src` code. Their presence is temporary debt, not a naming pattern to copy.

The desired end state is semantic capability names. Version identifiers belong in serialized contracts, policy/evidence IDs, migrations, or historical artifacts when compatibility/chronology is genuinely the subject; active runtime filenames should describe enduring responsibility.

## Remaining non-Genesis cleanup

One current runtime module still carries an implementation-version filename:

- `world-kernel/src/dignity-guardian-v4.mjs`

It does not represent a selectable production compatibility dialect. It remains here only because it has a broad direct-import surface spanning current runtime code and retained historical proof tooling. Rename it in a narrow mechanical commit behind the existing tests; preserve its versioned policy/evidence values where those values are real witnesses.

## Genesis naming debt — explicitly deferred until the birth seam is stable

The remaining Genesis filenames encode implementation chronology (`Pass A/B/C`, slice labels, or implementation versions) rather than enduring module responsibility:

- `world-kernel/src/genesis-event-structure-pool-v1.mjs`
- `world-kernel/src/genesis-event-structure-pool-v2.mjs`
- `world-kernel/src/genesis-event-structure-pool-v3.mjs`
- `world-kernel/src/genesis-historical-envelope-v1.mjs`
- `world-kernel/src/genesis-historical-realization-v1.mjs`
- `world-kernel/src/genesis-life-continuity-v1.mjs`
- `world-kernel/src/genesis-pass-a-reliability-v3.mjs`
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
- `world-kernel/src/genesis-slice-d-characterization.mjs`
- `world-kernel/src/genesis-slice-e-characterization.mjs`

Disposition: do not rename this graph while the #39 birth/publication seam is still being closed. Once the seam is stable, rename by enduring responsibility such as historical realization, memory formation, autobiographical meaning formation, admission, consistency, or orchestration. Move characterization-only machinery out of runtime. Preserve A/B/C, slice, and policy-version labels in historical evidence where useful.

## Retired debt

The following live runtime names have already been currentized:

- `m2-identity-causal-wire.mjs` -> `identity-causal-influence.mjs`
- `m1-deterministic-actor.mjs` -> `deterministic-actor.mjs`
- `embodiment-store-personhood-v2.mjs` -> `embodiment-persistence-store.mjs`
- `identity-schema-v2-repair.mjs` -> `identity-schema-compatibility.mjs`
- `identity-domain-registry-v2.mjs` -> `identity-domain-registry-definition.mjs`

These changes intentionally preserved serialized versions, evidence IDs, and policy witnesses where version identity remains meaningful.

## What is not debt

Serialized values such as `thread-presentation-packet-v0.1`, `asset-generation-job-v0.1`, a policy version, or a persistent workflow key can legitimately carry a version because they identify data/protocol compatibility or exact evidence.

Versioned filenames in migrations, historical fixtures, frozen gates, validation evidence, or vendor interoperability adapters are also acceptable when the version is the subject of the artifact rather than development residue.
