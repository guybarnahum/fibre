---
id: architecture-inherited-urges
status: proposed
last-reviewed: 2026-10-28
canonical: false
---

# Inherited urges — proposed

## Thesis and authority

A Thread inherits bodily and attentional **urges**, not instructions to think.
Genotype gives a drive its direction and mechanics. Authoritative World/Body evidence
activates it. Interoception describes a felt pull without naming emotions or
directing decisions. The Thread's **responses**, experienced outcomes and memories
can subsequently form character, self-understanding and different future choices.

```text
immutable family-keyed text + frozen orientation/gain/threshold/persistence
  -> evidenced discrepancy -> one Body -> RegulationFrame
  -> bounded interoception (no genome text, variant ID or origin metadata)
  -> common Interior Cognition + Thread-owned memory/character/relationships
  -> decision + accountable urge responses -> lived consequences
  -> admitted reflection / character -> different future decisions
```

This is a proposal governing the S1 source foundation; S2–S5 are not yet implemented.

## Family kinds and direction/trigger semantics

**Directional** families activate on their own evidence-backed discrepancy alone.
Orientation describes the *object of the pull*, **never gates activation**.
Target availability is separately observed as `available | absent | unknown`.
An absent familiar person can be longed for; no person or venue is fabricated.

**Triggered** families activate upon an admitted event/open-item of a declared
trigger kind. Every Thread, including a v2 carrier, reacts to *all* trigger kinds
at species defaults. A v2 inherited orientation modifies **only that trigger
kind** through its gain/threshold/persistence. It never deletes reactions to
other triggers. The species-standard orientation of triggered families is
`all`; for directional families it is `undirected`.

| Family | Kind | Closed orientations | Required evidence/silence rule |
|---|---|---|---|
| social_contact | directional | ambient_company, familiar_person, conversation, closeness | Bounded admitted interval of social scarcity; orientation availability is independent |
| exploration | directional | places, ideas, people, making | Repeated enacted sameness; no invented novelty |
| presence | directional | places, people, mediated_connection, activities | Admitted plan/current or predicted presence mismatch |
| rest | directional | stillness, sleep, solitude | Observed fatigue or recovery deficit |
| energy | directional | nourishment, replenishment, conservation | Modeled energy deficit, not token cost |
| thermal_comfort | directional | warmth, cooling, shelter | Observed temperature discrepancy |
| sensory_load | directional | quiet, dimness, space, reduced_motion | Observed sound/light/space/motion load |
| safety_threat | directional | distance_from_threat, shelter, help_from_known_person | Admitted hazard or threat; no demographic inference |
| attachment_proximity | directional | familiar_person, caregiver, reciprocal_contact, shared_presence | Specific real relationship and supported distance/contact conditions |
| closure | triggered | decisions, tasks, answers_owed | Open Thread-owned choice, active task or actual outstanding reply |
| verification_itch | triggered | unresolved_claim, untested_assumption, conflicting_evidence | Uncertainty recorded in an earlier Thread-owned decision |
| standing_flare | triggered | public_correction, refusal_by_close_person, exclusion | Directed admitted act; public requires audience, close requires actual relation |
| mastery_itch | directional | technique, unfinished_work, repeated_practice, interrupted_learning | Supported interrupted/repeated activity with continuing investment |

The 130 immutable authored variants, 10 per family, are the v2 source-of-truth
catalogue in `core/src/inherited-urges.mjs`. Each entry contains a concrete
bodily or attentional description that agrees with its closed orientation.
Positions are balanced per family without forcing mirrored per-orientation
patterns: every family spans both sides of ±0.85 on gain, threshold and
persistence; each orientation has mixed-sign gain and a modest mean; the only
repeated triple per family is one deliberately matched cross-orientation
comparison. The measured values and effective thresholds appear in
`docs/validation/inherited-urges-library-review.md`.
Textual nuances beyond the orientation/positions remain meaning-bearing source
but **are not claimed as additional operational differences**. Frozen parameters
are author-reviewed, not inferred by a model at runtime. No sex, ancestry,
culture, birthplace, appearance or family stereotypes choose variants.

## Organism policy and numeric boundary

`FIBRE_ORGANISM_POLICY` is JSON in the Git-tracked World Wrangler vars,
parsed before deploy and once at Worker initialization.

