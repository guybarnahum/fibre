---
id: ADR-0025
status: accepted
last-reviewed: 2026-10-28
---

# ADR-0025: Extend one Body with small, evidenced drive evaluators

## Status

Accepted decision. G1/D1 established one bounded evidence-backed
`social_contact` Body drive and historical v1 inherited sensitivity baselines.
**[ADR-0030](ADR-0030-inherited-urges.md), accepted 2026-10-28, amends
the inheritance rule for new v2 default births:** their 13 family-keyed
textual urge loci carry frozen orientation/G/T/P projections and do not
multiply by v1 0.85–1.15 sensitivities. The common Body and historical
v1 genomes remain unchanged. A v2 canary birth/projection has passed staging;
future drive generality, S2–S5, natural-life causal proof, considerate
social-time projection and spontaneous encounters remain open.

## Context

Fibre has one provider-neutral intrinsic regulator, a shared `RegulationFrame`, bounded organismic runtime sensitivity, interoception, Interior Cognition, World LivedNow and Flight Planning. Its existing social response reacts to present cues/relations but does not yet recognize a causally supported, prolonged lack of meaningful contact. A new need should not require its own engine, service, model invocation, feeling store, scheduling system or duplicated domain policy.

New future stimuli might include developmental appetite, grounded sensory/World changes, social scarcity or measured resources. They have **different authorities**. Only genuine regulator-level discrepancies become Body drives; model-token limits and infrastructure consumption are ordinarily feasibility, not invented organic hunger.

## Decision

1. **Keep one Body authority.** All families produce the existing generic Drive and `RegulationFrame` contract. Existing attention/interoception/planning/social consumers remain shared.
2. **Lightweight, statically composed drive modules.** A family consumes bounded, typed, evidenced `PerceptFrame` inputs and the existing species/individual profile; it deterministically returns zero or more ordinary drives. No World querying or model invocation inside family evaluators. Introduce a frozen `DRIVE_EVALUATORS` list only if more concrete families make such a list *simpler* than direct local evaluation. This is not a dynamic plugin runtime.
3. **Evidence and meaning separated.** Missing inputs mean unknown, not zero. A mechanical pressure is never automatically `loneliness`, `hunger`, `curiosity`, attraction, consent or an action. Personal meaning requires the existing interoception/Interior Cognition path and retained individual history.
4. **Genetics modest and explicit.** Species invariants own all allowed
ranges. Historical v1 `runtimeBaselines` remain inside their narrow envelope;
under ADR-0030 v2 uses an authored textual locus and *its own frozen*
physiological projection (gain 0.5×–2× at the species spread extremes),
not a second numeric personality genotype or an added v1 multiplier.
Neither defines developed character. New heritable mechanisms require a
real causal need, declared birth/lineage policy, and explicit handling of
already-born Threads; v1/v2 parental mixing remains deferred.
5. **First consumer: social-contact pressure.** Ground it in supported continuity plus bounded actual social/experienced evidence, respecting genuine solitude and sparse historical visibility. Improve non-social under-stimulation through the existing `exploration` drive. Let pressure affect ordinary life/planning and opportunities, not manufacture meetings.
6. **Considerate contact is situated social judgment.** Project recipient-local weekday/time, actual LivedNow reachability, modality and relationships into existing initiation/recipient cognition at real contact opportunities. No universal bedtimes or weekends, hard-coded relationship permissions, separate reminder engine or deterministic social approval table. Actual sleeping-person reachability is a World constraint, not inference from the hour.

## Consequences and controls

The near-term implementation surface is small and testable; adding another genuine drive can usually change its bounded World/body projector and one pure regulator evaluator (plus a genetic spec only when heritable). No per-minute ticking, whole-history reads, population-wide scans, extra provider calls, plugin framework, forced sociability or invented sensor data.

Acceptance requires an **actual differential causal effect** on a later Thread-owned action/plan together with preserved consent and valid non-action, not only a new field or a simulated feeling.

The implementation steps, source owners, semantic tests, current gaps and
explicit exclusions are recorded in [Extensible Body regulation, social hunger
and considerate contact](../architecture/regulation-drive-extensions.md).
The family-keyed S1 birth authority and precise limits are now governed by
[ADR-0030](ADR-0030-inherited-urges.md) and its
[architecture](../architecture/inherited-urges.md).
Follow [ADR-0020](ADR-0020-vision-led-development-discipline.md) and the
no-unneeded-abstraction rule. Work on `main` only; Guy runs local validation
and deployment.
