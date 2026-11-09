---
id: adr-0036-social-body
status: proposed
last-reviewed: 2026-11-09
canonical: true
---

# ADR-0036 — The social Body: hunger, battery, familiarity and trust

**Accepted in principle by Guy, November 9, 2026. Proposed until he approves the drafted loci** ([review](../validation/social-body-urges-library-review.md)). Plan: S0–S6.

## Why

Conversations ended only when an eight-turn compute guard cut them off, or when a Thread said goodbye. Messages ran in loops: Kaleb and Bontu wrote to each other every thirty minutes all day on November 8–9. Nothing in the Body said *enough for now*, *I don't know you yet* or *I trust you*.

Six of the eight living Threads (born before the urge library) have no urge genes at all, so their social Bodies are identical.

Guy's direction: behaviour emerges from Body urges and is never coded, and the genome holds the Body urges and nothing else.

## Decision

**States and urges.** The Body holds states that change with what World records. Inherited urge loci (ADR-0030) set how strongly, how soon and how persistently each is felt. The Thread feels them in words, and its own cognition decides what to do. No rule ends a conversation, delays a reply or grants trust.

**Social hunger** is the existing `social_contact` family. Messages now relieve it too, more weakly than talk.

**Social energy** is a new directional family, `social_energy`: the battery.
- **Drain:** social exposure drains it, as gain × (unfamiliarity + expected harm), plus a small effort term.
- **Charge:** it recharges where this Body is inherited to: `company`, `quiet_company`, `solitude` or `doing`.
- **Trust lowers the drain; it does not add charge** (Guy: "it drains less").

**Familiarity** is history, not a family. It is how much a Thread has lived around a person: co-presence, noticed encounters, conversations, messages, all already recorded. It lowers the uncertainty part of the drain. Existing loci decide whether the unfamiliar is a cost or a pull: exploration `people`, social_contact `familiar_person`, trust `familiarity`.

**Trust** is a new directional family, `trust`, held toward each person met, humans included.
- **What it is:** reduced expected harm. *They could have hurt me, and did not.*
- **It grows** from exposure without harm, and **falls** with harm taken.
- **It fades** toward the species baseline without contact.
- **Inherited:** what counts as evidence of safety: `reliability`, `warmth`, `reciprocity` or `familiarity`.
- **What flows from it:** openness, doors, stance, and less drain.

**Other social states** come from existing ADR-0030 families, each enabled only when World feeds it real evidence:
- `attachment_proximity` (bond);
- `closure` with `answers_owed` (a reply owed, the healthy end of a message chain);
- `standing_flare` (the sting of correction, refusal or exclusion);
- `safety_threat` (distrust felt in the Body);
- `presence` (expecting someone);
- `exploration` (sameness within and across conversations; a pull toward the new).

**Conversations.**
- The live-encounter guard rises to 24 opportunities and continues in the next invocation, so it never ends a conversation.
- A `PAUSE:` turn admits a non-verbal moment. Mutual pauses become a `lull`.
- Endings are recorded as `closed`, `lull`, `scene_changed` or `bounded`.

**Library v4** adds the two families, ten reviewed loci each, to v3. Births draw all 15, by the same per-family selection.

**Late expression** amends ADR-0030's "never back-filled". World may add a locus for a family **never expressed** for that Thread (a species default is not a gene), under four conditions:
1. **Drawn deterministically** from the Thread's existing genome digest. It is never chosen, and never inferred from character or behaviour.
2. **Recorded** as a timed `THREAD_GENOME_LOCI_EXPRESSED` event. The original genome, its digest and the Thread's history are untouched; earlier decisions stay attributed to what the Thread then had.
3. **Once per family.** A locus already expressed is never redrawn or replaced.
4. **The same library and review** as births. `inheritedSpread = 0` still reverts every inherited and expressed locus to the species default.

The six legacy Threads therefore gain all 15 families, and the two v3 Threads gain the two new ones. This changes their behaviour from the event onward, by design.

## Status of what this excludes

| Capability | Status | Extension path |
|---|---|---|
| Attraction, romance, couples | deferred | `attachment_proximity` and the accepted attraction concept on the same trust and familiarity |
| Groups, belonging, standing within a group | deferred | groups and institutions; the same states toward many |
| Real hazards for `safety_threat` | deferred | World hazards as evidence |
| Whole-day fatigue beyond the social battery | deferred | the existing `rest` and `energy` families |
| Recombination of the new families from legacy parents | deferred | the existing family-keyed rule once both parents carry v4 |

No permanent constraint.

## Evidence (as slices land)

- Mechanical library balance: [review](../validation/social-body-urges-library-review.md).
- S1: deterministic, recorded and idempotent expression; spread-0 ablation.
- S2: the same conversation drains two Bodies differently; familiar strangers drain less; messages relieve hunger.
- S3: a kept appointment makes the next talk drain less, a broken one more.
- On staging: endings by kind; length by familiarity and trust; messages per pair per day.