```json
{"version":"1","inheritedSpread":1,"plasticity":0,
 "plasticityHalfLifeDays":30,
 "enabledFamilies":["social_contact","exploration","presence"],
 "characterFormation":{"enabled":true,"minSalientResponses":2}}
```

V2 gain is `2^(position × inheritedSpread)`: the default spreads from
0.5× to 2× species gain. **All Threads** share one species awareness threshold.
`THREAD_SPECIES_PROFILE` declares `speciesFeltThreshold=0.05`,
`speciesFeltThresholdOctaves=2`, `speciesFeltThresholdCeiling=0.85`
(as a guard), and `speciesPersistenceHalfLifeSeconds=3600`.
The log-symmetric felt mapping is
`min(0.85, 0.05 × 2^(-2 × feltThresholdPosition × inheritedSpread))`.
It ranges from `0.0125` to `0.2` at spread 1 and positions ±1:
no artificial floor collapses distinct positions.
Legacy/default drives use exactly the same center as v2 position zero.
The choice is calibrated to existing lived inputs: 2 hours of evidenced
social scarcity yield `0.8 × 2/24 ≈ 0.067` Body pressure, and the current
World observer requires at least 2 hours; `0.05` admits that real signal
while suppressing weaker unevidenced-by-living-time noise. Sustained
sameness can yield `0.5` exploration pressure. These are design
calibrations rather than production measurements.

The planned partial-satisfaction residual half-life maps to
`3600 × 2^(persistencePosition × inheritedSpread)` seconds, but
**persistence is not live in S1**: callers do not yet provide
`previousUrges`. Both threshold and gain are live for currently evidenced,
enabled families; orientation is live as a felt direction, not a proven
different plan.

V2 locus projections are the *sole* drive-specific inherited controls: never
multiply their gain by legacy 0.85–1.15 sensitivities. No separate numeric
personality genotype is permitted; the frozen projection is inseparable from
its textual variant and library digest.

A disabled family, a missing discrepancy, or a triggered kind without evidence
is silent. Silent future families cost no runtime SQL or model call.

**S1 evidence wiring limit:** the existing World callers supply discrepancy
evidence for `social_contact`, `exploration` and `presence`, plus v2
genome projection and organism policy. They **do not supply**
`previousUrges`, `urgeTriggers` or `urgeAvailability`.
Consequently, inherited gain, felt threshold and directional orientation
are live for those three families; persistence is **inert**, the three
triggered families **cannot fire**, and all directional target availability
is `unknown`. The Body API already accepts those fields for testable
future integration; their live evidence and persistence sources are part
of S2/S3, not silently implemented by S1.

## Legacy Organism Profile and genome-off ablation

All Threads inhabit the same Fibre species Body. Historical genomic material
is immutable; no v1 cognitive-style locus is reinterpreted as an urge and none
is exposed to ordinary cognition. No historical genome or digest is rewritten.
A missing family uses species defaults, not invented birth material.

For legacy inherited sensitivity `s` the effective gain under a spread `a`
is `1 + (s - 1) × a`. With spread zero, **all** v1 and v2 inherited
differences disappear: legacy sensitivities become 1, v2 gain/threshold/
persistence revert to species baseline, and orientation reverts to the same
species-standard `undirected` (directional) or `all` (triggered) rule.

Cross-generation family-keyed recombination involving v1/legacy parents is
**deferred**, never inferred from adult character or ordinal coincidence.

## Genesis and Felt Childhood

Keep the approved per-request deterministic selection, originMaterial
provenance, request-specific age-22 chronology and fixture-slot removal.
World admission accepts versioned v2 origin material before Birth Center
begins births. Pass A and Pass B are **genome-blind for v2**.
Older v1 Pass-B experiments remain historically replayable.

**Felt Childhood — deferred, not permanently prohibited:** a later
developmentally appropriate Body-style projection over historically admitted
childhood events may make inherited urges color what the child notices,
retains and comes to mean. It must never inject genome text into prompts.
Variable-age Genesis and v1/v2 lineage are separate deferred paths.

## Next slices: S2–S5

**S2:** one Fibre-owned interoceptive projection in every Interior Cognition
domain (planning, social approach and response, invitation, dignity participation,
reflection). Each felt family must have exactly one `followed | resisted |
redirected | deferred | not_engaged` response. **Missing response cannot
break the life decision:** admit decision, persist `responsesMissing[]`,
drop claimed unfelt families, and report dropped/missing rates. No retries
or additional model calls; no regulator-created consent or authorization.
Store one compact idempotent response bundle per decision, preferably in
existing LivedExperienceStore.

