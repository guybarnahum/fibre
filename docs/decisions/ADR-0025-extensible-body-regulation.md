---
id: ADR-0025
status: accepted
last-reviewed: 2026-10-12
---

# ADR-0025: Extend one Body with small, evidenced drive evaluators

## Status

Accepted decision. **G1/D1 is implemented in source, not yet locally or staging validated:** the one Body now accepts a bounded evidence-backed `social_contact` drive, and newly generated genomes inherit the existing numeric regulator sensitivities. Historical genomes remain unchanged. Full future-drive generality, need-driven Flight Plans, considerate social-time projection and spontaneous encounters are still planned.

## Context

Fibre has one provider-neutral intrinsic regulator, a shared `RegulationFrame`, bounded organismic runtime sensitivity, interoception, Interior Cognition, World LivedNow and Flight Planning. Its existing social response reacts to present cues/relations but does not yet recognize a causally supported, prolonged lack of meaningful contact. A new need should not require its own engine, service, model invocation, feeling store, scheduling system or duplicated domain policy.

New future stimuli might include developmental appetite, grounded sensory/World changes, social scarcity or measured resources. They have **different authorities**. Only genuine regulator-level discrepancies become Body drives; model-token limits and infrastructure consumption are ordinarily feasibility, not invented organic hunger.

## Decision

1. **Keep one Body authority.** All families produce the existing generic Drive and `RegulationFrame` contract. Existing attention/interoception/planning/social consumers remain shared.
2. **Lightweight, statically composed drive modules.** A family consumes bounded, typed, evidenced `PerceptFrame` inputs and the existing species/individual profile; it deterministically returns zero or more ordinary drives. No World querying or model invocation inside family evaluators. Introduce a frozen `DRIVE_EVALUATORS` list only if more concrete families make such a list *simpler* than direct local evaluation. This is not a dynamic plugin runtime.
3. **Evidence and meaning separated.** Missing inputs mean unknown, not zero. A mechanical pressure is never automatically `loneliness`, `hunger`, `curiosity`, attraction, consent or an action. Personal meaning requires the existing interoception/Interior Cognition path and retained individual history.
4. **Genetics modest and explicit.** Species invariants own allowed ranges; genotype may tune measured regulator sensitivity only within a narrow envelope. Keep immutable inherited `runtimeBaselines` separate from developed character. A baseline recognized by the core is not automatically generated/inherited in the durable symbolic-genome path. Add a heritable parameter only after demonstrating the need, with a declared birth/lineage policy and handling of already-born Threads.
5. **First consumer: social-contact pressure.** Ground it in supported continuity plus bounded actual social/experienced evidence, respecting genuine solitude and sparse historical visibility. Improve non-social under-stimulation through the existing `exploration` drive. Let pressure affect ordinary life/planning and opportunities, not manufacture meetings.
6. **Considerate contact is situated social judgment.** Project recipient-local weekday/time, actual LivedNow reachability, modality and relationships into existing initiation/recipient cognition at real contact opportunities. No universal bedtimes or weekends, hard-coded relationship permissions, separate reminder engine or deterministic social approval table. Actual sleeping-person reachability is a World constraint, not inference from the hour.

## Consequences and controls

The near-term implementation surface is small and testable; adding another genuine drive can usually change its bounded World/body projector and one pure regulator evaluator (plus a genetic spec only when heritable). No per-minute ticking, whole-history reads, population-wide scans, extra provider calls, plugin framework, forced sociability or invented sensor data.

Acceptance requires an **actual differential causal effect** on a later Thread-owned action/plan together with preserved consent and valid non-action, not only a new field or a simulated feeling.

The implementation steps, source owners, semantic tests, current gaps and explicit exclusions are recorded in [Extensible Body regulation, social hunger and considerate contact](../architecture/regulation-drive-extensions.md). Follow [ADR-0020](ADR-0020-vision-led-development-discipline.md) and the no-unneeded-abstraction rule. Work on `main` only; Guy runs local validation and deployment.
