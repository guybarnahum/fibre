---
id: ADR-0030
status: proposed
last-reviewed: 2026-10-28
---

# Proposed ADR: Family-keyed inherited urges and one species Body

## Decision pending review

Replace the v1 six cognitive-style *default birth* loci with 13 immutable
family-keyed v2 textual urge loci, 10 variants per family. Each author-reviewed
text is bound to a frozen closed orientation plus gain, felt-threshold and
persistence positions. Text carries inherited meaning; no model parses it into
numbers. Orientation, unlike the three scalars, produces evidence-distinguishable
**qualitative** differences.

Ten families are **directional**: social_contact, exploration, presence, rest,
energy, thermal_comfort, sensory_load, safety_threat, attachment_proximity and
mastery_itch. Family discrepancy evidence activates the drive whether or not
the oriented target is available. A separate authoritative
`available | absent | unknown` witness describes target availability; longing
when a target is absent remains possible.

Three families are **triggered**: closure, verification_itch, standing_flare.
Every Thread reacts to *all* admitted trigger kinds at species defaults;
a v2 locus enhances only its inherited trigger kind, without suppressing
the other kinds.

All Threads inhabit the **same species Body**. Existing immutable genomes
are never rewritten or back-filled. Legacy cognitive-style text remains
stored and inert in lived cognition. Missing v2 families use species
default direction (undirected) or trigger coverage (all). Existing legacy
0.85–1.15 sensitivities remain valid but under the genome-off spread `a`
project as `1 + (s - 1) × a`. For v2 loci the frozen projection is the
*sole* inherited drive control, never multiplied by legacy sensitivities.
At `inheritedSpread=0` the entire population uses species-default controls
and directions. Parent/child v1/v2 mixing is deferred pending explicit
family-keyed recombination policy.

The validated Git-tracked `FIBRE_ORGANISM_POLICY` controls the species-wide
experiment, not individual preferences: version, spread, optional plasticity,
plasticity half-life, enabled families, and gated character formation.
The default is spread 1, plasticity 0, half-life 30 days, only social_contact,
exploration and presence enabled, and character reflection gate 2 salient
responses. An invalid policy blocks deployment acceptance. Replayed
consequential regulation records carry the policy version/digest.

**One species awareness boundary:** `THREAD_SPECIES_PROFILE` defines the
felt-threshold center `0.05`, variation span `0.15`, clamp `[0.01, 0.85]`,
and planned residual persistence half-life `3600` seconds. Legacy/default
drives use the same center as v2 with threshold position zero;
`inheritedSpread=0` returns both to that shared center. The center is
chosen from existing World-lived pressure: the first admissible two-hour
social-scarcity interval gives `0.8 × 2/24 ≈ 0.067`; sustained sameness
can yield `0.5` exploration pressure. Thus genuine low-pressure contact
scarcity remains perceptible in both generations without making every
positive numeric signal felt. It is a calibration choice, not a measured
production response curve.

**Accurate S1 causal scope:** only `social_contact`, `exploration`,
and `presence` currently have admitted live discrepancy evidence.
For those families, frozen v2 gain and felt threshold alter Body pressure
and interoception, and orientation alters the *direction of the felt pull*.
No live World caller supplies `previousUrges`, `urgeTriggers` or
`urgeAvailability`: persistence is inert, every triggered family remains
silent, and all directional target availability is `unknown`.
S2/S3 must provide those witnesses; S1 does not claim them.
The numeric library was rebalanced so each family and orientation spans
physiological variation independently of orientation.

New v2 Genesis Pass A **and Pass B** are genome-blind. Preserve historical
v1 Pass-B evidence. **Felt Childhood is deferred, not forbidden:** inherited
urges may later color childhood attention and autobiographical retention
through a developmentally appropriate evidenced Body projection, never
direct genomic prompt instructions. Variable-age Genesis remains deferred.

The next S2 decision output accounts for every felt family. Omitted responses
are persisted under `responsesMissing[]` without retry or failure of the
underlying life decision; unfelt claims are dropped and counted. The Thread's
cognition authors responses and because-refs. Drives create no permission,
consent, resource authority, relationship authority or protected action.

S4 explicitly introduces **a new** sleep-onset character reflection model
call, at most once per World-day when gated; record model, tokens, latency
and evidence. No unconditional daily call, organism ticker or polling.
Current Character View remains evidence-backed, derived and reconstructable.

## Rejected alternatives and risk

Reject a numeric personality vector with cosmetic prose, orientations that
silence directional drives, inheriting only one triggered event reaction,
reading genome text in ordinary cognition, retroactive DNA migration, and
unconditional per-Thread model invocations. The library's descriptions
must evoke embodied experience, not restate evidence-admission rules.
S1 does not prove individual plans or character development: it establishes
the limited, evidence-backed Body projection that S2–S5 must connect through
Thread-authored decisions to lived consequence.

Implementation and the detailed causal-status/cost/differential contracts
are in `docs/architecture/inherited-urges.md`. Historical accepted doctrine
remains effective pending explicit acceptance of this proposed ADR.