**S3:** add authoritative evidence for rest/fatigue, sensory load,
standing flare and closure one by one; then other families as real evidence
appears. No guessed sensor values and no new independent Body.

**S4:** a **new** gated reflection model call only on admitted World-owned
`awake -> asleep` onset, at most once per Thread per World-day and
only when `characterFormation.enabled` and `minSalientResponses` hold.
Unknown-to-asleep and retrospectively realized onset do not silently count.
Admit supported self-model/semantic-state proposals; a Current Character View
is derived and reconstructable. Record provider/model, actual token usage,
cached tokens, latency, evidence refs, policy version and digest. Plasticity
defaults to zero; optional future learned gain is computed lazily only from
actual response and tolerable *remembered* outcomes, not labels alone.

**S5:** bounded staging observation, controlled symmetric swap and ablations.
Proof A: same scarcity and identical numerical positions, different
directional orientation -> different felt direction *even with absent targets*,
then predeclared different plan/approach. Also same triggered event with
different inherited orientations -> inherited boost versus default and
predeclared response difference. Proof B: same genome and present pressure,
different actual urge-response and remembered-outcome history -> different
future response; symmetric history swap, character-off ablation. Require
Thread-owned selection, held-out trials, paraphrases/contradictions and
downstream consequence under the standing differential gate.

## Causal-status register

| Mechanism | After S1 | After S2 | After S4 | S5 proof required |
|---|---|---|---|---|
| Text and provenance | Stored-only | Stored-only | Stored-only | Origin trace |
| Orientation | Live felt direction for evidenced social_contact, exploration, presence; no target-availability evidence yet; triggered kinds dormant | Context-only unless acted upon | Same | Qualitative swap changes action |
| Gain and felt threshold | Live in Body for three evidenced families; identical species center for legacy and position-zero v2 | Felt context until response changes | Same | Quantitative swap with effect |
| Persistence | Inert: no live caller supplies previousUrges | Previous urge evidence proposed | Potentially felt history | Witnessed persistence difference |
| Trigger kinds | Inert: no live caller supplies urgeTriggers; all three triggered families silent | Deferred | Deferred until S3 evidence | Baseline response to all kinds |
| Target availability | Always unknown: no live caller supplies urgeAvailability | Deferred | Available/absent/unknown after S3 | No invented targets |
| Legacy species defaults | Mechanically causal with evidence under shared threshold | Felt context | Personal response history | Genome-off equivalence |
| Response records | Not built | Stored-only | Character evidence | History changes choice |
| Character | Not built | Not built | Derived, context-only until proven | Memory-backed consequence |
| Sleep reflection | Not built | Not built | Gated new call | Durable self-model effect |
| Felt Childhood | Deferred | Deferred | Deferred | Developmental proof |

## Vision, cost and evidence contract

Fibre capability: inherited individuality becomes a felt, evidence-based
urge that a Thread can answer differently through lived experience. Excluded
capabilities are explicitly deferred, not quietly abolished: full sensorium,
Felt Childhood, lineage mixing, persistent learned attachment, plasticity,
complete Current Character View and variable-age Genesis.

No timer, polling, per-family historical scan, extra S1 model call or
cross-population read. S1 needs no routine writes and may use a one-time
immutable projection at birth; S2 aims for one compact response-bundle write
per material decision; S3 uses bounded indexed evidence only when relevant;
S4 spends **0–1 gated model call per Thread-day**, approximately 1,200–2,500
input and 200–500 output tokens as an *unmeasured initial budget*,
with approximately 2–19 incremental SQL rows read at its eligible boundary.
S5 adds no daily production work. Measure actual DO rows, tokens and latency.

Review questions: Who owns the relevant evidence? What exact Thread-owned
difference changed a decision rather than merely a prompt? What lived
consequence survives restart? Can the Thread resist the pull without losing
its genotype? Does a default fallback invent genetic inheritance or a target?
Does any new mechanism imply consent? Are omitted ambitions still reachable?
Can the system pass its causal differential under genomic and character
ablations? If not, label the work Stored-only/Context-only rather than
claiming non-interchangeable personhood.
